"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartDataTable } from "@/components/ui/misc";
import { formatMonth } from "@/lib/dates";
import { formatBRL, formatBRLCompact } from "@/lib/format";
import type { MonthPoint } from "@/lib/metrics";
import { CHART_COLORS, Legend, TooltipBox } from "./chart-parts";

const SERIES = [
  { key: "receitas", label: "Receitas", color: CHART_COLORS.series1 },
  { key: "despesas", label: "Despesas", color: CHART_COLORS.series2 },
  { key: "poupado", label: "Poupado", color: CHART_COLORS.series3 },
] as const;

export function FinanceChart({
  data,
  height = 240,
  showSaved = true,
  highlightKey,
}: {
  data: MonthPoint[];
  height?: number;
  showSaved?: boolean;
  highlightKey?: string;
}) {
  const series = showSaved ? SERIES : SERIES.filter((s) => s.key !== "poupado");
  const empty = data.every((d) => d.receitas === 0 && d.despesas === 0);

  return (
    <div>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
      <div className="relative mt-3" style={{ height }} role="img" aria-label="Gráfico de barras de receitas, despesas e valor poupado por mês">
        {empty && (
          <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-ink-3">Sem lançamentos neste período.</p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="24%">
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="key"
              tickFormatter={(k: string) => formatMonth(k, "short")}
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={Number(y) + 12}
                  textAnchor="middle"
                  fontSize={11}
                  fill={payload.value === highlightKey ? "#141413" : CHART_COLORS.axis}
                  fontWeight={payload.value === highlightKey ? 600 : 400}
                >
                  {formatMonth(String(payload.value), "short")}
                </text>
              )}
              axisLine={false}
              tickLine={false}
            />
            <YAxis domain={empty ? [0, 400000] : [0, "auto"]} tickFormatter={(v: number) => formatBRLCompact(v)} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
            <Tooltip
              cursor={{ fill: "#141413", fillOpacity: 0.04 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as MonthPoint;
                return (
                  <TooltipBox
                    title={formatMonth(p.key)}
                    rows={[
                      ...series.map((s) => ({ label: s.label, value: formatBRL(p[s.key]), color: s.color })),
                      ...(showSaved ? [] : [{ label: "Saldo", value: formatBRL(p.receitas - p.despesas) }]),
                    ]}
                  />
                );
              }}
            />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption="Receitas, despesas e valor poupado por mês"
        headers={["Mês", ...series.map((s) => s.label)]}
        rows={data.map((d) => [formatMonth(d.key), ...series.map((s) => formatBRL(d[s.key]))])}
      />
    </div>
  );
}
