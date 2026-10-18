import { Code2, LoaderCircle, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  buildVisualQuery,
  getDefaultBuilderConfig,
} from '../lib/query-builder'
import type {
  AggregateFunction,
  FilterOperator,
  ResultSort,
  VisualQueryConfig,
} from '../lib/query-builder'
import type { QueryColumn, TableInfo } from '../types'

interface VisualQueryBuilderProps {
  tables: TableInfo[]
  isRunning: boolean
  onLoadColumns: (tableName: string) => Promise<QueryColumn[]>
  onQueryChange: (sql: string) => void
  onRun: (sql: string) => void
  onEditSql: () => void
}

const aggregations: { value: AggregateFunction; label: string }[] = [
  { value: 'count', label: 'Count rows' },
  { value: 'count_distinct', label: 'Count unique' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
]

const filterOperators: { value: FilterOperator; label: string }[] = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'at least' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'at most' },
  { value: 'contains', label: 'contains' },
]

function optionLabel(column: QueryColumn): string {
  return `${column.name} · ${column.kind}`
}

export function VisualQueryBuilder({
  tables,
  isRunning,
  onLoadColumns,
  onQueryChange,
  onRun,
  onEditSql,
}: VisualQueryBuilderProps) {
  const preferredTable =
    tables.find((table) => table.name === 'orders')?.name ?? tables[0]?.name ?? ''
  const [config, setConfig] = useState<VisualQueryConfig>(() =>
    getDefaultBuilderConfig(preferredTable, []),
  )
  const [columns, setColumns] = useState<QueryColumn[]>([])
  const [isLoadingColumns, setIsLoadingColumns] = useState(true)
  const [columnError, setColumnError] = useState('')

  useEffect(() => {
    if (!config.table) return
    let cancelled = false

    void onLoadColumns(config.table)
      .then((nextColumns) => {
        if (cancelled) return
        setColumns(nextColumns)
        setConfig((current) => {
          if (current.table !== config.table) return current
          return getDefaultBuilderConfig(config.table, nextColumns)
        })
      })
      .catch((loadFailure: unknown) => {
        if (!cancelled) {
          setColumnError(loadFailure instanceof Error ? loadFailure.message : String(loadFailure))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingColumns(false)
      })

    return () => {
      cancelled = true
    }
  }, [config.table, onLoadColumns])

  const generatedSql = useMemo(() => buildVisualQuery(config), [config])

  useEffect(() => {
    onQueryChange(generatedSql)
  }, [generatedSql, onQueryChange])

  const updateConfig = (patch: Partial<VisualQueryConfig>) => {
    setConfig((current) => ({ ...current, ...patch }))
  }

  const handleTableChange = (tableName: string) => {
    setIsLoadingColumns(true)
    setColumnError('')
    setColumns([])
    setConfig(getDefaultBuilderConfig(tableName, []))
  }

  const handleGroupByChange = (value: string) => {
    const column = columns.find((item) => item.name === value)
    updateConfig({
      groupBy: value,
      groupByKind: column?.kind ?? 'unknown',
      dateGrain: column?.kind === 'date' ? 'month' : 'none',
      sort: value ? config.sort : 'measure_desc',
    })
  }

  const handleFilterColumnChange = (value: string) => {
    const column = columns.find((item) => item.name === value)
    updateConfig({
      filterColumn: value,
      filterKind: column?.kind ?? 'unknown',
      filterOperator:
        config.filterOperator === 'contains' && column?.kind !== 'text'
          ? 'eq'
          : config.filterOperator,
    })
  }

  const handleAggregationChange = (value: AggregateFunction) => {
    const numericColumns = columns.filter((column) => column.kind === 'number')
    const availableColumns = value === 'count_distinct' ? columns : numericColumns
    const selectedMeasure = availableColumns.some((column) => column.name === config.measure)
      ? config.measure
      : (availableColumns[0]?.name ?? '')
    const measureColumn = availableColumns.find((column) => column.name === selectedMeasure)

    updateConfig({
      aggregation: value,
      measure: value === 'count' ? '' : selectedMeasure,
      measureKind: value === 'count' ? 'unknown' : (measureColumn?.kind ?? 'unknown'),
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && generatedSql) {
      event.preventDefault()
      onRun(generatedSql)
    }
  }

  const measureColumns =
    config.aggregation === 'count_distinct'
      ? columns
      : columns.filter((column) => column.kind === 'number')
  const groupByIsDate = config.groupByKind === 'date'
  const hasGroup = Boolean(config.groupBy)
  const sortOptions: { value: ResultSort; label: string }[] = [
    { value: 'measure_desc', label: 'Result high to low' },
    { value: 'measure_asc', label: 'Result low to high' },
    ...(hasGroup
      ? ([
          { value: 'group_asc', label: 'Group A to Z' },
          { value: 'group_desc', label: 'Group Z to A' },
        ] as const)
      : []),
  ]

  return (
    <div className="visual-builder" onKeyDown={handleKeyDown}>
      <div className="builder-heading">
        <span>
          <SlidersHorizontal size={13} />
          Build without SQL
          {columns.length > 0 && <small>{columns.length} fields</small>}
          {isLoadingColumns && <LoaderCircle className="spin" size={12} />}
        </span>
        <button onClick={onEditSql} type="button">
          <Code2 size={13} />
          Edit as SQL
        </button>
      </div>

      <div className="builder-grid builder-grid-primary">
        <label className="builder-field">
          <span>Table</span>
          <select
            aria-label="Builder table"
            onChange={(event) => handleTableChange(event.target.value)}
            value={config.table}
          >
            {tables.map((table) => (
              <option key={table.name} value={table.name}>
                {table.name}
              </option>
            ))}
          </select>
        </label>

        <label className="builder-field">
          <span>Group by</span>
          <select
            aria-label="Group by column"
            onChange={(event) => handleGroupByChange(event.target.value)}
            value={config.groupBy}
          >
            <option value="">No grouping</option>
            {columns.map((column) => (
              <option key={column.name} value={column.name}>
                {optionLabel(column)}
              </option>
            ))}
          </select>
        </label>

        <label className="builder-field">
          <span>Time grain</span>
          <select
            aria-label="Time grain"
            disabled={!groupByIsDate}
            onChange={(event) =>
              updateConfig({
                dateGrain: event.target.value as VisualQueryConfig['dateGrain'],
              })
            }
            value={groupByIsDate ? config.dateGrain : 'none'}
          >
            {!groupByIsDate && <option value="none">Not a date</option>}
            {groupByIsDate && <option value="day">Day</option>}
            {groupByIsDate && <option value="month">Month</option>}
            {groupByIsDate && <option value="year">Year</option>}
            {groupByIsDate && <option value="none">Exact date</option>}
          </select>
        </label>

        <label className="builder-field">
          <span>Summarize</span>
          <select
            aria-label="Aggregation"
            onChange={(event) =>
              handleAggregationChange(event.target.value as AggregateFunction)
            }
            value={config.aggregation}
          >
            {aggregations.map((aggregation) => (
              <option key={aggregation.value} value={aggregation.value}>
                {aggregation.label}
              </option>
            ))}
          </select>
        </label>

        <label className="builder-field">
          <span>Value</span>
          <select
            aria-label="Measure column"
            disabled={config.aggregation === 'count'}
            onChange={(event) => {
              const column = columns.find((item) => item.name === event.target.value)
              updateConfig({
                measure: event.target.value,
                measureKind: column?.kind ?? 'unknown',
              })
            }}
            value={config.aggregation === 'count' ? '' : config.measure}
          >
            {config.aggregation === 'count' && <option value="">All rows</option>}
            {config.aggregation !== 'count' && measureColumns.length === 0 && (
              <option value="">No numeric fields</option>
            )}
            {measureColumns.map((column) => (
              <option key={column.name} value={column.name}>
                {optionLabel(column)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="builder-grid builder-grid-secondary">
        <label className="builder-field">
          <span>Filter</span>
          <select
            aria-label="Filter column"
            onChange={(event) => handleFilterColumnChange(event.target.value)}
            value={config.filterColumn}
          >
            <option value="">No filter</option>
            {columns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.name}
              </option>
            ))}
          </select>
        </label>

        <label className="builder-field">
          <span>Operator</span>
          <select
            aria-label="Filter operator"
            disabled={!config.filterColumn}
            onChange={(event) =>
              updateConfig({
                filterOperator: event.target.value as FilterOperator,
              })
            }
            value={config.filterOperator}
          >
            {filterOperators.map((operator) => (
              <option
                disabled={operator.value === 'contains' && config.filterKind !== 'text'}
                key={operator.value}
                value={operator.value}
              >
                {operator.label}
              </option>
            ))}
          </select>
        </label>

        <label className="builder-field builder-value-field">
          <span>Value</span>
          <input
            aria-label="Filter value"
            disabled={!config.filterColumn}
            onChange={(event) => updateConfig({ filterValue: event.target.value })}
            placeholder={config.filterColumn ? 'Enter a value' : 'Choose a column'}
            type="text"
            value={config.filterValue}
          />
        </label>

        <label className="builder-field">
          <span>Sort</span>
          <select
            aria-label="Sort results"
            onChange={(event) =>
              updateConfig({ sort: event.target.value as ResultSort })
            }
            value={config.sort}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="builder-field">
          <span>Rows</span>
          <select
            aria-label="Result limit"
            onChange={(event) => updateConfig({ limit: Number(event.target.value) })}
            value={config.limit}
          >
            {[10, 25, 50, 100, 250, 500].map((limit) => (
              <option key={limit} value={limit}>
                {limit}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="builder-sql-preview">
        <span>Generated SQL</span>
        <code>{generatedSql.replace(/\s+/g, ' ')}</code>
        {isRunning && <LoaderCircle className="spin" size={12} />}
      </div>

      {columnError && <div className="builder-error">{columnError}</div>}
    </div>
  )
}
