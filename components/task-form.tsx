"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import type { Task } from "@/app/page"

type Language = "pt" | "en" | "es"

const translations = {
  pt: {
    newTask: "Nova Tarefa",
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
  onSubmit: (task: Omit<Task, "startWeek" | "endWeek" | "color">) => void
  onCancel: () => void
  language: Language
}

export function TaskForm({ existingTasks, onSubmit, onCancel, language }: TaskFormProps) {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    duration: "",
    predecessor: "",
    phase: "", // Added phase field to form data
  })

  const t = translations[language]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.id || !formData.name || !formData.duration) {
      alert(t.fillRequired)
      return
    }

    if (existingTasks.some((task) => task.id === formData.id)) {
      alert(t.idExists)
      return
    }

    const duration = Number.parseInt(formData.duration)
    if (duration <= 0) {
      alert(t.durationPositive)
      return
    }

    onSubmit({
      id: formData.id,
      name: formData.name,
      duration,
      predecessor: formData.predecessor || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t.newTask}</CardTitle>
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taskId">{t.taskId} *</Label>
              <Input
                id="taskId"
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

            {/* <div className="space-y-2">
              <Label htmlFor="phase">{t.phase}</Label>
              <Select
                value={formData.phase}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, phase: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectPhase} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.none}</SelectItem>
                  <SelectItem value={t.phases.planning}>{t.phases.planning}</SelectItem>
                  <SelectItem value={t.phases.design}>{t.phases.design}</SelectItem>
                  <SelectItem value={t.phases.development}>{t.phases.development}</SelectItem>
                  <SelectItem value={t.phases.testing}>{t.phases.testing}</SelectItem>
                  <SelectItem value={t.phases.deployment}>{t.phases.deployment}</SelectItem>
                </SelectContent>
              </Select>
            </div> */}

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
                  {existingTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.id} - {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {t.createTask}
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
