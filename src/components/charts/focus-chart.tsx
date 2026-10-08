"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartDataTable } from "@/components/ui/misc";
import { formatDate, WEEKDAYS_SHORT, weekday } from "@/lib/dates";
import { formatDuration } from "@/lib/format";
import { CHART_COLORS, Legend, TooltipBox } from "./chart-parts";

interface Point {
  date: string;
  minutes: number;
}

export function FocusChart({ data, goalMinutes, today, height = 240 }: { data: Point[]; goalMinutes: number; today: string; height?: number }) {
  const short = data.length <= 7;
  const max = Math.max(...data.map((d) => d.minutes), goalMinutes);
  const tickEvery = short ? 1 : 5;
  return (
    <div>
      <Legend
        items={[
          { label: "Minutos de foco", color: CHART_COLORS.series1 },
          ...(goalMinutes > 0 ? [{ label: `Meta diária (${formatDuration(goalMinutes * 60)})`, color: CHART_COLORS.reference, dashed: true }] : []),
        ]}
      />
      <div className="mt-3" style={{ height }} role="img" aria-label={`Gráfico de barras do tempo de foco por dia nos últimos ${data.length} dias`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barCategoryGap={short ? "30%" : "18%"}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="date"
              interval={0}
              tick={({ x, y, payload, index }) =>
                index % tickEvery === 0 || payload.value === today ? (
                  <text x={x} y={Number(y) + 12} textAnchor="middle" fontSize={11} fill={payload.value === today ? "#141413" : CHART_COLORS.axis} fontWeight={payload.value === today ? 600 : 400}>
                    {short ? WEEKDAYS_SHORT[weekday(String(payload.value))] : formatDate(String(payload.value), "short")}
                  </text>
                ) : (
                  <g />
                )
              }
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, max > 0 ? "auto" : 60]}
              tickFormatter={(v: number) => (v >= 60 ? `${Math.round((v / 60) * 10) / 10}h`.replace(".", ",") : `${v}m`)}
              tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            {goalMinutes > 0 && <ReferenceLine y={goalMinutes} stroke={CHART_COLORS.reference} strokeDasharray="4 4" />}
            <Tooltip
              cursor={{ fill: "#141413", fillOpacity: 0.04 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Point;
                return (
                  <TooltipBox
                    title={formatDate(p.date, "long").replace(/^./, (c) => c.toUpperCase())}
                    rows={[
                      { label: "Foco", value: formatDuration(p.minutes * 60), color: CHART_COLORS.series1 },
                      ...(goalMinutes > 0 ? [{ label: "Meta", value: `${Math.round((p.minutes / goalMinutes) * 100)}%` }] : []),
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="minutes" name="Foco" fill={CHART_COLORS.series1} radius={[4, 4, 0, 0]} maxBarSize={short ? 36 : 14} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        caption="Minutos de foco por dia"
        headers={["Dia", "Foco"]}
        rows={data.map((d) => [formatDate(d.date, "short"), formatDuration(d.minutes * 60)])}
      />
    </div>
  );
}
