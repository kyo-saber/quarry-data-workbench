import { describe, expect, it } from 'vitest'
import { buildVisualQuery, getDefaultBuilderConfig } from './query-builder'
import type { QueryColumn } from '../types'

const ordersColumns: QueryColumn[] = [
  { name: 'order_id', rawType: 'INTEGER', kind: 'number' },
  { name: 'order_date', rawType: 'DATE', kind: 'date' },
  { name: 'quantity', rawType: 'INTEGER', kind: 'number' },
  { name: 'status', rawType: 'VARCHAR', kind: 'text' },
  { name: 'channel', rawType: 'VARCHAR', kind: 'text' },
]

describe('visual query builder', () => {
  it('builds a grouped monthly sum query', () => {
    const config = {
      ...getDefaultBuilderConfig('orders', ordersColumns),
      groupBy: 'order_date',
      groupByKind: 'date' as const,
      dateGrain: 'month' as const,
      aggregation: 'sum' as const,
      measure: 'quantity',
      measureKind: 'number' as const,
      sort: 'measure_desc' as const,
      limit: 50,
    }

    expect(buildVisualQuery(config)).toBe(
      [
        'SELECT',
        '  date_trunc(\'month\', "order_date") AS "order_date",',
        '  round(sum("quantity"), 2) AS "sum_quantity"',
        'FROM "orders"',
        'GROUP BY date_trunc(\'month\', "order_date")',
        'ORDER BY "sum_quantity" DESC',
        'LIMIT 50',
      ].join('\n'),
    )
  })

  it('adds a safe text filter and count aggregation', () => {
    const config = {
      ...getDefaultBuilderConfig('orders', ordersColumns),
      groupBy: 'channel',
      groupByKind: 'text' as const,
      dateGrain: 'none' as const,
      aggregation: 'count' as const,
      measure: '',
      measureKind: 'unknown' as const,
      filterColumn: 'status',
      filterKind: 'text' as const,
      filterOperator: 'eq' as const,
      filterValue: "completed' OR true --",
      sort: 'group_asc' as const,
    }

    const query = buildVisualQuery(config)
    expect(query).toContain('count(*) AS "rows"')
    expect(query).toContain(
      'WHERE "status" = \'completed\'\' OR true --\'',
    )
    expect(query).toContain('ORDER BY "channel" ASC')
  })

  it('chooses useful defaults without selecting identifier columns as measures', () => {
    const config = getDefaultBuilderConfig('orders', ordersColumns)
    expect(config.groupBy).toBe('order_date')
    expect(config.aggregation).toBe('sum')
    expect(config.measure).toBe('quantity')
  })
})
