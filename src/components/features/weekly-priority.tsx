"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField } from "@/components/ui/fields";
import { PencilIcon, StarIcon, TargetIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { endOfWeek, formatDate, startOfWeek } from "@/lib/dates";
import { getActiveCycle, goalProgress } from "@/lib/metrics";
import { useStore, useToday } from "@/store/app-store";
import { ProgressBar } from "@/components/ui/misc";

/** Destaque da prioridade principal da semana (card escuro na visão geral). */
export function WeeklyPriorityCard() {
  const { data } = useStore();
  const today = useToday();
  const [open, setOpen] = useState(false);
  const cycle = getActiveCycle(data);
  const weekStart = startOfWeek(today);
  const priority = cycle ? data.weeklyPriorities.find((w) => w.cycleId === cycle.id && w.weekStart === weekStart) : undefined;
  const goal = priority?.goalId ? data.goals.find((g) => g.id === priority.goalId) : undefined;

  return (
    <section aria-labelledby="weekly-priority" className="flex h-full flex-col rounded-3xl bg-ink p-5 text-white sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">
            <StarIcon size={13} />
            Prioridade da semana
          </p>
          <p className="mt-1 text-xs text-white/60">
            {formatDate(weekStart, "short")} – {formatDate(endOfWeek(today), "short")}
          </p>
        </div>
        {cycle && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/25 px-3 text-xs font-medium text-white hover:bg-white/10 focus-visible:outline-white"
          >
            <PencilIcon size={13} />
            {priority ? "Editar" : "Definir"}
          </button>
        )}
      </div>
      {priority ? (
        <>
          <h2 id="weekly-priority" className="mt-6 text-[22px] font-semibold leading-snug tracking-tight">
            {priority.text}
          </h2>
          {goal && (
            <div className="mt-auto pt-6">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-white/70">
                <TargetIcon size={13} />
                {goal.title}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 [&_[role=progressbar]]:bg-white/15 [&_[role=progressbar]>div]:bg-white">
                  <ProgressBar value={goalProgress(goal)} label={`Progresso de ${goal.title}`} />
                </div>
                <span className="tabular text-xs font-medium">{Math.round(goalProgress(goal))}%</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 flex flex-1 flex-col">
          <h2 id="weekly-priority" className="text-lg font-semibold">
            Qual é a única coisa que fará esta semana valer a pena?
          </h2>
          <p className="mt-2 text-sm text-white/65">Escolha uma prioridade e, se quiser, vincule-a a uma meta do ciclo.</p>
          {cycle && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-auto self-start rounded-full bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-white/90"
            >
              Definir prioridade
            </button>
          )}
        </div>
      )}
      <WeeklyPriorityModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function WeeklyPriorityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Prioridade da semana"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">Salvar</Button>
        </>
      }
    >
      <WeeklyPriorityForm formId={formId} onDone={onClose} />
    </Modal>
  );
}

function WeeklyPriorityForm({ formId, onDone }: { formId: string; onDone: () => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const cycle = getActiveCycle(data)!;
  const weekStart = startOfWeek(today);
  const current = data.weeklyPriorities.find((w) => w.cycleId === cycle.id && w.weekStart === weekStart);
  const [text, setText] = useState(current?.text ?? "");
  const [goalId, setGoalId] = useState(current?.goalId ?? "");
  const [error, setError] = useState<string>();
  const goals = data.goals.filter((g) => g.cycleId === cycle.id && g.status !== "concluida");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3) return setError("Escreva a prioridade da semana.");
    actions.setWeeklyPriority({ cycleId: cycle.id, weekStart, text: text.trim(), goalId: goalId || null });
    toast.success("Prioridade da semana salva.");
    onDone();
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <TextAreaField label="Prioridade principal" required value={text} onChange={(e) => setText(e.target.value)} error={error} placeholder="Ex.: Publicar o portfólio" autoFocus />
      <SelectField label="Meta relacionada" value={goalId} onChange={(e) => setGoalId(e.target.value)} options={[{ value: "", label: "Nenhuma" }, ...goals.map((g) => ({ value: g.id, label: g.title }))]} />
    </form>
  );
}
