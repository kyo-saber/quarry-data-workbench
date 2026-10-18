import type { QueryColumn, QueryResult } from '../types'

export type ChartKind = 'line' | 'bar' | 'area'

export interface ChartPoint {
  label: string
  value: number
}

export interface ChartConfig {
  xColumn: QueryColumn
  yColumn: QueryColumn
  kind: ChartKind
  points: ChartPoint[]
  stats: {
    total: number
    average: number
    peak: number
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function inferChart(result: QueryResult): ChartConfig | null {
  if (result.columns.length < 2 || result.rows.length === 0) return null

  const numericIndexes = result.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.kind === 'number')

  if (numericIndexes.length === 0) return null

  const dimensionIndex = result.columns.findIndex(
    (column) => column.kind === 'date' || column.kind === 'text',
  )
  const dimension = dimensionIndex >= 0 ? dimensionIndex : 0

  let measure = numericIndexes.find(({ index }) => index !== dimension)
  if (!measure) measure = numericIndexes[0]

  const values = result.rows
    .map((row) => row[measure.index])
    .filter(isFiniteNumber)

  if (values.length === 0) return null

  const points = result.rows
    .map((row, index) => {
      const rawValue = row[measure.index]
      const labelValue = row[dimension]
      if (!isFiniteNumber(rawValue)) return null
      return {
        label:
          labelValue === null
            ? `Row ${index + 1}`
            : String(labelValue).replace('T00:00:00.000', ''),
        value: rawValue,
      }
    })
    .filter((point): point is ChartPoint => point !== null)

  const total = values.reduce((sum, value) => sum + value, 0)
  const xColumn = result.columns[dimension]

  return {
    xColumn,
    yColumn: measure.column,
    kind: xColumn.kind === 'date' ? 'line' : 'bar',
    points,
    stats: {
      total,
      average: total / values.length,
      peak: Math.max(...values),
    },
  }
}
