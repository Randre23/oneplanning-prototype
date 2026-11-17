import { datesInPeriod, dailyMetrics, hoursBalance, personSummary, getAssignment, eventFor, setAssignment, upsertEntity, dateKey } from './model.js';
import { LocalRepository, STORAGE_KEY } from './repository.js';

const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const number = value => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
const labelDate = date => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
const monthNames = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2026, i, 1)));
const initials = name => name.split(/\s+/).slice(0, 2).map(part => part[0]).join('');
const today = new Date();
const state = { year: today.getFullYear(), month: today.getMonth(), view: 'month', team: 'all', search: '', adminTab: 'people', cell: null, entity: null };
let data;
let repository;
let busy = false;
let feedbackTimer;

function showError(error, field) {
  console.error(error);
  const message = error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.';
  if (field) $(field).textContent = message;
  else {
    $('feedback').textContent = message;
    $('feedback').hidden = false;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { $('feedback').hidden = true; }, 12000);
  }
}

async function action(work, errorField) {
  if (busy) return;
  busy = true;
  const submits = document.querySelectorAll('button[type="submit"]');
  submits.forEach(button => { button.disabled = true; });
  try {
    await work();
  } catch (error) {
    $('saveStatus').textContent = 'No se han guardado los cambios';
    showError(error, errorField);
  } finally {
    busy = false;
    submits.forEach(button => { button.disabled = false; });
  }
}

async function commit(change) {
  const draft = structuredClone(data);
  change(draft);
  await repository.save(draft);
  data = draft;
  render();
  $('saveStatus').textContent = 'Cambios guardados en este navegador';
}

function visiblePeople() {
  return data.people.filter(person => (state.team === 'all' || person.teamId === state.team) && person.name.toLocaleLowerCase('es').includes(state.search.toLocaleLowerCase('es')));
}

function periodDays() {
  return datesInPeriod(state.year, state.view === 'year' ? null : state.month);
}

function periodLabel() {
  return state.view === 'year' ? `Año ${state.year}` : `${monthNames[state.month]} ${state.year}`;
}

function teamOf(person) {
  return data.teams.find(team => team.id === person.teamId);
}

function eventPill(event, hours) {
  return event ? `<span class="event-pill" style="--event-color:${event.color}">${escape(event.code)}${event.requiresHours ? `<small>${number(hours)}h</small>` : ''}</span>` : '<span class="cell-placeholder" aria-hidden="true">·</span>';
}

function permanenceMark(permanence) {
  return permanence === 'NONE' ? '' : `<span class="permanence-dot ${permanence.toLowerCase()}" aria-hidden="true"></span>`;
}

function render() {
  const people = visiblePeople();
  const days = periodDays();
  $('periodTitle').textContent = periodLabel();
  $('todayLabel').textContent = labelDate(today);
  $('monthSelect').innerHTML = monthNames.map((name, i) => `<option value="${i}" ${i === state.month ? 'selected' : ''}>${name}</option>`).join('');
  $('monthSelect').hidden = state.view === 'year';
  const years = [...new Set([today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1, today.getFullYear() + 2, state.year])].sort();
  $('yearSelect').innerHTML = years.map(year => `<option ${year === state.year ? 'selected' : ''}>${year}</option>`).join('');
  $('monthView').setAttribute('aria-pressed', String(state.view === 'month'));
  $('yearView').setAttribute('aria-pressed', String(state.view === 'year'));
  $('teamFilters').innerHTML = `<button data-team="all" class="team-chip ${state.team === 'all' ? 'selected' : ''}" aria-pressed="${state.team === 'all'}">Todo el equipo <span>${data.people.length}</span></button>` + data.teams.map(team => `<button data-team="${escape(team.id)}" class="team-chip ${state.team === team.id ? 'selected' : ''}" aria-pressed="${state.team === team.id}"><i style="background:${team.color}"></i>${escape(team.name)}<span>${data.people.filter(person => person.teamId === team.id).length}</span></button>`).join('');
  renderStats(people, days);
  renderMatrix(people, days);
  $('inlineLegend').innerHTML = data.events.slice(0, 5).map(event => `<span><i style="background:${event.color}"></i>${escape(event.name)}</span>`).join('');
}

