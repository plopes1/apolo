"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryBars } from "@/components/charts/category-bars";
import { FinanceChart } from "@/components/charts/finance-chart";
import { GoalProgressChart } from "@/components/charts/goal-progress-chart";
import { GoalDetailModal } from "@/components/features/goal-detail";
import { HabitToggle } from "@/components/features/habit-item";
import { NoCycleState } from "@/components/features/no-cycle";
import { TaskItem } from "@/components/features/task-item";
import { WeeklyPriorityCard } from "@/components/features/weekly-priority";
import { GoalFormModal } from "@/components/forms/goal-form";
import { HabitFormModal } from "@/components/forms/habit-form";
import { TaskFormModal } from "@/components/forms/task-form";
import { TransactionFormModal } from "@/components/forms/transaction-form";
import { PageHeader } from "@/components/layout/app-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CalendarIcon, ChevronRightIcon, PlusIcon, TargetIcon, WalletIcon } from "@/components/ui/icons";
import { AreaBadge, EmptyState, ProgressBar, StatTile } from "@/components/ui/misc";
import { addDays, endOfWeek, formatDateRange, formatMonth, monthKey, addMonths } from "@/lib/dates";
import { formatBRL, formatNumber } from "@/lib/format";
import {
  compareTasks,
  cycleGoals,
  cycleTimeline,
  expensesByCategory,
  getActiveCycle,
  goalCounts,
  goalDisplayStatus,
  goalProgress,
  isHabitScheduled,
  monthlySeries,
  monthSummary,
  emergencyPlan,
  overallProgress,
} from "@/lib/metrics";
import type { Goal, Task } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

