const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Formata centavos como "R$ 1.250,00". */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, " ");
}

/** Versão curta para eixos de gráfico: "R$ 8,5 mil". */
export function formatBRLCompact(cents: number): string {
  const value = cents / 100;
  if (Math.abs(value) >= 1000) {
    return `R$ ${number.format(Math.round(value / 100) / 10)} mil`;
  }
  return `R$ ${number.format(Math.round(value))}`;
}

/** 1500 s → "25 min"; 5400 s → "1h 30min". */
export function formatDuration(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

/** Segundos → "mm:ss" (ou "h:mm:ss"). */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`;
}

export function formatNumber(value: number): string {
  return number.format(value);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Converte "1.250,50", "1250.50" ou "1250" para centavos. Retorna null se inválido. */
export function parseMoney(input: string): number | null {
  let s = input.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "9.000" ou "1.250.000": pontos como separador de milhar (padrão brasileiro).
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Centavos para texto editável: 125050 → "1250,50". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function decimalToInput(value: number | null): string {
  return value === null ? "" : String(value).replace(".", ",");
}
