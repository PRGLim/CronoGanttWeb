"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Check, X, Plus, GripVertical, ChevronUp, ChevronDown } from "lucide-react"
import { getPlannedEndWeek, getProgressPercent, type Task, type TaskInput } from "@/lib/schedule"
import { formatUnit, getUnitLabels, type TimeUnit } from "@/lib/time-unit"

type Language = "pt" | "en" | "es"

const translations = {
  pt: {
    id: "ID",
    name: "Nome",
    duration: "Duração",
    predecessor: "Predecessor",
    lag: "Folga",
    progress: "Progresso",
    delayed: "Atraso de",
    startWeek: "Início",
    endWeek: "Fim",
    actions: "Ações",
    addTask: "Adicionar Tarefa",
    noTasks: "Nenhuma tarefa criada ainda",
    invalidPredecessor: "ID predecessor inválido",
    duplicateId: "ID já existe",
    requiredFields: "Preencha todos os campos obrigatórios",
    title: "Tabela de Tarefas",
    total: "TOTAL DO PROJETO",
    none: "Nenhum",
    reorder: "Arraste para reordenar",
    moveUp: "Mover para cima",
    moveDown: "Mover para baixo",
    editHint: "Edite qualquer campo diretamente na tabela. Arraste ⠿ para reordenar.",
  },
  en: {
    id: "ID",
    name: "Name",
    duration: "Duration",
    predecessor: "Predecessor",
    lag: "Lag",
    progress: "Progress",
    delayed: "Delayed by",
    startWeek: "Start",
    endWeek: "End",
    actions: "Actions",
    addTask: "Add Task",
    noTasks: "No tasks created yet",
    invalidPredecessor: "Invalid predecessor ID",
    duplicateId: "ID already exists",
    requiredFields: "Fill all required fields",
    title: "Task Table",
    total: "PROJECT TOTAL",
    none: "None",
    reorder: "Drag to reorder",
    moveUp: "Move up",
    moveDown: "Move down",
    editHint: "Edit any field directly in the table. Drag ⠿ to reorder.",
  },
  es: {
    id: "ID",
    name: "Nombre",
    duration: "Duración",
    predecessor: "Predecesor",
    lag: "Holgura",
    progress: "Progreso",
    delayed: "Retraso de",
    startWeek: "Inicio",
    endWeek: "Fin",
    actions: "Acciones",
    addTask: "Agregar Tarea",
    noTasks: "Ninguna tarea creada aún",
    invalidPredecessor: "ID predecesor inválido",
    duplicateId: "ID ya existe",
    requiredFields: "Complete todos los campos obligatorios",
    title: "Tabla de Tareas",
    total: "TOTAL DEL PROYECTO",
    none: "Ninguno",
    reorder: "Arrastra para reordenar",
    moveUp: "Mover arriba",
    moveDown: "Mover abajo",
    editHint: "Edita cualquier campo directamente en la tabla. Arrastra ⠿ para reordenar.",
  },
}

interface TaskTableProps {
  tasks: Task[]
  onUpdateTask: (taskId: string, updatedData: Partial<Task>) => void
  onRemoveTask: (taskId: string) => void
  onAddTask: (newTask: TaskInput) => void
  onReorder: (from: number, to: number) => void
  projectWeeks: number
  language: Language
  timeUnit: TimeUnit
}

