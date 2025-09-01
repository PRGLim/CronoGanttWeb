"use client"

import type { Task } from "@/app/page"
import { toPng } from 'html-to-image';
import Image from "next/image";
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

type Language = "pt" | "en" | "es"

const translations = {
  pt: {
    task: "Tarefa",
    noTasks: "Nenhuma tarefa para exibir",
    addTasks: "Adicione tarefas para visualizar o gráfico de Gantt",
    week: "sem",
    after: "Após",
    exportPng: "Exportar PNG",
    exportExcel: "Exportar para o Excel",
    exporting: "Exportando...",
    weekShort: "S"
  },
  en: {
    task: "Task",
    noTasks: "No tasks to display",
    addTasks: "Add tasks to visualize the Gantt chart",
    week: "wk",
    after: "After",
    exportPng: "Export PNG",
    exportExcel: "Export to Excel",
    exporting: "Exporting...",
    weekShort: "W"
  },
  es: {
    task: "Tarea",
    noTasks: "Ninguna tarea para mostrar",
    addTasks: "Agrega tareas para visualizar el gráfico de Gantt",
    week: "sem",
    after: "Después",
    exportPng: "Exportar PNG",
    exportExcel: "Exportar a Excel",
    exporting: "Exportando...",
    weekShort: "S"
  },
}

interface GanttChartProps {
  tasks: Task[]
  maxWeeks: number
  language: Language
}

export function GanttChart({ tasks, maxWeeks, language }: GanttChartProps) {
  const t = translations[language]
  const sorted = sortTasks(tasks);

  const colorMap: Record<string, string> = {
    "bg-red": "var(--secondary)",       // bloco de tarefa vermelho
    "bg-white": "var(--background)",      // fundo das células
    "text-white": "var(--foreground)",    // texto das tarefas
  }
  function sortTasks(tasks: Task[]): Task[] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const result: Task[] = [];
    const visited = new Set<string>();

    function visit(task: Task) {
      if (visited.has(task.id)) return;
      if (task.predecessor) {
        const predTask = taskMap.get(task.predecessor);
        if (predTask) visit(predTask);
      }
      visited.add(task.id);
      result.push(task);
    }

    tasks.forEach(visit);
    return result;
  }

  async function exportToExcelJS() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Gantt Chart');

    // Cabeçalho
    ws.addRow(['ID', t.task, ...weeks.map(w => `${t.weekShort}${w}`)]);

    // Tarefas
    sorted.forEach(task => {
      const rowValues = [task.id, task.name];
      weeks.forEach(week => {
        rowValues.push(week >= task.startWeek && week <= task.endWeek ? '  ' : '');
      });
      ws.addRow(rowValues);
    });

    // Formatação
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (colNumber <= 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        if (rowNumber === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
          cell.font = { bold: true, color: { argb: '000000' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (cell.value === '  ') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '990000' } };
          cell.font = { bold: true, color: { argb: 'FFFFFF' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

    // ws.eachRow((row, rowNumber) => {
    //   if (rowNumber === 1) {
    //     // Cabeçalho
    //     row.eachCell(cell => {
    //       cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    //       cell.font = { bold: true, color: { argb: '000000' } };
    //       cell.alignment = { horizontal: 'center', vertical: 'middle' };
    //     });
    //   } else {
    //     let mergeStart: number | null = null;

    //     row.eachCell((cell, colNumber) => {
    //       if (colNumber <= 2) {
    //         cell.alignment = { horizontal: 'center', vertical: 'middle' };
    //       } // Pular ID e Nome da tarefa
    //       if (cell.value === '  ') {
    //         if (mergeStart === null) mergeStart = colNumber; // Início do bloco
    //       } else {
    //         if (mergeStart !== null) {
    //           // Fim do bloco → mesclar
    //           ws.mergeCells(rowNumber, mergeStart, rowNumber, colNumber - 1);
    //           const mergedCell = ws.getCell(rowNumber, mergeStart);
    //           mergedCell.value = `${(colNumber - mergeStart)}${t.weekShort.toLocaleLowerCase()}`;
    //           mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '990000' } };
    //           mergedCell.font = { bold: true, color: { argb: 'FFFFFF' } };
    //           mergedCell.alignment = { horizontal: 'center', vertical: 'middle' };
    //           mergeStart = null;
    //         }
    //       }
    //     });

    //     // Caso o bloco vá até a última célula
    //     if (mergeStart !== null) {
    //       const lastCol = row.cellCount;
    //       ws.mergeCells(rowNumber, mergeStart, rowNumber, lastCol);
    //       const mergedCell = ws.getCell(rowNumber, mergeStart);
    //       mergedCell.value = `${(lastCol - mergeStart + 1)}${t.weekShort.toLocaleLowerCase()}`;
    //       mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '990000' } };
    //       mergedCell.font = { bold: true, color: { argb: 'FFFFFF' } };
    //       mergedCell.alignment = { horizontal: 'center', vertical: 'middle' };
    //     }
    //   }
    // });

    // Largura das colunas
    ws.columns = [{ width: 15 }, { width: 30 }, ...weeks.map(() => ({ width: 8 }))];

    // No navegador: gerar buffer e criar download
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-chart-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="space-y-4 max-h-105 overflow-auto">
      <div className="flex justify-end gap-2">
        <button
          onClick={exportToPNG}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          {t.exportPng}
        </button>
        <button
          onClick={exportToExcelJS}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          {t.exportExcel}
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
                {t.weekShort}{week}
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
                        {isFirstWeek && <span className="text-xs font-medium text-white">{task.duration}{t.weekShort.toLowerCase()}</span>}
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
