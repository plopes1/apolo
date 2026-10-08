"use client";

import { useState } from "react";
import { CategoryBars } from "@/components/charts/category-bars";
import { FocusChart } from "@/components/charts/focus-chart";
import { FocusTimerCard } from "@/components/features/focus-timer-card";
import { FocusSettingsModal } from "@/components/forms/focus-settings";
import { PageHeader } from "@/components/layout/app-shell";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { CheckSquareIcon, FlameIcon, SlidersIcon, TimerIcon, TrashIcon } from "@/components/ui/icons";
import { Badge, EmptyState, ProgressBar, SegmentedControl, StatTile } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { addDays, formatDate, relativeDayLabel, startOfWeek } from "@/lib/dates";
import { formatDuration } from "@/lib/format";
import { focusByLink, focusDailySeries, focusSecondsBetween, focusSecondsOn, focusStreak } from "@/lib/metrics";
import type { FocusSession } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function FocusPage() {
  const { data, actions } = useStore();
  const today = useToday();
  const toast = useToast();
  const confirm = useConfirm();
  const [range, setRange] = useState<"7" | "30">("7");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const sessions = data.focusSessions;
  const goal = data.settings.dailyFocusGoal;
  const todaySec = focusSecondsOn(sessions, today);
  const todayCount = sessions.filter((s) => s.date === today).length;
  const weekSec = focusSecondsBetween(sessions, startOfWeek(today), today);
  const days = Number(range);
  const from = addDays(today, -days + 1);
  const series = focusDailySeries(sessions, today, days);
  const periodSec = focusSecondsBetween(sessions, from, today);
  const activeDays = series.filter((d) => d.minutes > 0).length;
  const byLink = focusByLink(data, from, today);
  const streak = focusStreak(sessions, today);

  const history = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const shown = showAll ? history : history.slice(0, 12);
  const groups = shown.reduce<{ date: string; items: FocusSession[] }[]>((acc, s) => {
    const last = acc[acc.length - 1];
    if (last && last.date === s.date) last.items.push(s);
    else acc.push({ date: s.date, items: [s] });
    return acc;
  }, []);

  async function remove(s: FocusSession) {
    if (await confirm({ title: "Excluir sessão de foco?", message: `A sessão de ${formatDuration(s.seconds)} em “${s.label}” será removida do histórico.` })) {
      actions.deleteFocusSession(s.id);
      toast.success("Sessão excluída.");
    }
  }

  return (
    <>
      <PageHeader
        title="Foco"
        description="Pomodoro com histórico: escolha uma tarefa ou hábito e acompanhe seu tempo de foco."
        actions={
          <Button icon={<SlidersIcon size={16} />} onClick={() => setSettingsOpen(true)}>
            Ajustes do timer
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <Card aria-label="Timer Pomodoro">
          <FocusTimerCard />
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card aria-labelledby="focus-today">
            <CardHeader id="focus-today" eyebrow="Hoje" title={goal > 0 ? `${formatDuration(todaySec)} de ${formatDuration(goal * 60)}` : formatDuration(todaySec)} />
            {goal > 0 && (
              <div className="-mt-1 mb-5">
                <ProgressBar value={(todaySec / (goal * 60)) * 100} label="Progresso da meta diária de foco" />
                <p className="mt-1.5 text-xs text-ink-2">
                  {todaySec >= goal * 60 ? "Meta diária batida!" : `Faltam ${formatDuration(goal * 60 - todaySec)} para a meta diária.`}
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <StatTile label="Sessões hoje" value={todayCount} />
              <StatTile label="Esta semana" value={formatDuration(weekSec)} />
              <StatTile
                label="Sequência"
                icon={<FlameIcon size={13} className={streak ? "text-[#eb6834]" : ""} />}
                value={streak}
                detail={streak === 1 ? "dia com foco" : "dias com foco"}
              />
            </div>
          </Card>

          <Card aria-labelledby="focus-chart">
            <CardHeader
              id="focus-chart"
              eyebrow={`${formatDuration(periodSec)} · ${activeDays} ${activeDays === 1 ? "dia" : "dias"} com foco · média ${formatDuration(periodSec / days)}/dia`}
              title="Tempo de foco por dia"
              action={
                <SegmentedControl
                  label="Período"
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: "7", label: "7 dias" },
                    { value: "30", label: "30 dias" },
                  ]}
                />
              }
            />
            <FocusChart data={series} goalMinutes={goal} today={today} />
          </Card>
        </div>

        <Card aria-labelledby="focus-where">
          <CardHeader id="focus-where" eyebrow={`Últimos ${days} dias`} title="Onde foi seu foco" />
          {byLink.length === 0 ? (
            <EmptyState compact title="Sem sessões no período" description="Escolha uma tarefa ou hábito no timer para ver aqui o tempo dedicado a cada um." />
          ) : (
            <CategoryBars items={byLink} limit={6} color="#2a78d6" format={formatDuration} />
          )}
        </Card>

        <Card aria-labelledby="focus-history">
          <CardHeader id="focus-history" eyebrow={`${sessions.length} ${sessions.length === 1 ? "sessão" : "sessões"} no total`} title="Histórico" />
          {history.length === 0 ? (
            <EmptyState icon={<TimerIcon size={26} />} title="Nenhuma sessão ainda" description="Inicie um foco no timer. Cada sessão concluída (ou encerrada após 1 minuto) aparece aqui." />
          ) : (
            <>
              <div className="flex flex-col gap-5">
                {groups.map((g) => (
                  <section key={g.date} aria-label={formatDate(g.date)}>
                    <h3 className="mb-1 flex items-baseline justify-between text-xs font-semibold text-ink-3">
                      <span>
                        {relativeDayLabel(g.date, today)} · {formatDate(g.date, "short")}
                      </span>
                      <span className="tabular font-medium">{formatDuration(focusSecondsOn(sessions, g.date))}</span>
                    </h3>
                    <ul className="divide-y divide-line">
                      {g.items.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 py-2.5">
                          <span className="tabular w-12 shrink-0 text-xs text-ink-3">{timeOf(s.startedAt)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-sm">
                              {s.link?.type === "tarefa" && <CheckSquareIcon size={13} className="shrink-0 text-ink-3" />}
                              {s.link?.type === "habito" && <FlameIcon size={13} className="shrink-0 text-ink-3" />}
                              <span className="truncate">{s.label}</span>
                            </span>
                          </span>
                          {!s.completed && <Badge tone="warning">Interrompida</Badge>}
                          <span className="tabular shrink-0 text-sm font-medium">{formatDuration(s.seconds)}</span>
                          <IconButton label={`Excluir sessão de ${timeOf(s.startedAt)}`} tone="danger" onClick={() => remove(s)}>
                            <TrashIcon size={14} />
                          </IconButton>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              {history.length > 12 && (
                <Button size="sm" variant="ghost" className="mt-3" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Mostrar menos" : `Mostrar todas (${history.length})`}
                </Button>
              )}
            </>
          )}
        </Card>
      </div>

      <FocusSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
