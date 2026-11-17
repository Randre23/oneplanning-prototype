export function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function datesInPeriod(year, month = null) {
  const months = month === null ? Array.from({ length: 12 }, (_, i) => i) : [month];
  return months.flatMap(m => Array.from({ length: new Date(year, m + 1, 0).getDate() }, (_, i) => {
    const date = new Date(year, m, i + 1);
    return { key: dateKey(year, m, i + 1), date, weekend: [0, 6].includes(date.getDay()) };
  }));
}

export function assignmentKey(personId, date) {
  return `${personId}:${date}`;
}

export function getAssignment(data, personId, date) {
  return data.assignments[assignmentKey(personId, date)] ?? { eventId: '', permanence: 'NONE', hours: 0 };
}

export function eventFor(data, assignment) {
  return data.events.find(event => event.id === assignment.eventId);
}

export function dailyMetrics(data, people, day) {
  const teams = Object.fromEntries(data.teams.map(team => [team.id, 0]));
  let present = 0;
  let displaced = 0;
  let online = 0;
  let offline = 0;
  for (const person of people) {
    const assignment = getAssignment(data, person.id, day.key);
    const event = eventFor(data, assignment);
    if (!day.weekend && (!event || event.inOffice)) {
      present++;
      teams[person.teamId]++;
    }
    if (event?.displaced) displaced++;
    if (assignment.permanence === 'ONLINE') online++;
    if (assignment.permanence === 'OFFLINE') offline++;
  }
  return { present, displaced, online, offline, teams };
}

export function hoursBalance(data, person, year) {
  let consumed = 0;
  for (const [key, assignment] of Object.entries(data.assignments)) {
    if (key.startsWith(`${person.id}:${year}-`) && eventFor(data, assignment)?.requiresHours) {
      consumed += Number(assignment.hours);
    }
  }
  return { base: person.baseHours, consumed, remaining: person.baseHours - consumed };
}

export function personSummary(data, person, days) {
  return days.reduce((summary, day) => {
    const assignment = getAssignment(data, person.id, day.key);
    const event = eventFor(data, assignment);
    if (event) summary.events++;
    if (!day.weekend && (!event || event.inOffice)) summary.present++;
    if (assignment.permanence === 'ONLINE') summary.online++;
    if (assignment.permanence === 'OFFLINE') summary.offline++;
    return summary;
  }, { events: 0, present: 0, online: 0, offline: 0 });
}

function assertText(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) {
    throw new Error(`${label}: introduce entre 1 y 80 caracteres.`);
  }
}

function assertNumber(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}: introduce un número entre ${min} y ${max}.`);
  }
}

function validateAssignment(data, personId, date, assignment) {
  if (!data.people.some(person => person.id === personId)) throw new Error('La persona no existe.');
  const parsed = new Date(`${date}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || dateKey(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) !== date) {
    throw new Error('La fecha no es válida.');
  }
  if (!['NONE', 'ONLINE', 'OFFLINE'].includes(assignment.permanence)) throw new Error('Permanencia no válida.');
  const event = eventFor(data, assignment);
  if (assignment.eventId && !event) throw new Error('El estado no existe.');
  if (event?.requiresHours) {
    assertNumber(assignment.hours, 0.25, 24, 'Horas');
    if (!Number.isInteger(assignment.hours * 4)) throw new Error('Las horas deben ser múltiplos de 0,25.');
  }
}

export function setAssignment(data, personId, date, assignment) {
  validateAssignment(data, personId, date, assignment);
  const event = eventFor(data, assignment);
  const normalized = { eventId: assignment.eventId, permanence: assignment.permanence, hours: event?.requiresHours ? assignment.hours : 0 };
  const key = assignmentKey(personId, date);
  if (!normalized.eventId && normalized.permanence === 'NONE') delete data.assignments[key];
  else data.assignments[key] = normalized;
}

export function upsertEntity(data, collection, entity) {
  if (!['people', 'teams', 'events'].includes(collection)) throw new Error('Tipo de configuración no válido.');
  assertText(entity.id, 'Identificador');
  assertText(entity.name, 'Nombre');
  if (collection === 'people') {
    if (!data.teams.some(team => team.id === entity.teamId)) throw new Error('Selecciona un equipo válido.');
    assertNumber(entity.baseHours, 0, 1000, 'Saldo base');
    assertNumber(entity.weeklyHours, 1, 60, 'Jornada semanal');
  } else {
    if (!/^#[a-f\d]{6}$/i.test(entity.color)) throw new Error('Selecciona un color válido.');
    if (collection === 'teams') {
      assertNumber(entity.minimum, 0, 100, 'Disponibilidad mínima');
      if (!Number.isInteger(entity.minimum)) throw new Error('El mínimo debe ser un número entero.');
    } else {
      if (!/^[A-Z0-9]{1,5}$/.test(entity.code)) throw new Error('El código debe tener entre 1 y 5 letras o números.');
      if (data.events.some(event => event.id !== entity.id && event.code === entity.code)) throw new Error('Ya existe un estado con ese código.');
      if (![entity.requiresHours, entity.inOffice, entity.displaced].every(value => typeof value === 'boolean')) throw new Error('Configuración del estado no válida.');
      if (entity.requiresHours) {
        assertNumber(entity.defaultHours, 0.25, 24, 'Horas por defecto');
        if (!Number.isInteger(entity.defaultHours * 4)) throw new Error('Las horas deben ser múltiplos de 0,25.');
      }
    }
  }
  const index = data[collection].findIndex(item => item.id === entity.id);
  if (index === -1) data[collection].push(entity);
  else data[collection][index] = entity;
}

export function validateData(data) {
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.people) || !Array.isArray(data.teams) || !Array.isArray(data.events) || !data.assignments || typeof data.assignments !== 'object' || Array.isArray(data.assignments)) {
    throw new Error('Los datos locales no tienen un formato compatible.');
  }
  for (const collection of ['teams', 'events', 'people']) {
    if (new Set(data[collection].map(item => item.id)).size !== data[collection].length) throw new Error('Los datos contienen identificadores duplicados.');
    for (const item of data[collection]) upsertEntity(structuredClone(data), collection, item);
  }
  for (const [key, assignment] of Object.entries(data.assignments)) {
    const separator = key.lastIndexOf(':');
    validateAssignment(data, key.slice(0, separator), key.slice(separator + 1), assignment);
  }
  return data;
}
