"use client";

import { useState } from "react";
import { GoalDetailModal } from "@/components/features/goal-detail";
import { GoalCard, GoalListTable } from "@/components/features/goal-views";
import { NoCycleState } from "@/components/features/no-cycle";
import { CycleWizardModal } from "@/components/forms/cycle-wizard";
import { GoalFormModal } from "@/components/forms/goal-form";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/fields";
import { GridIcon, ListIcon, PlusIcon, RefreshIcon, TargetIcon } from "@/components/ui/icons";
import { AreaBadge, EmptyState, ProgressBar, SegmentedControl } from "@/components/ui/misc";
import { formatDateRange } from "@/lib/dates";
import { AREA_LABELS, AREAS, PRIORITY_WEIGHT } from "@/lib/labels";
import { cycleTimeline, goalCounts, goalDisplayStatus, overallProgress, type GoalDisplayStatus } from "@/lib/metrics";
import type { Area, Goal } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

type StatusFilter = "todas" | GoalDisplayStatus;

export default function GoalsPage() {
  const { data, actions } = useStore();
  const today = useToday();
  const [view, setView] = useState<"cards" | "lista">("cards");
  const [status, setStatus] = useState<StatusFilter>("todas");
  const [area, setArea] = useState<Area | "">("");
  const [goalModal, setGoalModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [viewCycleId, setViewCycleId] = useState<string | null>(null);

  const cycleId = viewCycleId ?? data.activeCycleId;
  const cycle = data.cycles.find((c) => c.id === cycleId) ?? null;
  const isActive = cycle?.id === data.activeCycleId;
  const all = cycle ? data.goals.filter((g) => g.cycleId === cycle.id) : [];
  const counts = goalCounts(all, today);
  const timeline = cycle ? cycleTimeline(cycle, today) : null;

  const filtered = all
    .filter((g) => status === "todas" || goalDisplayStatus(g, today) === status)
    .filter((g) => !area || g.area === area)
    .sort((a, b) => {
      const done = Number(a.status === "concluida") - Number(b.status === "concluida");
      return done || PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || a.dueDate.localeCompare(b.dueDate);
    });

  const statusOptions: { value: StatusFilter; label: string; count: number }[] = [
    { value: "todas", label: "Todas", count: counts.total },
    { value: "em_andamento", label: "Em andamento", count: counts.emAndamento },
    { value: "nao_iniciada", label: "Não iniciadas", count: counts.naoIniciadas },
    { value: "atrasada", label: "Atrasadas", count: counts.atrasadas },
    { value: "concluida", label: "Concluídas", count: counts.concluidas },
    { value: "pausada", label: "Pausadas", count: counts.pausadas },
  ];

  return (
    <>
      <PageHeader
        title="Ciclos"
        description="Transforme objetivos em resultados mensuráveis, com marcos e próximas ações."
        actions={
          <>
            <Button icon={<RefreshIcon size={16} />} onClick={() => setWizardOpen(true)}>
              Novo ciclo
            </Button>
            <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setGoalModal({ open: true, goal: null })} disabled={!data.activeCycleId}>
              Nova meta
            </Button>
          </>
        }
      />

      {!cycle ? (
        <NoCycleState />
      ) : (
        <>
          <section aria-label="Resumo do ciclo" className="mb-6 flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 sm:p-6 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {data.cycles.length > 1 ? (
                  <FilterSelect
                    label="Ciclo"
                    value={cycle.id}
                    onChange={(e) => setViewCycleId(e.target.value)}
                    options={[...data.cycles]
                      .sort((a, b) => b.startDate.localeCompare(a.startDate))
                      .map((c) => ({ value: c.id, label: `${c.name}${c.id === data.activeCycleId ? " (atual)" : ""}` }))}
                  />
                ) : (
                  <h2 className="text-lg font-semibold">{cycle.name}</h2>
                )}
                {!isActive && (
                  <Button size="sm" variant="ghost" onClick={() => { actions.setActiveCycle(cycle.id); setViewCycleId(null); }}>
                    Tornar ciclo atual
                  </Button>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-2">
                {formatDateRange(cycle.startDate, cycle.endDate)}
                {timeline && !timeline.finished && !timeline.notStarted && ` · dia ${timeline.currentDay} de ${timeline.totalDays} · ${timeline.remaining} dias restantes`}
                {timeline?.finished && " · ciclo encerrado"}
              </p>
              {cycle.focusAreas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {cycle.focusAreas.map((a) => (
                    <AreaBadge key={a} area={a} />
                  ))}
                </div>
              )}
            </div>
            <div className="w-full lg:w-72">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-ink-2">Progresso geral</span>
                <span className="tabular font-semibold">{Math.round(overallProgress(all))}%</span>
              </div>
              <ProgressBar value={overallProgress(all)} marker={timeline?.timePct} label="Progresso geral do ciclo" />
              <p className="mt-1.5 text-xs text-ink-3">O traço indica onde você deveria estar pelo tempo decorrido.</p>
            </div>
          </section>

          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SegmentedControl label="Filtrar por status" value={status} onChange={setStatus} options={statusOptions} />
            <div className="flex items-center gap-2">
              <FilterSelect
                label="Área"
                value={area}
                onChange={(e) => setArea(e.target.value as Area | "")}
                options={[{ value: "", label: "Todas as áreas" }, ...AREAS.map((a) => ({ value: a, label: AREA_LABELS[a] }))]}
              />
              <SegmentedControl
                label="Modo de visualização"
                value={view}
                onChange={setView}
                options={[
                  { value: "cards", label: <><GridIcon size={15} /><span className="sr-only">Cards</span></> },
                  { value: "lista", label: <><ListIcon size={15} /><span className="sr-only">Lista</span></> },
                ]}
              />
            </div>
          </div>

          {all.length === 0 ? (
            <EmptyState
              icon={<TargetIcon size={28} />}
              title="Este ciclo ainda não tem metas"
              description="Comece por 3 a 5 metas. Cada uma deve ter um resultado mensurável e um prazo."
              action={
                isActive && (
                  <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setGoalModal({ open: true, goal: null })}>
                    Criar primeira meta
                  </Button>
                )
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nenhuma meta com esses filtros"
              action={<Button size="sm" onClick={() => { setStatus("todas"); setArea(""); }}>Limpar filtros</Button>}
            />
          ) : view === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((g) => (
                <GoalCard key={g.id} goal={g} tasks={data.tasks} today={today} onOpen={(goal) => setDetailId(goal.id)} />
              ))}
            </div>
          ) : (
            <GoalListTable goals={filtered} tasks={data.tasks} today={today} onOpen={(goal) => setDetailId(goal.id)} />
          )}
        </>
      )}

      <GoalFormModal open={goalModal.open} goal={goalModal.goal} onClose={() => setGoalModal({ open: false, goal: null })} onSaved={(id) => !goalModal.goal && setDetailId(id)} />
      <CycleWizardModal open={wizardOpen} onClose={() => { setWizardOpen(false); setViewCycleId(null); }} />
      <GoalDetailModal
        goalId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(g) => {
          setDetailId(null);
          setGoalModal({ open: true, goal: g });
        }}
      />
    </>
  );
}
