// Modelo de dados da aplicação. Datas são strings ISO locais "YYYY-MM-DD".
// Valores monetários são inteiros em centavos para evitar erros de ponto flutuante.

export type Area =
  | "carreira"
  | "saude"
  | "financas"
  | "estudos"
  | "relacionamento"
  | "pessoal";

export type Priority = "alta" | "media" | "baixa";

export type GoalStatus = "nao_iniciada" | "em_andamento" | "concluida" | "pausada";

export interface Milestone {
  id: string;
  title: string;
  dueDate: string | null;
  done: boolean;
}

export interface Goal {
  id: string;
  cycleId: string;
  title: string;
  description: string;
  why: string;
  area: Area;
  startDate: string;
  dueDate: string;
  measurableResult: string;
  currentValue: number | null;
  targetValue: number | null;
  unit: string;
  priority: Priority;
  status: GoalStatus;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  focusAreas: Area[];
  createdAt: string;
}

export interface WeeklyPriority {
  cycleId: string;
  weekStart: string;
  text: string;
  goalId: string | null;
}

export interface ProgressSnapshot {
  cycleId: string;
  date: string;
  progress: number;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  priority: Priority;
  category: string;
  goalId: string | null;
  done: boolean;
  completedAt: string | null;
  createdAt: string;
}

export type HabitFrequency = "diaria" | "dias_especificos" | "vezes_por_semana";

export interface Habit {
  id: string;
  name: string;
  frequency: HabitFrequency;
  /** Dias da semana (0 = domingo … 6 = sábado), usado quando frequency = "dias_especificos". */
  days: number[];
  /** Meta semanal (1–7) usada quando frequency = "vezes_por_semana"; qualquer dia conta. */
  timesPerWeek: number | null;
  completions: string[];
  createdAt: string;
}

export type TransactionType = "receita" | "despesa";
export type ExpenseNature = "fixa" | "variavel";

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  /** Valor em centavos (sempre positivo). */
  amount: number;
  category: string;
  date: string;
  nature: ExpenseNature;
  createdAt: string;
}

export interface ReviewQuestion {
  id: string;
  text: string;
}

export interface ReviewAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export type ReviewKind = "semanal" | "ciclo";

export interface Review {
  id: string;
  kind: ReviewKind;
  cycleId: string | null;
  date: string;
  answers: ReviewAnswer[];
  createdAt: string;
}

export type AssetType = "reserva" | "conta" | "investimento" | "previdencia" | "bem" | "outro";

export interface BalanceEntry {
  date: string;
  /** Saldo em centavos naquela data. */
  balance: number;
}

/** Um lugar onde está parte do patrimônio (conta, investimento, bem). */
export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  institution: string;
  /** Saldo atual em centavos (igual ao último registro do histórico). */
  balance: number;
  history: BalanceEntry[];
  createdAt: string;
  updatedAt: string;
}

export type FocusLinkType = "tarefa" | "habito";

export interface FocusLink {
  type: FocusLinkType;
  id: string;
}

/** Uma sessão de foco registrada pelo Pomodoro. */
export interface FocusSession {
  id: string;
  /** Dia local (AAAA-MM-DD) em que a sessão começou. */
  date: string;
  /** Início da sessão (ISO com horário). */
  startedAt: string;
  /** Tempo de foco efetivo, em segundos. */
  seconds: number;
  /** false quando a sessão foi encerrada antes do fim. */
  completed: boolean;
  link: FocusLink | null;
  /** Nome da tarefa/hábito no momento da sessão (mantido se o item for excluído). */
  label: string;
  createdAt: string;
}

export interface Settings {
  userName: string;
  /** Meta mensal de economia em centavos. */
  monthlySavingsGoal: number;
  incomeCategories: string[];
  expenseCategories: string[];
  taskCategories: string[];
  weeklyQuestions: ReviewQuestion[];
  cycleQuestions: ReviewQuestion[];
  /** Meta da reserva de emergência em meses de custo mensal. */
  emergencyMonths: number;
  /** Valor fixo da meta em centavos; quando definido, substitui o cálculo por meses. */
  emergencyTarget: number | null;
  /** Pomodoro, em minutos. */
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  /** Pausa longa a cada N sessões de foco. */
  longBreakEvery: number;
  /** Meta diária de foco, em minutos (0 = sem meta). */
  dailyFocusGoal: number;
  focusSound: boolean;
}

export const DATA_VERSION = 1;

export interface AppData {
  version: typeof DATA_VERSION;
  activeCycleId: string | null;
  cycles: Cycle[];
  goals: Goal[];
  tasks: Task[];
  habits: Habit[];
  transactions: Transaction[];
  reviews: Review[];
  weeklyPriorities: WeeklyPriority[];
  progressHistory: ProgressSnapshot[];
  assets: Asset[];
  focusSessions: FocusSession[];
  settings: Settings;
  updatedAt: string;
}
