"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Plus,
  Calendar,
  Table,
  Trash2,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  Upload,
  Download,
  LayoutTemplate,
} from "lucide-react"
import { GanttChart } from "@/components/gantt-chart"
import { TaskForm } from "@/components/task-form"
import { TaskTable } from "@/components/task-table"
import {
  scheduleTasks,
  TASK_COLORS,
  getProjectWeeks,
  getProgressPercent,
  getPlannedEndWeek,
  type Task,
  type TaskInput,
} from "@/lib/schedule"
import { createTemplateTasks, exportProjectJson, parseProjectJson } from "@/lib/project-file"
import { formatUnit, getUnitLabels, type TimeUnit } from "@/lib/time-unit"
import Image from "next/image"


type Language = "pt" | "en" | "es"

const translations = {
  pt: {
    title: "Gerenciador de Projetos",
    subtitle: "Crie tarefas e visualize o cronograma no gráfico de Gantt",
    newTask: "Nova Tarefa",
    tasks: "Tarefas",
    ganttChart: "Gráfico de Gantt",
    noTasks: "Nenhuma tarefa criada ainda",
    duration: "Duração",
    period: "Período",
    after: "Após",
    progress: "Progresso",
    delayed: "atraso",
    tableView: "Visualização em Tabela",
    ganttView: "Visualização em Gantt",
    totalDuration: "Duração total",
    clearAll: "Limpar tudo",
    clearConfirm: "Remover todas as tarefas? Esta ação não pode ser desfeita.",
    edit: "Editar tarefa",
    remove: "Remover tarefa",
    hidePanel: "Ocultar painel",
    showPanel: "Mostrar painel",
    dragHint: "Arraste as barras para mover, as bordas para redimensionar e o ícone ⠿ para reordenar.",
    importJson: "Importar JSON",
    exportJson: "Salvar JSON",
    template: "Template",
    templateTitle: "Gerar cronograma modelo",
    templateConfirm: "Gerar o template substitui as tarefas atuais. Continuar?",
    importConfirm: "Importar substitui as tarefas atuais. Continuar?",
    importError: "Não foi possível ler o arquivo: não parece um cronograma válido.",
  },
  en: {
    title: "Project Manager",
    subtitle: "Create tasks and visualize the timeline in Gantt chart",
    newTask: "New Task",
    tasks: "Tasks",
    ganttChart: "Gantt Chart",
    noTasks: "No tasks created yet",
    duration: "Duration",
    period: "Period",
    after: "After",
    progress: "Progress",
    delayed: "delay",
    tableView: "Table View",
    ganttView: "Gantt View",
    totalDuration: "Total duration",
    clearAll: "Clear all",
    clearConfirm: "Remove all tasks? This action cannot be undone.",
    edit: "Edit task",
    remove: "Remove task",
    hidePanel: "Hide panel",
    showPanel: "Show panel",
    dragHint: "Drag bars to move, edges to resize and the ⠿ handle to reorder.",
    importJson: "Import JSON",
    exportJson: "Save JSON",
    template: "Template",
    templateTitle: "Generate template schedule",
    templateConfirm: "Generating the template replaces the current tasks. Continue?",
    importConfirm: "Importing replaces the current tasks. Continue?",
    importError: "Could not read the file: it does not look like a valid schedule.",
  },
  es: {
    title: "Gestor de Proyectos",
    subtitle: "Crea tareas y visualiza la cronología en el gráfico de Gantt",
    newTask: "Nueva Tarea",
    tasks: "Tareas",
    ganttChart: "Gráfico de Gantt",
    noTasks: "Ninguna tarea creada aún",
    duration: "Duración",
    period: "Período",
    after: "Después",
    progress: "Progreso",
    delayed: "retraso",
    tableView: "Vista de Tabla",
    ganttView: "Vista de Gantt",
    totalDuration: "Duración total",
    clearAll: "Limpiar todo",
    clearConfirm: "¿Eliminar todas las tareas? Esta acción no se puede deshacer.",
    edit: "Editar tarea",
    remove: "Eliminar tarea",
    hidePanel: "Ocultar panel",
    showPanel: "Mostrar panel",
    dragHint: "Arrastra las barras para mover, los bordes para redimensionar y el icono ⠿ para reordenar.",
    importJson: "Importar JSON",
    exportJson: "Guardar JSON",
    template: "Plantilla",
    templateTitle: "Generar cronograma modelo",
    templateConfirm: "Generar la plantilla reemplaza las tareas actuales. ¿Continuar?",
    importConfirm: "Importar reemplaza las tareas actuales. ¿Continuar?",
    importError: "No se pudo leer el archivo: no parece un cronograma válido.",
  },
}

