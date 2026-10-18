import type { CellValue, ColumnKind } from '../types'

export function inferColumnKind(rawType: string): ColumnKind {
  const type = rawType.toUpperCase()
  if (
    type.includes('INT') ||
    type.includes('DECIMAL') ||
    type.includes('DOUBLE') ||
    type.includes('FLOAT') ||
    type.includes('REAL') ||
    type.includes('HUGEINT')
  ) {
    return 'number'
  }
  if (type.includes('DATE') || type.includes('TIME')) return 'date'
  if (type.includes('BOOL')) return 'boolean'
  if (
    type.includes('CHAR') ||
    type.includes('TEXT') ||
    type.includes('STRING') ||
    type.includes('UTF8')
  ) {
    return 'text'
  }
  return 'unknown'
}

export function normalizeArrowValue(value: unknown, rawType: string): CellValue {
  if (value === null || value === undefined) return null
  const type = rawType.toUpperCase()

  if (
    typeof value === 'object' &&
    value !== null &&
    Symbol.for('isArrowBigNum') in value
  ) {
    const scale = Number(rawType.match(/e([+-]?\d+)/i)?.[1] ?? 0)
    return Number(String(value)) / 10 ** scale
  }

  if (typeof value === 'bigint') {
    if (type.includes('TIMESTAMP')) {
      return new Date(Number(value)).toISOString().replace('T00:00:00.000Z', '')
    }
    return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString()
  }
  if (value instanceof Date) {
    return value.toISOString().replace('T00:00:00.000Z', '')
  }
  if (typeof value === 'number' && type.includes('TIMESTAMP')) {
    return new Date(value).toISOString().replace('T00:00:00.000Z', '')
  }
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }
  if (ArrayBuffer.isView(value)) {
    return `[${value.constructor.name} ${value.byteLength} bytes]`
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
