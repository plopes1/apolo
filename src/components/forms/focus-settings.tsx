"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, FormError, TextField } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/store/app-store";

export function FocusSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Ajustes do Pomodoro"
      description="As novas durações valem a partir do próximo período."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">
            Salvar
          </Button>
        </>
      }
    >
      <FocusSettingsForm formId={formId} onDone={onClose} />
    </Modal>
  );
}

const FIELDS = [
  { key: "focusMinutes", label: "Foco (min)", min: 1, max: 180 },
  { key: "shortBreakMinutes", label: "Pausa curta (min)", min: 1, max: 60 },
  { key: "longBreakMinutes", label: "Pausa longa (min)", min: 1, max: 120 },
  { key: "longBreakEvery", label: "Pausa longa a cada (sessões)", min: 1, max: 12 },
  { key: "dailyFocusGoal", label: "Meta diária de foco (min)", min: 0, max: 1440 },
] as const;

type Key = (typeof FIELDS)[number]["key"];

function FocusSettingsForm({ formId, onDone }: { formId: string; onDone: () => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const [values, setValues] = useState<Record<Key, string>>(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(data.settings[f.key])])) as Record<Key, string>);
  const [sound, setSound] = useState(data.settings.focusSound);
  const [error, setError] = useState<string>();

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = {} as Record<Key, number>;
    for (const f of FIELDS) {
      const n = Number(values[f.key]);
      if (!Number.isInteger(n) || n < f.min || n > f.max) return setError(`“${f.label}” deve ser um número inteiro de ${f.min} a ${f.max}.`);
      parsed[f.key] = n;
    }
    actions.updateSettings({ ...parsed, focusSound: sound });
    toast.success("Ajustes do Pomodoro salvos.");
    onDone();
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            type="number"
            min={f.min}
            max={f.max}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            hint={f.key === "dailyFocusGoal" ? "0 para não usar meta" : undefined}
            className={f.key === "dailyFocusGoal" ? "col-span-2" : ""}
          />
        ))}
      </div>
      <Checkbox checked={sound} onChange={setSound} label="Tocar um som ao terminar cada período" />
    </form>
  );
}
