"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/fields";
import { SegmentedControl } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/dates";
import { centsToInput, formatBRL, parseMoney } from "@/lib/format";
import { ASSET_TYPE_LABELS, ASSET_TYPES } from "@/lib/labels";
import { emergencyPlan } from "@/lib/metrics";
import type { Asset, AssetType } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

function FormModal({
  open,
  onClose,
  title,
  description,
  submitLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel: string;
  children: (formId: string, done: () => void) => React.ReactNode;
}) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">
            {submitLabel}
          </Button>
        </>
      }
    >
      {children(formId, onClose)}
    </Modal>
  );
}

// ---------- Novo / editar ativo ----------

export function AssetFormModal({
  open,
  onClose,
  asset,
  defaultType = "reserva",
}: {
  open: boolean;
  onClose: () => void;
  asset?: Asset | null;
  defaultType?: AssetType;
}) {
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={asset ? "Editar ativo" : "Novo ativo"}
      description={asset ? undefined : "Uma conta, investimento ou bem que faz parte do seu patrimônio."}
      submitLabel={asset ? "Salvar" : "Adicionar"}
    >
      {(formId, done) => <AssetForm formId={formId} asset={asset ?? null} defaultType={defaultType} onDone={done} />}
    </FormModal>
  );
}

function AssetForm({ formId, asset, defaultType, onDone }: { formId: string; asset: Asset | null; defaultType: AssetType; onDone: () => void }) {
  const { actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const [name, setName] = useState(asset?.name ?? "");
  const [type, setType] = useState<AssetType>(asset?.type ?? defaultType);
  const [institution, setInstitution] = useState(asset?.institution ?? "");
  const [balance, setBalance] = useState("");
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<{ name?: string; balance?: string; date?: string }>({});
  const parsed = parseMoney(balance);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Dê um nome, como “Tesouro Selic” ou “Poupança”.";
    if (!asset && parsed === null) next.balance = "Informe o saldo atual, como 5.000,00 (pode ser 0).";
    if (!asset && !date) next.date = "Informe a data do saldo.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const input = { name: name.trim(), type, institution: institution.trim() };
    if (asset) {
      actions.updateAsset(asset.id, input);
      toast.success("Ativo atualizado.");
    } else {
      actions.addAsset(input, parsed!, date);
      toast.success(`“${input.name}” adicionado com ${formatBRL(parsed!)}.`);
    }
    onDone();
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <TextField label="Nome" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="Ex.: Tesouro Selic" autoFocus />
      <SelectField label="Tipo" value={type} onChange={(e) => setType(e.target.value as AssetType)} options={ASSET_TYPES.map((t) => ({ value: t, label: ASSET_TYPE_LABELS[t] }))} />
      <TextField label="Instituição" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Ex.: Nubank, Tesouro Direto" />
      {!asset && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Saldo atual (R$)"
            required
            inputMode="decimal"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            error={errors.balance}
            hint={parsed !== null ? formatBRL(parsed) : undefined}
            placeholder="0,00"
          />
          <TextField label="Data do saldo" type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        </div>
      )}
      {asset && <p className="text-xs text-ink-3">Para mudar o saldo, use “Atualizar saldo”.</p>}
    </form>
  );
}

// ---------- Atualizar saldo ----------

type BalanceMode = "aporte" | "retirada" | "saldo";

