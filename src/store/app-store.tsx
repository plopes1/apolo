"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { todayISO } from "@/lib/dates";
import { createId } from "@/lib/id";
import { withProgressSnapshot } from "@/lib/metrics";
import { STORAGE_KEY, repository } from "@/lib/repository";
import { createEmptyData } from "@/lib/seed";
import type { AppData, Asset, Cycle, FocusSession, Goal, Habit, Review, Settings, Task, Transaction, WeeklyPriority } from "@/lib/types";

export type GoalInput = Omit<Goal, "id" | "createdAt" | "updatedAt">;
export type TaskInput = Omit<Task, "id" | "createdAt" | "completedAt">;
export type HabitInput = Omit<Habit, "id" | "createdAt" | "completions">;
export type TransactionInput = Omit<Transaction, "id" | "createdAt">;
export type ReviewInput = Omit<Review, "id" | "createdAt">;
export type CycleInput = Omit<Cycle, "id" | "createdAt">;
export type FocusSessionInput = Omit<FocusSession, "id" | "createdAt">;
export type AssetInput = Pick<Asset, "name" | "type" | "institution">;

interface StoreValue {
  data: AppData;
  ready: boolean;
  saveError: string | null;
  actions: ReturnType<typeof createActions>;
}

const StoreContext = createContext<StoreValue | null>(null);

type Commit = (recipe: (d: AppData) => AppData) => void;