export default function OverviewPage() {
  const { data } = useStore();
  const today = useToday();
  const [goalModal, setGoalModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [taskModal, setTaskModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [txOpen, setTxOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const cycle = getActiveCycle(data);
  const goals = cycleGoals(data, cycle?.id ?? null);
  const counts = goalCounts(goals, today);
  const progress = overallProgress(goals);
  const timeline = cycle ? cycleTimeline(cycle, today) : null;

  const weekEnd = endOfWeek(today);
  const upcoming = data.tasks
    .filter((t) => !t.done && (t.dueDate === null || t.dueDate <= addDays(weekEnd, 7)))
    .sort(compareTasks)
    .slice(0, 6);
  const habitsToday = data.habits.filter((h) => isHabitScheduled(h, today));
  const habitsDone = habitsToday.filter((h) => h.completions.includes(today)).length;

  const month = monthKey(today);
  const summary = monthSummary(data.transactions, month);
  const previous = monthSummary(data.transactions, addMonths(month, -1));
  const savingsGoal = data.settings.monthlySavingsGoal;
  const savingsPct = savingsGoal > 0 ? (summary.saved / savingsGoal) * 100 : 0;
  const series = monthlySeries(data.transactions, month, 6);
  const categories = expensesByCategory(data.transactions, month);
  const reserve = emergencyPlan(data, today);

  const focusGoals = [...goals]
    .filter((g) => g.status !== "concluida" && g.status !== "pausada")
    .sort((a, b) => (goalDisplayStatus(a, today) === "atrasada" ? -1 : 0) - (goalDisplayStatus(b, today) === "atrasada" ? -1 : 0) || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  const pace = timeline ? progress - timeline.timePct : 0;

  return (
    <>
      <PageHeader
        title="Visão geral"
        description={
          cycle ? (
            <span className="inline-flex flex-wrap items-center gap-x-2">
              <span className="font-medium text-ink">{cycle.name}</span>
              <span aria-hidden>·</span>
              <span>{formatDateRange(cycle.startDate, cycle.endDate)}</span>
            </span>
          ) : (
            "Nenhum ciclo ativo"
          )
        }
        actions={
          <>
            <Button icon={<TargetIcon size={16} />} onClick={() => setGoalModal({ open: true, goal: null })} disabled={!cycle}>
              Nova meta
            </Button>
            <Button icon={<PlusIcon size={16} />} onClick={() => setTaskModal({ open: true, task: null })}>
              Adicionar tarefa
            </Button>
            <Button variant="primary" icon={<WalletIcon size={16} />} onClick={() => setTxOpen(true)}>
              Lançamento financeiro
            </Button>
          </>
        }
      />

      {!cycle || !timeline ? (
        <div className="mb-6">
          <NoCycleState />
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-2 gap-x-6 gap-y-7 lg:grid-cols-4">
          <StatTile
            label="Progresso geral"
            value={`${Math.round(progress)}%`}
            detail={
              timeline.notStarted
                ? "O ciclo ainda não começou"
                : pace >= 0
                  ? `${Math.round(pace)} p.p. à frente do ritmo`
                  : `${Math.round(Math.abs(pace))} p.p. abaixo do ritmo`
            }
          >
            <div className="mt-3 max-w-[220px]">
              <ProgressBar value={progress} marker={timeline.timePct} label="Progresso geral do ciclo" />
            </div>
          </StatTile>
          <StatTile
            label="Dias restantes"
            icon={<CalendarIcon size={13} />}
            value={timeline.finished ? "Encerrado" : timeline.remaining}
            detail={timeline.notStarted ? `Começa em ${formatDateRange(cycle.startDate, cycle.endDate).split(" – ")[0]}` : `Dia ${timeline.currentDay} de ${timeline.totalDays}`}
          />
          <StatTile
            label="Metas do ciclo"
            icon={<TargetIcon size={13} />}
            value={`${counts.concluidas}/${counts.total}`}
            detail={
              <span className="flex flex-wrap gap-x-3">
                <span>{counts.emAndamento} em andamento</span>
                <span className={counts.atrasadas ? "font-medium text-critical-ink" : ""}>
                  {counts.atrasadas} {counts.atrasadas === 1 ? "atrasada" : "atrasadas"}
                </span>
              </span>
            }
          />
          <StatTile
            label={`Saldo de ${formatMonth(month, "short").toLowerCase()}`}
            icon={<WalletIcon size={13} />}
            value={formatBRL(summary.balance)}
            detail={`Mês anterior: ${formatBRL(previous.balance)}`}
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {cycle && (
          <Card className="lg:col-span-2" aria-labelledby="chart-progress">
            <CardHeader
              id="chart-progress"
              eyebrow="Evolução do ciclo"
              title={progress >= (timeline?.timePct ?? 0) ? "Suas metas estão no ritmo" : "Hora de acelerar um pouco"}
              action={<ButtonLink href="/ciclos" variant="outline" size="sm">Ver ciclo <ChevronRightIcon size={14} /></ButtonLink>}
            />
            <GoalProgressChart cycle={cycle} history={data.progressHistory} today={today} />
          </Card>
        )}
        <div className={cycle ? "min-w-0" : "min-w-0 lg:col-span-3"}>
          <WeeklyPriorityCard />
        </div>

        <Card aria-labelledby="next-tasks">
          <CardHeader
            id="next-tasks"
            eyebrow="Próximos dias"
            title="Próximas tarefas"
            action={<ButtonLink href="/habitos" variant="ghost" size="sm">Ver todas</ButtonLink>}
          />
          {upcoming.length === 0 ? (
            <EmptyState
              compact
              title="Nada pendente por aqui"
              description="Adicione as próximas ações das suas metas."
              action={<Button size="sm" icon={<PlusIcon size={14} />} onClick={() => setTaskModal({ open: true, task: null })}>Adicionar tarefa</Button>}
            />
          ) : (
            <ul className="-my-1 divide-y divide-line">
              {upcoming.map((t) => (
                <TaskItem key={t.id} task={t} compact onEdit={(task) => setTaskModal({ open: true, task })} />
              ))}
            </ul>
          )}
        </Card>

        <Card aria-labelledby="habits-today">
          <CardHeader
            id="habits-today"
            eyebrow={`${habitsDone} de ${habitsToday.length} concluídos`}
            title="Hábitos de hoje"
            action={<ButtonLink href="/habitos" variant="ghost" size="sm">Gerenciar</ButtonLink>}
          />
          {habitsToday.length > 0 && (
            <div className="mb-4">
              <ProgressBar value={habitsToday.length ? (habitsDone / habitsToday.length) * 100 : 0} tone="good" size="sm" label="Hábitos concluídos hoje" />
            </div>
          )}
          {habitsToday.length === 0 ? (
            <EmptyState
              compact
              title={data.habits.length ? "Dia de folga" : "Nenhum hábito ainda"}
              description={data.habits.length ? "Nenhum hábito programado para hoje." : "Crie hábitos diários ou para dias específicos."}
              action={!data.habits.length && <Button size="sm" icon={<PlusIcon size={14} />} onClick={() => setHabitOpen(true)}>Novo hábito</Button>}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {habitsToday.map((h) => (
                <li key={h.id}>
                  <HabitToggle habit={h} date={today} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card aria-labelledby="finance-month">
          <CardHeader
            id="finance-month"
            eyebrow={formatMonth(month)}
            title="Resumo financeiro"
            action={<ButtonLink href="/financas" variant="ghost" size="sm">Detalhes</ButtonLink>}
          />
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-ink-3">Receitas</dt>
              <dd className="tabular mt-0.5 text-[17px] font-semibold">{formatBRL(summary.income)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Despesas</dt>
              <dd className="tabular mt-0.5 text-[17px] font-semibold">{formatBRL(summary.expense)}</dd>
            </div>
          </dl>
          <div className="mt-5 rounded-2xl bg-subtle p-4">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-ink-2">Poupado</span>
              <span className="text-ink-3">meta {formatBRL(savingsGoal)}</span>
            </div>
            <p className="tabular mt-1 text-xl font-semibold">{formatBRL(summary.saved)}</p>
            <div className="mt-2.5">
              <ProgressBar value={savingsPct} tone="good" label="Progresso da meta de economia" />
            </div>
            <p className="mt-1.5 text-xs text-ink-2">{Math.round(Math.min(savingsPct, 999))}% da meta mensal de economia</p>
          </div>
          <Link href="/patrimonio" className="mt-3 block rounded-2xl border border-line p-4 hover:border-line-strong hover:bg-subtle">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-ink-2">Reserva de emergência</span>
              <span className="text-ink-3">{reserve.target > 0 ? `meta ${formatBRL(reserve.target)}` : "sem meta"}</span>
            </div>
            <p className="tabular mt-1 text-[17px] font-semibold">{formatBRL(reserve.saved)}</p>
            {reserve.target > 0 && (
              <div className="mt-2">
                <ProgressBar value={reserve.progress} tone="good" size="sm" label="Progresso da reserva de emergência" />
              </div>
            )}
            <p className="mt-1.5 text-xs text-ink-2">
              {reserve.target > 0
                ? `${Math.round(reserve.progress)}% da meta${reserve.monthsCovered !== null ? ` · cobre ${formatNumber(Math.round(reserve.monthsCovered * 10) / 10)} meses` : ""}`
                : "Defina sua reserva em Patrimônio"}
            </p>
          </Link>
          {categories.length > 0 && (
            <div className="mt-5">
              <p className="mb-3 text-xs font-medium text-ink-3">Maiores despesas</p>
              <CategoryBars items={categories} limit={3} />
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2" aria-labelledby="chart-finance">
          <CardHeader
            id="chart-finance"
            eyebrow="Últimos 6 meses"
            title="Receitas, despesas e valor poupado"
            action={<ButtonLink href="/financas" variant="outline" size="sm">Ver finanças <ChevronRightIcon size={14} /></ButtonLink>}
          />
          <FinanceChart data={series} highlightKey={month} />
        </Card>

        <Card aria-labelledby="focus-goals">
          <CardHeader id="focus-goals" eyebrow="Em foco" title="Metas ativas" action={<ButtonLink href="/ciclos" variant="ghost" size="sm">Todas</ButtonLink>} />
          {focusGoals.length === 0 ? (
            <EmptyState
              compact
              title="Nenhuma meta ativa"
              description={cycle ? "Adicione metas ao ciclo para acompanhar o progresso." : "Inicie um ciclo para criar metas."}
              action={cycle && <Button size="sm" icon={<PlusIcon size={14} />} onClick={() => setGoalModal({ open: true, goal: null })}>Nova meta</Button>}
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {focusGoals.map((g) => {
                const st = goalDisplayStatus(g, today);
                return (
                  <li key={g.id}>
                    <button type="button" onClick={() => setDetailId(g.id)} className="block w-full rounded-xl text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium hover:underline">{g.title}</span>
                        <span className="tabular shrink-0 text-xs font-semibold">{Math.round(goalProgress(g))}%</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <AreaBadge area={g.area} />
                        {st === "atrasada" && <span className="font-medium text-critical-ink">· Atrasada</span>}
                      </div>
                      <div className="mt-2">
                        <ProgressBar value={goalProgress(g)} size="sm" label={`Progresso de ${g.title}`} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {cycle && (
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-4 text-xs text-ink-3">
              <span>Áreas prioritárias:</span>
              {cycle.focusAreas.length ? cycle.focusAreas.map((a) => <AreaBadge key={a} area={a} />) : "—"}
            </div>
          )}
        </Card>
      </div>

      <p className="mt-8 text-center text-xs text-ink-3">
        Seus dados ficam salvos apenas neste navegador.{" "}
        <Link href="/configuracoes#dados" className="font-medium text-accent-strong hover:underline">
          Baixar backup
        </Link>
      </p>

      <GoalFormModal open={goalModal.open} goal={goalModal.goal} onClose={() => setGoalModal({ open: false, goal: null })} />
      <TaskFormModal open={taskModal.open} task={taskModal.task} onClose={() => setTaskModal({ open: false, task: null })} />
      <TransactionFormModal open={txOpen} onClose={() => setTxOpen(false)} />
      <HabitFormModal open={habitOpen} onClose={() => setHabitOpen(false)} />
      <GoalDetailModal
        goalId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(g) => {
          setDetailId(null);
          setGoalModal({ open: true, goal: g });
        }}
      />
    </>
  );
}