const STORAGE_KEY = "crono-gantt-tasks"
const UNIT_STORAGE_KEY = "crono-gantt-unit"

export default function ProjectManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [language, setLanguage] = useState<Language>("pt")
  const [viewMode, setViewMode] = useState<"gantt" | "table">("gantt")
  const [showTaskPanel, setShowTaskPanel] = useState(true)
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("weeks")
  const ganttRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loaded = useRef(false)

  const t = translations[language]
  const units = getUnitLabels(language, timeUnit)
  const dayUnits = getUnitLabels(language, "days")

  // Persistência local: o trabalho não se perde ao recarregar a página.
  useEffect(() => {
    try {
      const savedUnit = localStorage.getItem(UNIT_STORAGE_KEY)
      const unit: TimeUnit = savedUnit === "days" ? "days" : "weeks"
      setTimeUnit(unit)
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setTasks(scheduleTasks(JSON.parse(saved) as Task[], unit))
    } catch {
      // storage indisponível ou conteúdo inválido — começa vazio
    }
    loaded.current = true
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
      localStorage.setItem(UNIT_STORAGE_KEY, timeUnit)
    } catch {
      // ignora quota/modo privado
    }
  }, [tasks, timeUnit])

  const addTask = (taskData: TaskInput) => {
    setTasks((prev) => scheduleTasks([...prev, { ...taskData, startWeek: 1, endWeek: 1, color: TASK_COLORS[0] }], timeUnit))
    setShowForm(false)
  }

  const removeTask = (taskId: string) => {
    setTasks((prev) =>
      scheduleTasks(
        prev
          .filter((task) => task.id !== taskId)
          // limpa dependências órfãs para não quebrar o cronograma
          .map((task) => (task.predecessor === taskId ? { ...task, predecessor: undefined } : task)),
        timeUnit,
      ),
    )
  }

  const updateTask = (taskId: string, updatedData: Partial<Task>) => {
    setTasks((prev) => {
      const renamedId = updatedData.id && updatedData.id !== taskId ? updatedData.id : null
      const next = prev.map((task) => {
        if (task.id === taskId) return { ...task, ...updatedData }
        // mantém as dependências apontando para o novo ID
        if (renamedId && task.predecessor === taskId) return { ...task, predecessor: renamedId }
        return task
      })
      return scheduleTasks(next, timeUnit)
    })
  }

  /** O mesmo formulário atende criação e edição. */
  const submitForm = (taskData: TaskInput) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData)
      setEditingTask(null)
      return
    }
    addTask(taskData)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingTask(null)
  }

  const reorderTasks = (from: number, to: number) => {
    setTasks((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return scheduleTasks(next, timeUnit)
    })
  }

  const clearAll = () => {
    if (tasks.length === 0) return
    if (window.confirm(t.clearConfirm)) setTasks([])
  }

  /* ------------------------------------------------- arquivo JSON e template */

  const generateTemplate = () => {
    if (tasks.length > 0 && !window.confirm(t.templateConfirm)) return
    setTasks(createTemplateTasks(language, timeUnit))
  }

  /** O progresso é sempre em dias, então trocar a unidade muda quanto ele ocupa no cronograma. */
  const changeTimeUnit = (unit: TimeUnit) => {
    setTimeUnit(unit)
    setTasks((prev) => scheduleTasks(prev, unit))
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Limpa o input para que escolher o mesmo arquivo de novo dispare o evento.
    event.target.value = ""
    if (!file) return
    if (tasks.length > 0 && !window.confirm(t.importConfirm)) return

    try {
      const data = parseProjectJson(await file.text())
      setTasks(data.tasks)
      setTimeUnit(data.timeUnit)
    } catch {
      window.alert(t.importError)
    }
  }

  const projectWeeks = getProjectWeeks(tasks)
  const maxWeek = Math.max(projectWeeks, 8)

  return (
    // Em telas grandes a altura fica presa à da janela: só o gráfico/tabela rolam
    // internamente, e apenas quando o conteúdo passa do espaço disponível.
    <div className="min-h-screen lg:h-screen bg-background px-6 py-4 flex flex-col items-center">
      <div className="max-w-7xl w-full flex-1 lg:min-h-0 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1">
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_PATH}/logo.png`}   // sempre começa com "/" se estiver em public
                alt="Logo"
                width={40}
                height={40}
              />
              <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex border rounded-lg">
              {(["pt", "en", "es"] as Language[]).map((lang) => (
                <Button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  variant={language === lang ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                >
                  {lang.toUpperCase()}
                </Button>
              ))}
            </div>

            {/* Unidade exibida — troca os rótulos; só o progresso (em dias) é reconvertido */}
            <div className="flex border rounded-lg">
              {(["weeks", "days"] as TimeUnit[]).map((unit) => (
                <Button
                  key={unit}
                  onClick={() => changeTimeUnit(unit)}
                  variant={timeUnit === unit ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                >
                  {getUnitLabels(language, unit).label}
                </Button>
              ))}
            </div>

            <div className="flex border rounded-lg">
              <Button
                onClick={() => setViewMode("gantt")}
                variant={viewMode === "gantt" ? "default" : "ghost"}
                size="sm"
                className="rounded-none rounded-l-lg gap-2"
              >
                <Calendar className="h-4 w-4" />
                {t.ganttView}
              </Button>
              <Button
                onClick={() => setViewMode("table")}
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-none rounded-r-lg gap-2"
              >
                <Table className="h-4 w-4" />
                {t.tableView}
              </Button>
            </div>

            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t.newTask}
            </Button>

            <Button onClick={generateTemplate} variant="outline" size="sm" title={t.templateTitle} className="gap-2">
              <LayoutTemplate className="h-4 w-4" />
              {t.template}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              {t.importJson}
            </Button>

            <Button
              onClick={() => exportProjectJson({ tasks, timeUnit })}
              variant="outline"
              size="sm"
              disabled={tasks.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {t.exportJson}
            </Button>

            <Button
              onClick={clearAll}
              variant="outline"
              size="sm"
              disabled={tasks.length === 0}
              className="gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t.clearAll}
            </Button>
          </div>
        </div>

        {/* Resumo do projeto */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">{t.totalDuration}:</span>
            <span className="text-base font-bold text-foreground">
              {projectWeeks} {projectWeeks === 1 ? units.one : units.many}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
            <span className="text-sm text-muted-foreground">{t.tasks}:</span>
            <span className="text-base font-bold text-foreground">{tasks.length}</span>
          </div>
          {viewMode === "gantt" && tasks.length > 0 && (
            <p className="text-xs text-muted-foreground">{t.dragHint}</p>
          )}
        </div>

        {/* Task Form Modal — criação e edição */}
        {(showForm || editingTask) && (
          <TaskForm
            key={editingTask?.id ?? "new"}
            existingTasks={tasks}
            task={editingTask ?? undefined}
            onSubmit={submitForm}
            onCancel={closeForm}
            language={language}
            timeUnit={timeUnit}
          />
        )}

        {viewMode === "table" ? (
          <TaskTable
            tasks={tasks}
            onUpdateTask={updateTask}
            onRemoveTask={removeTask}
            onAddTask={addTask}
            onReorder={reorderTasks}
            projectWeeks={projectWeeks}
            language={language}
            timeUnit={timeUnit}
          />
        ) : (
          // items-start: os cards têm a altura do conteúdo; o teto vem do max-h-full.
          <div
            className={`grid grid-cols-1 gap-4 flex-1 lg:min-h-0 lg:items-start ${
              showTaskPanel ? "lg:grid-cols-4" : "lg:grid-cols-1"
            }`}
          >
            {/* Tasks List */}
            {showTaskPanel && (
              <div className="lg:col-span-1 lg:max-h-full lg:min-h-0 lg:flex lg:flex-col">
                <Card className="py-4 gap-3 lg:min-h-0 lg:flex lg:flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {t.tasks} ({tasks.length})
                      </span>
                      <Button
                        onClick={() => setShowTaskPanel(false)}
                        variant="ghost"
                        size="sm"
                        title={t.hidePanel}
                        className="h-8 w-8 p-0"
                      >
                        <PanelLeftClose className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 overflow-y-auto max-h-96 lg:max-h-none lg:min-h-0">
                    {tasks.length === 0 ? (
                      <p className="text-muted-foreground text-sm">{t.noTasks}</p>
                    ) : (
                      <div className="space-y-2 pl-2">
                        {tasks.map((task) => (
                          <div key={task.id} className="p-3 border rounded-lg flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-3 h-3 rounded shrink-0 ${task.color}`} />
                                <span className="font-medium text-sm truncate">{task.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>ID: {task.id}</div>
                                <div>
                                  {t.duration}: {task.duration} {task.duration === 1 ? units.one : units.many}
                                </div>
                                <div>
                                  {t.period}: {units.short}
                                  {task.startWeek} - {units.short}
                                  {task.endWeek}
                                  {task.endWeek > getPlannedEndWeek(task) && (
                                    <span className="text-destructive">
                                      {" "}
                                      (+{task.endWeek - getPlannedEndWeek(task)} {units.abbrev} {t.delayed})
                                    </span>
                                  )}
                                </div>
                                {(task.progress ?? 0) > 0 && (
                                  <div>
                                    {t.progress}: {formatUnit(task.progress ?? 0, dayUnits)} (
                                    {Math.round(getProgressPercent(task, timeUnit))}%)
                                  </div>
                                )}
                                {task.predecessor && (
                                  <div>
                                    {t.after}: {task.predecessor}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button
                                onClick={() => setEditingTask(task)}
                                variant="ghost"
                                size="sm"
                                title={t.edit}
                                className="h-7 w-7 p-0"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => removeTask(task.id)}
                                variant="ghost"
                                size="sm"
                                title={t.remove}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Gantt Chart */}
            <div
              className={`lg:max-h-full lg:min-h-0 lg:flex lg:flex-col ${
                showTaskPanel ? "lg:col-span-3" : "lg:col-span-1"
              }`}
            >
              <Card className="py-4 gap-3 lg:min-h-0 lg:flex lg:flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {!showTaskPanel && (
                      <Button
                        onClick={() => setShowTaskPanel(true)}
                        variant="ghost"
                        size="sm"
                        title={t.showPanel}
                        className="h-8 w-8 p-0"
                      >
                        <PanelLeftOpen className="h-4 w-4" />
                      </Button>
                    )}
                    {t.ganttChart}
                  </CardTitle>
                </CardHeader>
                <CardContent className="lg:min-h-0 lg:flex lg:flex-col">
                  <div ref={ganttRef} className="lg:min-h-0 lg:flex lg:flex-col">
                    <GanttChart
                      tasks={tasks}
                      maxWeeks={maxWeek}
                      projectWeeks={projectWeeks}
                      language={language}
                      timeUnit={timeUnit}
                      onUpdateTask={updateTask}
                      onRemoveTask={removeTask}
                      onReorder={reorderTasks}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 flex flex-row justify-end items-end w-full">
        <Image
          src={`${process.env.NEXT_PUBLIC_BASE_PATH}/paragon.png`}  // sempre começa com "/" se estiver em public
          alt="Paragon"
          width={100}
          height={30}
        />
      </div>
    </div>
  )
}
