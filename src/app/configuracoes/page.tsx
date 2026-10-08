"use client";

import { useRef, useState, type FormEvent } from "react";
import { CycleWizardModal } from "@/components/forms/cycle-wizard";
import { SavingsGoalModal } from "@/components/forms/savings-goal-form";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { FormError, TextField } from "@/components/ui/fields";
import { AlertIcon, DeviceIcon, DownloadIcon, PencilIcon, RefreshIcon, TrashIcon, UploadIcon, XIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { downloadBackup, parseBackup } from "@/lib/backup";
import { diffDays, formatDate } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { AREA_COLORS, AREA_LABELS, AREAS } from "@/lib/labels";
import { getActiveCycle } from "@/lib/metrics";
import type { AppData, Area, Settings } from "@/lib/types";
import { useStore } from "@/store/app-store";

export default function SettingsPage() {
  const { data, actions } = useStore();
  const toast = useToast();
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [name, setName] = useState(data.settings.userName);
  const [syncedName, setSyncedName] = useState(data.settings.userName);
  if (syncedName !== data.settings.userName) {
    // Dados substituídos (importação/restauração): sincroniza o campo.
    setSyncedName(data.settings.userName);
    setName(data.settings.userName);
  }
  const active = getActiveCycle(data);
  const cycleKey = active ? `${active.id}-${active.name}-${active.startDate}-${active.endDate}-${active.focusAreas.join()}` : "none";

  function saveName(e: FormEvent) {
    e.preventDefault();
    actions.updateSettings({ userName: name.trim() });
    toast.success("Nome atualizado.");
  }

  return (
    <>
      <PageHeader title="Configurações" description="Preferências, categorias, ciclo atual e backup dos seus dados." />

      <div className="grid gap-5 lg:grid-cols-2">
        <DataCard />

        <Card aria-labelledby="profile">
          <CardHeader id="profile" eyebrow="Perfil" title="Como devemos te chamar?" />
          <form onSubmit={saveName} className="flex items-end gap-2">
            <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="flex-1" />
            <Button type="submit" variant="primary">Salvar</Button>
          </form>
        </Card>

        <CycleCard key={cycleKey} onNewCycle={() => setWizardOpen(true)} />

        <Card aria-labelledby="finance-settings">
          <CardHeader id="finance-settings" eyebrow="Finanças" title="Meta e categorias" />
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-subtle p-4">
            <div>
              <p className="text-xs text-ink-3">Meta mensal de economia</p>
              <p className="tabular text-lg font-semibold">{formatBRL(data.settings.monthlySavingsGoal)}</p>
            </div>
            <Button size="sm" icon={<PencilIcon size={14} />} onClick={() => setSavingsOpen(true)}>Alterar</Button>
          </div>
          <CategoryEditor label="Categorias de receita" field="incomeCategories" />
          <div className="mt-5">
            <CategoryEditor label="Categorias de despesa" field="expenseCategories" />
          </div>
        </Card>

        <Card aria-labelledby="task-settings">
          <CardHeader id="task-settings" eyebrow="Tarefas" title="Categorias de tarefas" />
          <CategoryEditor label="Categorias" field="taskCategories" />
        </Card>
      </div>

      <SavingsGoalModal open={savingsOpen} onClose={() => setSavingsOpen(false)} />
      <CycleWizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  );
}

function CategoryEditor({ label, field }: { label: string; field: keyof Pick<Settings, "incomeCategories" | "expenseCategories" | "taskCategories"> }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const list = data.settings[field];

  function add(e: FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return setError("Digite o nome da categoria.");
    if (list.some((c) => c.toLowerCase() === v.toLowerCase())) return setError("Essa categoria já existe.");
    actions.updateSettings({ [field]: [...list, v] });
    setValue("");
    setError(undefined);
    toast.success(`Categoria “${v}” adicionada.`);
  }

  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">{label}</p>
      <ul className="mb-3 flex flex-wrap gap-1.5">
        {list.map((c) => (
          <li key={c} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-1 pl-3 pr-1 text-[13px]">
            {c}
            <button
              type="button"
              aria-label={`Remover categoria ${c}`}
              disabled={list.length <= 1}
              onClick={() => actions.updateSettings({ [field]: list.filter((x) => x !== c) })}
              className="rounded-full p-1 text-ink-3 hover:bg-subtle hover:text-critical-ink disabled:opacity-40"
            >
              <XIcon size={12} />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex items-start gap-2" noValidate>
        <div className="flex-1">
          <input
            aria-label={`Nova categoria em ${label}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Nova categoria"
            aria-invalid={error ? true : undefined}
            className="h-9 w-full rounded-full border border-line-strong px-3.5 text-sm focus:border-accent focus:outline-none"
          />
          {error && <p role="alert" className="mt-1 pl-3 text-xs font-medium text-critical-ink">{error}</p>}
        </div>
        <Button type="submit" size="sm" className="h-9">Adicionar</Button>
      </form>
      <p className="mt-2 text-xs text-ink-3">Remover uma categoria não altera lançamentos já registrados.</p>
    </div>
  );
}

function CycleCard({ onNewCycle }: { onNewCycle: () => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const cycle = getActiveCycle(data);
  const [name, setName] = useState(cycle?.name ?? "");
  const [start, setStart] = useState(cycle?.startDate ?? "");
  const [end, setEnd] = useState(cycle?.endDate ?? "");
  const [areas, setAreas] = useState<Area[]>(cycle?.focusAreas ?? []);
  const [error, setError] = useState<string>();

  if (!cycle) {
    return (
      <Card aria-labelledby="cycle-settings">
        <CardHeader id="cycle-settings" eyebrow="Ciclo" title="Nenhum ciclo ativo" />
        <Button variant="primary" onClick={onNewCycle}>Iniciar ciclo de 90 dias</Button>
      </Card>
    );
  }

  function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Dê um nome ao ciclo.");
    if (!start || !end || end <= start) return setError("A data final deve ser posterior à inicial.");
    setError(undefined);
    actions.updateCycle(cycle!.id, { name: name.trim(), startDate: start, endDate: end, focusAreas: areas });
    toast.success("Ciclo atualizado.");
  }

  return (
    <Card aria-labelledby="cycle-settings">
      <CardHeader
        id="cycle-settings"
        eyebrow="Ciclo atual"
        title={cycle.name}
        action={<Button size="sm" icon={<RefreshIcon size={14} />} onClick={onNewCycle}>Novo ciclo</Button>}
      />
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Início" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <TextField label="Fim" type="date" value={end} onChange={(e) => setEnd(e.target.value)} hint={start && end && end > start ? `${diffDays(start, end) + 1} dias` : undefined} />
        </div>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium">Áreas prioritárias</legend>
          <div className="flex flex-wrap gap-1.5">
            {AREAS.map((a) => {
              const active = areas.includes(a);
              return (
                <label
                  key={a}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                    active ? "border-ink bg-subtle font-medium" : "border-line text-ink-2"
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={active} onChange={() => setAreas((l) => (l.includes(a) ? l.filter((x) => x !== a) : [...l, a]))} />
                  <span className="h-2 w-2 rounded-full" style={{ background: AREA_COLORS[a] }} aria-hidden />
                  {AREA_LABELS[a]}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Button type="submit" variant="primary" className="self-start">Salvar ciclo</Button>
      </form>
    </Card>
  );
}

function summarize(d: AppData) {
  return [
    [d.cycles.length, "ciclos"],
    [d.goals.length, "metas"],
    [d.tasks.length, "tarefas"],
    [d.habits.length, "hábitos"],
    [d.transactions.length, "lançamentos"],
    [d.reviews.length, "revisões"],
    [d.assets.length, "ativos"],
    [d.focusSessions.length, "sessões de foco"],
  ] as const;
}

function DataCard() {
  const { data, actions } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string>();
  const sizeKb = Math.max(1, Math.round(new Blob([JSON.stringify(data)]).size / 1024));

  async function onFile(file: File | undefined) {
    setImportError(undefined);
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setImportError("Arquivo muito grande para ser um backup do Apolo.");
    const result = parseBackup(await file.text());
    if (fileRef.current) fileRef.current.value = "";
    if (!result.ok) return setImportError(result.error);
    const incoming = summarize(result.data)
      .map(([n, l]) => `${n} ${l}`)
      .join(", ");
    const ok = await confirm({
      title: "Substituir os dados atuais?",
      message: (
        <div className="flex flex-col gap-3">
          <p>
            O backup <strong className="font-medium text-ink">{file.name}</strong> é válido e contém {incoming}.
          </p>
          <p>
            Todos os dados atuais deste navegador serão <strong className="font-medium text-ink">substituídos</strong>. Recomendamos baixar um backup dos dados atuais antes.
          </p>
        </div>
      ),
      confirmLabel: "Substituir dados",
    });
    if (ok) {
      actions.replaceAll(result.data);
      toast.success("Backup restaurado com sucesso.");
    }
  }

  return (
    <Card aria-labelledby="dados" className="lg:col-span-2">
      <div id="dados" className="scroll-mt-24" />
      <CardHeader eyebrow="Dados e backup" title="Seus dados ficam neste navegador" />
      <div className="mb-5 flex gap-3 rounded-2xl border border-warning/40 bg-warning-soft p-4 text-sm text-ink">
        <DeviceIcon size={20} className="mt-0.5 shrink-0 text-warning-ink" />
        <div className="flex flex-col gap-1.5">
          <p className="font-medium">Não há conta nem sincronização nesta versão.</p>
          <p className="text-ink-2">
            Tudo o que você registra é salvo apenas no armazenamento local (localStorage) <strong className="font-medium text-ink">deste navegador, neste dispositivo</strong>. O fato de o site estar
            publicado na internet não sincroniza os dados entre dispositivos: no celular ou em outro navegador você verá dados diferentes. Limpar os dados de navegação também apaga tudo.
          </p>
          <p className="text-ink-2">Baixe backups com frequência e use “Importar backup” para levar seus dados para outro dispositivo.</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
            {summarize(data).map(([n, l]) => (
              <li key={l}>
                <span className="tabular font-semibold text-ink">{n}</span> {l}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-3">
            Cerca de {sizeKb} KB · última alteração em {formatDate(data.updatedAt.slice(0, 10))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            icon={<DownloadIcon size={16} />}
            onClick={() => {
              downloadBackup(data);
              toast.success("Backup baixado.");
            }}
          >
            Baixar backup (JSON)
          </Button>
          <Button icon={<UploadIcon size={16} />} onClick={() => fileRef.current?.click()}>
            Importar backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>

      {importError && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-critical-soft px-3 py-2.5 text-sm text-critical-ink">
          <AlertIcon size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-medium">Backup não importado.</strong> {importError} Seus dados atuais não foram alterados.
          </span>
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
        <Button
          size="sm"
          variant="ghost"
          className="text-critical-ink hover:text-critical-ink"
          icon={<TrashIcon size={14} />}
          onClick={async () => {
            if (
              await confirm({
                title: "Apagar todos os dados?",
                message: "Metas, tarefas, hábitos, lançamentos, ativos e revisões deste navegador serão apagados permanentemente. Esta ação não pode ser desfeita.",
                confirmLabel: "Apagar tudo",
              })
            ) {
              actions.clearAll();
              toast.success("Todos os dados foram apagados.");
            }
          }}
        >
          Apagar todos os dados
        </Button>
      </div>
    </Card>
  );
}
