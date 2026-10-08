"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, PauseIcon, PlayIcon, StopIcon, TimerIcon, XIcon } from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { formatClock, formatDuration } from "@/lib/format";
import { compareTasks, focusLinkLabel, isHabitScheduled } from "@/lib/metrics";
import type { FocusLink } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";
import { MODE_LABELS, useFocusTimer, type TimerMode } from "@/store/focus-timer";

const MODE_COLORS: Record<TimerMode, string> = { foco: "#2a78d6", pausa_curta: "#1baf7a", pausa_longa: "#1baf7a" };

function encode(link: FocusLink | null) {
  return link ? `${link.type}:${link.id}` : "";
}
function decode(value: string): FocusLink | null {
  const [type, id] = value.split(":");
  return type === "tarefa" || type === "habito" ? { type, id } : null;
}

/** Seletor de tarefa ou hábito para a sessão de foco. */
export function FocusLinkPicker() {
  const { data } = useStore();
  const today = useToday();
  const timer = useFocusTimer();
  const id = useId();
  const tasks = data.tasks.filter((t) => !t.done || t.id === timer.link?.id).sort(compareTasks);
  const habits = data.habits.filter((h) => isHabitScheduled(h, today) || h.id === timer.link?.id);
  // Vínculo com item excluído não tem opção na lista: mostra "Sem vínculo".
  const linkExists = !timer.link || (timer.link.type === "tarefa" ? tasks : habits).some((x) => x.id === timer.link!.id);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        Focar em
      </label>
      <select
        id={id}
        value={linkExists ? encode(timer.link) : ""}
        onChange={(e) => timer.setLink(decode(e.target.value))}
        className="h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none"
      >
        <option value="">Sem vínculo (foco livre)</option>
        {tasks.length > 0 && (
          <optgroup label="Tarefas pendentes">
            {tasks.map((t) => (
              <option key={t.id} value={`tarefa:${t.id}`}>
                {t.title}
              </option>
            ))}
          </optgroup>
        )}
        {habits.length > 0 && (
          <optgroup label="Hábitos de hoje">
            {habits.map((h) => (
              <option key={h.id} value={`habito:${h.id}`}>
                {h.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {timer.status !== "idle" && <p className="text-xs text-ink-3">Você pode trocar o vínculo durante a sessão; vale o que estiver escolhido ao terminar.</p>}
    </div>
  );
}

function Ring({ progress, color, children }: { progress: number; color: string; children: React.ReactNode }) {
  const r = 104;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[260px]">
      <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="120" cy="120" r={r} fill="none" stroke="#ebeae6" strokeWidth="10" />
        <circle
          cx="120"
          cy="120"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(Math.max(progress, 0), 1))}
          className="transition-[stroke-dashoffset] duration-500 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function FocusTimerCard() {
  const { data, actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const timer = useFocusTimer();
  const progress = timer.durationSec ? timer.elapsedSec / timer.durationSec : 0;
  const every = data.settings.longBreakEvery;
  const finished = timer.finished;
  const finishedTask = finished?.link?.type === "tarefa" ? data.tasks.find((t) => t.id === finished.link!.id) : undefined;
  const finishedHabit = finished?.link?.type === "habito" ? data.habits.find((h) => h.id === finished.link!.id) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <SegmentedControl
          label="Tipo de período"
          value={timer.mode}
          onChange={(m) => timer.setMode(m)}
          options={(["foco", "pausa_curta", "pausa_longa"] as const).map((m) => ({ value: m, label: MODE_LABELS[m] }))}
        />
      </div>
      {timer.status !== "idle" && <p className="-mt-4 text-center text-xs text-ink-3">Encerre o período atual para trocar de modo.</p>}

      <Ring progress={progress} color={MODE_COLORS[timer.mode]}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{MODE_LABELS[timer.mode]}</p>
        <p className="tabular mt-1 text-[54px] font-semibold leading-none tracking-tight" role="timer" aria-live="off" aria-label={`Tempo restante ${formatClock(timer.remainingSec)}`}>
          {formatClock(timer.remainingSec)}
        </p>
        <p className="mt-2 max-w-[180px] truncate text-xs text-ink-2">
          {timer.status === "paused" ? "Pausado" : timer.mode === "foco" ? focusLinkLabel(data, timer.link) : "Descanse um pouco"}
        </p>
      </Ring>

      <div className="flex items-center justify-center gap-2" aria-label={`Sessão ${timer.focusCount + 1} de ${every} até a pausa longa`}>
        {Array.from({ length: every }, (_, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i < timer.focusCount ? "bg-accent" : "bg-line-strong"}`} aria-hidden />
        ))}
        <span className="ml-1 text-xs text-ink-3">pausa longa a cada {every}</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {timer.status === "running" ? (
          <Button variant="primary" className="h-12 min-w-[150px] px-6 text-[15px]" icon={<PauseIcon size={16} />} onClick={timer.pause}>
            Pausar
          </Button>
        ) : (
          <Button variant="primary" className="h-12 min-w-[150px] px-6 text-[15px]" icon={<PlayIcon size={16} />} onClick={timer.start}>
            {timer.status === "paused" ? "Retomar" : timer.mode === "foco" ? "Iniciar foco" : "Iniciar pausa"}
          </Button>
        )}
        {timer.status !== "idle" && (
          <>
            <Button className="h-12" icon={<StopIcon size={14} />} onClick={timer.stop} title={timer.canSave ? "Encerrar e salvar o tempo de foco" : undefined}>
              {timer.mode === "foco" && timer.canSave ? "Encerrar e salvar" : "Encerrar"}
            </Button>
            {timer.mode === "foco" && timer.canSave && (
              <Button variant="ghost" className="h-12" onClick={timer.discard}>
                Descartar
              </Button>
            )}
          </>
        )}
      </div>
      {timer.status !== "idle" && timer.mode === "foco" && !timer.canSave && <p className="-mt-3 text-center text-xs text-ink-3">Sessões com menos de 1 minuto não são salvas.</p>}

      {finished && (
        <div role="status" className="rounded-2xl bg-good-soft p-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-good text-white" aria-hidden>
              <CheckIcon size={14} strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-good-ink">
                {finished.mode === "foco" ? `Sessão de ${formatDuration(finished.seconds)} concluída` : `${MODE_LABELS[finished.mode]} concluída`}
              </p>
              {finished.mode === "foco" && <p className="mt-0.5 text-ink-2">{focusLinkLabel(data, finished.link)}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {finishedTask && !finishedTask.done && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<CheckIcon size={14} />}
                    onClick={() => {
                      actions.toggleTask(finishedTask.id);
                      toast.success("Tarefa concluída.");
                      timer.setLink(null);
                      timer.dismissFinished();
                    }}
                  >
                    Concluir tarefa
                  </Button>
                )}
                {finishedHabit && !finishedHabit.completions.includes(today) && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<CheckIcon size={14} />}
                    onClick={() => {
                      actions.toggleHabit(finishedHabit.id, today);
                      toast.success(`“${finishedHabit.name}” marcado como feito hoje.`);
                      timer.dismissFinished();
                    }}
                  >
                    Marcar hábito como feito hoje
                  </Button>
                )}
                {finished.mode === "foco" && (
                  <Button size="sm" icon={<PlayIcon size={13} />} onClick={timer.start}>
                    Iniciar {MODE_LABELS[timer.mode].toLowerCase()}
                  </Button>
                )}
              </div>
            </div>
            <button type="button" onClick={timer.dismissFinished} aria-label="Fechar aviso" className="rounded-full p-1 text-ink-3 hover:text-ink">
              <XIcon size={14} />
            </button>
          </div>
        </div>
      )}

      <FocusLinkPicker />
    </div>
  );
}

/** Timer compacto exibido fora da página Foco enquanto há um período em andamento. */
export function FocusMiniTimer({ className = "" }: { className?: string }) {
  const timer = useFocusTimer();
  const pathname = usePathname();
  if (timer.status === "idle" || pathname === "/foco") return null;
  return (
    <div className={`flex items-center gap-1 rounded-full border border-line bg-surface py-1 pl-1 pr-1 shadow-lg ${className}`}>
      <button
        type="button"
        onClick={timer.status === "running" ? timer.pause : timer.start}
        aria-label={timer.status === "running" ? "Pausar timer" : "Retomar timer"}
        className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${timer.mode === "foco" ? "bg-accent" : "bg-good"}`}
      >
        {timer.status === "running" ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
      </button>
      <Link href="/foco" className="flex items-center gap-2 rounded-full px-2 py-1 text-sm hover:bg-subtle">
        <span className="tabular font-semibold">{formatClock(timer.remainingSec)}</span>
        <span className="hidden text-xs text-ink-3 sm:inline">{timer.status === "paused" ? "Pausado" : MODE_LABELS[timer.mode]}</span>
        <TimerIcon size={14} className="text-ink-3" />
        <span className="sr-only">Abrir página de foco</span>
      </Link>
    </div>
  );
}
