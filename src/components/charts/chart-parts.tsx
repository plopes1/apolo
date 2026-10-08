import type { ReactNode } from "react";

export const CHART_COLORS = {
  series1: "#2a78d6",
  series2: "#eb6834",
  series3: "#1baf7a",
  grid: "#ebeae6",
  axis: "#6b6a66",
  reference: "#8f8e89",
};

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.dashed ? (
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} aria-hidden />
          ) : (
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} aria-hidden />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function TooltipBox({ title, rows }: { title: ReactNode; rows: { label: string; value: string; color?: string; dashed?: boolean }[] }) {
  return (
    <div className="min-w-[160px] rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-ink">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-2">
              {r.color &&
                (r.dashed ? (
                  <span className="w-3 border-t-2 border-dashed" style={{ borderColor: r.color }} aria-hidden />
                ) : (
                  <span className="h-2 w-2 rounded-[2px]" style={{ background: r.color }} aria-hidden />
                ))}
              {r.label}
            </span>
            <span className="tabular font-medium text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
