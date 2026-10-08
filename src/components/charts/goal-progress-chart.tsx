"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartDataTable } from "@/components/ui/misc";
import { addDays, diffDays, formatDate } from "@/lib/dates";
import type { Cycle, ProgressSnapshot } from "@/lib/types";
import { CHART_COLORS, Legend, TooltipBox } from "./chart-parts";

interface Point {
  date: string;
  day: number;
  ideal: number;
  real: number | null;
}

export function GoalProgressChart({
  cycle,
  history,
  today,
  height = 240,
}: {
  cycle: Cycle;
  history: ProgressSnapshot[];
  today: string;
  height?: number;
}) {
  const total = diffDays(cycle.startDate, cycle.endDate);
  const byDate = new Map(history.filter((h) => h.cycleId === cycle.id).map((h) => [h.date, h.progress]));
  const points: Point[] = [];
  let last: number | null = null;
  for (let d = 0; d <= total; d++) {
    const date = addDays(cycle.startDate, d);
    const value = byDate.get(date);
    if (value !== undefined) last = value;
    // Mantém a linha contínua até hoje mesmo em dias sem registro.
    const real = date <= today ? (value ?? last) : null;
    points.push({ date, day: d + 1, ideal: Math.round((d / Math.max(total, 1)) * 1000) / 10, real });
  }
  const ticks = points.filter((_, i) => i % 15 === 0 || i === points.length - 1).map((p) => p.date);
  const showToday = today >= cycle.startDate && today <= cycle.endDate;
  const tableRows = points
    .filter((p, i) => p.real !== null && (i % 7 === 0 || p.date === today))
    .map((p) => [formatDate(p.date, "short"), `Dia ${p.day}`, `${p.real}%`, `${p.ideal}%`]);

  return (
    <div>
      <Legend
        items={[
          { label: "Progresso real", color: CHART_COLORS.series1 },
          { label: "Ritmo ideal", color: CHART_COLORS.reference, dashed: true },
        ]}
      />
      <div className="mt-3" style={{ height }} role="img" aria-label={`Gráfico de progresso das metas ao longo do ciclo. Progresso atual de ${points.find((p) => p.date === today)?.real ?? 0}%.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={(v: string) => formatDate(v, "short")}
              tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            {showToday && (
              <ReferenceLine
                x={today}
                stroke={CHART_COLORS.axis}
                strokeOpacity={0.5}
                label={{ value: "Hoje", position: diffDays(cycle.startDate, today) < total * 0.15 ? "insideTopLeft" : "insideTopRight", fill: CHART_COLORS.axis, fontSize: 11 }}
              />
            )}
            <Tooltip
              cursor={{ stroke: CHART_COLORS.axis, strokeOpacity: 0.4 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Point;
                return (
                  <TooltipBox
                    title={`${formatDate(p.date)} · dia ${p.day}`}
                    rows={[
                      ...(p.real !== null ? [{ label: "Real", value: `${p.real}%`, color: CHART_COLORS.series1 }] : []),
                      { label: "Ideal", value: `${p.ideal}%`, color: CHART_COLORS.reference, dashed: true },
                    ]}
                  />
                );
              }}
            />
            <Line type="linear" dataKey="ideal" stroke={CHART_COLORS.reference} strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="real"
              stroke={CHART_COLORS.series1}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable caption="Progresso das metas por semana" headers={["Data", "Dia do ciclo", "Real", "Ideal"]} rows={tableRows} />
    </div>
  );
}
