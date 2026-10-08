import { validateAppData } from "./backup";
import type { AppData } from "./types";

/**
 * Camada de persistência. Nesta versão os dados ficam no localStorage;
 * para adicionar autenticação e banco de dados, basta criar outra implementação
 * desta interface (por exemplo, chamando uma API) e trocá-la em `repository`.
 */
export interface DataRepository {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

export const STORAGE_KEY = "apolo:data";
const CORRUPTED_KEY = "apolo:data-corrompido";

export class LocalStorageRepository implements DataRepository {
  constructor(private readonly key = STORAGE_KEY) {}

  async load(): Promise<AppData | null> {
    const raw = window.localStorage.getItem(this.key);
    if (!raw) return null;
    try {
      const result = validateAppData(JSON.parse(raw));
      if (result.ok) return result.data;
      throw new Error(result.error);
    } catch {
      // Guarda a cópia ilegível para não perdê-la ao recriar os dados.
      window.localStorage.setItem(CORRUPTED_KEY, raw);
      return null;
    }
  }

  async save(data: AppData): Promise<void> {
    window.localStorage.setItem(this.key, JSON.stringify(data));
  }

  async clear(): Promise<void> {
    window.localStorage.removeItem(this.key);
  }
}

export const repository: DataRepository = new LocalStorageRepository();