export function TaskTable({
  tasks,
  onUpdateTask,
  onRemoveTask,
  onAddTask,
  onReorder,
  projectWeeks,
  language,
  timeUnit,
}: TaskTableProps) {
  const [newTask, setNewTask] = useState<Partial<TaskInput>>({})
  const [showNewTaskRow, setShowNewTaskRow] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  /** Rascunho do ID em edição — só é aplicado ao sair do campo, para não renomear a cada tecla. */
  const [idDraft, setIdDraft] = useState<{ taskId: string; value: string } | null>(null)

  const t = translations[language]
  const units = getUnitLabels(language, timeUnit)
  const dayUnits = getUnitLabels(language, "days")

  const commitId = () => {
    if (!idDraft) return
    const value = idDraft.value.trim()
    const isDuplicate = tasks.some((task) => task.id === value && task.id !== idDraft.taskId)

    if (!value || isDuplicate) {
      setErrors(isDuplicate ? { id: t.duplicateId } : {})
    } else if (value !== idDraft.taskId) {
      onUpdateTask(idDraft.taskId, { id: value })
      setErrors({})
    }
    setIdDraft(null)
  }

  const handleIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      e.currentTarget.blur()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setIdDraft(null)
    }
  }

  const addNewTask = () => {
    const newErrors: { [key: string]: string } = {}

    if (!newTask.id?.trim() || !newTask.name?.trim() || !newTask.duration) {
      newErrors.general = t.requiredFields
    }
    if (newTask.id && tasks.some((task) => task.id === newTask.id!.trim())) {
      newErrors.id = t.duplicateId
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onAddTask({
      id: newTask.id!.trim(),
      name: newTask.name!.trim(),
      duration: Math.max(1, newTask.duration!),
      predecessor: newTask.predecessor || undefined,
      lag: 0,
      progress: 0,
    })
    setNewTask({})
    setShowNewTaskRow(false)
    setErrors({})
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropIndex(index)
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex !== null) onReorder(dragIndex, index)
    setDragIndex(null)
    setDropIndex(null)
  }

  return (
    <Card className="py-4 gap-3 lg:max-h-full lg:min-h-0 lg:flex lg:flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>
              {t.title} ({tasks.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{t.editHint}</p>
          </div>
          <Button onClick={() => setShowNewTaskRow(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t.addTask}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="lg:min-h-0 lg:flex lg:flex-col">
        {Object.keys(errors).length > 0 && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            {Object.entries(errors).map(([key, message]) => (
              <p key={key} className="text-sm text-destructive">
                {message}
              </p>
            ))}
          </div>
        )}

        {tasks.length === 0 && !showNewTaskRow ? (
          <p className="text-muted-foreground text-center py-8">{t.noTasks}</p>
        ) : (
          <div className="overflow-auto lg:min-h-0">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b">
                  <th className="w-8 p-2" />
                  <th className="text-left p-3 font-medium">{t.id}</th>
                  <th className="text-left p-3 font-medium">{t.name}</th>
                  <th className="text-left p-3 font-medium">
                    {t.duration} ({units.many})
                  </th>
                  <th className="text-left p-3 font-medium">{t.predecessor}</th>
                  <th className="text-left p-3 font-medium">{t.lag}</th>
                  <th className="text-left p-3 font-medium">
                    {t.progress} ({dayUnits.many})
                  </th>
                  <th className="text-left p-3 font-medium">{t.startWeek}</th>
                  <th className="text-left p-3 font-medium">{t.endWeek}</th>
                  <th className="text-left p-3 font-medium">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr
                    key={task.id}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`border-b hover:bg-muted/50 ${dragIndex === index ? "opacity-40" : ""} ${
                      dropIndex === index && dragIndex !== null && dragIndex !== index ? "border-t-2 border-t-primary" : ""
                    }`}
                  >
                    <td className="p-2">
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move"
                          setDragIndex(index)
                        }}
                        onDragEnd={() => {
                          setDragIndex(null)
                          setDropIndex(null)
                        }}
                        title={t.reorder}
                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded shrink-0 ${task.color}`} />
                        <Input
                          value={idDraft?.taskId === task.id ? idDraft.value : task.id}
                          onChange={(e) => setIdDraft({ taskId: task.id, value: e.target.value })}
                          onFocus={() => setIdDraft({ taskId: task.id, value: task.id })}
                          onBlur={commitId}
                          onKeyDown={handleIdKeyDown}
                          className="h-8 w-24"
                        />
                      </div>
                    </td>

                    <td className="p-3">
                      <Input
                        value={task.name}
                        onChange={(e) => onUpdateTask(task.id, { name: e.target.value })}
                        className="h-8 min-w-40"
                      />
                    </td>

                    <td className="p-3">
                      <Input
                        type="number"
                        min={1}
                        value={task.duration}
                        onChange={(e) => {
                          const duration = Number.parseInt(e.target.value, 10)
                          if (Number.isFinite(duration) && duration > 0) onUpdateTask(task.id, { duration })
                        }}
                        className="h-8 w-20"
                      />
                    </td>

                    <td className="p-3">
                      <select
                        value={task.predecessor ?? ""}
                        onChange={(e) => onUpdateTask(task.id, { predecessor: e.target.value || undefined, lag: 0 })}
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                      >
                        <option value="">{t.none}</option>
                        {tasks
                          .filter((other) => other.id !== task.id)
                          .map((other) => (
                            <option key={other.id} value={other.id}>
                              {other.id}
                            </option>
                          ))}
                      </select>
                    </td>

                    <td className="p-3">
                      <Input
                        type="number"
                        value={task.lag ?? 0}
                        onChange={(e) => {
                          const lag = Number.parseInt(e.target.value, 10)
                          onUpdateTask(task.id, { lag: Number.isFinite(lag) ? lag : 0 })
                        }}
                        className="h-8 w-20"
                      />
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={task.progress ?? 0}
                          onChange={(e) => {
                            const progress = Number(e.target.value)
                            onUpdateTask(task.id, { progress: Number.isFinite(progress) ? Math.max(0, progress) : 0 })
                          }}
                          className="h-8 w-20"
                        />
                        <span
                          className={`text-xs font-medium w-10 text-right ${
                            getProgressPercent(task, timeUnit) > 100 ? "text-destructive" : "text-muted-foreground"
                          }`}
                        >
                          {Math.round(getProgressPercent(task, timeUnit))}%
                        </span>
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {units.short}
                      {task.startWeek}
                    </td>
                    {/* Fim efetivo — em vermelho quando o progresso estourou a duração */}
                    <td
                      className={`p-3 whitespace-nowrap ${task.endWeek > getPlannedEndWeek(task) ? "text-destructive font-medium" : ""}`}
                      title={
                        task.endWeek > getPlannedEndWeek(task)
                          ? `${t.delayed} ${formatUnit(task.endWeek - getPlannedEndWeek(task), units)}`
                          : undefined
                      }
                    >
                      {units.short}
                      {task.endWeek}
                    </td>

                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button
                          onClick={() => onReorder(index, index - 1)}
                          disabled={index === 0}
                          size="sm"
                          variant="ghost"
                          title={t.moveUp}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => onReorder(index, index + 1)}
                          disabled={index === tasks.length - 1}
                          size="sm"
                          variant="ghost"
                          title={t.moveDown}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => onRemoveTask(task.id)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {showNewTaskRow && (
                  <tr className="border-b bg-muted/20">
                    <td className="p-2" />
                    <td className="p-3">
                      <Input
                        autoFocus
                        placeholder="ID"
                        value={newTask.id || ""}
                        onChange={(e) => setNewTask({ ...newTask, id: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && addNewTask()}
                        className={`h-8 w-24 ${errors.id ? "border-destructive" : ""}`}
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        placeholder={t.name}
                        value={newTask.name || ""}
                        onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && addNewTask()}
                        className="h-8 min-w-40"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min={1}
                        placeholder="1"
                        value={newTask.duration || ""}
                        onChange={(e) => setNewTask({ ...newTask, duration: Number.parseInt(e.target.value, 10) })}
                        onKeyDown={(e) => e.key === "Enter" && addNewTask()}
                        className="h-8 w-20"
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={newTask.predecessor ?? ""}
                        onChange={(e) => setNewTask({ ...newTask, predecessor: e.target.value || undefined })}
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                      >
                        <option value="">{t.none}</option>
                        {tasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.id}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">-</td>
                    <td className="p-3">-</td>
                    <td className="p-3">-</td>
                    <td className="p-3">-</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button onClick={addNewTask} size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          onClick={() => {
                            setShowNewTaskRow(false)
                            setNewTask({})
                            setErrors({})
                          }}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Linha de total do projeto */}
              {tasks.length > 0 && (
                <tfoot className="sticky bottom-0 bg-card z-10">
                  <tr className="border-t-2 border-primary bg-muted/30 font-bold">
                    <td className="p-2" />
                    <td className="p-3" colSpan={6}>
                      {t.total}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {units.short}1
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {units.short}
                      {projectWeeks}
                    </td>
                    <td className="p-3 whitespace-nowrap text-primary">
                      {formatUnit(projectWeeks, units)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
