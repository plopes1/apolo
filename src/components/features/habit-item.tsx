"use client";

import { IconButton } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { CheckIcon, FlameIcon, PencilIcon, TimerIcon, TrashIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { addDays, formatDate, startOfWeek, WEEKDAYS_LONG, WEEKDAYS_SHORT, weekday } from "@/lib/dates";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/format";
import { focusSecondsFor, habitStreak, habitWeekCount, isHabitScheduled, isWeeklyQuota, streakLabel } from "@/lib/metrics";
import type { Habit } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";
import { useFocusControls } from "@/store/focus-timer";

export function frequencyLabel(habit: Habit) {
  if (habit.frequency === "diaria") return "Todos os dias";
  if (habit.frequency === "vezes_por_semana") return `${habit.timesPerWeek}× por semana, qualquer dia`;
  if (habit.days.length === 7) return "Todos os dias";
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => habit.days.includes(d))
    .map((d) => WEEKDAYS_SHORT[d])
    .join(", ");
}

/** Botão grande para marcar o hábito do dia. */
export function HabitToggle({ habit, date }: { habit: Habit; date: string }) {
  const { actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const done = habit.completions.includes(date);
  const streak = habitStreak(habit, today);
  const quota = isWeeklyQuota(habit);
  const weekCount = quota ? habitWeekCount(habit, date) : 0;
  const target = habit.timesPerWeek ?? 0;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      onClick={() => {
        actions.toggleHabit(habit.id, date);
        if (!done) toast.success(`“${habit.name}” concluído hoje.`);
      }}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
        done ? "border-transparent bg-good-soft" : "border-line hover:border-line-strong hover:bg-subtle"
      }`}
    >
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
          done ? "border-good bg-good text-white" : "border-line-strong text-transparent"
        }`}
        aria-hidden
      >
        <CheckIcon size={13} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${done ? "text-good-ink" : "text-ink"}`}>{habit.name}</span>
        {quota && (
          <span className={`tabular block text-xs ${weekCount >= target ? "font-medium text-good-ink" : "text-ink-3"}`}>
            {weekCount >= target ? `Meta da semana batida · ${weekCount}/${target}` : `${weekCount}/${target} nesta semana`}
          </span>
        )}
      </span>
      <span className="tabular inline-flex shrink-0 items-center gap-1 text-xs text-ink-2" title={`Sequência: ${streakLabel(habit, streak)}`}>
        <FlameIcon size={14} className={streak > 0 ? "text-[#eb6834]" : "text-ink-3"} />
        {streak}
        {quota && <span aria-hidden>sem</span>}
        <span className="sr-only"> {streakLabel(habit, streak).replace(/^\d+ /, "")}</span>
      </span>
    </button>
  );
}

/** Linha completa com histórico da semana, sequência e ações. */
export function HabitRow({ habit, onEdit }: { habit: Habit; onEdit: (h: Habit) => void }) {
  const { data, actions } = useStore();
  const timer = useFocusControls();
  const router = useRouter();
  const focusSec = focusSecondsFor(data.focusSessions, "habito", habit.id);
  const toast = useToast();
  const confirm = useConfirm();
  const today = useToday();
  const streak = habitStreak(habit, today);
  const quota = isWeeklyQuota(habit);
  const target = habit.timesPerWeek ?? 0;
  const weekCount = quota ? habitWeekCount(habit, today) : 0;
  // Todos os hábitos mostram a semana corrente (seg–dom).
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(today), i));
  const scheduledToday = isHabitScheduled(habit, today);

  async function remove() {
    if (
      await confirm({
        title: "Excluir hábito?",
        message: <>O hábito “{habit.name}” e todo o histórico de conclusões serão removidos.</>,
      })
    ) {
      actions.deleteHabit(habit.id);
      toast.success("Hábito excluído.");
    }
  }

  const actionButtons = (
    <>
      <IconButton
        label={`Focar em “${habit.name}”`}
        onClick={() => {
          timer.setLink({ type: "habito", id: habit.id });
          router.push("/foco");
        }}
      >
        <TimerIcon size={15} />
      </IconButton>
      <IconButton label={`Editar “${habit.name}”`} onClick={() => onEdit(habit)}>
        <PencilIcon size={15} />
      </IconButton>
      <IconButton label={`Excluir “${habit.name}”`} tone="danger" onClick={remove}>
        <TrashIcon size={15} />
      </IconButton>
    </>
  );

  return (
    <li className="group flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{habit.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-3">
            {frequencyLabel(habit)}
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <FlameIcon size={13} className={streak > 0 ? "text-[#eb6834]" : ""} />
              {streakLabel(habit, streak)}
            </span>
            {quota && (
              <>
                <span aria-hidden>·</span>
                <span className={`tabular ${weekCount >= target ? "font-medium text-good-ink" : ""}`}>
                  {weekCount >= target ? `Meta batida (${weekCount}/${target})` : `${weekCount}/${target} nesta semana`}
                </span>
              </>
            )}
            {focusSec > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1" title="Tempo de foco neste hábito">
                  <TimerIcon size={12} />
                  {formatDuration(focusSec)}
                </span>
              </>
            )}
            {!scheduledToday && (
              <>
                <span aria-hidden>·</span>
                <span>Folga hoje</span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center sm:hidden">{actionButtons}</div>
      </div>
      <div className="flex items-center gap-3">
        <ul className="flex gap-1.5" aria-label={`Semana atual de ${habit.name}`}>
          {weekDays.map((d) => {
            const future = d > today;
            const scheduled = isHabitScheduled(habit, d);
            const done = habit.completions.includes(d);
            const label = `${WEEKDAYS_LONG[weekday(d)]}, ${formatDate(d, "short")}: ${done ? "concluído" : scheduled ? "não concluído" : "dia de folga"}`;
            return (
              <li key={d} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] ${d === today ? "font-semibold text-ink" : "text-ink-3"}`} aria-hidden>
                  {WEEKDAYS_SHORT[weekday(d)].charAt(0)}
                </span>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={label}
                  title={future ? `${WEEKDAYS_LONG[weekday(d)]}: ainda não chegou` : label}
                  disabled={future}
                  onClick={() => actions.toggleHabit(habit.id, d)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    done
                      ? "border-good bg-good text-white"
                      : scheduled
                        ? "border-line-strong bg-surface text-transparent hover:border-ink-2"
                        : "border-dashed border-line bg-subtle text-transparent"
                  } ${d === today ? "ring-2 ring-ink/10 ring-offset-1" : ""}`}
                >
                  <CheckIcon size={13} strokeWidth={3} />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="hidden items-center sm:flex">{actionButtons}</div>
      </div>
    </li>
  );
}
