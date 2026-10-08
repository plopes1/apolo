import { addDays, addMonths, diffDays, monthKey, startOfWeek, weekday } from "./dates";
import { PRIORITY_WEIGHT } from "./labels";
import type { AppData, Asset, Cycle, FocusLink, FocusSession, Goal, Habit, Task, Transaction } from "./types";

// ---------- Metas ----------

/** Progresso de 0 a 100: usa valor atual/alvo quando houver; senão, marcos concluídos. */
export function goalProgress(goal: Goal): number {
  if (goal.status === "concluida") return 100;
  if (goal.targetValue !== null && goal.targetValue > 0 && goal.currentValue !== null) {
    return clamp((goal.currentValue / goal.targetValue) * 100);
  }
  if (goal.milestones.length > 0) {
    const done = goal.milestones.filter((m) => m.done).length;
    return clamp((done / goal.milestones.length) * 100);
  }
  return 0;
}

export function isGoalOverdue(goal: Goal, today: string): boolean {
  return goal.status !== "concluida" && goal.status !== "pausada" && goal.dueDate < today;
}

export type GoalDisplayStatus = Goal["status"] | "atrasada";

export function goalDisplayStatus(goal: Goal, today: string): GoalDisplayStatus {
  return isGoalOverdue(goal, today) ? "atrasada" : goal.status;
}

export function goalNextAction(goal: Goal, tasks: Task[]): string | null {
  const nextTask = tasks
    .filter((t) => t.goalId === goal.id && !t.done)
    .sort(compareTasks)[0];
  if (nextTask) return nextTask.title;
  const nextMilestone = goal.milestones.find((m) => !m.done);
  return nextMilestone ? nextMilestone.title : null;
}

export function cycleGoals(data: AppData, cycleId: string | null): Goal[] {
  return cycleId ? data.goals.filter((g) => g.cycleId === cycleId) : [];
}

/** Média do progresso das metas ativas (metas pausadas não contam). */
export function overallProgress(goals: Goal[]): number {
  const counted = goals.filter((g) => g.status !== "pausada");
  if (counted.length === 0) return 0;
  return counted.reduce((sum, g) => sum + goalProgress(g), 0) / counted.length;
}

export function goalCounts(goals: Goal[], today: string) {
  let concluidas = 0;
  let emAndamento = 0;
  let atrasadas = 0;
  let naoIniciadas = 0;
  let pausadas = 0;
  for (const g of goals) {
    if (g.status === "concluida") concluidas++;
    else if (isGoalOverdue(g, today)) atrasadas++;
    else if (g.status === "em_andamento") emAndamento++;
    else if (g.status === "pausada") pausadas++;
    else naoIniciadas++;
  }
  return { concluidas, emAndamento, atrasadas, naoIniciadas, pausadas, total: goals.length };
}

// ---------- Ciclo ----------

export function cycleTimeline(cycle: Cycle, today: string) {
  const totalDays = diffDays(cycle.startDate, cycle.endDate) + 1;
  const rawElapsed = diffDays(cycle.startDate, today) + 1;
  const currentDay = Math.min(Math.max(rawElapsed, 0), totalDays);
  const remaining = Math.max(diffDays(today, cycle.endDate), 0);
  const notStarted = today < cycle.startDate;
  const finished = today > cycle.endDate;
  return {
    totalDays,
    currentDay,
    remaining: notStarted ? totalDays : remaining,
    timePct: clamp((currentDay / totalDays) * 100),
    notStarted,
    finished,
  };
}

export function getActiveCycle(data: AppData): Cycle | null {
  return data.cycles.find((c) => c.id === data.activeCycleId) ?? null;
}

/** Registra (ou atualiza) o progresso do dia para o gráfico do ciclo. */
export function withProgressSnapshot(data: AppData, today: string): AppData {
  const cycle = getActiveCycle(data);
  if (!cycle || today < cycle.startDate || today > cycle.endDate) return data;
  const progress = Math.round(overallProgress(cycleGoals(data, cycle.id)) * 10) / 10;
  const others = data.progressHistory.filter((s) => !(s.cycleId === cycle.id && s.date === today));
  return {
    ...data,
    progressHistory: [...others, { cycleId: cycle.id, date: today, progress }].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  };
}

