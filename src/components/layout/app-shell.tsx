"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertIcon,
  CheckSquareIcon,
  DeviceIcon,
  HomeIcon,
  LandmarkIcon,
  NotebookIcon,
  SlidersIcon,
  TargetIcon,
  TimerIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { FocusMiniTimer } from "@/components/features/focus-timer-card";
import { getActiveCycle } from "@/lib/metrics";
import { useFocusTimer } from "@/store/focus-timer";
import { useStore } from "@/store/app-store";

export const NAV_ITEMS = [
  { href: "/", label: "Visão geral", short: "Início", icon: HomeIcon },
  { href: "/ciclos", label: "Ciclos", short: "Ciclos", icon: TargetIcon },
  { href: "/habitos", label: "Hábitos e tarefas", short: "Hábitos", icon: CheckSquareIcon },
  { href: "/foco", label: "Foco", short: "Foco", icon: TimerIcon },
  { href: "/financas", label: "Planejamento financeiro", short: "Finanças", icon: WalletIcon },
  { href: "/patrimonio", label: "Patrimônio", short: "Patrimônio", icon: LandmarkIcon },
  { href: "/revisoes", label: "Revisões", short: "Revisões", icon: NotebookIcon },
  { href: "/configuracoes", label: "Configurações", short: "Ajustes", icon: SlidersIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data, saveError } = useStore();
  const cycle = getActiveCycle(data);
  const timerActive = useFocusTimer().status !== "idle" && pathname !== "/foco";
  const name = data.settings.userName.trim();
  const initials = name
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("")
    : "A";

  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#conteudo"
        className="sr-only z-[70] rounded-full bg-ink px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface/70 px-4 py-6 backdrop-blur lg:flex">
        <div className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight">Apolo</p>
            <p className="truncate text-xs text-ink-3">{name || cycle?.name || "Painel pessoal"}</p>
          </div>
        </div>

        <nav aria-label="Navegação principal" className="mt-9">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Navegação</p>
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                      active ? "bg-[#ebeae6] font-medium text-ink" : "text-ink-2 hover:bg-subtle hover:text-ink"
                    }`}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto rounded-2xl border border-line bg-surface p-3.5">
          <p className="flex items-center gap-2 text-xs font-semibold text-ink">
            <DeviceIcon size={15} />
            Dados neste navegador
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-2">
            Tudo fica salvo só neste dispositivo. Faça backups em{" "}
            <Link href="/configuracoes#dados" className="font-medium text-accent-strong underline-offset-2 hover:underline">
              Configurações
            </Link>
            .
          </p>
        </div>
      </aside>

      {/* Topo (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
            {initials}
          </span>
          <span className="text-[15px] font-semibold">Apolo</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          {timerActive ? <FocusMiniTimer className="shadow-none" /> : cycle && <span className="truncate pl-3 text-xs text-ink-3">{cycle.name}</span>}
          <Link
            href="/revisoes"
            aria-label="Revisões"
            aria-current={isActive(pathname, "/revisoes") ? "page" : undefined}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isActive(pathname, "/revisoes") ? "bg-[#ebeae6] text-ink" : "text-ink-2 hover:bg-subtle"
            }`}
          >
            <NotebookIcon size={18} />
          </Link>
          <Link
            href="/configuracoes"
            aria-label="Configurações"
            aria-current={isActive(pathname, "/configuracoes") ? "page" : undefined}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isActive(pathname, "/configuracoes") ? "bg-[#ebeae6] text-ink" : "text-ink-2 hover:bg-subtle"
            }`}
          >
            <SlidersIcon size={18} />
          </Link>
        </div>
      </header>

      {saveError && (
        <div role="alert" className="mx-4 mt-4 flex items-center gap-2 rounded-2xl bg-critical-soft px-4 py-3 text-sm text-critical-ink lg:mx-10">
          <AlertIcon size={16} />
          {saveError}
        </div>
      )}

      <main id="conteudo" className="mx-auto w-full max-w-[1280px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-10">
        {children}
      </main>

      {/* Timer em andamento fora da página Foco (desktop) */}
      <div className="fixed bottom-6 left-[calc(16rem+1.5rem)] z-40 hidden lg:block">
        <FocusMiniTimer />
      </div>

      {/* Navegação inferior (mobile) */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-6">
          {NAV_ITEMS.filter((item) => item.href !== "/configuracoes" && item.href !== "/revisoes").map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-tight ${
                    active ? "text-ink" : "text-ink-3"
                  }`}
                >
                  <span className={`flex h-7 w-11 items-center justify-center rounded-full ${active ? "bg-[#ebeae6]" : ""}`}>
                    <Icon size={18} />
                  </span>
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  section,
  description,
  actions,
}: {
  title: string;
  section?: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 lg:mb-9 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="mb-1.5 text-xs text-ink-3">
          Apolo <span aria-hidden>/</span> {section ?? title}
        </p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">{title}</h1>
        {description && <div className="mt-1.5 text-sm text-ink-2">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
