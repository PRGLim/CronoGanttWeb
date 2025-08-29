"use client"

import type { Task } from "@/app/page"
import { toPng } from 'html-to-image';

type Language = "pt" | "en" | "es"

const translations = {
  pt: {
    task: "Tarefa",
    noTasks: "Nenhuma tarefa para exibir",
    addTasks: "Adicione tarefas para visualizar o gráfico de Gantt",
    week: "sem",
    after: "Após",
    exportPng: "Exportar PNG",
    exporting: "Exportando...",
  },
  en: {
    task: "Task",
    noTasks: "No tasks to display",
    addTasks: "Add tasks to visualize the Gantt chart",
    week: "wk",
    after: "After",
    exportPng: "Export PNG",
    exporting: "Exporting...",
  },
  es: {
    task: "Tarea",
    noTasks: "Ninguna tarea para mostrar",
    addTasks: "Agrega tareas para visualizar el gráfico de Gantt",
    week: "sem",
    after: "Después",
    exportPng: "Exportar PNG",
    exporting: "Exportando...",
  },
}

interface GanttChartProps {
  tasks: Task[]
  maxWeeks: number
  language: Language
}

export function GanttChart({ tasks, maxWeeks, language }: GanttChartProps) {
  const t = translations[language]

  const colorMap: Record<string, string> = {
    "bg-blue-500": "#3b82f6",
    "bg-green-500": "#10b981",
    "bg-purple-500": "#8b5cf6",
    "bg-red-500": "#ef4444",
    "bg-yellow-500": "#eab308",
    "bg-pink-500": "#ec4899",
    "bg-indigo-500": "#6366f1",
    "bg-orange-500": "#f97316",
    "bg-teal-500": "#14b8a6",
    "bg-cyan-500": "#06b6d4",
  }

  const exportToPNG = async (): Promise<void> => {
    const element = document.getElementById("gantt-chart");
    if (!element) {
      console.error("Elemento não foi encontrado.");
      return;
    }

    try {
      // Gera a imagem em PNG
      const dataUrl = await toPng(element, {
        cacheBust: true,        // força recarregar imagens externas
        pixelRatio: 2,          // aumenta resolução
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      // Cria link para download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'gantt-chart.png';
      link.click();

      console.log('Imagem gantt-chart.png gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PNG:', error);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">{t.noTasks}</p>
          <p className="text-sm">{t.addTasks}</p>
        </div>
      </div>
    )
  }

  const weeks = Array.from({ length: maxWeeks }, (_, i) => i + 1)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={exportToPNG}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {t.exportPng}
        </button>
      </div>

      <div id="gantt-chart" className="overflow-x-auto bg-white">
        <div className="min-w-max">
          {/* Header with weeks */}
          <div className="flex border-b border-gray-300">
            <div className="w-48 p-3 font-semibold bg-gray-100 border-r border-gray-300">{t.task}</div>
            {weeks.map((week) => (
              <div key={week} className="w-16 p-2 text-center text-sm font-medium bg-gray-100 border-r border-gray-300">
                S{week}
              </div>
            ))}
          </div>

          {/* Task rows */}
          {tasks.map((task, index) => (
            <div key={task.id} className="flex border-b border-gray-200 hover:bg-gray-50">
              {/* Task info */}
              <div className="w-48 p-3 border-r border-gray-300">
                <div className="font-medium text-sm text-gray-900">{task.name}</div>
                <div className="text-xs text-gray-600">
                  ID: {task.id} | {task.duration} {t.week}
                </div>
                {task.predecessor && (
                  <div className="text-xs text-gray-600">
                    {t.after}: {task.predecessor}
                  </div>
                )}
              </div>

              {/* Timeline */}
              {weeks.map((week) => {
                const isTaskWeek = week >= task.startWeek && week <= task.endWeek
                const isFirstWeek = week === task.startWeek
                const isLastWeek = week === task.endWeek

                return (
                  <div
                    key={week}
                    className="w-16 h-16 border-r border-gray-300 flex items-center justify-center relative"
                  >
                    {isTaskWeek && (
                      <div
                        className={`
                          h-6 w-full mx-1 ${task.color} 
                          ${isFirstWeek ? "rounded-l" : ""} 
                          ${isLastWeek ? "rounded-r" : ""}
                          flex items-center justify-center
                        `}
                        style={{
                          backgroundColor: colorMap[task.color] || "#3b82f6",
                        }}
                      >
                        {isFirstWeek && <span className="text-xs font-medium text-white">{task.duration}s</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
