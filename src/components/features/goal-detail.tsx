"use client";

import { useState, type FormEvent } from "react";
import { TaskFormModal } from "@/components/forms/task-form";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { AreaBadge, EmptyState, PriorityBadge, ProgressBar, StatusBadge } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatDateRange } from "@/lib/dates";
import { decimalToInput, parseDecimal } from "@/lib/format";
import { STATUS_LABELS, STATUSES } from "@/lib/labels";
import { compareTasks, goalDisplayStatus, goalProgress } from "@/lib/metrics";
import type { Goal, GoalStatus, Task } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";
import { deadlineLabel, goalMeasureLabel } from "./goal-views";
import { TaskItem } from "./task-item";

export function GoalDetailModal({ goalId, onClose, onEdit }: { goalId: string | null; onClose: () => void; onEdit: (g: Goal) => void }) {
  const { data } = useStore();
  const goal = goalId ? (data.goals.find((g) => g.id === goalId) ?? null) : null;
  return (
    <Modal open={goal !== null} onClose={onClose} size="lg" title={goal?.title ?? "Meta"}>
      {goal && <GoalDetail goal={goal} onClose={onClose} onEdit={onEdit} />}
    </Modal>
  );
}

function GoalDetail({ goal, onClose, onEdit }: { goal: Goal; onClose: () => void; onEdit: (g: Goal) => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const today = useToday();
  const [taskModal, setTaskModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [value, setValue] = useState(decimalToInput(goal.currentValue));
  const [valueError, setValueError] = useState<string>();
  const tasks = data.tasks.filter((t) => t.goalId === goal.id).sort(compareTasks);
  const progress = goalProgress(goal);
  const status = goalDisplayStatus(goal, today);

  function saveValue(e: FormEvent) {
    e.preventDefault();
    const n = parseDecimal(value);
    if (n === null || n < 0) return setValueError("Informe um número válido.");
    setValueError(undefined);
    const reached = goal.targetValue !== null && n >= goal.targetValue;
    actions.updateGoal(goal.id, {
      currentValue: n,
      status: reached ? "concluida" : goal.status === "nao_iniciada" ? "em_andamento" : goal.status,
    });
    toast.success(reached ? "Meta atingida! Status alterado para concluída." : "Progresso atualizado.");
  }

  async function remove() {
    const ok = await confirm({
      title: "Excluir meta?",
      message: (
        <>
          A meta “{goal.title}” e seus marcos serão excluídos. {tasks.length > 0 && `As ${tasks.length} tarefas vinculadas serão mantidas, sem vínculo.`}
        </>
      ),
      confirmLabel: "Excluir meta",
    });
    if (ok) {
      actions.deleteGoal(goal.id);
      toast.success("Meta excluída.");
      onClose();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <AreaBadge area={goal.area} />
        <StatusBadge status={status} />
        <PriorityBadge priority={goal.priority} />
        <span className="text-xs text-ink-3">{formatDateRange(goal.startDate, goal.dueDate)}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-subtle p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Resultado esperado</p>
          <p className="mt-1 text-sm text-ink">{goal.measurableResult}</p>
        </div>
        <div className="rounded-2xl bg-subtle p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Por que importa</p>
          <p className="mt-1 text-sm text-ink">{goal.why || "—"}</p>
        </div>
      </div>
      {goal.description && <p className="text-sm text-ink-2">{goal.description}</p>}

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-ink-2">{goalMeasureLabel(goal)}</span>
          <span className="tabular text-2xl font-semibold">{Math.round(progress)}%</span>
        </div>
        <ProgressBar value={progress} size="lg" label={`Progresso de ${goal.title}`} tone={status === "concluida" ? "good" : "accent"} />
        <p className={`mt-2 text-xs ${status === "atrasada" ? "font-medium text-critical-ink" : "text-ink-3"}`}>{deadlineLabel(goal, today)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {goal.targetValue !== null && (
          <form onSubmit={saveValue} className="flex flex-col gap-1.5" noValidate>
            <label htmlFor="goal-current" className="text-[13px] font-medium">
              Atualizar valor atual {goal.unit && <span className="font-normal text-ink-3">({goal.unit})</span>}
            </label>
            <div className="flex gap-2">
              <input
                id="goal-current"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-invalid={valueError ? true : undefined}
                aria-describedby={valueError ? "goal-current-error" : undefined}
                className="h-10 min-w-0 flex-1 rounded-xl border border-line-strong px-3 text-sm focus:border-accent focus:outline-none"
              />
              <Button type="submit" variant="primary">Salvar</Button>
            </div>
            {valueError && <p id="goal-current-error" role="alert" className="text-xs font-medium text-critical-ink">{valueError}</p>}
          </form>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-status" className="text-[13px] font-medium">Status</label>
          <select
            id="goal-status"
            value={goal.status}
            onChange={(e) => {
              actions.updateGoal(goal.id, { status: e.target.value as GoalStatus });
              toast.success(`Status alterado para “${STATUS_LABELS[e.target.value as GoalStatus]}”.`);
            }}
            className="h-10 rounded-xl border border-line-strong bg-surface px-3 text-sm focus:border-accent focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <section aria-labelledby="ms-title">
        <h3 id="ms-title" className="mb-2 text-sm font-semibold">Marcos intermediários</h3>
        {goal.milestones.length === 0 ? (
          <p className="text-sm text-ink-3">Nenhum marco definido. Adicione marcos editando a meta.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {goal.milestones.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={m.done}
                  onClick={() => actions.toggleMilestone(goal.id, m.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-subtle"
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${m.done ? "border-good bg-good text-white" : "border-line-strong text-transparent"}`} aria-hidden>
                    <CheckIcon size={12} strokeWidth={3} />
                  </span>
                  <span className={`flex-1 text-sm ${m.done ? "text-ink-3 line-through" : ""}`}>{m.title}</span>
                  {m.dueDate && <span className="text-xs text-ink-3">{formatDate(m.dueDate, "short")}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tasks-title">
        <div className="mb-1 flex items-center justify-between">
          <h3 id="tasks-title" className="text-sm font-semibold">Tarefas relacionadas</h3>
          <Button size="sm" variant="ghost" icon={<PlusIcon size={15} />} onClick={() => setTaskModal({ open: true, task: null })}>
            Adicionar tarefa
          </Button>
        </div>
        {tasks.length === 0 ? (
          <EmptyState compact title="Nenhuma tarefa vinculada" description="Quebre a meta em ações concretas para a semana." />
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <TaskItem key={t.id} task={t} compact showGoal={false} onEdit={(task) => setTaskModal({ open: true, task })} />
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
        <Button variant="ghost" className="text-critical-ink hover:text-critical-ink" icon={<TrashIcon size={15} />} onClick={remove}>
          Excluir meta
        </Button>
        <Button variant="primary" icon={<PencilIcon size={15} />} onClick={() => onEdit(goal)}>
          Editar meta
        </Button>
      </div>

      <TaskFormModal open={taskModal.open} task={taskModal.task} defaultGoalId={goal.id} onClose={() => setTaskModal({ open: false, task: null })} />
    </div>
  );
}
