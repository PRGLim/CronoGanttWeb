import { scheduleTasks, TASK_COLORS, type Task } from "@/lib/schedule"
import type { TimeUnit } from "@/lib/time-unit"

type Language = "pt" | "en" | "es"

/** Marca do arquivo — usada para recusar JSON de outra origem. */
const FILE_KIND = "crono-gantt-project"
const FILE_VERSION = 1

export interface ProjectFile {
  kind: typeof FILE_KIND
  version: number
  exportedAt: string
  timeUnit: TimeUnit
  tasks: Task[]
}

export interface ProjectData {
  tasks: Task[]
  timeUnit: TimeUnit
}

/** Baixa o cronograma atual como .json. */
export function exportProjectJson({ tasks, timeUnit }: ProjectData): void {
  const payload: ProjectFile = {
    kind: FILE_KIND,
    version: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    timeUnit,
    tasks,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `cronograma-${new Date().toISOString().split("T")[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function isTimeUnit(value: unknown): value is TimeUnit {
  return value === "weeks" || value === "days"
}

/**
 * Lê o conteúdo de um arquivo exportado. Aceita tanto o formato completo quanto
 * uma lista solta de tarefas, para que um JSON editado à mão continue válido.
 * Lança `Error` quando o conteúdo não descreve um cronograma.
 */
export function parseProjectJson(text: string): ProjectData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("invalid-json")
  }

  const raw: Partial<ProjectFile> | null = Array.isArray(parsed)
    ? { tasks: parsed }
    : (parsed as Partial<ProjectFile> | null)
  if (!raw || !Array.isArray(raw.tasks)) throw new Error("invalid-file")

  const tasks: Task[] = []
  const seen = new Set<string>()

  for (const item of raw.tasks as unknown[]) {
    if (!item || typeof item !== "object") continue
    const task = item as Partial<Task>
    const id = typeof task.id === "string" ? task.id.trim() : ""
    const name = typeof task.name === "string" ? task.name.trim() : ""
    if (!id || seen.has(id)) continue
    seen.add(id)

    const duration = Number(task.duration)
    const lag = Number(task.lag)
    const progress = Number(task.progress)
    tasks.push({
      id,
      name: name || id,
      duration: Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 1,
      predecessor: typeof task.predecessor === "string" && task.predecessor ? task.predecessor : undefined,
      lag: Number.isFinite(lag) ? Math.floor(lag) : 0,
      progress: Number.isFinite(progress) && progress > 0 ? progress : 0,
      startWeek: 1,
      endWeek: 1,
      color: TASK_COLORS[0],
    })
  }

  if (tasks.length === 0) throw new Error("empty-file")

  // Dependências que não vieram no arquivo são descartadas para não travar o cálculo.
  const known = new Set(tasks.map((task) => task.id))
  const cleaned = tasks.map((task) =>
    task.predecessor && !known.has(task.predecessor) ? { ...task, predecessor: undefined } : task,
  )

  const timeUnit = isTimeUnit(raw.timeUnit) ? raw.timeUnit : "weeks"
  return { tasks: scheduleTasks(cleaned, timeUnit), timeUnit }
}

/** Etapas padrão de um projeto de modelagem, em sequência. */
const TEMPLATE_STEPS: Record<Language, string[]> = {
  pt: [
    "Especificação",
    "Levantamento e Análise de dados",
    "Desenvolvimento modelo protótipo",
    "Desenvolvimento modelo final",
    "Validação",
    "Execução de Cenários",
    "Relatório e Treinamento",
  ],
  en: [
    "Specification",
    "Data Collection and Analysis",
    "Prototype model development",
    "Final model development",
    "Validation",
    "Scenario Execution",
    "Report and Training",
  ],
  es: [
    "Especificación",
    "Recolección y Análisis de datos",
    "Desarrollo modelo prototipo",
    "Desarrollo modelo final",
    "Validación",
    "Ejecución de Escenarios",
    "Informe y Capacitación",
  ],
}

/** Cronograma inicial com as etapas encadeadas, uma após a outra. */
export function createTemplateTasks(language: Language, unit: TimeUnit): Task[] {
  const tasks: Task[] = TEMPLATE_STEPS[language].map((name, index) => ({
    id: `T${index + 1}`,
    name,
    duration: 1,
    predecessor: index === 0 ? undefined : `T${index}`,
    lag: 0,
    progress: 0,
    startWeek: 1,
    endWeek: 1,
    color: TASK_COLORS[0],
  }))

  return scheduleTasks(tasks, unit)
}
