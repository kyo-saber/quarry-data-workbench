import { quoteIdentifier, quoteSqlString } from './sql'
import type { ColumnKind, QueryColumn } from '../types'

export type AggregateFunction = 'count' | 'count_distinct' | 'sum' | 'avg' | 'min' | 'max'
export type DateGrain = 'day' | 'month' | 'year' | 'none'
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains'
export type ResultSort = 'measure_desc' | 'measure_asc' | 'group_asc' | 'group_desc'

export interface VisualQueryConfig {
  table: string
  groupBy: string
  groupByKind: ColumnKind
  dateGrain: DateGrain
  aggregation: AggregateFunction
  measure: string
  measureKind: ColumnKind
  filterColumn: string
  filterKind: ColumnKind
  filterOperator: FilterOperator
  filterValue: string
  sort: ResultSort
  limit: number
}

const operatorSql: Record<Exclude<FilterOperator, 'contains'>, string> = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
}

export function measureAlias(config: VisualQueryConfig): string {
  return config.aggregation === 'count'
    ? 'rows'
    : `${config.aggregation}_${config.measure || 'value'}`
}

function sqlLiteral(value: string, kind: ColumnKind): string {
  const trimmed = value.trim()
  if (kind === 'number' && /^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed
  if (kind === 'boolean' && (trimmed === 'true' || trimmed === 'false')) return trimmed
  return quoteSqlString(trimmed)
}

function groupExpression(config: VisualQueryConfig): string {
  const column = quoteIdentifier(config.groupBy)
  if (config.groupByKind === 'date' && config.dateGrain !== 'none') {
    return `date_trunc('${config.dateGrain}', ${column})`
  }
  return column
}

function measureExpression(config: VisualQueryConfig): string {
  if (config.aggregation === 'count') return 'count(*)'

  const column = quoteIdentifier(config.measure)
  if (config.aggregation === 'count_distinct') return `count(distinct ${column})`

  const expression = `${config.aggregation}(${column})`
  return config.measureKind === 'number' ? `round(${expression}, 2)` : expression
}

export function buildVisualQuery(config: VisualQueryConfig): string {
  if (!config.table) return ''

  const hasGroup = Boolean(config.groupBy)
  const needsMeasure = config.aggregation !== 'count'
  if (needsMeasure && !config.measure) return ''

  const measureName = measureAlias(config)
  const selectParts: string[] = []

  if (hasGroup) {
    selectParts.push(`${groupExpression(config)} AS ${quoteIdentifier(config.groupBy)}`)
  }
  selectParts.push(`${measureExpression(config)} AS ${quoteIdentifier(measureName)}`)

  const whereParts: string[] = []
  if (config.filterColumn && config.filterValue.trim()) {
    const filterColumn = quoteIdentifier(config.filterColumn)
    if (config.filterOperator === 'contains') {
      whereParts.push(
        `contains(cast(${filterColumn} AS VARCHAR), ${sqlLiteral(
          config.filterValue,
          'text',
        )})`,
      )
    } else {
      whereParts.push(
        `${filterColumn} ${operatorSql[config.filterOperator]} ${sqlLiteral(
          config.filterValue,
          config.filterKind,
        )}`,
      )
    }
  }

  const orderColumn =
    config.sort === 'group_asc' || config.sort === 'group_desc'
      ? config.groupBy
      : measureName
  const orderDirection = config.sort.endsWith('_asc') ? 'ASC' : 'DESC'
  const safeLimit = Math.min(500, Math.max(1, Number(config.limit) || 100))
  const lines = [
    'SELECT',
    `  ${selectParts.join(',\n  ')}`,
    `FROM ${quoteIdentifier(config.table)}`,
  ]

  if (whereParts.length > 0) lines.push(`WHERE ${whereParts.join('\n  AND ')}`)
  if (hasGroup) lines.push(`GROUP BY ${groupExpression(config)}`)
  if (orderColumn) lines.push(`ORDER BY ${quoteIdentifier(orderColumn)} ${orderDirection}`)
  lines.push(`LIMIT ${safeLimit}`)

  return lines.join('\n')
}

export function getDefaultBuilderConfig(
  table: string,
  columns: QueryColumn[],
): VisualQueryConfig {
  const dimension =
    columns.find((column) => column.kind === 'date') ??
    columns.find((column) => column.kind === 'text') ??
    columns.find((column) => column.kind === 'boolean')
  const measure =
    columns.find(
      (column) =>
        column.kind === 'number' &&
        !/(^id$|_id$)/i.test(column.name),
    ) ?? columns.find((column) => column.kind === 'number')

  return {
    table,
    groupBy: dimension?.name ?? '',
    groupByKind: dimension?.kind ?? 'unknown',
    dateGrain: dimension?.kind === 'date' ? 'month' : 'none',
    aggregation: measure ? 'sum' : 'count',
    measure: measure?.name ?? '',
    measureKind: measure?.kind ?? 'unknown',
    filterColumn: '',
    filterKind: 'unknown',
    filterOperator: 'eq',
    filterValue: '',
    sort: 'measure_desc',
    limit: 100,
  }
}
