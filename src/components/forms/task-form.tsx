"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/labels";
import type { Priority, Task } from "@/lib/types";
import { useStore, useToday } from "@/store/app-store";

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultGoalId?: string | null;
}

export function TaskFormModal({ open, onClose, task, defaultGoalId }: TaskFormModalProps) {
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Editar tarefa" : "Adicionar tarefa"}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">
            {task ? "Salvar" : "Adicionar"}
          </Button>
        </>
      }
    >
      <TaskForm formId={formId} task={task ?? null} defaultGoalId={defaultGoalId ?? null} onDone={onClose} />
    </Modal>
  );
}

function TaskForm({ formId, task, defaultGoalId, onDone }: { formId: string; task: Task | null; defaultGoalId: string | null; onDone: () => void }) {
  const { data, actions } = useStore();
  const toast = useToast();
  const today = useToday();
  const categories = data.settings.taskCategories;

  const [title, setTitle] = useState(task?.title ?? "");
  const [dueDate, setDueDate] = useState(task ? (task.dueDate ?? "") : today);
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "media");
  const [category, setCategory] = useState(task?.category ?? categories[0] ?? "Geral");
  const [goalId, setGoalId] = useState(task?.goalId ?? defaultGoalId ?? "");
  const [error, setError] = useState<string>();

  const goalOptions = data.goals
    .filter((g) => g.cycleId === data.activeCycleId || g.id === goalId)
    .map((g) => ({ value: g.id, label: g.title }));

  const categoryOptions = [...new Set([...categories, category])].map((c) => ({ value: c, label: c }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      setError("Descreva a tarefa (mínimo de 2 caracteres).");
      return;
    }
    const input = {
      title: title.trim(),
      dueDate: dueDate || null,
      priority,
      category,
      goalId: goalId || null,
    };
    if (task) {
      actions.updateTask(task.id, input);
      toast.success("Tarefa atualizada.");
    } else {
      actions.addTask({ ...input, done: false });
      toast.success("Tarefa adicionada.");
    }
    onDone();
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <TextField label="Tarefa" required value={title} onChange={(e) => setTitle(e.target.value)} error={error} placeholder="Ex.: Fazer o simulado 1" autoFocus />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Prazo" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} hint="Deixe vazio para tarefas sem data." />
        <SelectField label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))} />
        <SelectField label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} options={categoryOptions} />
        <SelectField label="Meta vinculada" value={goalId} onChange={(e) => setGoalId(e.target.value)} options={[{ value: "", label: "Nenhuma" }, ...goalOptions]} />
      </div>
    </form>
  );
}
