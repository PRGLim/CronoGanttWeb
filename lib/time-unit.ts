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

/** "3 semanas" / "1 semana" */
export function formatUnit(amount: number, labels: UnitLabels): string {
  return `${amount} ${amount === 1 ? labels.one : labels.many}`
}
