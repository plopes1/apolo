"use client";

import { useState } from "react";
import { CategoryBars } from "@/components/charts/category-bars";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { AssetFormModal, BalanceModal, ReserveGoalModal } from "@/components/forms/asset-forms";
import { PageHeader } from "@/components/layout/app-shell";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { CheckIcon, PencilIcon, PlusIcon, RefreshIcon, TrashIcon, WalletIcon } from "@/components/ui/icons";
import { Badge, EmptyState, ProgressBar, StatTile } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatMonth } from "@/lib/dates";
import { formatBRL, formatNumber } from "@/lib/format";
import { ASSET_TYPE_LABELS, ASSET_TYPES } from "@/lib/labels";
import { emergencyPlan, netWorth, netWorthSeries } from "@/lib/metrics";
import type { Asset, AssetType } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

function monthsLabel(n: number) {
  const rounded = Math.round(n * 10) / 10;
  return `${formatNumber(rounded)} ${rounded === 1 ? "mês" : "meses"}`;
}

export default function NetWorthPage() {
  const { data, actions } = useStore();
  const today = useToday();
  const toast = useToast();
  const confirm = useConfirm();
  const [assetModal, setAssetModal] = useState<{ open: boolean; asset: Asset | null; type: AssetType }>({ open: false, asset: null, type: "reserva" });
  const [balanceAsset, setBalanceAsset] = useState<Asset | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);

  const assets = [...data.assets].sort((a, b) => ASSET_TYPES.indexOf(a.type) - ASSET_TYPES.indexOf(b.type) || b.balance - a.balance);
  const total = netWorth(assets);
  const plan = emergencyPlan(data, today);
  const series = netWorthSeries(assets, today, 12);
  const previous = series[series.length - 2]?.total ?? 0;
  const change = total - previous;
  const reserveAssets = assets.filter((a) => a.type === "reserva");
  const byType = ASSET_TYPES.map((t) => ({
    category: ASSET_TYPE_LABELS[t],
    amount: assets.filter((a) => a.type === t).reduce((s, a) => s + a.balance, 0),
  }))
    .filter((i) => i.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const firstMonthWithData = series.findIndex((p) => p.total > 0);
  const chartData = firstMonthWithData > 0 ? series.slice(Math.min(firstMonthWithData, series.length - 6)) : series.slice(-6);

  const openNew = (type: AssetType = "reserva") => setAssetModal({ open: true, asset: null, type });

  async function remove(a: Asset) {
    const ok = await confirm({
      title: "Excluir ativo?",
      message: (
        <>
          “{a.name}” ({formatBRL(a.balance)}) e todo o histórico de saldos serão removidos do seu patrimônio.
        </>
      ),
    });
    if (ok) {
      actions.deleteAsset(a.id);
      toast.success("Ativo excluído.");
    }
  }

  const reached = plan.target > 0 && plan.saved >= plan.target;

  return (
    <>
      <PageHeader
        title="Patrimônio"
        description="Onde está o seu dinheiro e quanto falta para a reserva de emergência."
        actions={
          <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => openNew(data.assets.length ? "investimento" : "reserva")}>
            Novo ativo
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-x-6 gap-y-7 lg:grid-cols-4">
        <StatTile
          label="Patrimônio total"
          icon={<WalletIcon size={13} />}
          value={formatBRL(total)}
          detail={assets.length ? `${change >= 0 ? "+" : "−"} ${formatBRL(Math.abs(change))} desde ${formatMonth(series[series.length - 2].key, "short").toLowerCase()}` : "Nenhum ativo cadastrado"}
        />
        <StatTile label="Reserva de emergência" value={formatBRL(plan.saved)} detail={plan.target > 0 ? `${Math.round(plan.progress)}% da meta` : "Meta não definida"} />
        <StatTile
          label="Meses cobertos"
          value={plan.monthsCovered !== null ? monthsLabel(plan.monthsCovered) : "—"}
          detail={plan.cost.value > 0 ? `Custo médio de ${formatBRL(plan.cost.value)}/mês` : "Lance despesas em Finanças"}
        />
        <StatTile label="Ativos" value={assets.length} detail={`${reserveAssets.length} na reserva`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" aria-labelledby="reserve">
          <CardHeader
            id="reserve"
            eyebrow="Reserva de emergência"
            title={
              reached
                ? "Reserva completa"
                : plan.monthsCovered !== null && plan.saved > 0
                  ? `Sua reserva cobre ${monthsLabel(plan.monthsCovered)} de custo`
                  : "Monte sua reserva de emergência"
            }
            action={
              <Button size="sm" icon={<PencilIcon size={14} />} onClick={() => setGoalOpen(true)}>
                Meta
              </Button>
            }
          />

          {plan.target > 0 ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="tabular text-[30px] font-semibold leading-tight tracking-tight">{formatBRL(plan.saved)}</p>
                <p className="tabular text-sm text-ink-2">de {formatBRL(plan.target)}</p>
              </div>
              <div className="mt-3">
                <ProgressBar value={plan.progress} size="lg" tone="good" label="Progresso da reserva de emergência" />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                <span className={reached ? "inline-flex items-center gap-1 font-medium text-good-ink" : "text-ink-2"}>
                  {reached ? (
                    <>
                      <CheckIcon size={15} /> Meta atingida
                    </>
                  ) : (
                    <>
                      Faltam <strong className="tabular font-semibold text-ink">{formatBRL(plan.remaining)}</strong>
                    </>
                  )}
                </span>
                <span className="tabular font-medium">{Math.round(plan.progress)}%</span>
              </div>
              <p className="mt-3 text-xs text-ink-3">
                {plan.mode === "meses"
                  ? `Meta de ${data.settings.emergencyMonths} meses × custo médio de ${formatBRL(plan.cost.value)} (${
                      plan.cost.basis === "fechados" ? `média das despesas dos últimos ${plan.cost.months} ${plan.cost.months === 1 ? "mês" : "meses"}` : "despesas do mês atual"
                    }).`
                  : "Meta definida como valor fixo."}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-subtle p-4 text-sm text-ink-2">
              Defina a meta da reserva: um número de meses do seu custo mensal (calculado pelas despesas em Finanças) ou um valor fixo.
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={() => setGoalOpen(true)}>
                  Definir meta
                </Button>
                <ButtonLink href="/financas" size="sm">
                  Lançar despesas
                </ButtonLink>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-line pt-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Onde está a reserva</h3>
              <Button size="sm" variant="ghost" icon={<PlusIcon size={14} />} onClick={() => openNew("reserva")}>
                Adicionar conta
              </Button>
            </div>
            {reserveAssets.length === 0 ? (
              <EmptyState compact title="Nenhuma conta na reserva" description="Cadastre onde você guarda a reserva, como Tesouro Selic, CDB com liquidez diária ou poupança." />
            ) : (
              <ul className="divide-y divide-line">
                {reserveAssets.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate text-xs text-ink-3">
                        {a.institution ? `${a.institution} · ` : ""}atualizado em {formatDate(a.history[a.history.length - 1]?.date ?? today, "short")}
                      </p>
                    </div>
                    <span className="tabular text-sm font-semibold">{formatBRL(a.balance)}</span>
                    <Button size="sm" icon={<RefreshIcon size={14} />} onClick={() => setBalanceAsset(a)}>
                      <span className="hidden sm:inline">Atualizar</span>
                      <span className="sr-only sm:hidden">Atualizar saldo de {a.name}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card aria-labelledby="composition">
          <CardHeader id="composition" eyebrow="Composição" title="Patrimônio por tipo" />
          {byType.length === 0 ? (
            <EmptyState compact title="Sem saldos ainda" description="Adicione contas, investimentos ou bens para ver a divisão." />
          ) : (
            <CategoryBars items={byType} color="#2a78d6" />
          )}
        </Card>

        <Card className="lg:col-span-3" aria-labelledby="evolution">
          <CardHeader id="evolution" eyebrow="Fim de cada mês" title="Evolução do patrimônio" />
          {assets.length === 0 ? (
            <EmptyState compact title="O gráfico aparece depois do primeiro ativo" description="Cada atualização de saldo vira um ponto no histórico." />
          ) : (
            <NetWorthChart data={chartData} reserveTarget={plan.target > 0 ? plan.target : undefined} />
          )}
        </Card>

        <Card className="lg:col-span-3" aria-labelledby="assets">
          <CardHeader id="assets" eyebrow={`${assets.length} ${assets.length === 1 ? "ativo" : "ativos"} · ${formatBRL(total)}`} title="Todos os ativos" />
          {assets.length === 0 ? (
            <EmptyState
              icon={<WalletIcon size={26} />}
              title="Nenhum ativo cadastrado"
              description="Comece pela reserva de emergência e depois adicione contas, investimentos e bens."
              action={
                <Button variant="primary" size="sm" icon={<PlusIcon size={14} />} onClick={() => openNew("reserva")}>
                  Adicionar reserva
                </Button>
              }
            />
          ) : (
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Ativos do patrimônio</caption>
                <thead className="hidden sm:table-header-group">
                  <tr className="border-b border-line text-xs text-ink-3">
                    <th scope="col" className="py-2.5 pl-6 pr-3 font-medium">Ativo</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Tipo</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Atualizado</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">% do total</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Saldo</th>
                    <th scope="col" className="py-2.5 pl-3 pr-6"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id} className="border-b border-line last:border-0 hover:bg-subtle">
                      <td className="py-3 pl-5 pr-3 sm:pl-6">
                        <span className="block font-medium">{a.name}</span>
                        <span className="block text-xs text-ink-3">
                          {a.institution}
                          <span className="sm:hidden">
                            {a.institution ? " · " : ""}
                            {ASSET_TYPE_LABELS[a.type]}
                          </span>
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 sm:table-cell">
                        <Badge tone={a.type === "reserva" ? "good" : "neutral"}>{ASSET_TYPE_LABELS[a.type]}</Badge>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-ink-2 sm:table-cell">{formatDate(a.history[a.history.length - 1]?.date ?? today, "short")}</td>
                      <td className="tabular hidden px-3 py-3 text-right text-xs text-ink-2 sm:table-cell">{total ? Math.round((a.balance / total) * 100) : 0}%</td>
                      <td className="tabular whitespace-nowrap px-3 py-3 text-right font-medium">{formatBRL(a.balance)}</td>
                      <td className="whitespace-nowrap py-3 pl-1 pr-4 text-right sm:pr-6">
                        <IconButton label={`Atualizar saldo de “${a.name}”`} onClick={() => setBalanceAsset(a)}>
                          <RefreshIcon size={15} />
                        </IconButton>
                        <IconButton label={`Editar “${a.name}”`} onClick={() => setAssetModal({ open: true, asset: a, type: a.type })}>
                          <PencilIcon size={15} />
                        </IconButton>
                        <IconButton label={`Excluir “${a.name}”`} tone="danger" onClick={() => remove(a)}>
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

      <AssetFormModal open={assetModal.open} asset={assetModal.asset} defaultType={assetModal.type} onClose={() => setAssetModal((m) => ({ ...m, open: false, asset: null }))} />
      <BalanceModal asset={balanceAsset} onClose={() => setBalanceAsset(null)} />
      <ReserveGoalModal open={goalOpen} onClose={() => setGoalOpen(false)} />
    </>
  );
}
