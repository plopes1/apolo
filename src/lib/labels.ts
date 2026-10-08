import type { Area, AssetType, GoalStatus, Priority } from "./types";

export const AREAS: Area[] = ["carreira", "saude", "financas", "estudos", "relacionamento", "pessoal"];

export const AREA_LABELS: Record<Area, string> = {
  carreira: "Carreira",
  saude: "Saúde",
  financas: "Finanças",
  estudos: "Estudos",
  relacionamento: "Relacionamento",
  pessoal: "Pessoal",
};

// Ordem fixa da paleta categórica; a cor sempre acompanha o nome da área.
export const AREA_COLORS: Record<Area, string> = {
  carreira: "#2a78d6",
  saude: "#eb6834",
  financas: "#1baf7a",
  estudos: "#eda100",
  relacionamento: "#e87ba4",
  pessoal: "#008300",
};

export const STATUS_LABELS: Record<GoalStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  pausada: "Pausada",
};

export const STATUSES: GoalStatus[] = ["nao_iniciada", "em_andamento", "concluida", "pausada"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const PRIORITIES: Priority[] = ["alta", "media", "baixa"];

export const PRIORITY_WEIGHT: Record<Priority, number> = { alta: 0, media: 1, baixa: 2 };

export const ASSET_TYPES: AssetType[] = ["reserva", "conta", "investimento", "previdencia", "bem", "outro"];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  reserva: "Reserva de emergência",
  conta: "Conta corrente",
  investimento: "Investimentos",
  previdencia: "Previdência",
  bem: "Bens (imóvel, veículo)",
  outro: "Outros",
};
