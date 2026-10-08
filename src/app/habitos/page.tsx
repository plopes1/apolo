"use client";

import { useState } from "react";
import { HabitRow, HabitToggle } from "@/components/features/habit-item";
import { TaskItem } from "@/components/features/task-item";
import { HabitFormModal } from "@/components/forms/habit-form";
import { TaskFormModal } from "@/components/forms/task-form";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, FilterSelect } from "@/components/ui/fields";
import { CheckSquareIcon, FlameIcon, PlusIcon } from "@/components/ui/icons";
import { EmptyState, ProgressBar, SegmentedControl } from "@/components/ui/misc";
import { endOfWeek, formatDate } from "@/lib/dates";
import { compareTasks, habitStreak, isHabitScheduled, streakLabel } from "@/lib/metrics";
import type { Habit, Task } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

type TaskView = "hoje" | "semana" | "todas";

export default function HabitsPage() {
  const { data } = useStore();
  const today = useToday();
  const [view, setView] = useState<TaskView>("hoje");
  const [category, setCategory] = useState("");
  const [goalFilter, setGoalFilter] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [taskModal, setTaskModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [habitModal, setHabitModal] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null });

  const weekEnd = endOfWeek(today);
  const inView = (t: Task, v: TaskView) => {
    if (v === "todas") return true;
    if (t.done) return t.completedAt === today || (v === "semana" && t.dueDate !== null && t.dueDate >= today && t.dueDate <= weekEnd);
    if (!t.dueDate) return false;
    return v === "hoje" ? t.dueDate <= today : t.dueDate <= weekEnd;
  };
  const counts = {
    hoje: data.tasks.filter((t) => !t.done && inView(t, "hoje")).length,
    semana: data.tasks.filter((t) => !t.done && inView(t, "semana")).length,
    todas: data.tasks.filter((t) => !t.done).length,
  };
  const tasks = data.tasks
    .filter((t) => inView(t, view))
    .filter((t) => showDone || !t.done || (view !== "todas" && t.completedAt === today))
    .filter((t) => !category || t.category === category)
    .filter((t) => !goalFilter || (goalFilter === "sem" ? t.goalId === null : t.goalId === goalFilter))
    .sort(compareTasks);

  const categories = [...new Set([...data.settings.taskCategories, ...data.tasks.map((t) => t.category)])];
  const goals = data.goals.filter((g) => g.cycleId === data.activeCycleId);

  const habitsToday = data.habits.filter((h) => isHabitScheduled(h, today));
  const doneToday = habitsToday.filter((h) => h.completions.includes(today)).length;
  const best = data.habits
    .map((h) => ({ habit: h, streak: habitStreak(h, today) }))
    .sort((a, b) => b.streak - a.streak)[0];

  return (
    <>
      <PageHeader
        title="Hábitos e tarefas"
        section="Hábitos"
        description={formatDate(today, "long").replace(/^./, (c) => c.toUpperCase())}
        actions={
          <>
            <Button icon={<PlusIcon size={16} />} onClick={() => setHabitModal({ open: true, habit: null })}>
              Novo hábito
            </Button>
            <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setTaskModal({ open: true, task: null })}>
              Adicionar tarefa
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card aria-labelledby="tasks-title" className="order-2 lg:order-1">
          <CardHeader id="tasks-title" eyebrow={`${counts.todas} pendentes no total`} title="Tarefas" />
          <div className="mb-4 flex flex-col gap-3">
            <SegmentedControl
              label="Período"
              value={view}
              onChange={setView}
              options={[
                { value: "hoje", label: "Hoje", count: counts.hoje },
                { value: "semana", label: "Esta semana", count: counts.semana },
                { value: "todas", label: "Todas", count: counts.todas },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} options={[{ value: "", label: "Todas" }, ...categories.map((c) => ({ value: c, label: c }))]} />
              <FilterSelect
                label="Meta"
                value={goalFilter}
                onChange={(e) => setGoalFilter(e.target.value)}
                options={[{ value: "", label: "Todas" }, { value: "sem", label: "Sem meta" }, ...goals.map((g) => ({ value: g.id, label: g.title }))]}
              />
              {view === "todas" && (
                <div className="ml-1">
                  <Checkbox checked={showDone} onChange={setShowDone} label="Mostrar concluídas" />
                </div>
              )}
            </div>
          </div>
          {view === "hoje" && <p className="mb-2 text-xs text-ink-3">Inclui tarefas atrasadas.</p>}
          {tasks.length === 0 ? (
            <EmptyState
              icon={<CheckSquareIcon size={26} />}
              title={view === "hoje" ? "Tudo em dia por hoje" : "Nenhuma tarefa encontrada"}
              description={category || goalFilter ? "Tente remover os filtros." : "Adicione uma tarefa com prazo para vê-la aqui."}
              action={
                <Button size="sm" icon={<PlusIcon size={14} />} onClick={() => setTaskModal({ open: true, task: null })}>
                  Adicionar tarefa
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {tasks.map((t) => (
                <TaskItem key={t.id} task={t} onEdit={(task) => setTaskModal({ open: true, task })} />
              ))}
            </ul>
          )}
        </Card>

        <div className="order-1 flex min-w-0 flex-col gap-5 lg:order-2">
          <Card aria-labelledby="today-habits">
            <CardHeader id="today-habits" eyebrow="Hoje" title={`${doneToday} de ${habitsToday.length} hábitos`} />
            {habitsToday.length > 0 && (
              <div className="mb-4">
                <ProgressBar value={(doneToday / habitsToday.length) * 100} tone="good" label="Hábitos concluídos hoje" />
              </div>
            )}
            {habitsToday.length === 0 ? (
              <EmptyState compact title="Nenhum hábito programado para hoje" />
            ) : (
              <ul className="flex flex-col gap-2">
                {habitsToday.map((h) => (
                  <li key={h.id}>
                    <HabitToggle habit={h} date={today} />
                  </li>
                ))}
              </ul>
            )}
            {best && best.streak > 0 && (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-2">
                <FlameIcon size={14} className="shrink-0 text-[#eb6834]" />
                <span>
                  Maior sequência atual: <strong className="font-semibold text-ink">{streakLabel(best.habit, best.streak)}</strong> em {best.habit.name}
                </span>
              </p>
            )}
          </Card>
        </div>

        <Card aria-labelledby="all-habits" className="order-3 lg:col-span-2">
          <CardHeader
            id="all-habits"
            eyebrow="Esta semana"
            title="Todos os hábitos"
            action={
              <Button size="sm" icon={<PlusIcon size={14} />} onClick={() => setHabitModal({ open: true, habit: null })}>
                Novo hábito
              </Button>
            }
          />
          <p className="-mt-2 mb-2 text-xs text-ink-3">Semana de segunda a domingo. Toque nos círculos para marcar ou desmarcar os dias que já passaram. Dias tracejados são folgas.</p>
          {data.habits.length === 0 ? (
            <EmptyState title="Nenhum hábito cadastrado" description="Hábitos pequenos e diários sustentam metas grandes." />
          ) : (
            <ul className="divide-y divide-line">
              {data.habits.map((h) => (
                <HabitRow key={h.id} habit={h} onEdit={(habit) => setHabitModal({ open: true, habit })} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <TaskFormModal open={taskModal.open} task={taskModal.task} onClose={() => setTaskModal({ open: false, task: null })} />
      <HabitFormModal open={habitModal.open} habit={habitModal.habit} onClose={() => setHabitModal({ open: false, habit: null })} />
    </>
  );
}
