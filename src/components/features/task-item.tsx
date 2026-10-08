"use client";

import { IconButton } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { CalendarIcon, CheckIcon, PencilIcon, TargetIcon, TimerIcon, TrashIcon } from "@/components/ui/icons";
import { PriorityBadge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { relativeDayLabel } from "@/lib/dates";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/format";
import { focusSecondsFor, isTaskOverdue } from "@/lib/metrics";
import type { Task } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";
import { useFocusControls } from "@/store/focus-timer";

export function TaskCheck({ done, onToggle, label }: { done: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={onToggle}
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        done ? "border-good bg-good text-white" : "border-line-strong text-transparent hover:border-ink-2"
      }`}
    >
      <CheckIcon size={13} strokeWidth={3} />
    </button>
  );
}

export function TaskItem({
  task,
  onEdit,
  compact,
  showGoal = true,
}: {
  task: Task;
  onEdit?: (task: Task) => void;
  compact?: boolean;
  showGoal?: boolean;
}) {
  const { data, actions } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const today = useToday();
  const goal = task.goalId ? data.goals.find((g) => g.id === task.goalId) : null;
  const overdue = isTaskOverdue(task, today);
  const timer = useFocusControls();
  const router = useRouter();
  const focusSec = focusSecondsFor(data.focusSessions, "tarefa", task.id);

  async function remove() {
    const ok = await confirm({
      title: "Excluir tarefa?",
      message: <>A tarefa “{task.title}” será removida permanentemente.</>,
    });
    if (ok) {
      actions.deleteTask(task.id);
      toast.success("Tarefa excluída.");
    }
  }

  return (
    <li className={`group flex items-start gap-3 ${compact ? "py-2.5" : "py-3"}`}>
      <div className="pt-0.5">
        <TaskCheck
          done={task.done}
          label={`Concluir “${task.title}”`}
          onToggle={() => {
            actions.toggleTask(task.id);
            if (!task.done) toast.success("Tarefa concluída. Bom trabalho!");
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-snug ${task.done ? "text-ink-3 line-through" : "text-ink"}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          {task.dueDate && (
            <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-critical-ink" : ""}`}>
              <CalendarIcon size={12} />
              {overdue ? `Atrasada · ${relativeDayLabel(task.dueDate, today).toLowerCase()}` : relativeDayLabel(task.dueDate, today)}
            </span>
          )}
          {!compact && <PriorityBadge priority={task.priority} />}
          {!compact && <span>{task.category}</span>}
          {focusSec > 0 && (
            <span className="inline-flex items-center gap-1" title="Tempo de foco nesta tarefa">
              <TimerIcon size={12} />
              {formatDuration(focusSec)}
            </span>
          )}
          {showGoal && goal && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <TargetIcon size={12} />
              <span className="truncate">{goal.title}</span>
            </span>
          )}
        </div>
      </div>
      {onEdit && (
        <div className="flex shrink-0 items-center opacity-100 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
          {!task.done && (
            <IconButton
              label={`Focar em “${task.title}”`}
              onClick={() => {
                timer.setLink({ type: "tarefa", id: task.id });
                router.push("/foco");
              }}
            >
              <TimerIcon size={15} />
            </IconButton>
          )}
          <IconButton label={`Editar “${task.title}”`} onClick={() => onEdit(task)}>
            <PencilIcon size={15} />
          </IconButton>
          <IconButton label={`Excluir “${task.title}”`} tone="danger" onClick={remove}>
            <TrashIcon size={15} />
          </IconButton>
        </div>
      )}
    </li>
  );
}
