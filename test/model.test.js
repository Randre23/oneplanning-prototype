import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoData } from '../src/demo-data.js';
import { dateKey, datesInPeriod, dailyMetrics, hoursBalance, personSummary, setAssignment, getAssignment, upsertEntity, validateData } from '../src/model.js';
import { LocalRepository, STORAGE_KEY } from '../src/repository.js';

function fixture() {
  const data = createDemoData(2026);
  data.assignments = {};
  return data;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
}

test('calendar produces actual weekdays, leap days and year-qualified keys', () => {
  assert.equal(datesInPeriod(2026).length, 365);
  assert.equal(datesInPeriod(2028).length, 366);
  assert.equal(datesInPeriod(2028, 1).at(-1).key, '2028-02-29');
  assert.equal(datesInPeriod(2026, 8)[0].date.getDay(), 2);
  assert.equal(datesInPeriod(2026, 10)[0].weekend, true);
  assert.equal(dateKey(2026, 0, 1), '2026-01-01');
});

test('presence follows explicit event attributes, not code letters or fixed deductions', () => {
  const data = fixture();
  const day = datesInPeriod(2026, 10).find(item => !item.weekend);
  setAssignment(data, 'demo-1', day.key, { eventId: 'remote', permanence: 'ONLINE', hours: 0 });
  setAssignment(data, 'demo-2', day.key, { eventId: 'training', permanence: 'NONE', hours: 0 });
  upsertEntity(data, 'events', { ...data.events.find(event => event.id === 'training'), code: 'DIA' });
  const metric = dailyMetrics(data, data.people, day);
  assert.equal(metric.present, 11);
  assert.equal(metric.teams.product, 3);
  assert.equal(metric.online, 1);
  assert.equal(metric.displaced, 0);
  setAssignment(data, 'demo-3', day.key, { eventId: 'travel', permanence: 'OFFLINE', hours: 0 });
  assert.equal(dailyMetrics(data, data.people, day).displaced, 1);
  assert.equal(dailyMetrics(data, data.people.slice(0, 4), day).present, 2);
  const weekend = datesInPeriod(2026, 10).find(item => item.weekend);
  assert.equal(dailyMetrics(data, data.people, weekend).present, 0);
});

test('event and permanence coexist and clearing is atomic within one assignment', () => {
  const data = fixture();
  const date = '2026-11-02';
  setAssignment(data, 'demo-1', date, { eventId: 'recovery', permanence: 'ONLINE', hours: 1.25 });
  assert.deepEqual(getAssignment(data, 'demo-1', date), { eventId: 'recovery', permanence: 'ONLINE', hours: 1.25 });
  setAssignment(data, 'demo-1', date, { eventId: '', permanence: 'ONLINE', hours: 1.25 });
  assert.deepEqual(getAssignment(data, 'demo-1', date), { eventId: '', permanence: 'ONLINE', hours: 0 });
  setAssignment(data, 'demo-1', date, { eventId: '', permanence: 'NONE', hours: 0 });
  assert.equal(Object.keys(data.assignments).length, 0);
});

test('recovery balance is annual, preserves fractions and exposes over-allocation', () => {
  const data = fixture();
  const person = data.people[0];
  person.baseHours = 2;
  setAssignment(data, person.id, '2026-01-02', { eventId: 'recovery', permanence: 'NONE', hours: 1.25 });
  setAssignment(data, person.id, '2026-12-01', { eventId: 'recovery', permanence: 'NONE', hours: 2 });
  setAssignment(data, person.id, '2027-01-01', { eventId: 'recovery', permanence: 'NONE', hours: 8 });
  assert.deepEqual(hoursBalance(data, person, 2026), { base: 2, consumed: 3.25, remaining: -1.25 });
  assert.equal(hoursBalance(data, person, 2027).consumed, 8);
});

