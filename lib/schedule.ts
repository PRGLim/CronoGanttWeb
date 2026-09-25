import { DAYS_PER_WEEK, periodsPerWeek, type TimeUnit } from "@/lib/time-unit"

export interface Task {
  id: string
  name: string
  duration: number
  predecessor?: string
  /** Semanas de folga aplicadas depois do predecessor (pode ser negativo para sobrepor). */
  lag?: number
  /**
   * Progresso realizado, sempre em dias úteis — mesmo com o cronograma em semanas.
   * Quando passa da duração, a tarefa se estende e empurra as sucessoras.
   */
  progress?: number
  startWeek: number
  /** Fim efetivo: o planejado ou, se o progresso estourou a duração, o fim estendido. */
  endWeek: number
  color: string
}

/** Dados informados pelo usuário — início, fim e cor são derivados pelo agendador. */
export type TaskInput = Omit<Task, "startWeek" | "endWeek" | "color">

export const TASK_COLORS = ["bg-chart-1", "bg-chart-2", "bg-primary", "bg-secondary", "bg-accent"]

/** Progresso convertido para períodos da unidade (5 dias úteis = 1 semana). */
export function getProgressPeriods(task: Pick<Task, "progress">, unit: TimeUnit): number {
  return (Math.max(0, task.progress ?? 0) * periodsPerWeek(unit)) / DAYS_PER_WEEK
}

/** Percentual realizado em relação à duração planejada — pode passar de 100. */
export function getProgressPercent(task: Pick<Task, "progress" | "duration">, unit: TimeUnit): number {
  return task.duration > 0 ? (getProgressPeriods(task, unit) / task.duration) * 100 : 0
}

/** Último período planejado, ignorando qualquer estouro de progresso. */
export function getPlannedEndWeek(task: Pick<Task, "startWeek" | "duration">): number {
  return task.startWeek + task.duration - 1
}

/**
 * Recalcula início/fim preservando a ordem escolhida pelo usuário.
 * O predecessor pode aparecer em qualquer posição da lista — a resolução é
 * recursiva com memoização e proteção contra ciclos.
 */
export function scheduleTasks(list: Task[], unit: TimeUnit): Task[] {
  const byId = new Map(list.map((task) => [task.id, task]))
  const resolved = new Map<string, { startWeek: number; endWeek: number }>()
  const visiting = new Set<string>()

  const resolve = (task: Task): { startWeek: number; endWeek: number } => {
    const cached = resolved.get(task.id)
    if (cached) return cached

    const duration = Math.max(1, Math.floor(task.duration) || 1)
    // Progresso além da duração ocupa períodos extras (arredondados para cima) e atrasa as sucessoras.
    const span = Math.max(duration, Math.ceil(getProgressPeriods(task, unit) - 1e-9))
    const lag = task.lag ?? 0

    // Ciclo de dependências: trata a tarefa como se não tivesse predecessor.
    if (visiting.has(task.id)) {
      return { startWeek: 1, endWeek: span }
    }

    visiting.add(task.id)

    let startWeek = 1 + lag
    if (task.predecessor) {
      const predecessor = byId.get(task.predecessor)
      if (predecessor) startWeek = resolve(predecessor).endWeek + 1 + lag
    }
    startWeek = Math.max(1, startWeek)

    visiting.delete(task.id)

    const result = { startWeek, endWeek: startWeek + span - 1 }
    resolved.set(task.id, result)
    return result
  }

  return list.map((task, index) => ({
    ...task,
    duration: Math.max(1, Math.floor(task.duration) || 1),
    ...resolve(task),
    color: TASK_COLORS[index % TASK_COLORS.length],
  }))
}

/** Duração total do projeto em semanas (da semana 1 até o fim da última tarefa). */
export function getProjectWeeks(tasks: Task[]): number {
  return tasks.length > 0 ? Math.max(...tasks.map((task) => task.endWeek)) : 0
}
