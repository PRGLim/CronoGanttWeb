"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Check, X, Plus } from "lucide-react"
import type { Task } from "@/app/page"

type Language = "pt" | "en" | "es"

const translations = {
  pt: {
    id: "ID",
    name: "Nome",
    duration: "Duração",
    predecessor: "Predecessor",
    phase: "Fase",
    startWeek: "Início",
    endWeek: "Fim",
    actions: "Ações",
    week: "sem",
    weeks: "sem",
    weekShort: "S",
    addTask: "Adicionar Tarefa",
    noTasks: "Nenhuma tarefa criada ainda",
    invalidPredecessor: "ID predecessor inválido",
    duplicateId: "ID já existe",
    requiredFields: "Preencha todos os campos obrigatórios",
  },
  en: {
    id: "ID",
    name: "Name",
    duration: "Duration",
    predecessor: "Predecessor",
    phase: "Phase",
    startWeek: "Start",
    endWeek: "End",
    actions: "Actions",
    week: "wk",
    weeks: "wks",
    weekShort: "W",
    addTask: "Add Task",
    noTasks: "No tasks created yet",
    invalidPredecessor: "Invalid predecessor ID",
    duplicateId: "ID already exists",
    requiredFields: "Fill all required fields",
  },
  es: {
    id: "ID",
    name: "Nombre",
    duration: "Duración",
    predecessor: "Predecesor",
    phase: "Fase",
    startWeek: "Inicio",
    endWeek: "Fin",
    actions: "Acciones",
    week: "sem",
    weeks: "sem",
    weekShort: "S",
    addTask: "Agregar Tarea",
    noTasks: "Ninguna tarea creada aún",
    invalidPredecessor: "ID predecesor inválido",
    duplicateId: "ID ya existe",
    requiredFields: "Complete todos los campos obligatorios",
  },
}

interface TaskTableProps {
  tasks: Task[]
  onUpdateTask: (taskId: string, updatedData: Partial<Task>) => void
  onRemoveTask: (taskId: string) => void
  onAddTask: (newTask: Task) => void
  language: Language
}

