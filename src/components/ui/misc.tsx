"use client";

import { useId, type ReactNode } from "react";
import { AREA_COLORS, AREA_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { GoalDisplayStatus } from "@/lib/metrics";
import type { Area, Priority } from "@/lib/types";
import { CheckIcon } from "./icons";

export function ProgressBar({
  value,
  label,
  size = "md",
  tone = "accent",
  marker,
}: {
  value: number;
  label: string;
  size?: "sm" | "md" | "lg";
  tone?: "accent" | "good" | "ink";
  /** Posição (0–100) de um marcador de referência, como o ritmo esperado. */
  marker?: number;
}) {
  const heights = { sm: "h-1.5", md: "h-2", lg: "h-3" };
  const tones = { accent: "bg-accent", good: "bg-good", ink: "bg-ink" };
  const v = Math.min(Math.max(value, 0), 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={`relative w-full overflow-hidden rounded-full bg-[#ebeae6] ${heights[size]}`}
    >
      <div className={`h-full rounded-full ${tones[tone]} transition-[width] duration-500`} style={{ width: `${v}%` }} />
      {marker !== undefined && (
        <div
          className="absolute top-0 h-full w-0.5 bg-ink/50"
          style={{ left: `calc(${Math.min(Math.max(marker, 0), 100)}% - 1px)` }}
          aria-hidden
        />
      )}
    </div>
  );
}

type BadgeTone = "neutral" | "accent" | "good" | "warning" | "critical" | "dark";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-subtle text-ink-2 border-line",
  accent: "bg-accent-soft text-accent-strong border-transparent",
  good: "bg-good-soft text-good-ink border-transparent",
  warning: "bg-warning-soft text-warning-ink border-transparent",
  critical: "bg-critical-soft text-critical-ink border-transparent",
  dark: "bg-ink text-white border-transparent",
};

export function Badge({ tone = "neutral", children, icon }: { tone?: BadgeTone; children: ReactNode; icon?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium ${badgeTones[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function AreaBadge({ area }: { area: Area }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-ink-2">
      <span className="h-2 w-2 rounded-full" style={{ background: AREA_COLORS[area] }} aria-hidden />
      {AREA_LABELS[area]}
    </span>
  );
}

const statusTone: Record<GoalDisplayStatus, BadgeTone> = {
  nao_iniciada: "neutral",
  em_andamento: "accent",
  concluida: "good",
  pausada: "warning",
  atrasada: "critical",
};

export function StatusBadge({ status }: { status: GoalDisplayStatus }) {
  const label = status === "atrasada" ? "Atrasada" : STATUS_LABELS[status];
  return (
    <Badge tone={statusTone[status]} icon={status === "concluida" ? <CheckIcon size={12} /> : undefined}>
      {label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const dots = { alta: 3, media: 2, baixa: 1 }[priority];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-2" title={`Prioridade ${PRIORITY_LABELS[priority].toLowerCase()}`}>
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-2.5 w-1 rounded-full ${i < dots ? "bg-ink-2" : "bg-line-strong"}`} />
        ))}
      </span>
      <span>{PRIORITY_LABELS[priority]}</span>
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  compact,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-subtle text-center ${
        compact ? "px-4 py-6" : "px-6 py-10"
      }`}
    >
      {icon && <div className="mb-3 text-ink-3">{icon}</div>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-subtle p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <label
            key={o.value}
            className={`relative inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
              active ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={active}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
            {o.count !== undefined && <span className="tabular text-xs text-ink-3">{o.count}</span>}
          </label>
        );
      })}
    </div>
  );
}

export function StatTile({
  label,
  value,
  detail,
  icon,
  children,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {icon}
        {label}
      </p>
      <p className="tabular mt-2 truncate text-[21px] font-semibold leading-tight tracking-tight text-ink sm:text-[26px]" title={typeof value === "string" ? value : undefined}>
        {value}
      </p>
      {detail && <div className="mt-1 text-[13px] text-ink-2">{detail}</div>}
      {children}
    </div>
  );
}

/** Tabela alternativa e acessível para os dados de um gráfico. */
export function ChartDataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3 text-[13px]">
      <summary className="cursor-pointer select-none text-ink-3 hover:text-ink">Ver dados em tabela</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="tabular w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line text-ink-3">
              {headers.map((h) => (
                <th key={h} scope="col" className="py-1.5 pr-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line/60 last:border-0">
                {r.map((c, j) => (
                  <td key={j} className="py-1.5 pr-4 text-ink-2">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
