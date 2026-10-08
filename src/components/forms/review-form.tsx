"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { FormError, TextAreaField, TextField } from "@/components/ui/fields";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDateRange } from "@/lib/dates";
import { createId } from "@/lib/id";
import { cycleGoals, getActiveCycle, goalCounts, overallProgress } from "@/lib/metrics";
import type { Review, ReviewKind, ReviewQuestion } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

export function ReviewFormModal({ open, onClose, kind, review }: { open: boolean; onClose: () => void; kind: ReviewKind; review: Review | null }) {
  const formId = useId();
  const isCycle = (review?.kind ?? kind) === "ciclo";
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={review ? "Editar revisão" : isCycle ? "Encerramento do ciclo" : "Revisão semanal"}
      description={isCycle ? "Feche o ciclo com aprendizados claros para o próximo." : "Responda com calma; frases curtas já bastam."}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">
            Salvar revisão
          </Button>
        </>
      }
    >
      <ReviewForm formId={formId} kind={review?.kind ?? kind} review={review} onDone={onClose} />
    </Modal>
  );
}

function ReviewForm({ formId, kind, review, onDone }: { formId: string; kind: ReviewKind; review: Review | null; onDone: () => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const cycle = getActiveCycle(data);
  const questions: ReviewQuestion[] = review
    ? review.answers.map((a) => ({ id: a.questionId, text: a.question }))
    : kind === "ciclo"
      ? data.settings.cycleQuestions
      : data.settings.weeklyQuestions;
  const [date, setDate] = useState(review?.date ?? today);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, review?.answers.find((a) => a.questionId === q.id)?.answer ?? ""])),
  );
  const [error, setError] = useState<string>();

  const goals = cycle ? cycleGoals(data, cycle.id) : [];
  const counts = goalCounts(goals, today);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!date) return setError("Informe a data da revisão.");
    if (!Object.values(answers).some((a) => a.trim())) return setError("Responda pelo menos uma pergunta.");
    const payload = {
      kind,
      date,
      cycleId: review?.cycleId ?? cycle?.id ?? null,
      answers: questions.map((q) => ({ questionId: q.id, question: q.text, answer: answers[q.id]?.trim() ?? "" })),
    };
    if (review) {
      actions.updateReview(review.id, payload);
      toast.success("Revisão atualizada.");
    } else {
      actions.addReview(payload);
      toast.success(kind === "ciclo" ? "Revisão do ciclo salva. Que venha o próximo!" : "Revisão semanal salva.");
    }
    onDone();
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormError message={error} />
      {kind === "ciclo" && cycle && !review && (
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-subtle p-4 text-sm sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-4">
            <p className="font-medium">{cycle.name}</p>
            <p className="text-xs text-ink-3">{formatDateRange(cycle.startDate, cycle.endDate)}</p>
          </div>
          <Stat label="Progresso" value={`${Math.round(overallProgress(goals))}%`} />
          <Stat label="Concluídas" value={String(counts.concluidas)} />
          <Stat label="Em aberto" value={String(counts.emAndamento + counts.naoIniciadas + counts.atrasadas)} />
          <Stat label="Pausadas" value={String(counts.pausadas)} />
        </div>
      )}
      <TextField label="Data" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="sm:max-w-[220px]" />
      {questions.map((q, i) => (
        <TextAreaField
          key={q.id}
          label={q.text}
          value={answers[q.id] ?? ""}
          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
          rows={3}
          autoFocus={i === 0}
        />
      ))}
      {questions.length === 0 && <p className="text-sm text-ink-3">Nenhuma pergunta configurada. Use “Editar perguntas”.</p>}
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-3">{label}</p>
      <p className="tabular text-lg font-semibold">{value}</p>
    </div>
  );
}

export function QuestionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Perguntas das revisões"
      description="As alterações valem para as próximas revisões; as já salvas mantêm suas perguntas."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">Salvar perguntas</Button>
        </>
      }
    >
      <QuestionsForm formId={formId} onDone={onClose} />
    </Modal>
  );
}

function QuestionsForm({ formId, onDone }: { formId: string; onDone: () => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<ReviewKind>("semanal");
  const [weekly, setWeekly] = useState(data.settings.weeklyQuestions);
  const [cycleQ, setCycleQ] = useState(data.settings.cycleQuestions);
  const [error, setError] = useState<string>();
  const list = tab === "semanal" ? weekly : cycleQ;
  const setList = tab === "semanal" ? setWeekly : setCycleQ;

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = (qs: ReviewQuestion[]) => qs.map((q) => ({ ...q, text: q.text.trim() })).filter((q) => q.text);
    const w = clean(weekly);
    const c = clean(cycleQ);
    if (w.length === 0 || c.length === 0) return setError("Cada tipo de revisão precisa de pelo menos uma pergunta.");
    actions.updateSettings({ weeklyQuestions: w, cycleQuestions: c });
    toast.success("Perguntas atualizadas.");
    onDone();
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <SegmentedControl
        label="Tipo de revisão"
        value={tab}
        onChange={setTab}
        options={[
          { value: "semanal", label: "Semanal" },
          { value: "ciclo", label: "Encerramento de ciclo" },
        ]}
      />
      <ol className="flex flex-col gap-2">
        {list.map((q, i) => (
          <li key={q.id} className="flex items-center gap-2">
            <span className="tabular w-5 text-right text-xs text-ink-3">{i + 1}.</span>
            <input
              aria-label={`Pergunta ${i + 1}`}
              value={q.text}
              onChange={(e) => setList((qs) => qs.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)))}
              className="h-10 min-w-0 flex-1 rounded-xl border border-line-strong px-3 text-sm focus:border-accent focus:outline-none"
            />
            <IconButton label={`Remover pergunta ${i + 1}`} tone="danger" onClick={() => setList((qs) => qs.filter((x) => x.id !== q.id))}>
              <TrashIcon size={15} />
            </IconButton>
          </li>
        ))}
      </ol>
      <Button size="sm" variant="ghost" className="self-start" icon={<PlusIcon size={15} />} onClick={() => setList((qs) => [...qs, { id: createId(), text: "" }])}>
        Adicionar pergunta
      </Button>
    </form>
  );
}
