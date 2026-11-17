import { assignmentKey, dateKey, datesInPeriod } from './model.js';

export function createDemoData(year = new Date().getFullYear()) {
  const teams = [
    { id: 'product', name: 'Producto', color: '#667aa6', minimum: 2 },
    { id: 'operations', name: 'Operaciones', color: '#439c87', minimum: 2 },
    { id: 'quality', name: 'Calidad', color: '#b28a54', minimum: 1 }
  ];
  const events = [
    { id: 'remote', code: 'TL', name: 'Teletrabajo', color: '#6383bb', inOffice: false, displaced: false, requiresHours: false, defaultHours: 0 },
    { id: 'holiday', code: 'V', name: 'Vacaciones', color: '#419782', inOffice: false, displaced: false, requiresHours: false, defaultHours: 0 },
    { id: 'travel', code: 'D', name: 'Desplazamiento', color: '#b38652', inOffice: false, displaced: true, requiresHours: false, defaultHours: 0 },
    { id: 'recovery', code: 'R', name: 'Recuperación', color: '#9375b2', inOffice: false, displaced: false, requiresHours: true, defaultHours: 2 },
    { id: 'training', code: 'F', name: 'Formación en oficina', color: '#6296a2', inOffice: true, displaced: false, requiresHours: false, defaultHours: 0 }
  ];
  const names = ['Alex Demo', 'Sam Demo', 'Robin Demo', 'Dani Demo', 'Cris Ejemplo', 'Noa Ejemplo', 'Ari Ejemplo', 'Kai Ejemplo', 'Luca Muestra', 'Nico Muestra', 'Leo Muestra', 'Max Muestra'];
  const people = names.map((name, i) => ({ id: `demo-${i + 1}`, name, teamId: teams[Math.floor(i / 4)].id, weeklyHours: i === 6 ? 32 : 40, baseHours: 8 + (i % 4) * 4 }));
  const data = { schemaVersion: 1, teams, events, people, assignments: {} };
  for (let month = 0; month < 12; month++) {
    const workdays = datesInPeriod(year, month).filter(day => !day.weekend);
    people.forEach((person, i) => {
      const remote = workdays[(i * 3 + month) % workdays.length];
      data.assignments[assignmentKey(person.id, remote.key)] = { eventId: 'remote', permanence: 'NONE', hours: 0 };
      const day = workdays[(i * 2 + month + 5) % workdays.length];
      const eventId = ['holiday', 'travel', 'recovery', 'training'][i % 4];
      data.assignments[assignmentKey(person.id, day.key)] = { eventId, permanence: 'NONE', hours: eventId === 'recovery' ? 2 : 0 };
    });
    workdays.forEach((day, i) => {
      const person = people[(i + month) % people.length];
      const key = assignmentKey(person.id, day.key);
      data.assignments[key] = { ...(data.assignments[key] ?? { eventId: '', hours: 0 }), permanence: i % 2 ? 'OFFLINE' : 'ONLINE' };
    });
  }
  const firstWorkday = datesInPeriod(year, 0).find(day => !day.weekend);
  data.assignments[assignmentKey(people[3].id, firstWorkday.key)] = { eventId: 'recovery', permanence: 'NONE', hours: 4 };
  data.demoYear = Number(dateKey(year, 0, 1).slice(0, 4));
  return data;
}
