import { describe, expect, it } from 'vitest'
import { formatCell, formatDuration, quoteCsvCell, resultToCsv } from './format'
import type { QueryResult } from '../types'

describe('result formatting', () => {
  it('formats cells by semantic type', () => {
    expect(formatCell(1234.5, 'number')).toBe('1,234.5')
    expect(formatCell(null, 'text')).toBe('NULL')
    expect(formatCell(true, 'boolean')).toBe('true')
  })

  it('escapes CSV cells and serializes query rows', () => {
    expect(quoteCsvCell('North, "West"')).toBe('"North, ""West"""')

    const result: QueryResult = {
      columns: [
        { name: 'region', rawType: 'VARCHAR', kind: 'text' },
        { name: 'revenue', rawType: 'DOUBLE', kind: 'number' },
      ],
      rows: [
        ['West', 1200],
        ['North, metro', 980.5],
      ],
      rowCount: 2,
      elapsedMs: 4,
      sql: 'select 1',
      truncated: false,
    }

    expect(resultToCsv(result)).toBe(
      'region,revenue\nWest,1200\n"North, metro",980.5',
    )
  })

  it('formats fast and slow query durations', () => {
    expect(formatDuration(0.4)).toBe('<1 ms')
    expect(formatDuration(32.2)).toBe('32 ms')
    expect(formatDuration(1_250)).toBe('1.25 s')
  })
})
