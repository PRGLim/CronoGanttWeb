"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { getPlannedEndWeek, getProgressPercent, getProgressPeriods, type Task } from "@/lib/schedule"
import {
  formatUnit,
  getColumnScales,
  getUnitLabels,
  periodsPerWeek,
  type ColumnScale,
  type TimeUnit,
} from "@/lib/time-unit"
import { toPng } from "html-to-image"
import Image from "next/image"
import ExcelJS from "exceljs"
import { GripVertical, Trash2, ZoomIn, ZoomOut, FileImage, FileSpreadsheet } from "lucide-react"

type Language = "pt" | "en" | "es"

const translations = {
  pt: {
    task: "Tarefa",
    noTasks: "Nenhuma tarefa para exibir",
    addTasks: "Adicione tarefas para visualizar o gráfico de Gantt",
    after: "Após",
    exportPng: "Exportar PNG",
    exportExcel: "Exportar para o Excel",
    exporting: "Exportando...",
    total: "TOTAL DO PROJETO",
    zoomIn: "Aproximar",
    zoomOut: "Afastar",
    remove: "Remover tarefa",
    reorder: "Arraste para reordenar",
    editName: "Clique para editar o nome",
    editDuration: "Clique para editar a duração",
    editProgress: "Clique para editar o progresso (dias)",
    progress: "Progresso",
    overrun: "Estouro",
    noPredecessor: "Sem predecessor",
    scale: "Escala",
    scaleHint: "Quantos períodos cada coluna representa",
  },
  en: {
    task: "Task",
    noTasks: "No tasks to display",
    addTasks: "Add tasks to visualize the Gantt chart",
    after: "After",
    exportPng: "Export PNG",
    exportExcel: "Export to Excel",
    exporting: "Exporting...",
    total: "PROJECT TOTAL",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    remove: "Remove task",
    reorder: "Drag to reorder",
    editName: "Click to edit name",
    editDuration: "Click to edit duration",
    editProgress: "Click to edit progress (days)",
    progress: "Progress",
    overrun: "Overrun",
    noPredecessor: "No predecessor",
    scale: "Scale",
    scaleHint: "How many periods each column covers",
  },
  es: {
    task: "Tarea",
    noTasks: "Ninguna tarea para mostrar",
    addTasks: "Agrega tareas para visualizar el gráfico de Gantt",
    after: "Después",
    exportPng: "Exportar PNG",
    exportExcel: "Exportar a Excel",
    exporting: "Exportando...",
    total: "TOTAL DEL PROYECTO",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    remove: "Eliminar tarea",
    reorder: "Arrastra para reordenar",
    editName: "Clic para editar el nombre",
    editDuration: "Clic para editar la duración",
    editProgress: "Clic para editar el progreso (días)",
    progress: "Progreso",
    overrun: "Exceso",
    noPredecessor: "Sin predecesor",
    scale: "Escala",
    scaleHint: "Cuántos períodos representa cada columna",
  },
}

interface GanttChartProps {
  tasks: Task[]
  maxWeeks: number
  projectWeeks: number
  language: Language
  timeUnit: TimeUnit
  onUpdateTask: (taskId: string, updatedData: Partial<Task>) => void
  onRemoveTask: (taskId: string) => void
  onReorder: (from: number, to: number) => void
}

const CELL_WIDTHS = [16, 24, 32, 48, 64, 88]
/** 64px — mesma densidade de antes; os níveis menores existem para réguas longas. */
const DEFAULT_ZOOM = 4
const LABEL_WIDTH = 280
const ROW_HEIGHT = 44
/** Altura da barra da tarefa, centralizada na linha. */
const BAR_HEIGHT = 28
/** Distância do topo da linha até a base da barra — referência do progresso. */
const BAR_BOTTOM = (ROW_HEIGHT + BAR_HEIGHT) / 2
const TOTAL_ROW_HEIGHT = 40
/** Espaço mínimo para um rótulo de coluna caber sem encostar no vizinho. */
const MIN_LABEL_WIDTH = 28
/** Acima disso a régua fica densa demais e o gráfico passa a ser agrupado. */
const MAX_COMFORTABLE_COLUMNS = 40
/** Abaixo disso a barra não tem espaço para o texto da duração. */
const MIN_BAR_TEXT_WIDTH = 26
/** Espessura da barrinha de progresso na base da barra da tarefa. */
const PROGRESS_HEIGHT = 5
/** Vermelho claro — mesma cor dentro e fora da barra, inclusive no estouro. */
const PROGRESS_COLOR = "#fca5a5"
/** Espaço reservado à direita da barra para o rótulo do percentual ("125%"). */
const PROGRESS_LABEL_ROOM = 40