export function BalanceModal({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  return (
    <FormModal open={asset !== null} onClose={onClose} title={asset ? `Atualizar ${asset.name}` : "Atualizar saldo"} submitLabel="Salvar saldo">
      {(formId, done) => asset && <BalanceForm formId={formId} asset={asset} onDone={done} />}
    </FormModal>
  );
}

function BalanceForm({ formId, asset, onDone }: { formId: string; asset: Asset; onDone: () => void }) {
  const { actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const [mode, setMode] = useState<BalanceMode>("aporte");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string>();
  const parsed = parseMoney(value);
  const result =
    parsed === null ? null : mode === "saldo" ? parsed : mode === "aporte" ? asset.balance + parsed : asset.balance - parsed;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (parsed === null) return setError("Informe um valor válido, como 500,00.");
    if (mode !== "saldo" && parsed === 0) return setError("O valor deve ser maior que zero.");
    if (result! < 0) return setError(`A retirada é maior que o saldo atual (${formatBRL(asset.balance)}).`);
    if (!date) return setError("Informe a data.");
    actions.recordBalance(asset.id, date, result!);
    toast.success(`Saldo de “${asset.name}”: ${formatBRL(result!)}.`);
    onDone();
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="rounded-2xl bg-subtle p-4">
        <p className="text-xs text-ink-3">Saldo atual</p>
        <p className="tabular text-xl font-semibold">{formatBRL(asset.balance)}</p>
        {asset.history.length > 0 && <p className="text-xs text-ink-3">Atualizado em {formatDate(asset.history[asset.history.length - 1].date)}</p>}
      </div>
      <SegmentedControl
        label="Tipo de atualização"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(undefined);
          if (m === "saldo" && !value) setValue(centsToInput(asset.balance));
        }}
        options={[
          { value: "aporte", label: "Aporte" },
          { value: "retirada", label: "Retirada" },
          { value: "saldo", label: "Novo saldo" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={mode === "saldo" ? "Saldo total (R$)" : mode === "aporte" ? "Valor do aporte (R$)" : "Valor da retirada (R$)"}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={error}
          placeholder="0,00"
          autoFocus
        />
        <TextField label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {result !== null && result >= 0 && (
        <p className="text-sm text-ink-2">
          Novo saldo: <strong className="tabular font-semibold text-ink">{formatBRL(result)}</strong>
        </p>
      )}
    </form>
  );
}

// ---------- Meta da reserva ----------

export function ReserveGoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <FormModal open={open} onClose={onClose} title="Meta da reserva de emergência" description="Quanto você quer ter guardado para imprevistos." submitLabel="Salvar meta">
      {(formId, done) => <ReserveGoalForm formId={formId} onDone={done} />}
    </FormModal>
  );
}

function ReserveGoalForm({ formId, onDone }: { formId: string; onDone: () => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const plan = emergencyPlan(data, today);
  const [mode, setMode] = useState<"meses" | "valor">(plan.mode);
  const [months, setMonths] = useState(String(data.settings.emergencyMonths));
  const [value, setValue] = useState(data.settings.emergencyTarget !== null ? centsToInput(data.settings.emergencyTarget) : "");
  const [error, setError] = useState<string>();
  const m = Number(months);
  const parsed = parseMoney(value);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "meses") {
      if (!Number.isInteger(m) || m < 1 || m > 36) return setError("Use um número inteiro de 1 a 36 meses.");
      actions.updateSettings({ emergencyMonths: m, emergencyTarget: null });
      toast.success(`Meta da reserva: ${m} meses de custo.`);
    } else {
      if (!parsed) return setError("Informe um valor maior que zero, como 30.000,00.");
      actions.updateSettings({ emergencyTarget: parsed });
      toast.success(`Meta da reserva: ${formatBRL(parsed)}.`);
    }
    onDone();
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <SegmentedControl
        label="Como definir a meta"
        value={mode}
        onChange={(v) => {
          setMode(v);
          setError(undefined);
        }}
        options={[
          { value: "meses", label: "Meses de custo" },
          { value: "valor", label: "Valor fixo" },
        ]}
      />
      {mode === "meses" ? (
        <>
          <TextField label="Quantos meses de custo?" type="number" min={1} max={36} value={months} onChange={(e) => setMonths(e.target.value)} error={error} hint="O mais comum é de 6 a 12 meses." />
          <div className="rounded-2xl bg-subtle p-4 text-sm text-ink-2">
            {plan.cost.value > 0 ? (
              <>
                Seu custo médio é <strong className="tabular font-medium text-ink">{formatBRL(plan.cost.value)}</strong> por mês
                {plan.cost.basis === "fechados" ? ` (média das despesas dos últimos ${plan.cost.months} ${plan.cost.months === 1 ? "mês" : "meses"})` : " (despesas do mês atual)"}.
                {Number.isInteger(m) && m > 0 && (
                  <>
                    {" "}
                    Meta: <strong className="tabular font-medium text-ink">{formatBRL(plan.cost.value * m)}</strong>.
                  </>
                )}
              </>
            ) : (
              "Ainda não há despesas lançadas em Finanças para calcular seu custo mensal. Registre suas despesas ou use um valor fixo."
            )}
          </div>
        </>
      ) : (
        <TextField
          label="Valor da meta (R$)"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={error}
          hint={parsed ? formatBRL(parsed) : undefined}
          placeholder="30.000,00"
          autoFocus
        />
      )}
    </form>
  );
}
