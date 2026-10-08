"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { toISODate } from "@/lib/dates";
import { formatClock, formatDuration } from "@/lib/format";
import { focusLinkLabel } from "@/lib/metrics";
import type { FocusLink } from "@/lib/types";
import { useStore } from "./app-store";

export type TimerMode = "foco" | "pausa_curta" | "pausa_longa";

export const MODE_LABELS: Record<TimerMode, string> = {
  foco: "Foco",
  pausa_curta: "Pausa curta",
  pausa_longa: "Pausa longa",
};

interface FinishedInfo {
  mode: TimerMode;
  seconds: number;
  link: FocusLink | null;
}

interface TimerState {
  mode: TimerMode;
  status: "idle" | "running" | "paused";
  /** Duração do período atual em segundos (fixada ao iniciar). */
  durationSec: number;
  /** Tempo acumulado antes do último início/retomada. */
  elapsedMs: number;
  runningSince: number | null;
  startedAt: string | null;
  link: FocusLink | null;
  /** Sessões de foco concluídas desde a última pausa longa. */
  focusCount: number;
  finished: FinishedInfo | null;
}

const STORAGE_KEY = "apolo:timer";
const MIN_SAVED_SECONDS = 60;

function readStored(): TimerState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TimerState;
    if (!["foco", "pausa_curta", "pausa_longa"].includes(s.mode) || !["idle", "running", "paused"].includes(s.status)) return null;
    return s;
  } catch {
    return null;
  }
}

function elapsedOf(s: TimerState, now: number) {
  return s.elapsedMs + (s.status === "running" && s.runningSince ? now - s.runningSince : 0);
}

/** Toque curto gerado no navegador (sem arquivo de áudio). */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.22, 0.44].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = i === 2 ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.22);
    });
    window.setTimeout(() => ctx.close(), 1200);
  } catch {
    // Áudio indisponível: o aviso visual continua.
  }
}

