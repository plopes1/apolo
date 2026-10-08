"use client";

import { useState } from "react";
import { CycleWizardModal } from "@/components/forms/cycle-wizard";
import { Button } from "@/components/ui/button";
import { PlusIcon, TargetIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/misc";

export function NoCycleState() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EmptyState
        icon={<TargetIcon size={28} />}
        title="Nenhum ciclo ativo"
        description="Comece um ciclo de 90 dias: defina as datas, escolha as áreas prioritárias e adicione suas metas."
        action={
          <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setOpen(true)}>
            Iniciar ciclo de 90 dias
          </Button>
        }
      />
      <CycleWizardModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
