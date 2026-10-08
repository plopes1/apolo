// Utilitários de data trabalhando com strings ISO locais ("YYYY-MM-DD"),
// sem conversões de fuso horário.

const DAY_MS = 86_400_000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseISODate(value);
  return toISODate(d) === value;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Número de dias de `from` até `to` (positivo se `to` for depois). */
export function diffDays(from: string, to: string): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / DAY_MS);
}

/** Segunda-feira da semana da data. */
export function startOfWeek(iso: string): string {
  const d = parseISODate(iso);
  const offset = (d.getDay() + 6) % 7;
  return addDays(iso, -offset);
}

export function endOfWeek(iso: string): string {
  return addDays(startOfWeek(iso), 6);
}

export function weekday(iso: string): number {
  return parseISODate(iso).getDay();
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function formatDate(iso: string, style: "short" | "medium" | "long" = "medium"): string {
  const d = parseISODate(iso);
  if (style === "short") {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }
  if (style === "long") {
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  }
  return d
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })
    .replace(/\./g, "");
}

export function formatDateRange(start: string, end: string): string {
  const s = parseISODate(start);
  const e = parseISODate(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const startLabel = s
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })
    .replace(/\./g, "");
  return `${startLabel} – ${formatDate(end)}`;
}

export function formatMonth(key: string, style: "short" | "long" = "long"): string {
  const d = parseISODate(`${key}-01`);
  if (style === "short") {
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(/\./g, "");
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAYS_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function relativeDayLabel(iso: string, today: string): string {
  const diff = diffDays(today, iso);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  if (diff < 0) return `Há ${Math.abs(diff)} dias`;
  if (diff < 7) return WEEKDAYS_LONG[weekday(iso)];
  return formatDate(iso, "short");
}
