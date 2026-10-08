"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ConfirmProvider } from "@/components/ui/confirm";
import { ToastProvider } from "@/components/ui/toast";
import { AppStoreProvider } from "@/store/app-store";
import { FocusTimerProvider } from "@/store/focus-timer";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppStoreProvider>
      <ToastProvider>
        <FocusTimerProvider>
          <ConfirmProvider>
            <AppShell>{children}</AppShell>
          </ConfirmProvider>
        </FocusTimerProvider>
      </ToastProvider>
    </AppStoreProvider>
  );
}
