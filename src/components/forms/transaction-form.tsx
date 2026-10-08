"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/fields";
import { SegmentedControl } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { centsToInput, formatBRL, parseMoney } from "@/lib/format";
import type { ExpenseNature, Transaction, TransactionType } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

export function TransactionFormModal({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
}) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transaction ? "Editar lançamento" : "Lançamento financeiro"}
      description="Registre uma receita ou despesa em reais."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">
            {transaction ? "Salvar" : "Registrar"}
          </Button>
        </>
      }
    >
      <TransactionForm formId={formId} transaction={transaction ?? null} onDone={onClose} />
    </Modal>
  );
}

type Errors = Partial<Record<"description" | "amount" | "date" | "category", string>>;

function TransactionForm({ formId, transaction, onDone }: { formId: string; transaction: Transaction | null; onDone: () => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "despesa");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [amount, setAmount] = useState(transaction ? centsToInput(transaction.amount) : "");
  const [date, setDate] = useState(transaction?.date ?? today);
  const [nature, setNature] = useState<ExpenseNature>(transaction?.nature ?? "variavel");
  const categoriesFor = (t: TransactionType) => (t === "receita" ? data.settings.incomeCategories : data.settings.expenseCategories);
  const [category, setCategory] = useState(transaction?.category ?? categoriesFor(type)[0] ?? "Outros");
  const [errors, setErrors] = useState<Errors>({});

  const categories = [...new Set([...categoriesFor(type), ...(transaction?.type === type ? [transaction.category] : [])])];
  const parsed = parseMoney(amount);

  function changeType(t: TransactionType) {
    setType(t);
    const list = categoriesFor(t);
    if (!list.includes(category)) setCategory(list[0] ?? "Outros");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (description.trim().length < 2) next.description = "Descreva o lançamento.";
    if (parsed === null) next.amount = "Informe um valor válido, como 1.250,00.";
    else if (parsed === 0) next.amount = "O valor deve ser maior que zero.";
    if (!date) next.date = "Informe a data.";
    if (!category) next.category = "Escolha uma categoria.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const input = { type, description: description.trim(), amount: parsed!, date, category, nature };
    if (transaction) {
      actions.updateTransaction(transaction.id, input);
      toast.success("Lançamento atualizado.");
    } else {
      actions.addTransaction(input);
      toast.success(`${type === "receita" ? "Receita" : "Despesa"} de ${formatBRL(parsed!)} registrada.`);
    }
    onDone();
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <SegmentedControl
        label="Tipo de lançamento"
        value={type}
        onChange={changeType}
        options={[
          { value: "despesa", label: "Despesa" },
          { value: "receita", label: "Receita" },
        ]}
      />
      <TextField label="Descrição" required value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} placeholder={type === "receita" ? "Ex.: Salário" : "Ex.: Supermercado"} autoFocus />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Valor (R$)"
          required
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          hint={parsed ? formatBRL(parsed) : "Use vírgula para centavos"}
          placeholder="0,00"
        />
        <TextField label="Data" type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <SelectField label="Categoria" required value={category} onChange={(e) => setCategory(e.target.value)} error={errors.category} options={categories.map((c) => ({ value: c, label: c }))} />
        <SelectField
          label={type === "receita" ? "Recorrência" : "Tipo de despesa"}
          value={nature}
          onChange={(e) => setNature(e.target.value as ExpenseNature)}
          options={[
            { value: "fixa", label: type === "receita" ? "Fixa (todo mês)" : "Fixa" },
            { value: "variavel", label: "Variável" },
          ]}
        />
      </div>
    </form>
  );
}
