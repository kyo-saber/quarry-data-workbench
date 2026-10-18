import { describe, expect, it } from 'vitest'
import {
  detectFileType,
  quoteIdentifier,
  quoteSqlString,
  sanitizeTableName,
} from './sql'

describe('SQL helpers', () => {
  it('creates readable table names from file names', () => {
    expect(sanitizeTableName('Q3 Revenue Report.csv')).toBe('q3_revenue_report')
    expect(sanitizeTableName('2025-orders.json')).toBe('data_2025_orders')
    expect(sanitizeTableName('---.csv')).toBe('imported_data')
  })

  it('quotes identifiers and string literals safely', () => {
    expect(quoteIdentifier('sales"2025')).toBe('"sales""2025"')
    expect(quoteSqlString("O'Brien.csv")).toBe("'O''Brien.csv'")
  })

  it('detects supported source formats', () => {
    expect(detectFileType('orders.csv')).toBe('csv')
    expect(detectFileType('events.tsv')).toBe('csv')
    expect(detectFileType('events.jsonl')).toBe('json')
    expect(detectFileType('readme.md')).toBeNull()
  })
})