function renderStats(people, days) {
  const workdays = days.filter(day => !day.weekend);
  const metrics = workdays.map(day => dailyMetrics(data, people, day));
  const relevantTeams = data.teams.filter(team => people.some(person => person.teamId === team.id));
  const lowDays = metrics.filter(metric => relevantTeams.some(team => metric.teams[team.id] < team.minimum)).length;
  const average = workdays.length ? metrics.reduce((sum, metric) => sum + metric.present, 0) / workdays.length : 0;
  const permas = days.reduce((sum, day) => {
    const metric = dailyMetrics(data, people, day);
    return sum + metric.online + metric.offline;
  }, 0);
  const cards = [
    { title: 'Personas en el cuadrante', value: people.length, suffix: '', note: `${relevantTeams.length} equipos · según filtro`, icon: '♧', tone: 'mint' },
    { title: 'Presencia media', value: number(average), suffix: '/ día', note: 'Solo días laborables del periodo', icon: '▦', tone: 'blue' },
    { title: 'Días bajo mínimos', value: lowDays, suffix: '', note: 'Disponibilidad de los equipos filtrados', icon: '↘', tone: lowDays ? 'amber' : 'mint' },
    { title: 'Permanencias asignadas', value: permas, suffix: '', note: 'Online + offline · periodo visible', icon: '◷', tone: 'purple' }
  ];
  $('stats').innerHTML = cards.map(card => `<article class="stat-card"><div class="stat-card-top"><span>${card.title}</span><span class="stat-icon ${card.tone}" aria-hidden="true">${card.icon}</span></div><div class="stat-value">${card.value}<small>${card.suffix}</small></div><p>${card.note}</p></article>`).join('');
}

function renderMatrix(people, days) {
  $('emptyState').hidden = people.length !== 0;
  $('planningTable').hidden = people.length === 0;
  const sorted = data.teams.flatMap(team => people.filter(person => person.teamId === team.id));
  const groups = data.teams.map(team => ({ ...team, people: sorted.filter(person => person.teamId === team.id) })).filter(team => team.people.length);
  $('matrixHead').innerHTML = `<tr class="team-row"><th class="date-heading" rowspan="2" scope="col">DÍA <small>${state.year}</small></th>${groups.map(team => `<th colspan="${team.people.length}" scope="colgroup" style="--team-color:${team.color}"><span class="team-heading"><i></i>${escape(team.name)}</span></th>`).join('')}<th class="metric-heading" rowspan="2" scope="col">EN OFICINA</th>${groups.map(team => `<th class="metric-heading" rowspan="2" scope="col" title="Mínimo: ${team.minimum}"><span style="color:${team.color}">${escape(team.name)}</span><small>MÍN. ${team.minimum}</small></th>`).join('')}<th class="metric-heading" rowspan="2" scope="col">DESPL.</th></tr><tr class="people-row">${sorted.map(person => {
    const balance = hoursBalance(data, person, state.year);
    return `<th scope="col"><button class="person-heading" data-person="${escape(person.id)}" title="Ver resumen de ${escape(person.name)}"><span class="person-avatar" style="--team-color:${teamOf(person).color}">${escape(initials(person.name))}</span><span>${escape(person.name.split(' ')[0])}<small>${escape(person.name.split(' ').slice(1).join(' '))}</small></span><span class="hours-badge ${balance.remaining < 0 ? 'negative' : ''}" title="Saldo anual de recuperación">${number(balance.remaining)} h</span></button></th>`;
  }).join('')}</tr>`;
  let lastMonth = -1;
  $('matrixBody').innerHTML = days.map(day => {
    const monthStart = state.view === 'year' && day.date.getMonth() !== lastMonth;
    lastMonth = day.date.getMonth();
    const monthRow = monthStart ? `<tr class="month-separator"><th colspan="${1 + sorted.length + 2 + groups.length}">${escape(monthNames[lastMonth])} ${state.year}</th></tr>` : '';
    const metric = dailyMetrics(data, sorted, day);
    const isToday = day.key === dateKey(today.getFullYear(), today.getMonth(), today.getDate());
    const weekday = new Intl.DateTimeFormat('es', { weekday: 'short' }).format(day.date).replace('.', '');
    return `${monthRow}<tr class="${day.weekend ? 'weekend' : ''} ${isToday ? 'today-row' : ''}"><th scope="row" class="date-cell"><span>${String(day.date.getDate()).padStart(2, '0')}</span><small>${weekday}</small>${isToday ? '<i title="Hoy"></i>' : ''}</th>${sorted.map(person => {
      const assignment = getAssignment(data, person.id, day.key);
      const event = eventFor(data, assignment);
      const label = `${person.name}, ${labelDate(day.date)}: ${event?.name ?? 'Sin evento'}${event?.requiresHours ? `, ${assignment.hours} horas` : ''}, permanencia ${assignment.permanence === 'NONE' ? 'ninguna' : assignment.permanence.toLowerCase()}`;
      return `<td><button class="planning-cell ${assignment.permanence.toLowerCase()}" data-cell="${escape(person.id)}" data-date="${day.key}" aria-label="${escape(label)}">${eventPill(event, assignment.hours)}${permanenceMark(assignment.permanence)}</button></td>`;
    }).join('')}<td class="metric office-metric">${day.weekend ? '<span class="muted">—</span>' : metric.present}</td>${groups.map(team => `<td class="metric ${!day.weekend && metric.teams[team.id] < team.minimum ? 'low-coverage' : ''}" title="${day.weekend ? 'Fin de semana' : `${team.name}: ${metric.teams[team.id]} presentes, mínimo ${team.minimum}`}">${day.weekend ? '<span class="muted">—</span>' : metric.teams[team.id]}</td>`).join('')}<td class="metric displaced-metric">${metric.displaced || '<span class="muted">—</span>'}</td></tr>`;
  }).join('');
}

