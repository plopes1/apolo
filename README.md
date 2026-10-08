# Apolo

Painel pessoal para planejar ciclos de 90 dias, acompanhar metas, hábitos e tarefas, e organizar finanças.

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Recharts.

## Rodar localmente

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de produção
```

## Publicar na Vercel

Importe o repositório na Vercel; nenhuma variável de ambiente é necessária.

## Dados

Não há login nem banco de dados nesta versão. Os dados ficam no `localStorage`
do navegador (chave `apolo:data`), portanto **existem apenas naquele
navegador e dispositivo**: publicar o site não sincroniza nada entre dispositivos.
Em **Configurações → Dados e backup** é possível baixar um backup JSON e
importá-lo (o arquivo é validado e a substituição é confirmada antes).

O app começa vazio: crie seu primeiro ciclo em **Ciclos** ou na Visão geral.

Em **Patrimônio** você cadastra contas, investimentos e bens e acompanha a reserva
de emergência. A meta da reserva é um número de meses do custo mensal (média das
despesas dos últimos 3 meses lançados em Finanças) ou um valor fixo.

Em **Foco** há um Pomodoro que pode ser vinculado a uma tarefa ou hábito. Cada
sessão concluída (ou encerrada após 1 minuto) entra no histórico e nos gráficos.
O estado do timer fica em `apolo:timer` e sobrevive a trocas de página e recarregamentos.

## Estrutura

```
src/
  app/                 páginas (visão geral, ciclos, hábitos, foco, finanças, patrimônio, revisões, configurações)
  components/
    ui/                botões, cards, modal (<dialog>), campos, toasts, confirmação, ícones
    layout/            sidebar, navegação inferior (mobile), cabeçalho de página
    charts/            gráficos (Recharts) e barras de categoria
    forms/             formulários de meta, tarefa, hábito, lançamento, revisão e novo ciclo
    features/          cards/listas de domínio (metas, tarefas, hábitos, prioridade da semana)
  lib/
    types.ts           modelo de dados
    repository.ts      persistência (interface DataRepository + LocalStorageRepository)
    backup.ts          exportação e validação de importação
    metrics.ts         cálculos (progresso, sequências, resumos financeiros)
    seed.ts            dados iniciais vazios e configurações padrão
  store/app-store.tsx  estado global e ações
  store/focus-timer.tsx timer Pomodoro (estado, relógio e gravação das sessões)
```

Para adicionar autenticação e banco de dados, crie outra implementação de
`DataRepository` (por exemplo, chamando uma API) e troque a instância exportada
em `src/lib/repository.ts`. Valores monetários são guardados em centavos (inteiros).