function useTimerValue() {
  const { data, actions } = useStore();
  const toast = useToast();
  const settings = data.settings;
  const durationFor = useCallback(
    (mode: TimerMode) =>
      60 * (mode === "foco" ? settings.focusMinutes : mode === "pausa_curta" ? settings.shortBreakMinutes : settings.longBreakMinutes),
    [settings.focusMinutes, settings.shortBreakMinutes, settings.longBreakMinutes],
  );

  const [state, setState] = useState<TimerState>(
    () =>
      readStored() ?? {
        mode: "foco",
        status: "idle",
        durationSec: durationFor("foco"),
        elapsedMs: 0,
        runningSince: null,
        startedAt: null,
        link: null,
        focusCount: 0,
        finished: null,
      },
  );
  const [now, setNow] = useState(() => Date.now());

  // Valores atuais para o intervalo e para as ações (sem efeitos dentro de updaters do React).
  const dataRef = useRef(data);
  const stateRef = useRef(state);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const commitState = useCallback((next: TimerState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Sem armazenamento: o timer funciona até recarregar.
    }
  }, [state]);

  const saveFocus = useCallback(
    (s: TimerState, seconds: number, completed: boolean) => {
      const startedMs = s.startedAt ? Date.parse(s.startedAt) : Date.now() - seconds * 1000;
      actions.addFocusSession({
        date: toISODate(new Date(startedMs)),
        startedAt: new Date(startedMs).toISOString(),
        seconds,
        completed,
        link: s.link,
        label: focusLinkLabel(dataRef.current, s.link),
      });
    },
    [actions],
  );

  const complete = useCallback(
    (s: TimerState): TimerState => {
      if (dataRef.current.settings.focusSound) chime();
      if (s.mode === "foco") {
        saveFocus(s, s.durationSec, true);
        const count = s.focusCount + 1;
        const next: TimerMode = count % dataRef.current.settings.longBreakEvery === 0 ? "pausa_longa" : "pausa_curta";
        toast.success(`Foco concluído: ${formatDuration(s.durationSec)}. Hora de uma ${MODE_LABELS[next].toLowerCase()}.`);
        return {
          ...s,
          mode: next,
          status: "idle",
          durationSec: durationFor(next),
          elapsedMs: 0,
          runningSince: null,
          startedAt: null,
          focusCount: next === "pausa_longa" ? 0 : count,
          finished: { mode: "foco", seconds: s.durationSec, link: s.link },
        };
      }
      toast.success("Pausa encerrada. Pronto para mais um foco?");
      return {
        ...s,
        mode: "foco",
        status: "idle",
        durationSec: durationFor("foco"),
        elapsedMs: 0,
        runningSince: null,
        startedAt: null,
        finished: { mode: s.mode, seconds: s.durationSec, link: s.link },
      };
    },
    [durationFor, saveFocus, toast],
  );

  // Relógio: recalcula a partir do horário real (preciso mesmo com a aba em segundo plano).
  useEffect(() => {
    if (state.status !== "running") return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const s = stateRef.current;
      if (s.status === "running" && elapsedOf(s, t) >= s.durationSec * 1000) commitState(complete(s));
    };
    const id = window.setInterval(tick, 500);
    const first = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, [state.status, complete, commitState]);

  // Parado, a duração acompanha as configurações; em andamento, vale a fixada ao iniciar.
  const durationSec = state.status === "idle" ? durationFor(state.mode) : state.durationSec;
  const remainingSec = Math.max(0, durationSec - elapsedOf(state, now) / 1000);
  const elapsedSec = durationSec - remainingSec;

  // Título da aba mostra o tempo restante.
  useEffect(() => {
    const base = "Apolo — painel pessoal";
    document.title = state.status === "idle" ? base : `${formatClock(remainingSec)} · ${MODE_LABELS[state.mode]} — Apolo`;
  }, [remainingSec, state.status, state.mode]);
  useEffect(() => () => void (document.title = "Apolo — painel pessoal"), []);

  const controls = useMemo(() => {
    const idle = (s: TimerState): TimerState => ({ ...s, status: "idle", elapsedMs: 0, runningSince: null, startedAt: null, durationSec: durationFor(s.mode) });
    return {
      start() {
        const s = stateRef.current;
        if (s.status === "running") return;
        const t = Date.now();
        setNow(t);
        commitState({
          ...s,
          status: "running",
          runningSince: t,
          startedAt: s.startedAt ?? new Date(t).toISOString(),
          durationSec: s.status === "idle" ? durationFor(s.mode) : s.durationSec,
          finished: null,
        });
      },
      pause() {
        const s = stateRef.current;
        if (s.status === "running") commitState({ ...s, status: "paused", elapsedMs: elapsedOf(s, Date.now()), runningSince: null });
      },
      /** Encerra agora; o foco com 1 minuto ou mais é salvo como sessão interrompida. */
      stop() {
        const s = stateRef.current;
        if (s.status === "idle") return;
        const seconds = Math.floor(elapsedOf(s, Date.now()) / 1000);
        if (s.mode === "foco" && seconds >= MIN_SAVED_SECONDS) {
          saveFocus(s, seconds, false);
          toast.success(`Sessão salva: ${formatDuration(seconds)} de foco.`);
        }
        // Encerrar uma pausa antes do fim já prepara o próximo foco.
        commitState(s.mode === "foco" ? idle(s) : idle({ ...s, mode: "foco" }));
      },
      discard() {
        commitState(idle(stateRef.current));
      },
      setMode(mode: TimerMode) {
        const s = stateRef.current;
        if (s.status === "idle") commitState({ ...s, mode, durationSec: durationFor(mode), finished: null });
      },
      setLink(link: FocusLink | null) {
        commitState({ ...stateRef.current, link });
      },
      dismissFinished() {
        commitState({ ...stateRef.current, finished: null });
      },
    };
  }, [durationFor, saveFocus, toast, commitState]);

  return { ...state, durationSec, remainingSec, elapsedSec, canSave: state.mode === "foco" && elapsedSec >= MIN_SAVED_SECONDS, ...controls, controls };
}

type TimerValue = ReturnType<typeof useTimerValue>;
type TimerControls = TimerValue["controls"];
const TimerContext = createContext<TimerValue | null>(null);
// Ações estáveis em contexto próprio: quem só precisa delas não re-renderiza a cada segundo.
const ControlsContext = createContext<TimerControls | null>(null);

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const value = useTimerValue();
  return (
    <ControlsContext.Provider value={value.controls}>
      <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
    </ControlsContext.Provider>
  );
}

export function useFocusControls() {
  const ctx = useContext(ControlsContext);
  if (!ctx) throw new Error("useFocusControls deve ser usado dentro de FocusTimerProvider");
  return ctx;
}

export function useFocusTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useFocusTimer deve ser usado dentro de FocusTimerProvider");
  return ctx;
}
