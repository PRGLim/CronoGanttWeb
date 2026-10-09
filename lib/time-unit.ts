/**
 * O cronograma é armazenado em períodos genéricos (1, 2, 3...). A unidade
 * escolhida aqui só muda como esses períodos são rotulados na interface e nas
 * exportações — nenhum valor é convertido ao trocar de unidade.
 */
export type TimeUnit = "weeks" | "days"

type Language = "pt" | "en" | "es"

export interface UnitLabels {
  /** Prefixo das colunas do gráfico: "S1", "D1". */
  short: string
  /** Abreviação colada ao número: "3 sem", "3 d". */
  abbrev: string
  /** Singular por extenso: "semana". */
  one: string
  /** Plural por extenso: "semanas". */
  many: string
  /** Nome da unidade no seletor: "Semanas". */
  label: string
}

const LABELS: Record<Language, Record<TimeUnit, UnitLabels>> = {
  pt: {
    weeks: { short: "S", abbrev: "sem", one: "semana", many: "semanas", label: "Semanas" },
    days: { short: "D", abbrev: "d", one: "dia", many: "dias", label: "Dias" },
  },
  en: {
    weeks: { short: "W", abbrev: "wk", one: "week", many: "weeks", label: "Weeks" },
    days: { short: "D", abbrev: "d", one: "day", many: "days", label: "Days" },
  },
  es: {
    weeks: { short: "S", abbrev: "sem", one: "semana", many: "semanas", label: "Semanas" },
    days: { short: "D", abbrev: "d", one: "día", many: "días", label: "Días" },
  },
}

export function getUnitLabels(language: Language, unit: TimeUnit): UnitLabels {
  return LABELS[language][unit]
}

/**
 * Escala das colunas do gráfico. Em projetos longos — sobretudo em dias — uma
 * coluna por período fica ilegível, então é possível agrupar vários períodos
 * em cada coluna. As barras continuam desenhadas na precisão do período: só a
 * régua fica mais grossa.
 */
export interface ColumnScale {
  /** Quantos períodos cabem em cada coluna. */
  span: number
  /** Prefixo das colunas: "D1", "S1", "M1". */
  short: string
  /** Nome no seletor. */
  label: string
}

const MONTH_LABEL: Record<Language, string> = { pt: "Meses", en: "Months", es: "Meses" }

/** Os dias do cronograma são úteis: a semana fecha em 5. */
export const DAYS_PER_WEEK = 5
/** Um mês é contado como 4 semanas — 4 colunas em semanas, 20 em dias úteis. */
export const WEEKS_PER_MONTH = 4

/** Quantos períodos da unidade cabem em uma semana. */
export function periodsPerWeek(unit: TimeUnit): number {
  return unit === "days" ? DAYS_PER_WEEK : 1
}

/** Da mais detalhada para a mais resumida. A primeira é o padrão da unidade. */
export function getColumnScales(language: Language, unit: TimeUnit): ColumnScale[] {
  const week = LABELS[language].weeks
  const day = LABELS[language].days
  const month = { short: "M", label: MONTH_LABEL[language] }
  const perWeek = periodsPerWeek(unit)

  const scales: ColumnScale[] = [{ span: perWeek, short: week.short, label: week.label }]
  if (unit === "days") scales.unshift({ span: 1, short: day.short, label: day.label })
  scales.push({ span: perWeek * WEEKS_PER_MONTH, ...month })

  return scales
}

/* ------------------------------------------------------------- datas reais */

/**
 * "generic" rotula as colunas como S1, S2...; "startDate" ancora o cronograma
 * numa data real e as colunas passam a mostrar o dia em que cada uma começa.
 */
export type DateMode = "generic" | "startDate"

/** Converte "2026-03-02" (valor do <input type="date">) em Date local, sem fuso. */
export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addCalendarDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6

/** Avança `amount` dias úteis; um ponto de partida em fim de semana vai para a segunda seguinte. */
function addBusinessDays(date: Date, amount: number): Date {
  let current = date
  while (isWeekend(current)) current = addCalendarDays(current, 1)
  let remaining = amount
  while (remaining > 0) {
    current = addCalendarDays(current, 1)
    if (!isWeekend(current)) remaining--
  }
  return current
}

/**
 * Data em que começa o período `offset` (0 = primeiro). Semanas andam de 7 em 7
 * dias corridos; dias andam só pelos dias úteis, coerente com a semana de 5 dias.
 */
export function getPeriodStartDate(start: Date, unit: TimeUnit, offset: number): Date {
  return unit === "days" ? addBusinessDays(start, offset) : addCalendarDays(start, offset * 7)
}

const DATE_LOCALE: Record<Language, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" }

/** "02/03" (pt/es) ou "03/02" (en) — curto o bastante para o cabeçalho da coluna. */
export function formatShortDate(date: Date, language: Language): string {
  return date.toLocaleDateString(DATE_LOCALE[language], { day: "2-digit", month: "2-digit" })
}

/** "seg., 02/03/2026" — para tooltips e exportações. */
export function formatFullDate(date: Date, language: Language): string {
  return date.toLocaleDateString(DATE_LOCALE[language], {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/** "3 semanas" / "1 semana" */
export function formatUnit(amount: number, labels: UnitLabels): string {
  return `${amount} ${amount === 1 ? labels.one : labels.many}`
}
