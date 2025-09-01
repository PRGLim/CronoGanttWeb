"use client"

import type { Task } from "@/app/page"
import { toPng } from 'html-to-image';
import Image from "next/image";
import logo from '../public/logo.png'

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
    "bg-red": "var(--secondary)",       // bloco de tarefa vermelho
    "bg-white": "var(--background)",      // fundo das células
    "text-white": "var(--foreground)",    // texto das tarefas
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
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          {t.exportPng}
        </button>
      </div>

      <div id="gantt-chart" className="overflow-x-auto bg-white rounded-md">
        <div className="min-w-max">
          {/* Header with weeks */}
          <div className="flex border-b border-gray-300">
            <div className="w-48 p-3 font-semibold bg-gray-100 border-r border-gray-300 text-black flex items-center gap-2">
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_PATH}/logo.png`}
                alt="Logo"
                width={30}
                height={30}
              />
              <span>{t.task}</span>
            </div>
            {weeks.map((week) => (
              <div key={week} className="w-16 p-2 text-center text-sm font-medium bg-gray-100 border-r border-gray-300 text-black">
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
                          backgroundColor: colorMap["bg-red"] || "#3b82f6",
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