function openCell(personId, date) {
  state.cell = { personId, date };
  const person = data.people.find(item => item.id === personId);
  const assignment = getAssignment(data, personId, date);
  $('cellTitle').textContent = person.name;
  $('cellDate').textContent = labelDate(new Date(`${date}T12:00:00`));
  $('cellEvent').innerHTML = '<option value="">En oficina · sin evento</option>' + data.events.map(event => `<option value="${escape(event.id)}">${escape(event.code)} · ${escape(event.name)}</option>`).join('');
  $('cellEvent').value = assignment.eventId;
  $('cellForm').elements.permanence.value = assignment.permanence;
  $('cellHours').value = assignment.hours || eventFor(data, assignment)?.defaultHours || 2;
  $('cellError').textContent = '';
  updateHoursField();
  $('cellDialog').showModal();
}

function updateHoursField(useDefault = false) {
  const event = data.events.find(item => item.id === $('cellEvent').value);
  $('cellHoursField').hidden = !event?.requiresHours;
  $('cellHours').disabled = !event?.requiresHours;
  $('cellHours').required = Boolean(event?.requiresHours);
  if (useDefault && event?.requiresHours) $('cellHours').value = event.defaultHours;
}

function openPerson(personId) {
  const person = data.people.find(item => item.id === personId);
  const days = periodDays();
  const summary = personSummary(data, person, days);
  const balance = hoursBalance(data, person, state.year);
  $('personTitle').textContent = person.name;
  $('personTeam').textContent = `${teamOf(person).name} · ${person.weeklyHours} h/semana · ${periodLabel()}`;
  const rows = days.flatMap(day => {
    const assignment = getAssignment(data, personId, day.key);
    const event = eventFor(data, assignment);
    return event || assignment.permanence !== 'NONE' ? [`<tr><td>${escape(labelDate(day.date))}</td><td>${eventPill(event, assignment.hours)}</td><td>${assignment.permanence === 'NONE' ? '—' : assignment.permanence.toLowerCase()}</td></tr>`] : [];
  });
  $('personBody').innerHTML = `<div class="person-summary"><div><strong>${summary.present}</strong><span>Días en oficina</span></div><div><strong>${summary.events}</strong><span>Días con evento</span></div><div><strong>${summary.online} / ${summary.offline}</strong><span>Online / offline</span></div></div><div class="balance-card"><div><span>Saldo de recuperación · ${state.year}</span><strong class="${balance.remaining < 0 ? 'negative-text' : ''}">${number(balance.remaining)} h</strong></div><p>Base anual: ${number(balance.base)} h · Asignadas: ${number(balance.consumed)} h</p>${balance.remaining < 0 ? '<p class="negative-text">Las horas asignadas superan el saldo disponible.</p>' : ''}</div><h3>Detalle de ${escape(periodLabel())}</h3>${rows.length ? `<div class="detail-scroll"><table class="detail-table"><thead><tr><th>Fecha</th><th>Estado</th><th>Permanencia</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '<p class="muted">No hay eventos ni permanencias en este periodo.</p>'}<p class="field-help">La presencia se calcula en días laborables (lunes a viernes). No se incluye un calendario de festivos.</p>`;
  $('personDialog').showModal();
}

function openAdmin(tab = 'people') {
  state.adminTab = tab;
  renderAdmin();
  $('adminDialog').showModal();
}

function renderAdmin() {
  const tab = state.adminTab;
  document.querySelectorAll('[data-admin-tab]').forEach(button => {
    button.setAttribute('aria-selected', String(button.dataset.adminTab === tab));
  });
  $('adminContent').setAttribute('aria-labelledby', `tab-${tab}`);
  const titles = { people: ['Personas', 'Añadir persona'], teams: ['Equipos', 'Añadir equipo'], events: ['Estados del día', 'Añadir estado'] };
  $('adminContent').innerHTML = `<div class="admin-section-heading"><h3>${titles[tab][0]} <span class="count-badge">${data[tab].length}</span></h3><button class="button primary small-button" data-new="${tab}">+ ${titles[tab][1]}</button></div><div class="entity-list">${data[tab].map(item => {
    let subtitle;
    let visual;
    if (tab === 'people') {
      subtitle = `${teamOf(item).name} · ${item.weeklyHours} h/semana · Base ${number(item.baseHours)} h`;
      visual = `<span class="entity-avatar" style="--team-color:${teamOf(item).color}">${escape(initials(item.name))}</span>`;
    } else {
      subtitle = tab === 'teams' ? `${data.people.filter(person => person.teamId === item.id).length} personas · mínimo ${item.minimum} en oficina` : `${item.inOffice ? 'Cuenta en oficina' : 'Fuera de oficina'}${item.displaced ? ' · Desplazamiento' : ''}${item.requiresHours ? ` · ${number(item.defaultHours)} h por defecto` : ''}`;
      visual = `<span class="entity-color" style="background:${item.color}">${escape(tab === 'events' ? item.code : initials(item.name))}</span>`;
    }
    return `<div class="entity-row">${visual}<div><strong>${escape(item.name)}</strong><small>${escape(subtitle)}</small></div><button class="button secondary small-button" data-edit="${escape(item.id)}" data-collection="${tab}" aria-label="Editar ${escape(item.name)}">Editar</button></div>`;
  }).join('')}</div><p class="field-help">Configuración de demostración: no existen roles ni autenticación. No utilices datos reales.</p>`;
}

function textField(label, name, value = '', attributes = '') {
  return `<label class="field">${label}<input name="${name}" value="${escape(value)}" ${attributes}></label>`;
}

function checkbox(label, name, value) {
  return `<label class="checkbox-field"><input type="checkbox" name="${name}" ${value ? 'checked' : ''}>${label}</label>`;
}

function openEntity(collection, id = null) {
  const entity = id ? data[collection].find(item => item.id === id) : {};
  state.entity = { collection, id };
  $('entityTitle').textContent = `${id ? 'Editar' : 'Añadir'} ${ { people: 'persona ficticia', teams: 'equipo', events: 'estado' }[collection]}`;
  let fields = textField('Nombre', 'name', entity.name, 'required maxlength="80" autocomplete="off"');
  if (collection === 'people') {
    fields += `<label class="field">Equipo<select name="teamId">${data.teams.map(team => `<option value="${escape(team.id)}" ${entity.teamId === team.id ? 'selected' : ''}>${escape(team.name)}</option>`).join('')}</select></label>`;
    fields += `<div class="field-grid">${textField('Jornada semanal (h)', 'weeklyHours', entity.weeklyHours ?? 40, 'type="number" min="1" max="60" step="0.5" required')}${textField('Saldo base anual (h)', 'baseHours', entity.baseHours ?? 8, 'type="number" min="0" max="1000" step="0.25" required')}</div><p class="field-help">El saldo base se aplica a cada año en este prototipo. No se convierte la jornada en horas de ausencia.</p>`;
  } else {
    if (collection === 'events') fields += textField('Código', 'code', entity.code, 'required maxlength="5" pattern="[A-Za-z0-9]{1,5}"');
    fields += textField('Color', 'color', entity.color ?? '#6383bb', 'type="color" required');
    if (collection === 'teams') fields += textField('Mínimo de personas en oficina', 'minimum', entity.minimum ?? 1, 'type="number" min="0" max="100" step="1" required');
    else fields += checkbox('Cuenta como presencia en oficina', 'inOffice', entity.inOffice) + checkbox('Es un desplazamiento', 'displaced', entity.displaced) + checkbox('Descuenta horas de recuperación', 'requiresHours', entity.requiresHours) + textField('Horas por defecto', 'defaultHours', entity.defaultHours || 2, 'type="number" min="0.25" max="24" step="0.25" required');
  }
  $('entityFields').innerHTML = fields;
  $('entityError').textContent = '';
  $('entityDialog').showModal();
}

function openLegend() {
  $('legendContent').innerHTML = '<p class="muted">Una celda puede combinar un estado y una permanencia. Sin estado, cuenta como presencia de lunes a viernes.</p>' + data.events.map(event => `<div class="legend-row">${eventPill(event, event.defaultHours)}<div><strong>${escape(event.name)}</strong><p>${event.inOffice ? 'Cuenta como presencia en oficina.' : 'No cuenta como presencia en oficina.'}${event.displaced ? ' Suma a desplazamientos.' : ''}${event.requiresHours ? ' Descuenta las horas indicadas del saldo anual.' : ''}</p></div></div>`).join('') + '<div class="legend-row"><span class="legend-perma online">Online</span><p>Borde azul: permanencia online.</p></div><div class="legend-row"><span class="legend-perma offline">Offline</span><p>Borde ámbar: permanencia offline.</p></div><div class="legend-callout"><strong>Cómo leemos el cuadrante</strong><p>Los mínimos y la presencia ignoran fines de semana, pero no festivos. Los indicadores siguen los filtros activos. Las horas restantes son anuales y pueden ser negativas. No hay guardado compartido ni conexión con la aplicación original.</p></div>';
  $('legendDialog').showModal();
}

function navigatePeriod(direction) {
  if (state.view === 'year') state.year += direction;
  else {
    const next = new Date(state.year, state.month + direction, 1);
    state.year = next.getFullYear();
    state.month = next.getMonth();
  }
  render();
  $('matrixScroll').scrollTop = 0;
}

function bindEvents() {
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-close')) button.closest('dialog').close();
    else if (button.dataset.cell) openCell(button.dataset.cell, button.dataset.date);
    else if (button.dataset.person) openPerson(button.dataset.person);
    else if (button.dataset.team) { state.team = button.dataset.team; render(); }
    else if (button.dataset.adminTab) { state.adminTab = button.dataset.adminTab; renderAdmin(); }
    else if (button.dataset.new) openEntity(button.dataset.new);
    else if (button.dataset.edit) openEntity(button.dataset.collection, button.dataset.edit);
  });
  $('adminButton').addEventListener('click', () => openAdmin());
  $('peopleNav').addEventListener('click', () => openAdmin());
  $('planningNav').addEventListener('click', () => $('planningTable').scrollIntoView({ block: 'center', behavior: 'smooth' }));
  $('legendNav').addEventListener('click', openLegend);
  $('legendButton').addEventListener('click', openLegend);
  $('prevPeriod').addEventListener('click', () => navigatePeriod(-1));
  $('nextPeriod').addEventListener('click', () => navigatePeriod(1));
  $('monthView').addEventListener('click', () => { state.view = 'month'; render(); });
  $('yearView').addEventListener('click', () => { state.view = 'year'; render(); });
  $('yearSelect').addEventListener('change', event => { state.year = Number(event.target.value); render(); });
  $('monthSelect').addEventListener('change', event => { state.month = Number(event.target.value); render(); $('matrixScroll').scrollTop = 0; });
  $('todayButton').addEventListener('click', () => {
    state.year = today.getFullYear(); state.month = today.getMonth(); state.view = 'month'; render();
    $('matrixBody').querySelector('.today-row')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  $('searchInput').addEventListener('input', event => { state.search = event.target.value; render(); });
  $('cellEvent').addEventListener('change', () => updateHoursField(true));
  $('cellForm').addEventListener('submit', event => {
    event.preventDefault();
    $('cellError').textContent = '';
    action(async () => {
      const { personId, date } = state.cell;
      const assignment = { eventId: $('cellEvent').value, permanence: $('cellForm').elements.permanence.value, hours: Number($('cellHours').value) };
      await commit(draft => setAssignment(draft, personId, date, assignment));
      $('cellDialog').close();
    }, 'cellError');
  });
  $('clearCell').addEventListener('click', () => action(async () => {
    const { personId, date } = state.cell;
    await commit(draft => setAssignment(draft, personId, date, { eventId: '', permanence: 'NONE', hours: 0 }));
    $('cellDialog').close();
  }, 'cellError'));
  $('entityForm').addEventListener('submit', event => {
    event.preventDefault();
    $('entityError').textContent = '';
    action(async () => {
      const { collection, id } = state.entity;
      const form = new FormData($('entityForm'));
      const entity = { id: id ?? crypto.randomUUID(), name: form.get('name').trim() };
      if (collection === 'people') Object.assign(entity, { teamId: form.get('teamId'), weeklyHours: Number(form.get('weeklyHours')), baseHours: Number(form.get('baseHours')) });
      else {
        entity.color = form.get('color');
        if (collection === 'teams') entity.minimum = Number(form.get('minimum'));
        else Object.assign(entity, { code: form.get('code').trim().toUpperCase(), inOffice: form.has('inOffice'), displaced: form.has('displaced'), requiresHours: form.has('requiresHours'), defaultHours: form.has('requiresHours') ? Number(form.get('defaultHours')) : 0 });
      }
      await commit(draft => {
        upsertEntity(draft, collection, entity);
        if (collection === 'events') {
          for (const assignment of Object.values(draft.assignments)) {
            if (assignment.eventId === entity.id) assignment.hours = entity.requiresHours ? (assignment.hours || entity.defaultHours) : 0;
          }
        }
      });
      renderAdmin();
      $('entityDialog').close();
    }, 'entityError');
  });
  $('resetDemo').addEventListener('click', () => {
    if (!confirm('¿Restablecer los datos ficticios? Se perderán todos los cambios guardados por esta demo en este navegador.')) return;
    action(async () => {
      data = await repository.reset();
      state.team = 'all'; state.search = ''; $('searchInput').value = '';
      render(); renderAdmin();
      $('saveStatus').textContent = 'Demo restablecida y guardada';
    });
  });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) {
      $('saveStatus').textContent = 'Datos cambiados en otra pestaña. Recarga antes de editar.';
      showError(new Error('Otra pestaña ha cambiado la demo. Recarga esta página para ver sus cambios.'));
    }
  });
}

try {
  repository = new LocalRepository(window.localStorage, today.getFullYear());
  data = await repository.load();
  render();
  bindEvents();
} catch (error) {
  console.error(error);
  $('stats').innerHTML = `<div class="error-banner"><h2>No se ha podido abrir la demo</h2><p>${escape(error.message)}</p><p>Comprueba que el almacenamiento del navegador esté disponible. Si los datos locales están dañados, puedes borrarlos con el botón siguiente; no se eliminarán automáticamente.</p><button class="button secondary" id="recoverData">Borrar datos locales de esta demo y recargar</button></div>`;
  $('saveStatus').textContent = 'Error de carga: la planificación no está disponible';
  document.querySelectorAll('button, select, input').forEach(element => { element.disabled = element.id !== 'recoverData'; });
  $('recoverData').addEventListener('click', () => {
    if (!confirm('¿Borrar los datos locales de OnePlanning? Esta acción elimina los cambios de esta demo guardados en este navegador.')) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      location.reload();
    } catch (recoveryError) { showError(recoveryError); }
  });
}
