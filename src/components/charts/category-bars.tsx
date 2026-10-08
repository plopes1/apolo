import { formatBRL } from "@/lib/format";

/** Barras horizontais em HTML para despesas por categoria (rótulo e valor sempre visíveis). */
export function CategoryBars({
  items,
  limit,
  selected,
  onSelect,
  color = "#eb6834",
  format = formatBRL,
}: {
  color?: string;
  /** Formata o valor de cada barra (padrão: reais). */
  format?: (value: number) => string;
  items: { category: string; amount: number }[];
  limit?: number;
  selected?: string;
  onSelect?: (category: string) => void;
}) {
  const total = items.reduce((s, i) => s + i.amount, 0);
  const max = items[0]?.amount ?? 0;
  const shown = limit ? items.slice(0, limit) : items;
  const rest = limit ? items.slice(limit) : [];
  const rows = rest.length
    ? [...shown, { category: `Outras (${rest.length})`, amount: rest.reduce((s, i) => s + i.amount, 0) }]
    : shown;

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((item) => {
        const pct = total ? (item.amount / total) * 100 : 0;
        const active = selected === item.category;
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className={`truncate ${active ? "font-semibold text-ink" : "text-ink-2"}`}>{item.category}</span>
              <span className="tabular shrink-0 text-ink">
                {format(item.amount)} <span className="text-ink-3">· {Math.round(pct)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full rounded-full bg-[#efeeea]">
              <div
                className="h-full rounded-full"
                style={{ width: `${max ? Math.max((item.amount / max) * 100, 2) : 0}%`, background: color, opacity: selected && !active ? 0.45 : 1 }}
              />
            </div>
          </>
        );
        return (
          <li key={item.category}>
            {onSelect && !item.category.startsWith("Outras (") ? (
              <button
                type="button"
                onClick={() => onSelect(item.category)}
                aria-pressed={active}
                className="block w-full rounded-lg text-left"
                title={active ? "Remover filtro" : `Filtrar por ${item.category}`}
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
