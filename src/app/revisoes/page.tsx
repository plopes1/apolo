"use client";

import { useState } from "react";
import { QuestionsModal, ReviewFormModal } from "@/components/forms/review-form";
import { PageHeader } from "@/components/layout/app-shell";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { ChevronDownIcon, NotebookIcon, PencilIcon, PlusIcon, SlidersIcon, TrashIcon } from "@/components/ui/icons";
import { Badge, EmptyState, SegmentedControl } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { diffDays, formatDate, startOfWeek } from "@/lib/dates";
import { getActiveCycle } from "@/lib/metrics";
import type { Review, ReviewKind } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

export default function ReviewsPage() {
  const { data, actions } = useStore();
  const today = useToday();
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<"todas" | ReviewKind>("todas");
  const [form, setForm] = useState<{ open: boolean; kind: ReviewKind; review: Review | null }>({ open: false, kind: "semanal", review: null });
  const [questionsOpen, setQuestionsOpen] = useState(false);

  const cycle = getActiveCycle(data);
  const reviews = [...data.reviews].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const weekly = reviews.filter((r) => r.kind === "semanal");
  const last = weekly[0];
  const doneThisWeek = last && last.date >= startOfWeek(today);
  const shown = reviews.filter((r) => filter === "todas" || r.kind === filter);
  const cycleName = (id: string | null) => data.cycles.find((c) => c.id === id)?.name;

  async function remove(r: Review) {
    const ok = await confirm({ title: "Excluir revisão?", message: `A revisão de ${formatDate(r.date)} será removida permanentemente.` });
    if (ok) {
      actions.deleteReview(r.id);
      toast.success("Revisão excluída.");
    }
  }

  return (
    <>
      <PageHeader
        title="Revisões"
        description="Olhe para trás para planejar melhor a próxima semana e o próximo ciclo."
        actions={
          <>
            <Button icon={<SlidersIcon size={16} />} onClick={() => setQuestionsOpen(true)}>
              Editar perguntas
            </Button>
            <Button onClick={() => setForm({ open: true, kind: "ciclo", review: null })} disabled={!cycle}>
              Encerrar ciclo
            </Button>
            <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setForm({ open: true, kind: "semanal", review: null })}>
              Revisão semanal
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className={doneThisWeek ? "" : "border-accent/40 bg-accent-soft"}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Esta semana</p>
          <p className="mt-2 text-lg font-semibold">{doneThisWeek ? "Revisão feita" : "Revisão pendente"}</p>
          <p className="mt-1 text-sm text-ink-2">
            {doneThisWeek ? `Registrada em ${formatDate(last.date, "short")}.` : "Reserve 15 minutos para refletir sobre a semana."}
          </p>
          {!doneThisWeek && (
            <Button size="sm" variant="primary" className="mt-4" onClick={() => setForm({ open: true, kind: "semanal", review: null })}>
              Fazer agora
            </Button>
          )}
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Última revisão</p>
          <p className="tabular mt-2 text-lg font-semibold">{last ? (diffDays(last.date, today) === 0 ? "Hoje" : `Há ${diffDays(last.date, today)} dias`) : "—"}</p>
          <p className="mt-1 text-sm text-ink-2">{last ? formatDate(last.date) : "Nenhuma revisão registrada."}</p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Histórico</p>
          <p className="tabular mt-2 text-lg font-semibold">{reviews.length} revisões</p>
          <p className="mt-1 text-sm text-ink-2">
            {weekly.length} semanais · {reviews.length - weekly.length} de ciclo
          </p>
        </Card>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">Revisões anteriores</h2>
        <SegmentedControl
          label="Tipo de revisão"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "todas", label: "Todas" },
            { value: "semanal", label: "Semanais" },
            { value: "ciclo", label: "De ciclo" },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<NotebookIcon size={28} />}
          title="Nenhuma revisão por aqui"
          description="As revisões salvas aparecem nesta lista, com data, para você consultar quando quiser."
          action={<Button variant="primary" size="sm" onClick={() => setForm({ open: true, kind: "semanal", review: null })}>Fazer revisão semanal</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r, i) => (
            <li key={r.id}>
              <details className="group rounded-3xl border border-line bg-surface" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{formatDate(r.date)}</span>
                      <Badge tone={r.kind === "ciclo" ? "dark" : "neutral"}>{r.kind === "ciclo" ? "Encerramento de ciclo" : "Semanal"}</Badge>
                      {cycleName(r.cycleId) && <span className="text-xs text-ink-3">{cycleName(r.cycleId)}</span>}
                    </div>
                    <p className="mt-1 truncate text-sm text-ink-2">{r.answers.find((a) => a.answer.trim())?.answer ?? "Sem respostas"}</p>
                  </div>
                  <ChevronDownIcon className="shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-line px-5 pb-5 pt-4 sm:px-6">
                  <dl className="grid gap-4 md:grid-cols-2">
                    {r.answers.map((a) => (
                      <div key={a.questionId}>
                        <dt className="text-[13px] font-medium text-ink">{a.question}</dt>
                        <dd className="mt-1 whitespace-pre-line text-sm text-ink-2">{a.answer.trim() || <span className="text-ink-3">Sem resposta</span>}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex justify-end gap-1">
                    <IconButton label="Editar revisão" onClick={() => setForm({ open: true, kind: r.kind, review: r })}>
                      <PencilIcon size={15} />
                    </IconButton>
                    <IconButton label="Excluir revisão" tone="danger" onClick={() => remove(r)}>
                      <TrashIcon size={15} />
                    </IconButton>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <ReviewFormModal open={form.open} kind={form.kind} review={form.review} onClose={() => setForm((f) => ({ ...f, open: false, review: null }))} />
      <QuestionsModal open={questionsOpen} onClose={() => setQuestionsOpen(false)} />
    </>
  );
}
