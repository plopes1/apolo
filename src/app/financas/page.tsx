"use client";

import { useState } from "react";
import { CategoryBars } from "@/components/charts/category-bars";
import { FinanceChart } from "@/components/charts/finance-chart";
import { SavingsGoalModal } from "@/components/forms/savings-goal-form";
import { TransactionFormModal } from "@/components/forms/transaction-form";
import { PageHeader } from "@/components/layout/app-shell";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { FilterSelect } from "@/components/ui/fields";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, TrashIcon, WalletIcon, XIcon } from "@/components/ui/icons";
import { Badge, EmptyState, ProgressBar, SegmentedControl, StatTile } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatMonth, monthKey } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { expensesByCategory, monthlySeries, monthSummary } from "@/lib/metrics";
import type { Transaction, TransactionType } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

export default function FinancePage() {
  const { data, actions } = useStore();
  const today = useToday();
  const toast = useToast();
  const confirm = useConfirm();
  const currentMonth = monthKey(today);
  const [month, setMonth] = useState(currentMonth);
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"todas" | TransactionType>("todas");
  const [txModal, setTxModal] = useState<{ open: boolean; tx: Transaction | null }>({ open: false, tx: null });
  const [goalOpen, setGoalOpen] = useState(false);

  const months = [...new Set([currentMonth, ...data.transactions.map((t) => monthKey(t.date))])].sort().reverse();
  const allCategories = [...new Set([...data.settings.incomeCategories, ...data.settings.expenseCategories, ...data.transactions.map((t) => t.category)])].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  const summary = monthSummary(data.transactions, month);
  const goal = data.settings.monthlySavingsGoal;
  const goalPct = goal > 0 ? (summary.saved / goal) * 100 : 0;
  const byCategory = expensesByCategory(data.transactions, month);
  const chartTx = category ? data.transactions.filter((t) => t.category === category) : data.transactions;
  const series = monthlySeries(chartTx, month, 6);

  const list = data.transactions
    .filter((t) => monthKey(t.date) === month)
    .filter((t) => !category || t.category === category)
    .filter((t) => type === "todas" || t.type === type)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const listTotal = list.reduce((s, t) => s + (t.type === "receita" ? t.amount : -t.amount), 0);

  async function remove(t: Transaction) {
    const ok = await confirm({
      title: "Excluir lançamento?",
      message: (
        <>
          “{t.description}” de {formatBRL(t.amount)} em {formatDate(t.date)} será removido.
        </>
      ),
    });
    if (ok) {
      actions.deleteTransaction(t.id);
      toast.success("Lançamento excluído.");
    }
  }

  const filtersActive = category !== "" || type !== "todas";

  return (
    <>
      <PageHeader
        title="Planejamento financeiro"
        section="Finanças"
        description="Receitas, despesas e progresso da sua meta de economia."
        actions={
          <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setTxModal({ open: true, tx: null })}>
            Lançamento financeiro
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filtros">
        <FilterSelect label="Mês" value={month} onChange={(e) => setMonth(e.target.value)} options={months.map((m) => ({ value: m, label: formatMonth(m) }))} />
        <FilterSelect label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} options={[{ value: "", label: "Todas" }, ...allCategories.map((c) => ({ value: c, label: c }))]} />
        {filtersActive && (
          <Button size="sm" variant="ghost" icon={<XIcon size={14} />} onClick={() => { setCategory(""); setType("todas"); }}>
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-x-6 gap-y-7 lg:grid-cols-4">
        <StatTile label="Saldo do mês" icon={<WalletIcon size={13} />} value={formatBRL(summary.balance)} detail={summary.balance >= 0 ? "Receitas menos despesas" : "Despesas acima das receitas"} />
        <StatTile label="Receitas" icon={<ArrowUpIcon size={13} />} value={formatBRL(summary.income)} detail={formatMonth(month)} />
        <StatTile label="Despesas" icon={<ArrowDownIcon size={13} />} value={formatBRL(summary.expense)} detail={`Fixas ${formatBRL(summary.fixed)} · variáveis ${formatBRL(summary.variable)}`} />
        <StatTile
          label="Valor poupado"
          value={formatBRL(summary.saved)}
          detail={
            <span className="flex items-center gap-1">
              {Math.round(goalPct)}% da meta de {formatBRL(goal)}
              <IconButton label="Editar meta de economia" className="h-6 w-6" onClick={() => setGoalOpen(true)}>
                <PencilIcon size={13} />
              </IconButton>
            </span>
          }
        >
          <div className="mt-2 max-w-[220px]">
            <ProgressBar value={goalPct} tone="good" label="Progresso da meta mensal de economia" />
          </div>
        </StatTile>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" aria-labelledby="fin-chart">
          <CardHeader
            id="fin-chart"
            eyebrow={category ? `Categoria: ${category}` : "6 meses até " + formatMonth(month, "short").toLowerCase()}
            title="Receitas e despesas por mês"
          />
          <FinanceChart data={series} highlightKey={month} showSaved={!category} />
        </Card>

        <Card aria-labelledby="fin-cats">
          <CardHeader id="fin-cats" eyebrow={formatMonth(month)} title="Despesas por categoria" />
          {byCategory.length === 0 ? (
            <EmptyState compact title="Sem despesas neste mês" />
          ) : (
            <>
              <CategoryBars items={byCategory} selected={category} onSelect={(c) => setCategory((cur) => (cur === c ? "" : c))} />
              <p className="mt-4 text-xs text-ink-3">Toque em uma categoria para filtrar.</p>
            </>
          )}
        </Card>

        <Card className="lg:col-span-3" aria-labelledby="fin-list">
          <CardHeader
            id="fin-list"
            eyebrow={`${list.length} ${list.length === 1 ? "lançamento" : "lançamentos"} · ${formatBRL(listTotal)}`}
            title="Lançamentos"
            action={
              <SegmentedControl
                label="Tipo"
                value={type}
                onChange={setType}
                options={[
                  { value: "todas", label: "Todos" },
                  { value: "receita", label: "Receitas" },
                  { value: "despesa", label: "Despesas" },
                ]}
              />
            }
          />
          {list.length === 0 ? (
            <EmptyState
              title="Nenhum lançamento encontrado"
              description={filtersActive ? "Tente remover os filtros." : `Registre receitas e despesas de ${formatMonth(month).toLowerCase()}.`}
              action={<Button size="sm" icon={<PlusIcon size={14} />} onClick={() => setTxModal({ open: true, tx: null })}>Novo lançamento</Button>}
            />
          ) : (
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Lançamentos de {formatMonth(month)}</caption>
                <thead className="hidden sm:table-header-group">
                  <tr className="border-b border-line text-xs text-ink-3">
                    <th scope="col" className="py-2.5 pl-6 pr-3 font-medium">Data</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Descrição</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Categoria</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Tipo</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Valor</th>
                    <th scope="col" className="py-2.5 pl-3 pr-6"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id} className="group border-b border-line last:border-0 hover:bg-subtle">
                      <td className="hidden whitespace-nowrap py-3 pl-6 pr-3 text-xs text-ink-2 sm:table-cell">{formatDate(t.date, "short")}</td>
                      <td className="py-3 pl-5 pr-3 sm:px-3">
                        <span className="block font-medium text-ink">{t.description}</span>
                        <span className="block text-xs text-ink-3 sm:hidden">
                          {formatDate(t.date, "short")} · {t.category} · {t.nature === "fixa" ? "Fixa" : "Variável"}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 text-ink-2 sm:table-cell">{t.category}</td>
                      <td className="hidden px-3 py-3 sm:table-cell">
                        <Badge tone={t.nature === "fixa" ? "neutral" : "accent"}>{t.nature === "fixa" ? "Fixa" : "Variável"}</Badge>
                      </td>
                      <td className={`tabular whitespace-nowrap px-3 py-3 text-right font-medium ${t.type === "receita" ? "text-good-ink" : "text-ink"}`}>
                        {t.type === "receita" ? "+ " : "− "}
                        {formatBRL(t.amount)}
                      </td>
                      <td className="whitespace-nowrap py-3 pl-1 pr-4 text-right sm:pr-6">
                        <IconButton label={`Editar “${t.description}”`} onClick={() => setTxModal({ open: true, tx: t })}>
                          <PencilIcon size={15} />
                        </IconButton>
                        <IconButton label={`Excluir “${t.description}”`} tone="danger" onClick={() => remove(t)}>
                          <TrashIcon size={15} />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <TransactionFormModal open={txModal.open} transaction={txModal.tx} onClose={() => setTxModal({ open: false, tx: null })} />
      <SavingsGoalModal open={goalOpen} onClose={() => setGoalOpen(false)} />
    </>
  );
}
