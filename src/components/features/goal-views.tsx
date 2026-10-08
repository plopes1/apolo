"use client";

import { AreaBadge, PriorityBadge, ProgressBar, StatusBadge } from "@/components/ui/misc";
import { ChevronRightIcon, ClockIcon } from "@/components/ui/icons";
import { diffDays, formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { goalDisplayStatus, goalNextAction, goalProgress } from "@/lib/metrics";
import type { Goal, Task } from "@/lib/types";

export function goalMeasureLabel(goal: Goal) {
  if (goal.targetValue !== null) {
    const cur = formatNumber(goal.currentValue ?? 0);
    const tgt = formatNumber(goal.targetValue);
    if (goal.unit === "R$") return `R$ ${cur} de R$ ${tgt}`;
    return `${cur} de ${tgt}${goal.unit ? ` ${goal.unit}` : ""}`;
  }
  if (goal.milestones.length) {
    return `${goal.milestones.filter((m) => m.done).length} de ${goal.milestones.length} marcos`;
  }
  return "Sem medição";
}

export function deadlineLabel(goal: Goal, today: string) {
  if (goal.status === "concluida") return `Concluída · prazo ${formatDate(goal.dueDate, "short")}`;
  const diff = diffDays(today, goal.dueDate);
  if (diff < 0) return `Prazo vencido há ${Math.abs(diff)} ${Math.abs(diff) === 1 ? "dia" : "dias"}`;
  if (diff === 0) return "Prazo é hoje";
  return `${diff} ${diff === 1 ? "dia" : "dias"} · ${formatDate(goal.dueDate, "short")}`;
}

export function GoalCard({ goal, tasks, today, onOpen }: { goal: Goal; tasks: Task[]; today: string; onOpen: (g: Goal) => void }) {
  const progress = goalProgress(goal);
  const status = goalDisplayStatus(goal, today);
  const next = goalNextAction(goal, tasks);
  return (
    <article className="flex flex-col rounded-3xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <div className="flex items-center justify-between gap-2">
        <AreaBadge area={goal.area} />
        <StatusBadge status={status} />
      </div>
      <h3 className="mt-3 text-[15px] font-semibold leading-snug">
        <button type="button" onClick={() => onOpen(goal)} className="text-left hover:underline hover:underline-offset-2">
          {goal.title}
        </button>
      </h3>
      <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{goal.measurableResult}</p>
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-ink-2">{goalMeasureLabel(goal)}</span>
          <span className="tabular font-semibold text-ink">{Math.round(progress)}%</span>
        </div>
        <ProgressBar value={progress} label={`Progresso de ${goal.title}`} tone={status === "concluida" ? "good" : "accent"} />
      </div>
      <div className="mt-4 flex flex-1 flex-col justify-end gap-2 border-t border-line pt-3 text-xs">
        <p className={`flex items-center gap-1.5 ${status === "atrasada" ? "font-medium text-critical-ink" : "text-ink-2"}`}>
          <ClockIcon size={13} />
          {deadlineLabel(goal, today)}
        </p>
        {goal.status !== "concluida" && (
          <p className="flex items-start gap-1.5 text-ink-2">
            <ChevronRightIcon size={13} className="mt-px shrink-0" />
            <span className="line-clamp-1">
              <span className="text-ink-3">Próxima ação: </span>
              {next ?? "Defina uma próxima ação"}
            </span>
          </p>
        )}
      </div>
    </article>
  );
}

export function GoalListTable({ goals, tasks, today, onOpen }: { goals: Goal[]; tasks: Task[]; today: string; onOpen: (g: Goal) => void }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink-3">
            <th scope="col" className="px-5 py-3 font-medium">Meta</th>
            <th scope="col" className="px-3 py-3 font-medium">Área</th>
            <th scope="col" className="px-3 py-3 font-medium">Status</th>
            <th scope="col" className="w-44 px-3 py-3 font-medium">Progresso</th>
            <th scope="col" className="px-3 py-3 font-medium">Prazo</th>
            <th scope="col" className="px-3 py-3 font-medium">Prioridade</th>
            <th scope="col" className="px-5 py-3 font-medium">Próxima ação</th>
          </tr>
        </thead>
        <tbody>
          {goals.map((g) => {
            const progress = goalProgress(g);
            const status = goalDisplayStatus(g, today);
            return (
              <tr key={g.id} className="border-b border-line last:border-0 hover:bg-subtle">
                <td className="px-5 py-3">
                  <button type="button" onClick={() => onOpen(g)} className="text-left font-medium hover:underline hover:underline-offset-2">
                    {g.title}
                  </button>
                </td>
                <td className="px-3 py-3"><AreaBadge area={g.area} /></td>
                <td className="px-3 py-3"><StatusBadge status={status} /></td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={progress} size="sm" label={`Progresso de ${g.title}`} tone={status === "concluida" ? "good" : "accent"} />
                    <span className="tabular w-9 text-right text-xs font-medium">{Math.round(progress)}%</span>
                  </div>
                </td>
                <td className={`whitespace-nowrap px-3 py-3 text-xs ${status === "atrasada" ? "font-medium text-critical-ink" : "text-ink-2"}`}>
                  {formatDate(g.dueDate)}
                </td>
                <td className="px-3 py-3"><PriorityBadge priority={g.priority} /></td>
                <td className="max-w-[220px] truncate px-5 py-3 text-xs text-ink-2">{g.status === "concluida" ? "—" : (goalNextAction(g, tasks) ?? "—")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