// ---------- Tarefas ----------

export function compareTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const ad = a.dueDate ?? "9999-12-31";
  const bd = b.dueDate ?? "9999-12-31";
  if (ad !== bd) return ad.localeCompare(bd);
  return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
}

export function isTaskOverdue(task: Task, today: string): boolean {
  return !task.done && task.dueDate !== null && task.dueDate < today;
}

// ---------- Hábitos ----------

/** Hábitos com meta semanal podem ser feitos em qualquer dia. */
export function isHabitScheduled(habit: Habit, date: string): boolean {
  if (habit.frequency === "dias_especificos") return habit.days.includes(weekday(date));
  return true;
}

export function isWeeklyQuota(habit: Habit): boolean {
  return habit.frequency === "vezes_por_semana" && (habit.timesPerWeek ?? 0) > 0;
}

/** Conclusões na semana (segunda a domingo) que contém `date`. */
export function habitWeekCount(habit: Habit, date: string): number {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  return habit.completions.filter((c) => c >= start && c <= end).length;
}

/**
 * Sequência atual. Para hábitos diários ou de dias fixos: dias programados consecutivos.
 * Para "X vezes por semana": semanas consecutivas com a meta batida.
 * O período em andamento (hoje ou a semana atual) ainda não quebra a sequência.
 */
export function habitStreak(habit: Habit, today: string): number {
  if (isWeeklyQuota(habit)) {
    const target = habit.timesPerWeek!;
    let streak = 0;
    let week = startOfWeek(today);
    if (habitWeekCount(habit, week) >= target) streak++;
    week = addDays(week, -7);
    for (let i = 0; i < 104 && habitWeekCount(habit, week) >= target; i++) {
      streak++;
      week = addDays(week, -7);
    }
    return streak;
  }
  const done = new Set(habit.completions);
  let streak = 0;
  let cursor = today;
  if (!done.has(today)) cursor = addDays(today, -1);
  const floor = addDays(today, -730);
  while (cursor >= floor) {
    if (isHabitScheduled(habit, cursor)) {
      if (!done.has(cursor)) break;
      streak++;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function streakLabel(habit: Habit, n: number): string {
  if (isWeeklyQuota(habit)) return n === 1 ? "1 semana seguida" : `${n} semanas seguidas`;
  return n === 1 ? "1 dia seguido" : `${n} dias seguidos`;
}

// ---------- Finanças ----------

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  saved: number;
  fixed: number;
  variable: number;
}

export function monthSummary(transactions: Transaction[], key: string): MonthSummary {
  let income = 0;
  let expense = 0;
  let fixed = 0;
  let variable = 0;
  for (const t of transactions) {
    if (monthKey(t.date) !== key) continue;
    if (t.type === "receita") income += t.amount;
    else {
      expense += t.amount;
      if (t.nature === "fixa") fixed += t.amount;
      else variable += t.amount;
    }
  }
  const balance = income - expense;
  return { income, expense, balance, saved: Math.max(balance, 0), fixed, variable };
}

export interface MonthPoint {
  key: string;
  receitas: number;
  despesas: number;
  poupado: number;
}

export function monthlySeries(transactions: Transaction[], endKey: string, months = 6): MonthPoint[] {
  const points: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = addMonths(endKey, -i);
    const s = monthSummary(transactions, key);
    points.push({ key, receitas: s.income, despesas: s.expense, poupado: s.saved });
  }
  return points;
}

export function expensesByCategory(transactions: Transaction[], key: string) {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "despesa" || monthKey(t.date) !== key) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

// ---------- Patrimônio ----------

/** Saldo do ativo no fim do dia `date` (0 antes do primeiro registro). */
export function assetBalanceAt(asset: Asset, date: string): number {
  let value = 0;
  for (const h of asset.history) {
    if (h.date <= date) value = h.balance;
    else break;
  }
  return value;
}

export function netWorth(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + a.balance, 0);
}

export function reserveTotal(assets: Asset[]): number {
  return netWorth(assets.filter((a) => a.type === "reserva"));
}

/**
 * Custo mensal médio para a reserva: média das despesas dos últimos 3 meses
 * fechados que tiveram lançamentos; sem histórico, usa o mês atual.
 */
