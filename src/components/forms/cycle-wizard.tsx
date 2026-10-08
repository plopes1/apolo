"use client";

import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Checkbox, FormError, SelectField, TextField } from "@/components/ui/fields";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { addDays, diffDays, formatDateRange } from "@/lib/dates";
import { decimalToInput, parseDecimal } from "@/lib/format";
import { createId } from "@/lib/id";
import { AREA_COLORS, AREA_LABELS, AREAS } from "@/lib/labels";
import type { Area } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

interface DraftGoal {
  key: string;
  title: string;
  area: Area;
  measurableResult: string;
  targetValue: string;
  unit: string;
}

const STEPS = ["Datas", "Áreas", "Metas"];

export function CycleWizardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Iniciar novo ciclo de 90 dias" description="Três passos: datas, áreas prioritárias e metas.">
      <Wizard onDone={onClose} />
    </Modal>
  );
}

function Wizard({ onDone }: { onDone: () => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const current = data.cycles.find((c) => c.id === data.activeCycleId);
  const suggestedStart = current && current.endDate >= today ? addDays(current.endDate, 1) : today;
  const cycleNumber = data.cycles.length + 1;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(`Ciclo ${cycleNumber}`);
  const [startDate, setStartDate] = useState(suggestedStart);
  const [endDate, setEndDate] = useState(addDays(suggestedStart, 89));
  const [areas, setAreas] = useState<Area[]>([]);
  const [drafts, setDrafts] = useState<DraftGoal[]>([]);
  const pending = current ? data.goals.filter((g) => g.cycleId === current.id && g.status !== "concluida") : [];
  const [carryOver, setCarryOver] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  function next() {
    setError(undefined);
    if (step === 0) {
      if (!name.trim()) return setError("Dê um nome ao ciclo.");
      if (!startDate || !endDate) return setError("Informe as datas de início e fim.");
      if (endDate <= startDate) return setError("A data final deve ser posterior à inicial.");
    }
    if (step === 1 && areas.length === 0) return setError("Escolha pelo menos uma área prioritária.");
    if (step === 1 && drafts.length === 0) {
      setDrafts(areas.map((a) => ({ key: createId(), title: "", area: a, measurableResult: "", targetValue: "", unit: "" })));
    }
    setStep((s) => s + 1);
  }

  function finish() {
    setError(undefined);
    const filled = drafts.filter((d) => d.title.trim());
    const bad = filled.find((d) => d.targetValue.trim() && !(parseDecimal(d.targetValue)! > 0));
    if (bad) return setError(`Valor-alvo inválido na meta “${bad.title}”.`);
    const goals = filled.map((d) => {
      const target = d.targetValue.trim() ? parseDecimal(d.targetValue) : null;
      return {
        title: d.title.trim(),
        description: "",
        why: "",
        area: d.area,
        startDate,
        dueDate: endDate,
        measurableResult: d.measurableResult.trim() || d.title.trim(),
        currentValue: target === null ? null : 0,
        targetValue: target,
        unit: d.unit.trim(),
        priority: "media" as const,
        status: "nao_iniciada" as const,
        milestones: [],
      };
    });
    actions.startCycle({ name: name.trim(), startDate, endDate, focusAreas: areas }, goals, carryOver);
    toast.success(`“${name.trim()}” iniciado com ${goals.length + carryOver.length} meta(s).`);
    onDone();
  }

  const length = startDate && endDate ? diffDays(startDate, endDate) + 1 : 0;

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center gap-2" aria-label="Etapas">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i < step ? "bg-good text-white" : i === step ? "bg-ink text-white" : "bg-subtle text-ink-3"
              }`}
            >
              {i < step ? <CheckIcon size={14} /> : i + 1}
            </span>
            <span className={`text-sm ${i === step ? "font-medium text-ink" : "text-ink-3"}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-line sm:block" aria-hidden />}
          </li>
        ))}
      </ol>

      <FormError message={error} />

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <TextField label="Nome do ciclo" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Início"
              type="date"
              required
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value) setEndDate(addDays(e.target.value, 89));
              }}
            />
            <TextField label="Fim" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} hint={length > 0 ? `${length} dias` : undefined} />
          </div>
          {pending.length > 0 && (
            <fieldset className="rounded-2xl border border-line p-4">
              <legend className="px-1 text-[13px] font-medium">Levar metas não concluídas do ciclo atual</legend>
              <div className="mt-1 flex flex-col gap-2.5">
                {pending.map((g) => (
                  <Checkbox
                    key={g.id}
                    checked={carryOver.includes(g.id)}
                    onChange={(checked) => setCarryOver((list) => (checked ? [...list, g.id] : list.filter((id) => id !== g.id)))}
                    label={g.title}
                  />
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      {step === 1 && (
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Quais áreas da vida terão prioridade neste ciclo?</legend>
          <p className="mb-4 text-sm text-ink-3">Recomendamos de 2 a 3 áreas para manter o foco.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AREAS.map((a) => {
              const active = areas.includes(a);
              return (
                <label
                  key={a}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border p-3.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                    active ? "border-ink bg-subtle" : "border-line hover:border-line-strong"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-ink)]"
                    checked={active}
                    onChange={() => setAreas((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]))}
                  />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: AREA_COLORS[a] }} aria-hidden />
                  {AREA_LABELS[a]}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-2">
            Adicione as metas de <strong className="font-medium text-ink">{name}</strong> ({formatDateRange(startDate, endDate)}). Você pode detalhar cada uma depois. Linhas sem título são ignoradas.
          </p>
          <ul className="flex flex-col gap-3">
            {drafts.map((d, i) => {
              const update = (patch: Partial<DraftGoal>) => setDrafts((list) => list.map((x) => (x.key === d.key ? { ...x, ...patch } : x)));
              return (
                <li key={d.key} className="rounded-2xl border border-line p-4">
                  <div className="flex items-start gap-2">
                    <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_180px]">
                      <TextField label={`Meta ${i + 1}`} value={d.title} onChange={(e) => update({ title: e.target.value })} placeholder="Ex.: Ler 4 livros" />
                      <SelectField label="Área" value={d.area} onChange={(e) => update({ area: e.target.value as Area })} options={AREAS.map((a) => ({ value: a, label: AREA_LABELS[a] }))} />
                      <TextField label="Resultado mensurável" value={d.measurableResult} onChange={(e) => update({ measurableResult: e.target.value })} placeholder="Ex.: 4 livros lidos" />
                      <div className="grid grid-cols-2 gap-2">
                        <TextField label="Alvo" inputMode="decimal" value={d.targetValue} onChange={(e) => update({ targetValue: e.target.value })} placeholder={decimalToInput(4)} />
                        <TextField label="Unidade" value={d.unit} onChange={(e) => update({ unit: e.target.value })} placeholder="livros" />
                      </div>
                    </div>
                    <IconButton label={`Remover meta ${i + 1}`} tone="danger" className="mt-6" onClick={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}>
                      <TrashIcon size={16} />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            icon={<PlusIcon size={15} />}
            onClick={() => setDrafts((list) => [...list, { key: createId(), title: "", area: areas[0] ?? "pessoal", measurableResult: "", targetValue: "", unit: "" }])}
          >
            Adicionar outra meta
          </Button>
        </div>
      )}

      <div className="flex justify-between gap-2 border-t border-line pt-4">
        <Button onClick={() => (step === 0 ? onDone() : setStep((s) => s - 1))}>{step === 0 ? "Cancelar" : "Voltar"}</Button>
        {step < 2 ? (
          <Button variant="primary" onClick={next}>
            Continuar
          </Button>
        ) : (
          <Button variant="primary" onClick={finish}>
            Iniciar ciclo
          </Button>
        )}
      </div>
    </div>
  );
}
