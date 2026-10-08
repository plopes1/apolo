"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { WEEKDAYS_LONG, WEEKDAYS_SHORT } from "@/lib/dates";
import type { Habit, HabitFrequency } from "@/lib/types";
import { useStore } from "@/store/app-store";

export function HabitFormModal({ open, onClose, habit }: { open: boolean; onClose: () => void; habit?: Habit | null }) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={habit ? "Editar hábito" : "Novo hábito"}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">
            {habit ? "Salvar" : "Criar hábito"}
          </Button>
        </>
      }
    >
      <HabitForm formId={formId} habit={habit ?? null} onDone={onClose} />
    </Modal>
  );
}

// Semana começando na segunda-feira.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function HabitForm({ formId, habit, onDone }: { formId: string; habit: Habit | null; onDone: () => void }) {
  const { actions } = useStore();
  const toast = useToast();
  const [name, setName] = useState(habit?.name ?? "");
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency ?? "diaria");
  const [days, setDays] = useState<number[]>(habit?.days.length ? habit.days : [1, 3, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState(habit?.timesPerWeek ?? 3);
  const [errors, setErrors] = useState<{ name?: string; days?: string }>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Dê um nome ao hábito.";
    if (frequency === "dias_especificos" && days.length === 0) next.days = "Escolha pelo menos um dia.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const input = {
      name: name.trim(),
      frequency,
      days: frequency === "dias_especificos" ? [...days].sort() : [],
      timesPerWeek: frequency === "vezes_por_semana" ? timesPerWeek : null,
    };
    if (habit) {
      actions.updateHabit(habit.id, input);
      toast.success("Hábito atualizado.");
    } else {
      actions.addHabit(input);
      toast.success("Hábito criado.");
    }
    onDone();
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <TextField label="Hábito" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="Ex.: Ler 20 páginas" autoFocus />
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Frequência</legend>
        <div className="flex flex-col gap-2">
          {(
            [
              ["diaria", "Todos os dias"],
              ["dias_especificos", "Dias específicos da semana"],
              ["vezes_por_semana", "Quantidade de vezes por semana (qualquer dia)"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2.5 text-sm">
              <input type="radio" name={`${formId}-freq`} checked={frequency === value} onChange={() => setFrequency(value)} className="h-4 w-4 accent-[var(--color-accent)]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {frequency === "vezes_por_semana" && (
        <fieldset>
          <legend className="mb-1 text-[13px] font-medium">Vezes por semana</legend>
          <p className="mb-2 text-xs text-ink-3">Marque nos dias em que fizer. A sequência conta semanas seguidas (segunda a domingo) com a meta batida.</p>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <label
                key={n}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border text-[13px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                  timesPerWeek === n ? "border-ink bg-ink text-white" : "border-line-strong text-ink-2 hover:border-ink"
                }`}
              >
                <input
                  type="radio"
                  name={`${formId}-times`}
                  className="sr-only"
                  checked={timesPerWeek === n}
                  aria-label={`${n} ${n === 1 ? "vez" : "vezes"} por semana`}
                  onChange={() => setTimesPerWeek(n)}
                />
                {n}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-2">
            Meta: <strong className="font-medium text-ink">{timesPerWeek}× por semana</strong>
          </p>
        </fieldset>
      )}
      {frequency === "dias_especificos" && (
        <fieldset aria-describedby={errors.days ? `${formId}-days-error` : undefined}>
          <legend className="mb-2 text-[13px] font-medium">Dias</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEK_ORDER.map((d) => {
              const active = days.includes(d);
              return (
                <label
                  key={d}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                    active ? "border-ink bg-ink text-white" : "border-line-strong text-ink-2 hover:border-ink"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={active}
                    aria-label={WEEKDAYS_LONG[d]}
                    onChange={() => setDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]))}
                  />
                  {WEEKDAYS_SHORT[d]}
                </label>
              );
            })}
          </div>
          {errors.days && (
            <p id={`${formId}-days-error`} role="alert" className="mt-2 text-xs font-medium text-critical-ink">
              {errors.days}
            </p>
          )}
        </fieldset>
      )}
    </form>
  );
}