export function averageMonthlyCost(transactions: Transaction[], today: string) {
  const current = monthKey(today);
  const months = [1, 2, 3]
    .map((i) => addMonths(current, -i))
    .map((key) => ({ key, expense: monthSummary(transactions, key).expense }))
    .filter((m) => m.expense > 0);
  if (months.length > 0) {
    return { value: Math.round(months.reduce((s, m) => s + m.expense, 0) / months.length), months: months.length, basis: "fechados" as const };
  }
  const now = monthSummary(transactions, current).expense;
  return { value: now, months: now > 0 ? 1 : 0, basis: "atual" as const };
}

export function emergencyPlan(data: AppData, today: string) {
  const cost = averageMonthlyCost(data.transactions, today);
  const { emergencyMonths, emergencyTarget } = data.settings;
  const target = emergencyTarget ?? cost.value * emergencyMonths;
  const saved = reserveTotal(data.assets);
  return {
    saved,
    target,
    cost,
    mode: emergencyTarget === null ? ("meses" as const) : ("valor" as const),
    progress: target > 0 ? Math.min((saved / target) * 100, 100) : 0,
    remaining: Math.max(target - saved, 0),
    monthsCovered: cost.value > 0 ? saved / cost.value : null,
  };
}

export interface NetWorthPoint {
  key: string;
  total: number;
  reserva: number;
}

/** Patrimônio no fim de cada mês (o mês atual usa o saldo de hoje). */
export function netWorthSeries(assets: Asset[], today: string, months = 12): NetWorthPoint[] {
  const current = monthKey(today);
  const points: NetWorthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = addMonths(current, -i);
    const end = i === 0 ? today : addDays(`${addMonths(key, 1)}-01`, -1);
    let total = 0;
    let reserva = 0;
    for (const a of assets) {
      const v = assetBalanceAt(a, end);
      total += v;
      if (a.type === "reserva") reserva += v;
    }
    points.push({ key, total, reserva });
  }
  return points;
}

// ---------- Foco ----------

export function focusLinkLabel(data: AppData, link: FocusLink | null): string {
  if (!link) return "Sem vínculo";
  if (link.type === "tarefa") return data.tasks.find((t) => t.id === link.id)?.title ?? "Tarefa excluída";
  return data.habits.find((h) => h.id === link.id)?.name ?? "Hábito excluído";
}

export function focusSecondsOn(sessions: FocusSession[], date: string): number {
  return sessions.reduce((s, f) => (f.date === date ? s + f.seconds : s), 0);
}

export function focusSecondsBetween(sessions: FocusSession[], from: string, to: string): number {
  return sessions.reduce((s, f) => (f.date >= from && f.date <= to ? s + f.seconds : s), 0);
}

/** Total de foco vinculado a uma tarefa ou hábito. */
export function focusSecondsFor(sessions: FocusSession[], type: FocusLink["type"], id: string): number {
  return sessions.reduce((s, f) => (f.link?.type === type && f.link.id === id ? s + f.seconds : s), 0);
}

export function focusDailySeries(sessions: FocusSession[], today: string, days: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);
    return { date, minutes: Math.round(focusSecondsOn(sessions, date) / 60) };
  });
}

/** Tempo por tarefa/hábito no período (usa o nome atual quando o item ainda existe). */
export function focusByLink(data: AppData, from: string, to: string) {
  const map = new Map<string, { category: string; amount: number }>();
  for (const f of data.focusSessions) {
    if (f.date < from || f.date > to) continue;
    const key = f.link ? `${f.link.type}:${f.link.id}` : "none";
    const current = f.link?.type === "tarefa" ? data.tasks.find((t) => t.id === f.link!.id)?.title : data.habits.find((h) => h.id === f.link?.id)?.name;
    const name = f.link ? (current ?? f.label) : "Sem vínculo";
    const entry = map.get(key) ?? { category: name, amount: 0 };
    entry.amount += f.seconds;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

/** Dias seguidos com pelo menos uma sessão de foco (hoje ainda sem foco não quebra). */
export function focusStreak(sessions: FocusSession[], today: string): number {
  const days = new Set(sessions.map((s) => s.date));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
