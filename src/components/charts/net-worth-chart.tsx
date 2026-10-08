"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartDataTable } from "@/components/ui/misc";
import { formatMonth } from "@/lib/dates";
import { formatBRL, formatBRLCompact } from "@/lib/format";
import type { NetWorthPoint } from "@/lib/metrics";
import { CHART_COLORS, Legend, TooltipBox } from "./chart-parts";

export function NetWorthChart({ data, reserveTarget, height = 260 }: { data: NetWorthPoint[]; reserveTarget?: number; height?: number }) {
  const max = Math.max(...data.map((d) => d.total), reserveTarget ?? 0);
  return (
    <div>
      <Legend
        items={[
          { label: "Patrimônio total", color: CHART_COLORS.series1 },
          { label: "Reserva de emergência", color: CHART_COLORS.series3 },
          ...(reserveTarget ? [{ label: "Meta da reserva", color: CHART_COLORS.reference, dashed: true }] : []),
        ]}
      />
      <div className="mt-3" style={{ height }} role="img" aria-label="Gráfico de linhas da evolução mensal do patrimônio total e da reserva de emergência">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="key" tickFormatter={(k: string) => formatMonth(k, "short")} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={8} />
            <YAxis
              domain={[0, max > 0 ? "auto" : 400000]}
              tickFormatter={(v: number) => formatBRLCompact(v)}
              tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            {reserveTarget ? <ReferenceLine y={reserveTarget} stroke={CHART_COLORS.reference} strokeDasharray="4 4" /> : null}
            <Tooltip
              cursor={{ stroke: CHART_COLORS.axis, strokeOpacity: 0.4 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as NetWorthPoint;
                return (
                  <TooltipBox
                    title={formatMonth(p.key)}
                    rows={[
                      { label: "Patrimônio", value: formatBRL(p.total), color: CHART_COLORS.series1 },
                      { label: "Reserva", value: formatBRL(p.reserva), color: CHART_COLORS.series3 },
                    ]}
                  />
                );
              }}
            />
            <Line type="linear" dataKey="total" stroke={CHART_COLORS.series1} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
            <Line type="linear" dataKey="reserva" stroke={CHART_COLORS.series3} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption="Patrimônio e reserva por mês"
        headers={["Mês", "Patrimônio total", "Reserva"]}
        rows={data.map((d) => [formatMonth(d.key), formatBRL(d.total), formatBRL(d.reserva)])}
      />
    </div>
  );
}
