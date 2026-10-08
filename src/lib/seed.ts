import { DATA_VERSION, type AppData, type Settings } from "./types";

export function defaultSettings(): Settings {
  return {
    userName: "",
    monthlySavingsGoal: 200000,
    incomeCategories: ["Salário", "Freelance", "Rendimentos", "Outros"],
    expenseCategories: [
      "Moradia",
      "Alimentação",
      "Transporte",
      "Saúde",
      "Educação",
      "Lazer",
      "Assinaturas",
      "Outros",
    ],
    taskCategories: ["Trabalho", "Pessoal", "Saúde", "Estudos", "Casa", "Finanças"],
    weeklyQuestions: [
      { id: "q-avancei", text: "O que avancei nesta semana?" },
      { id: "q-pendente", text: "O que ficou pendente?" },
      { id: "q-aprendi", text: "O que aprendi?" },
      { id: "q-obstaculo", text: "Qual foi meu principal obstáculo?" },
      { id: "q-prioridade", text: "Qual é minha prioridade para a próxima semana?" },
    ],
    emergencyMonths: 6,
    emergencyTarget: null,
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    dailyFocusGoal: 120,
    focusSound: true,
    cycleQuestions: [
      { id: "c-conquistas", text: "Quais foram as principais conquistas deste ciclo?" },
      { id: "c-metas", text: "Quais metas não foram concluídas e por quê?" },
      { id: "c-aprendizados", text: "O que aprendi sobre a forma como eu trabalho?" },
      { id: "c-manter", text: "O que devo manter, começar e parar no próximo ciclo?" },
      { id: "c-foco", text: "Qual será o foco do próximo ciclo de 90 dias?" },
    ],
  };
}

export function createEmptyData(): AppData {
  return {
    version: DATA_VERSION,
    activeCycleId: null,
    cycles: [],
    goals: [],
    tasks: [],
    habits: [],
    transactions: [],
    reviews: [],
    weeklyPriorities: [],
    progressHistory: [],
    assets: [],
    focusSessions: [],
    settings: defaultSettings(),
    updatedAt: new Date().toISOString(),
  };
}
