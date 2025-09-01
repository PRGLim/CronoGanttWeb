"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Download, Plus, Calendar, Table } from "lucide-react"
import { GanttChart } from "@/components/gantt-chart"
import { TaskForm } from "@/components/task-form"
import { TaskTable } from "@/components/task-table"
import Image from "next/image"
import logo from '../public/logo.png'
import paragon from '../public/paragon.png'


type Language = "pt" | "en" | "es"

const translations = {
  pt: {
    title: "Gerenciador de Projetos",
    subtitle: "Crie tarefas e visualize o cronograma no gráfico de Gantt",
    newTask: "Nova Tarefa",
    exportPng: "Exportar PNG",
    tasks: "Tarefas",
    ganttChart: "Gráfico de Gantt",
    noTasks: "Nenhuma tarefa criada ainda",
    duration: "Duração",
    week: "semana",
    weeks: "semanas",
    period: "Período",
    after: "Após",
    tableView: "Visualização em Tabela",
    ganttView: "Visualização em Gantt",
  },
  en: {
    title: "Project Manager",
    subtitle: "Create tasks and visualize the timeline in Gantt chart",
    newTask: "New Task",
    exportPng: "Export PNG",
    tasks: "Tasks",
    ganttChart: "Gantt Chart",
    noTasks: "No tasks created yet",
    duration: "Duration",
    week: "week",
    weeks: "weeks",
    period: "Period",
    after: "After",
    tableView: "Table View",
    ganttView: "Gantt View",
  },
  es: {
    title: "Gestor de Proyectos",
    subtitle: "Crea tareas y visualiza la cronología en el gráfico de Gantt",
    newTask: "Nueva Tarefa",
    exportPng: "Exportar PNG",
    tasks: "Tareas",
    ganttChart: "Gráfico de Gantt",
    noTasks: "Ninguna tarea creada aún",
    duration: "Duración",
    week: "semana",
    weeks: "semanas",
    period: "Período",
    after: "Después",
    tableView: "Vista de Tabla",
    ganttView: "Vista de Gantt",
  },
}

export interface Task {
  id: string
  name: string
  duration: number
  predecessor?: string
  startWeek: number
  endWeek: number
  color: string
}

export default function ProjectManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showForm, setShowForm] = useState(false)
  const [language, setLanguage] = useState<Language>("pt")
  const [viewMode, setViewMode] = useState<"gantt" | "table">("gantt")
  const ganttRef = useRef<HTMLDivElement>(null)

  const t = translations[language]

  const calculateTaskSchedule = (newTasks: Task[]) => {
    const sortedTasks = [...newTasks].sort((a, b) => {
      if (a.predecessor && !b.predecessor) return 1
      if (!a.predecessor && b.predecessor) return -1
      return 0
    })

    const scheduledTasks: Task[] = []

    for (const task of sortedTasks) {
      let startWeek = 1

      if (task.predecessor) {
        const predecessorTask = scheduledTasks.find((t) => t.id === task.predecessor)
        if (predecessorTask) {
          startWeek = predecessorTask.endWeek + 1
        }
      }

      const endWeek = startWeek + task.duration - 1
      const colors = ["bg-chart-1", "bg-chart-2", "bg-primary", "bg-secondary", "bg-accent"]
      const color = colors[scheduledTasks.length % colors.length]

      scheduledTasks.push({
        ...task,
        startWeek,
        endWeek,
        color,
      })
    }

    return scheduledTasks
  }

  const addTask = (taskData: Omit<Task, "startWeek" | "endWeek" | "color">) => {
    const newTasks = [...tasks, { ...taskData, startWeek: 1, endWeek: 1, color: "bg-chart-1" }]
    const scheduledTasks = calculateTaskSchedule(newTasks)
    setTasks(scheduledTasks)
    setShowForm(false)
  }

  const removeTask = (taskId: string) => {
    const filteredTasks = tasks.filter((task) => task.id !== taskId)
    const rescheduledTasks = calculateTaskSchedule(filteredTasks)
    setTasks(rescheduledTasks)
  }

  const updateTask = (taskId: string, updatedData: Partial<Task>) => {
    const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, ...updatedData } : task))
    const rescheduledTasks = calculateTaskSchedule(updatedTasks)
    setTasks(rescheduledTasks)
  }

  const maxWeek = Math.max(...tasks.map((task) => task.endWeek), 12)

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center">
      <div className="max-w-7xl space-y-6 w-full flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_PATH}/logo.png`}   // sempre começa com "/" se estiver em public
                alt="Logo"
                width={50}
                height={50}
              />
              <h1 className="text-3xl font-bold text-foreground">{t.title}</h1>
            </div>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>

        {/* Task Form Modal */}
        {showForm && (
          <TaskForm existingTasks={tasks} onSubmit={addTask} onCancel={() => setShowForm(false)} language={language} />
        )}

        {viewMode === "table" ? (
          <TaskTable tasks={tasks} onUpdateTask={updateTask} onRemoveTask={removeTask} onAddTask={addTask} language={language} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Tasks List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t.tasks} ({tasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tasks.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t.noTasks}</p>
                  ) : (
                    <div className="space-y-2 pl-2">
                      {tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-3 h-3 rounded ${task.color}`} />
                              <span className="font-medium text-sm">{task.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>ID: {task.id}</div>
                              <div>
                                {t.duration}: {task.duration} {task.duration > 1 ? t.weeks : t.week}
                              </div>
                              <div>
                                {t.period}: S{task.startWeek} - S{task.endWeek}
                              </div>
                              {task.predecessor && (
                                <Badge variant="secondary" className="text-xs">
                                  {t.after}: {task.predecessor}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => removeTask(task.id)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gantt Chart */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>{t.ganttChart}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div ref={ganttRef}>
                    <GanttChart tasks={tasks} maxWeeks={maxWeek} language={language} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <div className="mt-1 py-6 flex flex-row justify-end items-end w-full">
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
