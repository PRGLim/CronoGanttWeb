"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import type { Task, TaskInput } from "@/lib/schedule"

type Language = "pt" | "en" | "es"

const translations = {
  pt: {
    newTask: "Nova Tarefa",
    editTask: "Editar Tarefa",
    saveChanges: "Salvar Alterações",
    lag: "Folga (semanas)",
    lagHint: "Deslocamento em relação ao predecessor. Negativo sobrepõe as tarefas.",
    taskId: "ID da Tarefa",
    taskName: "Nome da Tarefa",
    duration: "Duração (semanas)",
    predecessor: "Tarefa Predecessora",
    phase: "Fase do Projeto",
    selectTask: "Selecione uma tarefa (opcional)",
    selectPhase: "Selecione uma fase (opcional)",
    none: "Nenhuma",
    createTask: "Criar Tarefa",
    cancel: "Cancelar",
    fillRequired: "Por favor, preencha todos os campos obrigatórios",
    idExists: "ID já existe. Escolha um ID único.",
    durationPositive: "Duração deve ser maior que zero",
    exampleId: "Ex: T001",
    exampleName: "Ex: Análise de Requisitos",
    exampleDuration: "Ex: 2",
    phases: {
      planning: "Planejamento",
      design: "Design",
      development: "Desenvolvimento",
      testing: "Testes",
      deployment: "Implantação",
    },
  },
  en: {
    newTask: "New Task",
    editTask: "Edit Task",
    saveChanges: "Save Changes",
    lag: "Lag (weeks)",
    lagHint: "Offset from the predecessor. Negative values overlap the tasks.",
    taskId: "Task ID",
    taskName: "Task Name",
    duration: "Duration (weeks)",
    predecessor: "Predecessor Task",
    phase: "Project Phase",
    selectTask: "Select a task (optional)",
    selectPhase: "Select a phase (optional)",
    none: "None",
    createTask: "Create Task",
    cancel: "Cancel",
    fillRequired: "Please fill in all required fields",
    idExists: "ID already exists. Choose a unique ID.",
    durationPositive: "Duration must be greater than zero",
    exampleId: "Ex: T001",
    exampleName: "Ex: Requirements Analysis",
    exampleDuration: "Ex: 2",
    phases: {
      planning: "Planning",
      design: "Design",
      development: "Development",
      testing: "Testing",
      deployment: "Deployment",
    },
  },
  es: {
    newTask: "Nueva Tarea",
    editTask: "Editar Tarea",
    saveChanges: "Guardar Cambios",
    lag: "Holgura (semanas)",
    lagHint: "Desplazamiento respecto al predecesor. Los valores negativos superponen las tareas.",
    taskId: "ID de Tarea",
    taskName: "Nombre de Tarea",
    duration: "Duración (semanas)",
    predecessor: "Tarea Predecesora",
    phase: "Fase del Proyecto",
    selectTask: "Selecciona una tarea (opcional)",
    selectPhase: "Selecciona una fase (opcional)",
    none: "Ninguna",
    createTask: "Crear Tarea",
    cancel: "Cancelar",
    fillRequired: "Por favor, completa todos los campos obligatorios",
    idExists: "ID ya existe. Elige un ID único.",
    durationPositive: "La duración debe ser mayor que cero",
    exampleId: "Ej: T001",
    exampleName: "Ej: Análisis de Requisitos",
    exampleDuration: "Ej: 2",
    phases: {
      planning: "Planificación",
      design: "Diseño",
      development: "Desarrollo",
      testing: "Pruebas",
      deployment: "Despliegue",
    },
  },
}

interface TaskFormProps {
  existingTasks: Task[]
  /** Quando informada, o formulário abre em modo de edição. */
  task?: Task
  onSubmit: (task: TaskInput) => void
  onCancel: () => void
  language: Language
}

export function TaskForm({ existingTasks, task, onSubmit, onCancel, language }: TaskFormProps) {
  const isEditing = Boolean(task)
  const [formData, setFormData] = useState({
    id: task?.id ?? "",
    name: task?.name ?? "",
    duration: task ? String(task.duration) : "",
    predecessor: task?.predecessor ?? "",
    lag: task ? String(task.lag ?? 0) : "0",
  })
  const [error, setError] = useState("")

  const t = translations[language]

  // Esc fecha o modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onCancel])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const id = formData.id.trim()
    const name = formData.name.trim()

    if (!id || !name || !formData.duration) {
      setError(t.fillRequired)
      return
    }

    if (existingTasks.some((other) => other.id === id && other.id !== task?.id)) {
      setError(t.idExists)
      return
    }

    const duration = Number.parseInt(formData.duration, 10)
    if (!Number.isFinite(duration) || duration <= 0) {
      setError(t.durationPositive)
      return
    }

    const lag = Number.parseInt(formData.lag, 10)

    setError("")
    onSubmit({
      id,
      name,
      duration,
      predecessor: formData.predecessor || undefined,
      lag: Number.isFinite(lag) ? lag : 0,
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{isEditing ? t.editTask : t.newTask}</CardTitle>
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                {error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="taskId">{t.taskId} *</Label>
              <Input
                id="taskId"
                autoFocus
                value={formData.id}
                onChange={(e) => setFormData((prev) => ({ ...prev, id: e.target.value }))}
                placeholder={t.exampleId}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskName">{t.taskName} *</Label>
              <Input
                id="taskName"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t.exampleName}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">{t.duration} *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
                placeholder={t.exampleDuration}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="predecessor">{t.predecessor}</Label>
              <Select
                value={formData.predecessor}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, predecessor: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectTask} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.none}</SelectItem>
                  {existingTasks
                    .filter((other) => other.id !== task?.id)
                    .map((other) => (
                      <SelectItem key={other.id} value={other.id}>
                        {other.id} - {other.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lag">{t.lag}</Label>
              <Input
                id="lag"
                type="number"
                value={formData.lag}
                onChange={(e) => setFormData((prev) => ({ ...prev, lag: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{t.lagHint}</p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {isEditing ? t.saveChanges : t.createTask}
              </Button>
              <Button type="button" onClick={onCancel} variant="outline" className="flex-1 bg-transparent">
                {t.cancel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