test('individual annual summary covers every month and excludes weekends from presence', () => {
  const data = fixture();
  const person = data.people[0];
  setAssignment(data, person.id, '2026-01-02', { eventId: 'holiday', permanence: 'ONLINE', hours: 0 });
  setAssignment(data, person.id, '2026-12-01', { eventId: 'holiday', permanence: 'OFFLINE', hours: 0 });
  const days = datesInPeriod(2026);
  const summary = personSummary(data, person, days);
  assert.equal(summary.events, 2);
  assert.equal(summary.online, 1);
  assert.equal(summary.offline, 1);
  assert.equal(summary.present, days.filter(day => !day.weekend).length - 2);
});

test('invalid assignments are rejected without changing stored assignments', () => {
  const data = fixture();
  const valid = { eventId: 'recovery', permanence: 'NONE', hours: 1 };
  for (const hours of [0, -1, 25, 0.1, NaN, Infinity]) {
    assert.throws(() => setAssignment(data, 'demo-1', '2026-11-02', { ...valid, hours }));
  }
  assert.throws(() => setAssignment(data, 'demo-1', '2026-02-30', valid), /fecha/);
  assert.throws(() => setAssignment(data, 'unknown', '2026-11-02', valid), /persona/);
  assert.throws(() => setAssignment(data, 'demo-1', '2026-11-02', { ...valid, eventId: 'missing' }), /estado/);
  assert.throws(() => setAssignment(data, 'demo-1', '2026-11-02', { ...valid, permanence: 'OTHER' }), /Permanencia/);
  assert.deepEqual(data.assignments, {});
});

test('configuration prevents invalid team references, duplicated codes and invalid thresholds', () => {
  const data = fixture();
  assert.throws(() => upsertEntity(data, 'people', { ...data.people[0], teamId: 'missing' }), /equipo/);
  assert.throws(() => upsertEntity(data, 'events', { ...data.events[0], id: 'new' }), /código/);
  assert.throws(() => upsertEntity(data, 'teams', { ...data.teams[0], minimum: 1.5 }), /entero/);
  assert.throws(() => upsertEntity(data, 'events', { ...data.events[0], color: 'javascript:bad' }), /color/);
  assert.throws(() => upsertEntity(data, 'people', { ...data.people[0], baseHours: -1 }), /Saldo/);
  upsertEntity(data, 'teams', { id: 'new-team', name: 'Otro equipo', minimum: 0, color: '#123456' });
  upsertEntity(data, 'people', { ...data.people[0], teamId: 'new-team' });
  assert.equal(data.people[0].teamId, 'new-team');
});

test('repository persists reloads and resets only the demo key', async () => {
  const storage = memoryStorage();
  storage.setItem('unrelated-app', 'untouched');
  const repo = new LocalRepository(storage, 2026);
  const data = await repo.load();
  data.people[0].name = 'Persona de prueba';
  await repo.save(data);
  const loaded = await new LocalRepository(storage, 2026).load();
  assert.equal(loaded.people[0].name, 'Persona de prueba');
  const fresh = await repo.reset();
  assert.equal(fresh.people[0].name, 'Alex Demo');
  assert.equal(storage.getItem('unrelated-app'), 'untouched');
});

test('repository rejects corrupted data and does not overwrite it', async () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, '{bad');
  await assert.rejects(new LocalRepository(storage, 2026).load(), /cargar/);
  assert.equal(storage.getItem(STORAGE_KEY), '{bad');
  const data = fixture();
  data.people[0].teamId = 'nonexistent';
  assert.throws(() => validateData(data), /equipo/);
});

test('repository detects cross-tab edits and preserves the other writer', async () => {
  const storage = memoryStorage();
  const first = new LocalRepository(storage, 2026);
  const second = new LocalRepository(storage, 2026);
  const firstData = await first.load();
  const secondData = await second.load();
  firstData.people[0].name = 'Primera pestaña';
  await first.save(firstData);
  secondData.people[0].name = 'Segunda pestaña';
  await assert.rejects(second.save(secondData), /Otra pestaña/);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).people[0].name, 'Primera pestaña');
});

test('storage quota failures propagate rather than reporting a successful save', async () => {
  const storage = memoryStorage();
  const repo = new LocalRepository(storage, 2026);
  const data = await repo.load();
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  await assert.rejects(repo.save(data), /QuotaExceededError/);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});
