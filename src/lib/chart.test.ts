import { describe, expect, it } from 'vitest'
import { inferChart } from './chart'
import type { QueryResult } from '../types'

const monthlyRevenue: QueryResult = {
  columns: [
    { name: 'month', rawType: 'DATE', kind: 'date' },
    { name: 'revenue', rawType: 'DOUBLE', kind: 'number' },
  ],
  rows: [
    ['2025-01-01', 614],
    ['2025-02-01', 632],
    ['2025-03-01', 625],
  ],
  rowCount: 3,
  elapsedMs: 2,
  sql: 'select month, revenue',
  truncated: false,
}

describe('chart inference', () => {
  it('uses a date dimension for a line chart', () => {
    const config = inferChart(monthlyRevenue)
    expect(config?.kind).toBe('line')
    expect(config?.points).toHaveLength(3)
    expect(config?.stats.total).toBe(1_871)
    expect(config?.yColumn.name).toBe('revenue')
  })

  it('uses a categorical dimension for a bar chart', () => {
    const config = inferChart({
      ...monthlyRevenue,
      columns: [
        { name: 'channel', rawType: 'VARCHAR', kind: 'text' },
        { name: 'revenue', rawType: 'DOUBLE', kind: 'number' },
      ],
      rows: [
        ['Email', 400],
        ['Paid social', 350],
      ],
    })
    expect(config?.kind).toBe('bar')
  })

  it('returns null when there is no usable measure', () => {
    expect(
      inferChart({
        ...monthlyRevenue,
        columns: [{ name: 'message', rawType: 'VARCHAR', kind: 'text' }],
        rows: [['Hello']],
      }),
    ).toBeNull()
  })
})
