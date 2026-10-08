"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { FormError, SelectField, TextAreaField, TextField } from "@/components/ui/fields";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { decimalToInput, parseDecimal } from "@/lib/format";
import { createId } from "@/lib/id";
import { AREA_LABELS, AREAS, PRIORITIES, PRIORITY_LABELS, STATUS_LABELS, STATUSES } from "@/lib/labels";
import { getActiveCycle } from "@/lib/metrics";
import type { Area, Goal, GoalStatus, Milestone, Priority } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  goal?: Goal | null;
  onSaved?: (id: string) => void;
}

export function GoalFormModal({ open, onClose, goal, onSaved }: GoalFormModalProps) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={goal ? "Editar meta" : "Nova meta"}
      description="Defina um resultado mensurável e os marcos até chegar lá."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">
            {goal ? "Salvar alterações" : "Criar meta"}
          </Button>
        </>
      }
    >
      <GoalForm formId={formId} goal={goal ?? null} onDone={(id) => { onSaved?.(id); onClose(); }} />
    </Modal>
  );
}

type Errors = Partial<Record<"title" | "area" | "startDate" | "dueDate" | "measurableResult" | "currentValue" | "targetValue" | "form", string>>;

function GoalForm({ formId, goal, onDone }: { formId: string; goal: Goal | null; onDone: (id: string) => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const cycle = getActiveCycle(data);

  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [why, setWhy] = useState(goal?.why ?? "");
  const [area, setArea] = useState<Area>(goal?.area ?? cycle?.focusAreas[0] ?? "pessoal");
  const [startDate, setStartDate] = useState(goal?.startDate ?? (cycle && today < cycle.startDate ? cycle.startDate : today));
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? cycle?.endDate ?? "");
  const [measurableResult, setMeasurableResult] = useState(goal?.measurableResult ?? "");
  const [currentValue, setCurrentValue] = useState(decimalToInput(goal?.currentValue ?? null));
  const [targetValue, setTargetValue] = useState(decimalToInput(goal?.targetValue ?? null));
  const [unit, setUnit] = useState(goal?.unit ?? "");
  const [priority, setPriority] = useState<Priority>(goal?.priority ?? "media");
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "nao_iniciada");
  const [milestones, setMilestones] = useState<Milestone[]>(goal?.milestones ?? []);
  const [errors, setErrors] = useState<Errors>({});

  const linkedTasks = goal ? data.tasks.filter((t) => t.goalId === goal.id) : [];

  function validate(): Errors {
    const e: Errors = {};
    if (title.trim().length < 3) e.title = "Dê um título com pelo menos 3 caracteres.";
    if (!startDate) e.startDate = "Informe a data de início.";
    if (!dueDate) e.dueDate = "Informe o prazo.";
    if (startDate && dueDate && dueDate < startDate) e.dueDate = "O prazo deve ser igual ou posterior ao início.";
    if (!measurableResult.trim()) e.measurableResult = "Descreva como você vai medir o resultado.";
    const cur = currentValue.trim() ? parseDecimal(currentValue) : null;
    const tgt = targetValue.trim() ? parseDecimal(targetValue) : null;
    if (currentValue.trim() && (cur === null || cur < 0)) e.currentValue = "Use um número maior ou igual a zero.";
    if (targetValue.trim() && (tgt === null || tgt <= 0)) e.targetValue = "Use um número maior que zero.";
    if (currentValue.trim() && !targetValue.trim()) e.targetValue = "Informe o valor-alvo para medir o progresso.";
    return e;
  }

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (!cycle && !goal) {
      setErrors({ form: "Crie um ciclo de 90 dias antes de adicionar metas." });
      return;
    }
    const tgt = targetValue.trim() ? parseDecimal(targetValue) : null;
    const input = {
      cycleId: goal?.cycleId ?? cycle!.id,
      title: title.trim(),
      description: description.trim(),
      why: why.trim(),
      area,
      startDate,
      dueDate,
      measurableResult: measurableResult.trim(),
      currentValue: tgt === null ? null : (parseDecimal(currentValue) ?? 0),
      targetValue: tgt,
      unit: unit.trim(),
      priority,
      status,
      milestones: milestones.filter((m) => m.title.trim()).map((m) => ({ ...m, title: m.title.trim() })),
    };
    if (goal) {
      actions.updateGoal(goal.id, input);
      toast.success("Meta atualizada.");
      onDone(goal.id);
    } else {
      const id = actions.addGoal(input);
      toast.success("Meta criada.");
      onDone(id);
    }
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormError message={errors.form} />
      <TextField label="Título" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} placeholder="Ex.: Correr 10 km em menos de 60 minutos" autoFocus />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextAreaField label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Como você pretende chegar lá?" />
        <TextAreaField label="Por que esta meta importa?" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="O motivo que vai te manter firme" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Área da vida" required value={area} onChange={(e) => setArea(e.target.value as Area)} options={AREAS.map((a) => ({ value: a, label: AREA_LABELS[a] }))} />
        <SelectField label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))} />
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)} options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Início" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} error={errors.startDate} />
        <TextField label="Prazo" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} error={errors.dueDate} />
      </div>
      <TextField
        label="Resultado mensurável esperado"
        required
        value={measurableResult}
        onChange={(e) => setMeasurableResult(e.target.value)}
        error={errors.measurableResult}
        placeholder="Ex.: Prova de 10 km concluída abaixo de 60 min"
      />
      <fieldset className="rounded-2xl border border-line p-4">
        <legend className="px-1 text-[13px] font-medium">Medição numérica (opcional)</legend>
        <p className="mb-3 text-xs text-ink-3">Com valor atual e alvo, o progresso é calculado automaticamente. Sem eles, usamos os marcos concluídos.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Valor atual" inputMode="decimal" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} error={errors.currentValue} placeholder="0" />
          <TextField label="Valor-alvo" inputMode="decimal" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} error={errors.targetValue} placeholder="10" />
          <TextField label="Unidade" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="km, livros, R$…" />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Marcos intermediários</legend>
        {milestones.length === 0 && <p className="mb-2 text-sm text-ink-3">Nenhum marco ainda. Marcos ajudam a dividir a meta em etapas.</p>}
        <ul className="flex flex-col gap-2">
          {milestones.map((m, i) => (
            <li key={m.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={m.done}
                aria-label={`Marco ${i + 1} concluído`}
                onChange={(e) => setMilestones((list) => list.map((x) => (x.id === m.id ? { ...x, done: e.target.checked } : x)))}
                className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
              />
              <input
                aria-label={`Título do marco ${i + 1}`}
                value={m.title}
                onChange={(e) => setMilestones((list) => list.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x)))}
                placeholder="Ex.: Correr 5 km sem parar"
                className="min-w-0 flex-1 rounded-xl border border-line-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <input
                type="date"
                aria-label={`Data do marco ${i + 1}`}
                value={m.dueDate ?? ""}
                onChange={(e) => setMilestones((list) => list.map((x) => (x.id === m.id ? { ...x, dueDate: e.target.value || null } : x)))}
                className="hidden w-40 rounded-xl border border-line-strong px-3 py-2 text-sm focus:border-accent focus:outline-none sm:block"
              />
              <IconButton label={`Remover marco ${i + 1}`} tone="danger" onClick={() => setMilestones((list) => list.filter((x) => x.id !== m.id))}>
                <TrashIcon size={16} />
              </IconButton>
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          variant="ghost"
          className="mt-2"
          icon={<PlusIcon size={15} />}
          onClick={() => setMilestones((list) => [...list, { id: createId(), title: "", dueDate: null, done: false }])}
        >
          Adicionar marco
        </Button>
      </fieldset>

      {goal && (
        <div className="rounded-2xl bg-subtle p-4 text-sm text-ink-2">
          <p className="font-medium text-ink">Tarefas relacionadas</p>
          {linkedTasks.length === 0 ? (
            <p className="mt-1">Nenhuma tarefa vinculada. Vincule tarefas pela página de detalhes da meta ou em Hábitos e tarefas.</p>
          ) : (
            <p className="mt-1">
              {linkedTasks.filter((t) => t.done).length} de {linkedTasks.length} tarefas concluídas.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