type EditableField = "name" | "duration" | "progress"

/** Escala mais detalhada que ainda cabe confortavelmente na tela. */
function pickScale(scales: ColumnScale[], periods: number): number {
  const index = scales.findIndex((scale) => Math.ceil(periods / scale.span) <= MAX_COMFORTABLE_COLUMNS)
  return index === -1 ? scales.length - 1 : index
}

/** Estado de um arrasto de barra em andamento. */
type BarDrag = {
  taskId: string
  mode: "move" | "resize-start" | "resize-end"
  startX: number
  originalLag: number
  originalDuration: number
  /** Semana em que a tarefa começaria com lag 0 — usado para impedir início antes da semana 1. */
  base: number
}

export function GanttChart({
  tasks,
  maxWeeks,
  projectWeeks,
  language,
  timeUnit,
  onUpdateTask,
  onRemoveTask,
  onReorder,
}: GanttChartProps) {
  const t = translations[language]
  const units = getUnitLabels(language, timeUnit)

  const scales = getColumnScales(language, timeUnit)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [scaleIndex, setScaleIndex] = useState(() => pickScale(scales, maxWeeks))
  /** Enquanto true, o gráfico é renderizado limpo — sem os controles de edição — para a captura. */
  const [isExporting, setIsExporting] = useState(false)
  const [draggingBarId, setDraggingBarId] = useState<string | null>(null)
  const [dragRowIndex, setDragRowIndex] = useState<number | null>(null)
  const [dropRowIndex, setDropRowIndex] = useState<number | null>(null)
  const [editing, setEditing] = useState<{ taskId: string; field: EditableField } | null>(null)
  const [editValue, setEditValue] = useState("")

  const barDrag = useRef<BarDrag | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastUnit = useRef(timeUnit)
  /** Depois que o usuário escolhe uma escala, o ajuste automático sai de cena. */
  const scalePinned = useRef(false)

  // Enquanto a escala não for fixada à mão, ela acompanha o tamanho do
  // cronograma — trocar para dias ou crescer o projeto não joga o usuário
  // numa régua de centenas de colunas.
  useEffect(() => {
    if (lastUnit.current !== timeUnit) {
      lastUnit.current = timeUnit
      scalePinned.current = false
    }
    if (!scalePinned.current) setScaleIndex(pickScale(getColumnScales(language, timeUnit), maxWeeks))
  }, [timeUnit, language, maxWeeks])

  const scale = scales[Math.min(scaleIndex, scales.length - 1)]
  const { span } = scale
  const cellWidth = CELL_WIDTHS[zoom]
  /** Largura de um único período — as barras seguem esta medida, não a da coluna. */
  const periodWidth = cellWidth / span
  const columns = Array.from({ length: Math.ceil(maxWeeks / span) }, (_, i) => i + 1)
  const timelineWidth = columns.length * cellWidth
  /** Com colunas estreitas só um rótulo a cada N aparece — o resto vira só grade. */
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_WIDTH / cellWidth))
  /** Em dias sem agrupamento, marca o fim de cada semana para dar ritmo à régua. */
  const perWeek = periodsPerWeek(timeUnit)
  const isBlockEdge = (column: number) => span === 1 && perWeek > 1 && column % perWeek === 0
  /** Primeiro e último período de uma coluna, para o tooltip das colunas agrupadas. */
  const columnRange = (column: number) => {
    const first = (column - 1) * span + 1
    return span === 1 ? `${scale.short}${first}` : `${units.short}${first}-${units.short}${column * span}`
  }

  /** Quanto os rótulos de progresso passam do fim da régua — vira folga à direita do gráfico. */
  const progressLabelOverflow = Math.max(
    0,
    ...tasks
      .filter((task) => (task.progress ?? 0) > 0)
      .map(
        (task) =>
          (task.startWeek - 1 + Math.max(task.duration, getProgressPeriods(task, timeUnit))) * periodWidth +
          PROGRESS_LABEL_ROOM -
          timelineWidth,
      ),
  )

  const barColor = "var(--secondary)"
  const totalColor = "var(--primary)"

  /* ---------------------------------------------------------------- edição */

  const startEditing = (task: Task, field: EditableField) => {
    setEditing({ taskId: task.id, field })
    setEditValue(field === "name" ? task.name : String(field === "duration" ? task.duration : (task.progress ?? 0)))
  }

  const commitEditing = () => {
    if (!editing) return
    if (editing.field === "name") {
      const name = editValue.trim()
      if (name) onUpdateTask(editing.taskId, { name })
    } else if (editing.field === "duration") {
      const duration = Number.parseInt(editValue, 10)
      if (Number.isFinite(duration) && duration > 0) onUpdateTask(editing.taskId, { duration })
    } else {
      const progress = editValue.trim() ? Number(editValue) : 0
      if (Number.isFinite(progress) && progress >= 0) onUpdateTask(editing.taskId, { progress })
    }
    setEditing(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitEditing()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setEditing(null)
    }
  }

  /* ------------------------------------------------- arrastar/redimensionar */

  const beginBarDrag = (e: React.PointerEvent<HTMLDivElement>, task: Task, mode: BarDrag["mode"]) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const originalLag = task.lag ?? 0
    barDrag.current = {
      taskId: task.id,
      mode,
      startX: e.clientX,
      originalLag,
      originalDuration: task.duration,
      base: task.startWeek - originalLag,
    }
    setDraggingBarId(task.id)
  }

  const moveBarDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = barDrag.current
    if (!drag) return

    const delta = Math.round((e.clientX - drag.startX) / periodWidth)
    // lag mínimo que ainda mantém o início na semana 1 ou depois
    const minLag = 1 - drag.base

    if (drag.mode === "move") {
      const lag = Math.max(minLag, drag.originalLag + delta)
      onUpdateTask(drag.taskId, { lag })
      return
    }

    if (drag.mode === "resize-end") {
      const duration = Math.max(1, drag.originalDuration + delta)
      onUpdateTask(drag.taskId, { duration })
      return
    }

    // resize-start: encurta/alonga pela esquerda mantendo o fim no lugar
    const lag = Math.max(minLag, drag.originalLag + delta)
    const duration = Math.max(1, drag.originalDuration - (lag - drag.originalLag))
    onUpdateTask(drag.taskId, { lag, duration })
  }

  const endBarDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!barDrag.current) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    barDrag.current = null
    setDraggingBarId(null)
  }

  /* ------------------------------------------------------------ reordenação */

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    if (dragRowIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropRowIndex(index)
  }

  const handleRowDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragRowIndex !== null) onReorder(dragRowIndex, index)
    setDragRowIndex(null)
    setDropRowIndex(null)
  }

  /* --------------------------------------------------------------- exports */

  async function exportToExcelJS() {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Gantt Chart")

    // Cada coluna cobre `span` períodos; a célula é pintada quando a tarefa
    // toca qualquer período dessa faixa.
    const covers = (column: number, from: number, to: number) =>
      from <= column * span && to > (column - 1) * span

    ws.addRow(["ID", t.task, `${t.progress} (%)`, ...columns.map((c) => `${scale.short}${c}`)])

    // "  " marca o período planejado e "!!" o estouro causado pelo progresso.
    tasks.forEach((task) => {
      const plannedEnd = getPlannedEndWeek(task)
      const rowValues: (string | number)[] = [task.id, task.name, `${Math.round(getProgressPercent(task, timeUnit))}%`]
      columns.forEach((column) => {
        if (covers(column, task.startWeek, plannedEnd)) rowValues.push("  ")
        else if (covers(column, plannedEnd + 1, task.endWeek)) rowValues.push("!!")
        else rowValues.push("")
      })
      ws.addRow(rowValues)
    })

    // Linha de total do projeto
    const totalRowValues: (string | number)[] = ["", t.total, ""]
    columns.forEach((column) => totalRowValues.push(covers(column, 1, projectWeeks) ? "##" : ""))
    const totalRow = ws.addRow(totalRowValues)

    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (colNumber <= 3) {
          cell.alignment = { horizontal: "center", vertical: "middle" }
        }
        if (rowNumber === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } }
          cell.font = { bold: true, color: { argb: "000000" } }
          cell.alignment = { horizontal: "center", vertical: "middle" }
        } else if (cell.value === "  ") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "990000" } }
          cell.font = { bold: true, color: { argb: "FFFFFF" } }
          cell.alignment = { horizontal: "center", vertical: "middle" }
        } else if (cell.value === "!!") {
          cell.value = ""
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCA5A5" } }
        }
      })
    })

    // Destaque da linha de total (aplicado depois para não ser sobrescrito)
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } }
      cell.alignment = { horizontal: "center", vertical: "middle" }
      if (colNumber > 3 && cell.value === "##") {
        cell.value = ""
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } }
      } else if (colNumber === 2) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } }
      }
    })
    if (projectWeeks > 0) {
      const totalCell = ws.getCell(totalRow.number, 4)
      totalCell.value = formatUnit(projectWeeks, units)
    }

    const columnWidth = columns.length > 30 ? 4 : 8
    ws.columns = [{ width: 15 }, { width: 30 }, { width: 14 }, ...columns.map(() => ({ width: columnWidth }))]

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gantt-chart-${new Date().toISOString().split("T")[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToPNG = async (): Promise<void> => {
    const element = document.getElementById("gantt-chart")
    if (!element) {
      console.error("Elemento não foi encontrado.")
      return
    }

    // Entra no modo de exportação e espera o React pintar a versão limpa
    // antes de capturar.
    setEditing(null)
    setIsExporting(true)
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)

    // Solta a altura máxima e o scroll para capturar o gráfico inteiro,
    // sem cortes e sem deslocamento das colunas/linhas fixas.
    const previousScroll = { left: element.scrollLeft, top: element.scrollTop }
    const previousStyle = { maxHeight: element.style.maxHeight, overflow: element.style.overflow }
    element.scrollLeft = 0
    element.scrollTop = 0
    element.style.maxHeight = "none"
    element.style.overflow = "visible"

    try {
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        width: element.scrollWidth,
        height: element.scrollHeight,
      })

      const link = document.createElement("a")
      link.href = dataUrl
      link.download = "gantt-chart.png"
      link.click()
    } catch (error) {
      console.error("Erro ao gerar PNG:", error)
    } finally {
      element.style.maxHeight = previousStyle.maxHeight
      element.style.overflow = previousStyle.overflow
      element.scrollLeft = previousScroll.left
      element.scrollTop = previousScroll.top
      setIsExporting(false)
    }
  }

  /* ----------------------------------------------------------------- render */

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

  return (
    <div className="flex flex-col gap-2 min-h-0">
      <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
        {/* Agrupa vários períodos por coluna quando a régua fica longa demais */}
        <label className="flex items-center gap-1 text-sm text-muted-foreground">
          {t.scale}
          <select
            value={scaleIndex}
            onChange={(e) => {
              scalePinned.current = true
              setScaleIndex(Number(e.target.value))
            }}
            title={t.scaleHint}
            className="h-8 rounded-md border px-2 text-sm bg-transparent cursor-pointer"
          >
            {scales.map((option, index) => (
              <option key={option.span} value={index}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1 border rounded-md">
          <button
            onClick={() => setZoom((z) => Math.max(0, z - 1))}
            disabled={zoom === 0}
            title={t.zoomOut}
            className="px-2 py-1.5 disabled:opacity-40 hover:bg-muted rounded-l-md transition-colors"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(CELL_WIDTHS.length - 1, z + 1))}
            disabled={zoom === CELL_WIDTHS.length - 1}
            title={t.zoomIn}
            className="px-2 py-1.5 disabled:opacity-40 hover:bg-muted rounded-r-md transition-colors"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={exportToPNG}
          disabled={isExporting}
          className="px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
        >
          <FileImage className="h-4 w-4" />
          {isExporting ? t.exporting : t.exportPng}
        </button>
        <button
          onClick={exportToExcelJS}
          className="px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {t.exportExcel}
        </button>
      </div>

      <div
        id="gantt-chart"
        ref={scrollRef}
        className="overflow-auto min-h-0 max-h-[70vh] lg:max-h-none bg-white rounded-md border border-gray-300"
      >
        <div className="min-w-max" style={{ paddingRight: progressLabelOverflow }}>
          {/* Cabeçalho com as semanas */}
          <div className="flex border-b border-gray-300 sticky top-0 z-30">
            <div
              className="px-2 py-1.5 font-semibold bg-gray-100 border-r border-gray-300 text-black flex items-center gap-2 sticky left-0 z-10"
              style={{ width: LABEL_WIDTH }}
            >
              <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH}/logo.png`} alt="Logo" width={26} height={26} />
              <span>{t.task}</span>
            </div>
            <div className="flex bg-gray-100" style={{ width: timelineWidth }}>
              {columns.map((column) => (
                <div
                  key={column}
                  title={columnRange(column)}
                  className={`py-1.5 text-center text-sm font-medium border-r text-black shrink-0 overflow-hidden ${
                    isBlockEdge(column) ? "border-gray-400" : "border-gray-300"
                  }`}
                  style={{ width: cellWidth }}
                >
                  {(column - 1) % labelEvery === 0 ? `${scale.short}${column}` : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Linhas de tarefas */}
          {tasks.map((task, index) => {
            const isDropTarget = dropRowIndex === index && dragRowIndex !== null && dragRowIndex !== index
            const isEditingName = editing?.taskId === task.id && editing.field === "name"
            const isEditingDuration = editing?.taskId === task.id && editing.field === "duration"
            const isEditingProgress = editing?.taskId === task.id && editing.field === "progress"
            const hasProgress = (task.progress ?? 0) > 0
            const exactPercent = getProgressPercent(task, timeUnit)
            const percent = Math.round(exactPercent)
            // Trecho do progresso que passou da duração planejada, em períodos.
            const overrunPeriods = Math.max(0, getProgressPeriods(task, timeUnit) - task.duration)
            const barWidth = task.duration * periodWidth
            const barLeft = (task.startWeek - 1) * periodWidth + 2
            /** Fim da barra planejada — onde começa o estouro. */
            const barEnd = barLeft + Math.max(4, barWidth - 4)
            const progressEnd = barEnd + overrunPeriods * periodWidth

            return (
              <div
                key={task.id}
                className={`flex border-b border-gray-200 group ${isDropTarget ? "border-t-2 border-t-red-600" : ""} ${
                  dragRowIndex === index ? "opacity-40" : ""
                }`}
                onDragOver={(e) => handleRowDragOver(e, index)}
                onDrop={(e) => handleRowDrop(e, index)}
              >
                {/* Coluna de informações — editável */}
                <div
                  className="px-1 py-1 border-r border-gray-300 bg-white group-hover:bg-gray-50 sticky left-0 z-10 flex items-center gap-1"
                  style={{ width: LABEL_WIDTH, height: ROW_HEIGHT }}
                >
                  {!isExporting && (
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move"
                        setDragRowIndex(index)
                      }}
                      onDragEnd={() => {
                        setDragRowIndex(null)
                        setDropRowIndex(null)
                      }}
                      title={t.reorder}
                      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 shrink-0"
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 leading-tight">
                    {isExporting ? (
                      <div className="font-medium text-sm text-gray-900 truncate px-1">{task.name}</div>
                    ) : isEditingName ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEditing}
                        onKeyDown={handleEditKeyDown}
                        className="w-full text-sm font-medium text-gray-900 border border-red-500 rounded px-1 outline-none bg-white"
                      />
                    ) : (
                      <div
                        onClick={() => startEditing(task, "name")}
                        title={t.editName}
                        className="font-medium text-sm text-gray-900 truncate cursor-text hover:bg-yellow-50 rounded px-1"
                      >
                        {task.name}
                      </div>
                    )}

                    <div className="text-[11px] text-gray-500 px-1 flex items-center gap-1">
                      <span className="truncate max-w-16">{task.id}</span>
                      <span className="text-gray-300">|</span>
                      {isExporting ? (
                        <span className="shrink-0">
                          {task.duration} {units.abbrev}
                        </span>
                      ) : isEditingDuration ? (
                        <input
                          autoFocus
                          type="number"
                          min={1}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEditing}
                          onKeyDown={handleEditKeyDown}
                          className="w-10 border border-red-500 rounded px-1 outline-none bg-white"
                        />
                      ) : (
                        <button
                          onClick={() => startEditing(task, "duration")}
                          title={t.editDuration}
                          className="hover:bg-yellow-50 rounded px-0.5 underline decoration-dotted shrink-0"
                        >
                          {task.duration} {units.abbrev}
                        </button>
                      )}
                      {/* Progresso: editado em dias, exibido em percentual */}
                      {isExporting ? (
                        hasProgress && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className={`shrink-0 ${percent > 100 ? "text-red-600 font-semibold" : ""}`}>
                              {percent}%
                            </span>
                          </>
                        )
                      ) : (
                        <>
                          <span className="text-gray-300">|</span>
                          {isEditingProgress ? (
                            <input
                              autoFocus
                              type="number"
                              min={0}
                              step={0.5}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitEditing}
                              onKeyDown={handleEditKeyDown}
                              className="w-12 border border-red-500 rounded px-1 outline-none bg-white"
                            />
                          ) : (
                            <button
                              onClick={() => startEditing(task, "progress")}
                              title={`${t.editProgress}: ${task.progress ?? 0}`}
                              className={`hover:bg-yellow-50 rounded px-0.5 underline decoration-dotted shrink-0 ${
                                percent > 100 ? "text-red-600 font-semibold" : ""
                              }`}
                            >
                              {percent}%
                            </button>
                          )}
                        </>
                      )}
                      {isExporting ? (
                        // No PNG o predecessor vira texto — só aparece quando existe.
                        task.predecessor && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="truncate">
                              {t.after}: {task.predecessor}
                            </span>
                          </>
                        )
                      ) : (
                        <>
                          <span className="text-gray-300">|</span>
                          <select
                            value={task.predecessor ?? ""}
                            onChange={(e) => onUpdateTask(task.id, { predecessor: e.target.value || undefined, lag: 0 })}
                            className="text-[11px] text-gray-500 bg-transparent border-none outline-none cursor-pointer hover:bg-yellow-50 rounded min-w-0 flex-1"
                          >
                            <option value="">{t.noPredecessor}</option>
                            {tasks
                              .filter((other) => other.id !== task.id)
                              .map((other) => (
                                <option key={other.id} value={other.id}>
                                  {t.after}: {other.id}
                                </option>
                              ))}
                          </select>
                        </>
                      )}
                    </div>
                  </div>

                  {!isExporting && (
                    <button
                      onClick={() => onRemoveTask(task.id)}
                      title={t.remove}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Linha do tempo */}
                <div
                  className="relative group-hover:bg-gray-50 shrink-0"
                  style={{ width: timelineWidth, height: ROW_HEIGHT }}
                >
                  <div className="absolute inset-0 flex">
                    {columns.map((column) => (
                      <div
                        key={column}
                        className={`border-r shrink-0 ${isBlockEdge(column) ? "border-gray-300" : "border-gray-200"}`}
                        style={{ width: cellWidth }}
                      />
                    ))}
                  </div>

                  <div
                    onPointerDown={isExporting ? undefined : (e) => beginBarDrag(e, task, "move")}
                    onPointerMove={isExporting ? undefined : moveBarDrag}
                    onPointerUp={isExporting ? undefined : endBarDrag}
                    onPointerCancel={isExporting ? undefined : endBarDrag}
                    className={`absolute top-1/2 -translate-y-1/2 rounded flex items-center justify-center select-none touch-none overflow-hidden ${
                      isExporting ? "" : draggingBarId === task.id ? "cursor-grabbing ring-2 ring-black/40" : "cursor-grab"
                    } ${overrunPeriods > 0 ? "rounded-br-none" : ""}`}
                    style={{
                      left: barLeft,
                      width: barEnd - barLeft,
                      height: BAR_HEIGHT,
                      backgroundColor: barColor,
                    }}
                  >
                    {/* Barrinha de progresso na base da barra, até o limite de 100% */}
                    {hasProgress && (
                      <div
                        className="absolute bottom-0 left-0 pointer-events-none"
                        style={{
                          width: `${Math.min(100, exactPercent)}%`,
                          height: PROGRESS_HEIGHT,
                          backgroundColor: PROGRESS_COLOR,
                        }}
                      />
                    )}

                    {/* alça esquerda */}
                    {!isExporting && (
                      <div
                        onPointerDown={(e) => beginBarDrag(e, task, "resize-start")}
                        onPointerMove={moveBarDrag}
                        onPointerUp={endBarDrag}
                        onPointerCancel={endBarDrag}
                        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l hover:bg-black/30 touch-none"
                      />
                    )}

                    {barWidth >= MIN_BAR_TEXT_WIDTH && (
                      <span className="relative text-xs font-medium text-white pointer-events-none px-2 truncate">
                        {task.duration}
                        {units.short.toLowerCase()}
                      </span>
                    )}

                    {/* alça direita */}
                    {!isExporting && (
                      <div
                        onPointerDown={(e) => beginBarDrag(e, task, "resize-end")}
                        onPointerMove={moveBarDrag}
                        onPointerUp={endBarDrag}
                        onPointerCancel={endBarDrag}
                        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r hover:bg-black/30 touch-none"
                      />
                    )}
                  </div>

                  {/* Progresso além da duração: a barrinha continua para fora da barra da tarefa */}
                  {overrunPeriods > 0 && (
                    <div
                      title={`${t.overrun}: ${percent}%`}
                      className="absolute rounded-r-sm"
                      style={{
                        left: barEnd,
                        top: BAR_BOTTOM - PROGRESS_HEIGHT,
                        width: overrunPeriods * periodWidth,
                        height: PROGRESS_HEIGHT,
                        backgroundColor: PROGRESS_COLOR,
                      }}
                    />
                  )}

                  {/* Percentual do lado de fora, alinhado à base da barra (canto inferior direito) */}
                  {hasProgress && (
                    <span
                      className={`absolute text-[10px] leading-none font-semibold whitespace-nowrap pointer-events-none -translate-y-full ${
                        percent > 100 ? "text-red-600" : "text-gray-600"
                      }`}
                      style={{ left: progressEnd + 4, top: BAR_BOTTOM }}
                    >
                      {percent}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Linha de total do projeto */}
          <div className="flex border-t-2 border-gray-400 bg-gray-100 sticky bottom-0 z-20">
            <div
              className="px-2 border-r border-gray-300 bg-gray-100 sticky left-0 z-10 flex items-center font-bold text-sm text-gray-900"
              style={{ width: LABEL_WIDTH, height: TOTAL_ROW_HEIGHT }}
            >
              {t.total}
            </div>
            <div className="relative shrink-0 bg-gray-100" style={{ width: timelineWidth, height: TOTAL_ROW_HEIGHT }}>
              <div className="absolute inset-0 flex">
                {columns.map((column) => (
                  <div
                    key={column}
                    className={`border-r shrink-0 ${isBlockEdge(column) ? "border-gray-300" : "border-gray-200"}`}
                    style={{ width: cellWidth }}
                  />
                ))}
              </div>
              <div
                className="absolute top-1/2 -translate-y-1/2 h-7 rounded flex items-center justify-center"
                style={{
                  left: 2,
                  width: Math.max(4, Math.max(projectWeeks, 1) * periodWidth - 4),
                  backgroundColor: totalColor,
                }}
              >
                <span className="text-xs font-bold text-white px-2 truncate">
                  {formatUnit(projectWeeks, units)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
