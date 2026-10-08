import { isISODate, todayISO } from "./dates";
import { AREAS, PRIORITIES, STATUSES } from "./labels";
import { DATA_VERSION, type AppData } from "./types";

export const BACKUP_APP_ID = "apolo";
/** Identificador usado antes da mudança de nome; backups antigos continuam aceitos. */
const LEGACY_APP_IDS = ["90-dias"];

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  data: AppData;
}

export function createBackup(data: AppData): BackupFile {
  return { app: BACKUP_APP_ID, version: DATA_VERSION, exportedAt: new Date().toISOString(), data };
}

export function downloadBackup(data: AppData) {
  const blob = new Blob([JSON.stringify(createBackup(data), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `apolo-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ValidationResult = { ok: true; data: AppData } | { ok: false; error: string };

/** Lê o texto de um arquivo de backup (aceita o envelope de exportação ou os dados puros). */
export function parseBackup(text: string): ValidationResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "O arquivo não é um JSON válido." };
  }
  if (isObject(json) && "app" in json) {
    if (json.app !== BACKUP_APP_ID && !LEGACY_APP_IDS.includes(json.app as string)) {
      return { ok: false, error: "Este arquivo não é um backup do Apolo." };
    }
    if (typeof json.version !== "number" || json.version > DATA_VERSION) {
      return { ok: false, error: "A versão deste backup não é compatível com esta versão do app." };
    }
    return validateAppData(json.data);
  }
  return validateAppData(json);
}

// ---------- Validação estrutural ----------

type Obj = Record<string, unknown>;

function isObject(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

class InvalidData extends Error {}

function fail(path: string, expected: string): never {
  throw new InvalidData(`Campo inválido em "${path}": esperado ${expected}.`);
}

const str = (o: Obj, k: string, p: string) => (typeof o[k] === "string" ? (o[k] as string) : fail(`${p}.${k}`, "texto"));
const optStr = (o: Obj, k: string, p: string) =>
  o[k] === null || o[k] === undefined ? null : typeof o[k] === "string" ? (o[k] as string) : fail(`${p}.${k}`, "texto ou vazio");
const bool = (o: Obj, k: string, p: string) => (typeof o[k] === "boolean" ? (o[k] as boolean) : fail(`${p}.${k}`, "verdadeiro/falso"));
const num = (o: Obj, k: string, p: string) =>
  typeof o[k] === "number" && Number.isFinite(o[k]) ? (o[k] as number) : fail(`${p}.${k}`, "número");
const optNum = (o: Obj, k: string, p: string) =>
  o[k] === null || o[k] === undefined ? null : num(o, k, p);
const date = (o: Obj, k: string, p: string) => (isISODate(o[k]) ? (o[k] as string) : fail(`${p}.${k}`, "data AAAA-MM-DD"));
const optDate = (o: Obj, k: string, p: string) => (o[k] === null || o[k] === undefined ? null : date(o, k, p));
function oneOf<T extends string>(o: Obj, k: string, p: string, options: readonly T[]): T {
  return options.includes(o[k] as T) ? (o[k] as T) : fail(`${p}.${k}`, options.join(" | "));
}
function arr<T>(o: Obj, k: string, p: string, item: (v: Obj, path: string) => T): T[] {
  const value = o[k];
  if (!Array.isArray(value)) fail(`${p}.${k}`, "lista");
  return value.map((v, i) => {
    const path = `${p}.${k}[${i}]`;
    if (!isObject(v)) fail(path, "objeto");
    return item(v, path);
  });
}
function strArr(o: Obj, k: string, p: string): string[] {
  const value = o[k];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) fail(`${p}.${k}`, "lista de textos");
  return value as string[];
}

/** Inteiro de configuração com valor padrão quando ausente (dados antigos). */
function intIn(o: Obj, k: string, fallback: number, min: number, max: number): number {
  if (o[k] === undefined) return fallback;
  const n = num(o, k, "settings");
  if (!Number.isInteger(n) || n < min || n > max) fail(`settings.${k}`, `número inteiro de ${min} a ${max}`);
  return n;
}

const question = (q: Obj, p: string) => ({ id: str(q, "id", p), text: str(q, "text", p) });

export function validateAppData(input: unknown): ValidationResult {
  try {
    if (!isObject(input)) fail("dados", "objeto");
    const p = "dados";
    if (input.version !== DATA_VERSION) fail(`${p}.version`, `versão ${DATA_VERSION}`);
    const s = isObject(input.settings) ? input.settings : fail(`${p}.settings`, "objeto");
    const data: AppData = {
      version: DATA_VERSION,
      activeCycleId: optStr(input, "activeCycleId", p),
      updatedAt: str(input, "updatedAt", p),
      cycles: arr(input, "cycles", p, (c, cp) => ({
        id: str(c, "id", cp),
        name: str(c, "name", cp),
        startDate: date(c, "startDate", cp),
        endDate: date(c, "endDate", cp),
        focusAreas: strArr(c, "focusAreas", cp).map((a) => (AREAS.includes(a as never) ? (a as AppData["goals"][number]["area"]) : fail(`${cp}.focusAreas`, "área válida"))),
        createdAt: str(c, "createdAt", cp),
      })),
      goals: arr(input, "goals", p, (g, gp) => ({
        id: str(g, "id", gp),
        cycleId: str(g, "cycleId", gp),
        title: str(g, "title", gp),
        description: str(g, "description", gp),
        why: str(g, "why", gp),
        area: oneOf(g, "area", gp, AREAS),
        startDate: date(g, "startDate", gp),
        dueDate: date(g, "dueDate", gp),
        measurableResult: str(g, "measurableResult", gp),
        currentValue: optNum(g, "currentValue", gp),
        targetValue: optNum(g, "targetValue", gp),
        unit: str(g, "unit", gp),
        priority: oneOf(g, "priority", gp, PRIORITIES),
        status: oneOf(g, "status", gp, STATUSES),
        milestones: arr(g, "milestones", gp, (m, mp) => ({
          id: str(m, "id", mp),
          title: str(m, "title", mp),
          dueDate: optDate(m, "dueDate", mp),
          done: bool(m, "done", mp),
        })),
        createdAt: str(g, "createdAt", gp),
        updatedAt: str(g, "updatedAt", gp),
      })),
      tasks: arr(input, "tasks", p, (t, tp) => ({
        id: str(t, "id", tp),
        title: str(t, "title", tp),
        dueDate: optDate(t, "dueDate", tp),
        priority: oneOf(t, "priority", tp, PRIORITIES),
        category: str(t, "category", tp),
        goalId: optStr(t, "goalId", tp),
        done: bool(t, "done", tp),
        completedAt: optDate(t, "completedAt", tp),
        createdAt: str(t, "createdAt", tp),
      })),
      habits: arr(input, "habits", p, (h, hp) => ({
        id: str(h, "id", hp),
        name: str(h, "name", hp),
        frequency: oneOf(h, "frequency", hp, ["diaria", "dias_especificos", "vezes_por_semana"] as const),
        days: Array.isArray(h.days) && h.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) ? (h.days as number[]) : fail(`${hp}.days`, "dias da semana de 0 a 6"),
        // Opcional para manter compatíveis os backups anteriores a este campo.
        timesPerWeek: (() => {
          const n = optNum(h, "timesPerWeek", hp);
          if (n !== null && (!Number.isInteger(n) || n < 1 || n > 7)) fail(`${hp}.timesPerWeek`, "número inteiro de 1 a 7");
          if (n === null && h.frequency === "vezes_por_semana") fail(`${hp}.timesPerWeek`, "número inteiro de 1 a 7");
          return n;
        })(),
        completions: strArr(h, "completions", hp).map((d) => (isISODate(d) ? d : fail(`${hp}.completions`, "datas AAAA-MM-DD"))),
        createdAt: str(h, "createdAt", hp),
      })),
      transactions: arr(input, "transactions", p, (t, tp) => {
        const amount = num(t, "amount", tp);
        if (amount < 0 || !Number.isInteger(amount)) fail(`${tp}.amount`, "valor em centavos (inteiro positivo)");
        return {
          id: str(t, "id", tp),
          type: oneOf(t, "type", tp, ["receita", "despesa"] as const),
          description: str(t, "description", tp),
          amount,
          category: str(t, "category", tp),
          date: date(t, "date", tp),
          nature: oneOf(t, "nature", tp, ["fixa", "variavel"] as const),
          createdAt: str(t, "createdAt", tp),
        };
      }),
      reviews: arr(input, "reviews", p, (r, rp) => ({
        id: str(r, "id", rp),
        kind: oneOf(r, "kind", rp, ["semanal", "ciclo"] as const),
        cycleId: optStr(r, "cycleId", rp),
        date: date(r, "date", rp),
        createdAt: str(r, "createdAt", rp),
        answers: arr(r, "answers", rp, (a, ap) => ({
          questionId: str(a, "questionId", ap),
          question: str(a, "question", ap),
          answer: str(a, "answer", ap),
        })),
      })),
      weeklyPriorities: arr(input, "weeklyPriorities", p, (w, wp) => ({
        cycleId: str(w, "cycleId", wp),
        weekStart: date(w, "weekStart", wp),
        text: str(w, "text", wp),
        goalId: optStr(w, "goalId", wp),
      })),
      progressHistory: arr(input, "progressHistory", p, (h, hp) => ({
        cycleId: str(h, "cycleId", hp),
        date: date(h, "date", hp),
        progress: num(h, "progress", hp),
      })),
      // Campo adicionado depois da primeira versão: ausente em backups antigos.
      assets:
        input.assets === undefined
          ? []
          : arr(input, "assets", p, (a, ap) => {
              const cents = (o: Obj, k: string, path: string) => {
                const n = num(o, k, path);
                if (!Number.isInteger(n) || n < 0) fail(`${path}.${k}`, "valor em centavos (inteiro positivo)");
                return n;
              };
              return {
                id: str(a, "id", ap),
                name: str(a, "name", ap),
                type: oneOf(a, "type", ap, ["reserva", "conta", "investimento", "previdencia", "bem", "outro"] as const),
                institution: str(a, "institution", ap),
                balance: cents(a, "balance", ap),
                history: arr(a, "history", ap, (h, hp) => ({ date: date(h, "date", hp), balance: cents(h, "balance", hp) })),
                createdAt: str(a, "createdAt", ap),
                updatedAt: str(a, "updatedAt", ap),
              };
            }),
      // Campo adicionado depois da primeira versão: ausente em backups antigos.
      focusSessions:
        input.focusSessions === undefined
          ? []
          : arr(input, "focusSessions", p, (f, fp) => {
              const seconds = num(f, "seconds", fp);
              if (!Number.isInteger(seconds) || seconds < 0) fail(`${fp}.seconds`, "segundos (inteiro positivo)");
              let link: { type: "tarefa" | "habito"; id: string } | null = null;
              if (f.link !== null && f.link !== undefined) {
                if (!isObject(f.link)) fail(`${fp}.link`, "objeto ou vazio");
                link = { type: oneOf(f.link, "type", `${fp}.link`, ["tarefa", "habito"] as const), id: str(f.link, "id", `${fp}.link`) };
              }
              return {
                id: str(f, "id", fp),
                date: date(f, "date", fp),
                startedAt: str(f, "startedAt", fp),
                seconds,
                completed: bool(f, "completed", fp),
                link,
                label: str(f, "label", fp),
                createdAt: str(f, "createdAt", fp),
              };
            }),
      settings: {
        userName: str(s, "userName", "settings"),
        monthlySavingsGoal: num(s, "monthlySavingsGoal", "settings"),
        incomeCategories: strArr(s, "incomeCategories", "settings"),
        expenseCategories: strArr(s, "expenseCategories", "settings"),
        taskCategories: strArr(s, "taskCategories", "settings"),
        weeklyQuestions: arr(s, "weeklyQuestions", "settings", question),
        cycleQuestions: arr(s, "cycleQuestions", "settings", question),
        emergencyMonths: (() => {
          const n = s.emergencyMonths === undefined ? 6 : num(s, "emergencyMonths", "settings");
          if (!Number.isInteger(n) || n < 1 || n > 36) fail("settings.emergencyMonths", "número inteiro de 1 a 36");
          return n;
        })(),
        emergencyTarget: optNum(s, "emergencyTarget", "settings"),
        focusMinutes: intIn(s, "focusMinutes", 25, 1, 180),
        shortBreakMinutes: intIn(s, "shortBreakMinutes", 5, 1, 60),
        longBreakMinutes: intIn(s, "longBreakMinutes", 15, 1, 120),
        longBreakEvery: intIn(s, "longBreakEvery", 4, 1, 12),
        dailyFocusGoal: intIn(s, "dailyFocusGoal", 120, 0, 1440),
        focusSound: s.focusSound === undefined ? true : bool(s, "focusSound", "settings"),
      },
    };
    if (data.activeCycleId && !data.cycles.some((c) => c.id === data.activeCycleId)) {
      fail(`${p}.activeCycleId`, "o id de um ciclo existente");
    }
    return { ok: true, data };
  } catch (e) {
    if (e instanceof InvalidData) return { ok: false, error: e.message };
    return { ok: false, error: "Não foi possível ler os dados do arquivo." };
  }
}