function createActions(commit: Commit) {
  const now = () => new Date().toISOString();
  const replaceIn = <T extends { id: string }>(list: T[], id: string, patch: (item: T) => T) =>
    list.map((item) => (item.id === id ? patch(item) : item));

  return {
    // Metas
    addGoal(input: GoalInput): string {
      const id = createId();
      commit((d) => ({ ...d, goals: [...d.goals, { ...input, id, createdAt: now(), updatedAt: now() }] }));
      return id;
    },
    updateGoal(id: string, input: Partial<GoalInput>) {
      commit((d) => ({ ...d, goals: replaceIn(d.goals, id, (g) => ({ ...g, ...input, updatedAt: now() })) }));
    },
    deleteGoal(id: string) {
      commit((d) => ({
        ...d,
        goals: d.goals.filter((g) => g.id !== id),
        tasks: d.tasks.map((t) => (t.goalId === id ? { ...t, goalId: null } : t)),
        weeklyPriorities: d.weeklyPriorities.map((w) => (w.goalId === id ? { ...w, goalId: null } : w)),
      }));
    },
    toggleMilestone(goalId: string, milestoneId: string) {
      commit((d) => ({
        ...d,
        goals: replaceIn(d.goals, goalId, (g) => ({
          ...g,
          status: g.status === "nao_iniciada" ? "em_andamento" : g.status,
          milestones: g.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m)),
          updatedAt: now(),
        })),
      }));
    },

    // Ciclos
    startCycle(input: CycleInput, newGoals: Omit<GoalInput, "cycleId">[], carryOverGoalIds: string[]) {
      const cycleId = createId();
      commit((d) => ({
        ...d,
        activeCycleId: cycleId,
        cycles: [...d.cycles, { ...input, id: cycleId, createdAt: now() }],
        goals: [
          ...d.goals.map((g) => (carryOverGoalIds.includes(g.id) ? { ...g, cycleId, updatedAt: now() } : g)),
          ...newGoals.map((g) => ({ ...g, cycleId, id: createId(), createdAt: now(), updatedAt: now() })),
        ],
      }));
    },
    updateCycle(id: string, input: Partial<CycleInput>) {
      commit((d) => ({ ...d, cycles: replaceIn(d.cycles, id, (c) => ({ ...c, ...input })) }));
    },
    setActiveCycle(id: string) {
      commit((d) => ({ ...d, activeCycleId: id }));
    },
    setWeeklyPriority(priority: WeeklyPriority) {
      commit((d) => ({
        ...d,
        weeklyPriorities: [
          ...d.weeklyPriorities.filter((w) => !(w.cycleId === priority.cycleId && w.weekStart === priority.weekStart)),
          priority,
        ],
      }));
    },

    // Tarefas
    addTask(input: TaskInput) {
      commit((d) => ({
        ...d,
        tasks: [...d.tasks, { ...input, id: createId(), createdAt: now(), completedAt: input.done ? todayISO() : null }],
      }));
    },
    updateTask(id: string, input: Partial<TaskInput>) {
      commit((d) => ({
        ...d,
        tasks: replaceIn(d.tasks, id, (t) => {
          const next = { ...t, ...input };
          if (input.done !== undefined && input.done !== t.done) next.completedAt = input.done ? todayISO() : null;
          return next;
        }),
      }));
    },
    toggleTask(id: string) {
      commit((d) => ({
        ...d,
        tasks: replaceIn(d.tasks, id, (t) => ({ ...t, done: !t.done, completedAt: t.done ? null : todayISO() })),
      }));
    },
    deleteTask(id: string) {
      commit((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
    },

    // Hábitos
    addHabit(input: HabitInput) {
      commit((d) => ({ ...d, habits: [...d.habits, { ...input, id: createId(), completions: [], createdAt: todayISO() }] }));
    },
    updateHabit(id: string, input: Partial<HabitInput>) {
      commit((d) => ({ ...d, habits: replaceIn(d.habits, id, (h) => ({ ...h, ...input })) }));
    },
    toggleHabit(id: string, date: string) {
      commit((d) => ({
        ...d,
        habits: replaceIn(d.habits, id, (h) => ({
          ...h,
          completions: h.completions.includes(date)
            ? h.completions.filter((c) => c !== date)
            : [...h.completions, date].sort(),
        })),
      }));
    },
    deleteHabit(id: string) {
      commit((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id) }));
    },

    // Finanças
    addTransaction(input: TransactionInput) {
      commit((d) => ({ ...d, transactions: [{ ...input, id: createId(), createdAt: now() }, ...d.transactions] }));
    },
    updateTransaction(id: string, input: Partial<TransactionInput>) {
      commit((d) => ({ ...d, transactions: replaceIn(d.transactions, id, (t) => ({ ...t, ...input })) }));
    },
    deleteTransaction(id: string) {
      commit((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
    },

    // Patrimônio
    addAsset(input: AssetInput, balance: number, date: string) {
      commit((d) => ({
        ...d,
        assets: [...d.assets, { ...input, id: createId(), balance, history: [{ date, balance }], createdAt: now(), updatedAt: now() }],
      }));
    },
    updateAsset(id: string, input: Partial<AssetInput>) {
      commit((d) => ({ ...d, assets: replaceIn(d.assets, id, (a) => ({ ...a, ...input, updatedAt: now() })) }));
    },
    /** Registra o saldo em uma data; o saldo atual passa a ser o do registro mais recente. */
    recordBalance(id: string, date: string, balance: number) {
      commit((d) => ({
        ...d,
        assets: replaceIn(d.assets, id, (a) => {
          const history = [...a.history.filter((h) => h.date !== date), { date, balance }].sort((x, y) => x.date.localeCompare(y.date));
          return { ...a, history, balance: history[history.length - 1].balance, updatedAt: now() };
        }),
      }));
    },
    deleteAsset(id: string) {
      commit((d) => ({ ...d, assets: d.assets.filter((a) => a.id !== id) }));
    },

    // Foco
    addFocusSession(input: FocusSessionInput): string {
      const id = createId();
      commit((d) => ({ ...d, focusSessions: [...d.focusSessions, { ...input, id, createdAt: now() }] }));
      return id;
    },
    deleteFocusSession(id: string) {
      commit((d) => ({ ...d, focusSessions: d.focusSessions.filter((f) => f.id !== id) }));
    },

    // Revisões
    addReview(input: ReviewInput) {
      commit((d) => ({ ...d, reviews: [{ ...input, id: createId(), createdAt: now() }, ...d.reviews] }));
    },
    updateReview(id: string, input: Partial<ReviewInput>) {
      commit((d) => ({ ...d, reviews: replaceIn(d.reviews, id, (r) => ({ ...r, ...input })) }));
    },
    deleteReview(id: string) {
      commit((d) => ({ ...d, reviews: d.reviews.filter((r) => r.id !== id) }));
    },

    // Configurações e dados
    updateSettings(input: Partial<Settings>) {
      commit((d) => ({ ...d, settings: { ...d.settings, ...input } }));
    },
    replaceAll(data: AppData) {
      commit(() => data);
    },
    clearAll() {
      commit(() => createEmptyData());
    },
  };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    repository
      .load()
      .catch(() => null)
      .then((loaded) => {
        if (alive) setData(loaded ?? createEmptyData());
      });

    // Mantém abas abertas em sincronia.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      repository.load().then((loaded) => {
        if (loaded) {
          lastSaved.current = e.newValue;
          setData(loaded);
        }
      });
    };
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const serialized = JSON.stringify(data);
    if (serialized === lastSaved.current) return;
    repository
      .save(data)
      .then(() => {
        lastSaved.current = serialized;
        setSaveError(null);
      })
      .catch(() => setSaveError("Não foi possível salvar no navegador. O armazenamento pode estar cheio ou bloqueado."));
  }, [data]);

  const commit = useCallback<Commit>((recipe) => {
    setData((prev) => {
      if (!prev) return prev;
      return withProgressSnapshot({ ...recipe(prev), updatedAt: new Date().toISOString() }, todayISO());
    });
  }, []);

  const actions = useMemo(() => createActions(commit), [commit]);

  const value = useMemo<StoreValue | null>(
    () => (data ? { data, ready: true, saveError, actions } : null),
    [data, saveError, actions],
  );

  if (!value) {
    return <LoadingScreen />;
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-ink-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" aria-hidden />
        Carregando seus dados…
      </div>
    </div>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de AppStoreProvider");
  return ctx;
}

/** Data de hoje, estável durante a sessão (recalculada ao voltar para a aba). */
export function useToday() {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const refresh = () => setToday(todayISO());
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);
  return today;
}
