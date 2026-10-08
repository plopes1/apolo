"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { centsToInput, formatBRL, parseMoney } from "@/lib/format";
import { useStore } from "@/store/app-store";

export function SavingsGoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Meta mensal de economia"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">Salvar</Button>
        </>
      }
    >
      <SavingsGoalForm formId={formId} onDone={onClose} />
    </Modal>
  );
}

function SavingsGoalForm({ formId, onDone }: { formId: string; onDone: () => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const [value, setValue] = useState(centsToInput(data.settings.monthlySavingsGoal));
  const [error, setError] = useState<string>();
  const parsed = parseMoney(value);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (parsed === null) return setError("Informe um valor válido, como 2.000,00.");
    actions.updateSettings({ monthlySavingsGoal: parsed });
    toast.success(`Meta de economia definida em ${formatBRL(parsed)}.`);
    onDone();
  }

  return (
    <form id={formId} onSubmit={submit} noValidate>
      <TextField
        label="Quanto você quer poupar por mês? (R$)"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={error}
        hint={parsed !== null ? formatBRL(parsed) : undefined}
        autoFocus
      />
    </form>
  );
}
