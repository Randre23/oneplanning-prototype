import { validateData } from './model.js';
import { createDemoData } from './demo-data.js';

export const STORAGE_KEY = 'oneplanning.prototype.v1';

export class LocalRepository {
  constructor(storage, year) {
    this.storage = storage;
    this.year = year;
    this.lastSerialized = undefined;
  }

  async load() {
    const raw = this.storage.getItem(STORAGE_KEY);
    this.lastSerialized = raw;
    if (raw === null) return createDemoData(this.year);
    try {
      return validateData(JSON.parse(raw));
    } catch (error) {
      throw new Error(`No se puede cargar la demo: ${error.message}`);
    }
  }

  async save(data) {
    validateData(data);
    if (this.storage.getItem(STORAGE_KEY) !== this.lastSerialized) {
      throw new Error('Otra pestaña ha cambiado los datos. Recarga esta página antes de guardar para no sobrescribirlos.');
    }
    const serialized = JSON.stringify(data);
    this.storage.setItem(STORAGE_KEY, serialized);
    this.lastSerialized = serialized;
  }

  async reset() {
    const fresh = createDemoData(this.year);
    await this.save(fresh);
    return fresh;
  }
}