export function TaskTable({ tasks, onUpdateTask, onRemoveTask, onAddTask, language }: TaskTableProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Task>>({})
  const [newTask, setNewTask] = useState<Partial<Task>>({})
  const [showNewTaskRow, setShowNewTaskRow] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const t = translations[language]

  const validatePredecessor = (predecessorId: string | undefined, currentTaskId?: string): boolean => {
    if (!predecessorId || predecessorId.trim() === "") return true

    const existingTask = tasks.find((task) => task.id === predecessorId.trim())
    if (!existingTask) return false

    if (currentTaskId && predecessorId.trim() === currentTaskId) return false

    return true
  }

  const validateUniqueId = (id: string, currentTaskId?: string): boolean => {
    if (!id || id.trim() === "") return false

    const existingTask = tasks.find((task) => task.id === id.trim())
    if (!existingTask) return true

    return currentTaskId === id.trim()
  }

  const startEdit = (task: Task) => {
    setEditingTask(task.id)
    setEditData({
      name: task.name,
      duration: task.duration,
      predecessor: task.predecessor,
    })
    setErrors({})
  }

  const saveEdit = () => {
    if (editingTask && editData) {
      const newErrors: { [key: string]: string } = {}

      if (editData.predecessor && !validatePredecessor(editData.predecessor, editingTask)) {
        newErrors.predecessor = t.invalidPredecessor
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      onUpdateTask(editingTask, editData)
      setEditingTask(null)
      setEditData({})
      setErrors({})
    }
  }

  const cancelEdit = () => {
    setEditingTask(null)
    setEditData({})
    setErrors({})
  }

  const addNewTask = () => {
    const newErrors: { [key: string]: string } = {}

    if (!newTask.id || !newTask.name || !newTask.duration) {
      newErrors.general = t.requiredFields
    }

    if (newTask.id && !validateUniqueId(newTask.id)) {
      newErrors.id = t.duplicateId
    }

    if (newTask.predecessor && !validatePredecessor(newTask.predecessor)) {
      newErrors.predecessor = t.invalidPredecessor
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (newTask.id && newTask.name && newTask.duration) {
      const taskToAdd = {
        id: newTask.id,
        name: newTask.name,
        duration: newTask.duration,
        predecessor: newTask.predecessor,
        startWeek: 1,
        endWeek: 1,
        color: "bg-chart-1",
      } as Task

      onAddTask(taskToAdd)
      setNewTask({})
      setShowNewTaskRow(false)
      setErrors({})
    }
  }

  const getAvailablePredecessors = (currentTaskId?: string) => {
    return tasks.filter((task) => task.id !== currentTaskId).map((task) => task.id)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tabela de Tarefas ({tasks.length})</CardTitle>
          <Button onClick={() => setShowNewTaskRow(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t.addTask}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">{t.id}</th>
                  <th className="text-left p-3 font-medium">{t.name}</th>
                  <th className="text-left p-3 font-medium">{t.duration}</th>
                  <th className="text-left p-3 font-medium">{t.predecessor}</th>
                  {/* <th className="text-left p-3 font-medium">{t.phase}</th> */}
                  <th className="text-left p-3 font-medium">{t.startWeek}</th>
                  <th className="text-left p-3 font-medium">{t.endWeek}</th>
                  <th className="text-left p-3 font-medium">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${task.color}`} />
                        {task.id}
                      </div>
                    </td>
                    <td className="p-3">
                      {editingTask === task.id ? (
                        <Input
                          value={editData.name || ""}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        task.name
                      )}
                    </td>
                    <td className="p-3">
                      {editingTask === task.id ? (
                        <Input
                          type="number"
                          value={editData.duration || ""}
                          onChange={(e) => setEditData({ ...editData, duration: Number.parseInt(e.target.value) })}
                          className="h-8 w-20"
                        />
                      ) : (
                        `${task.duration} ${task.duration > 1 ? t.weeks : t.week}`
                      )}
                    </td>
                    <td className="p-3">
                      {editingTask === task.id ? (
                        <div className="relative">
                          <Input
                            value={editData.predecessor || ""}
                            onChange={(e) => setEditData({ ...editData, predecessor: e.target.value || undefined })}
                            className={`h-8 ${errors.predecessor ? "border-destructive" : ""}`}
                            placeholder="-"
                            list={`predecessors-${task.id}`}
                          />
                          <datalist id={`predecessors-${task.id}`}>
                            {getAvailablePredecessors(task.id).map((id) => (
                              <option key={id} value={id} />
                            ))}
                          </datalist>
                        </div>
                      ) : task.predecessor ? (
                        <Badge variant="secondary">{task.predecessor}</Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    {/* <td className="p-3">
                      {editingTask === task.id ? (
                        <Input
                          value={editData.phase || ""}
                          onChange={(e) => setEditData({ ...editData, phase: e.target.value || undefined })}
                          className="h-8"
                          placeholder="-"
                        />
                      ) : task.phase ? (
                        <Badge variant="outline">{task.phase}</Badge>
                      ) : (
                        "-"
                      )}
                    </td> */}
                    <td className="p-3">{t.weekShort}{task.startWeek}</td>
                    <td className="p-3">{t.weekShort}{task.endWeek}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {editingTask === task.id ? (
                          <>
                            <Button onClick={saveEdit} size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button onClick={cancelEdit} size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => startEdit(task)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => onRemoveTask(task.id)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {showNewTaskRow && (
                  <tr className="border-b bg-muted/20">
                    <td className="p-3">
                      <Input
                        placeholder="ID"
                        value={newTask.id || ""}
                        onChange={(e) => setNewTask({ ...newTask, id: e.target.value })}
                        className={`h-8 ${errors.id ? "border-destructive" : ""}`}
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        placeholder={t.name}
                        value={newTask.name || ""}
                        onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                        className="h-8"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        placeholder="1"
                        value={newTask.duration || ""}
                        onChange={(e) => setNewTask({ ...newTask, duration: Number.parseInt(e.target.value) })}
                        className="h-8 w-20"
                      />
                    </td>
                    <td className="p-3">
                      <div className="relative">
                        <Input
                          placeholder="-"
                          value={newTask.predecessor || ""}
                          onChange={(e) => setNewTask({ ...newTask, predecessor: e.target.value || undefined })}
                          className={`h-8 ${errors.predecessor ? "border-destructive" : ""}`}
                          list="new-task-predecessors"
                        />
                        <datalist id="new-task-predecessors">
                          {tasks.map((task) => (
                            <option key={task.id} value={task.id} />
                          ))}
                        </datalist>
                      </div>
                    </td>
                    {/* <td className="p-3">
                      <Input
                        placeholder="Fase"
                        value={newTask.phase || ""}
                        onChange={(e) => setNewTask({ ...newTask, phase: e.target.value || undefined })}
                        className="h-8"
                      />
                    </td> */}
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
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
