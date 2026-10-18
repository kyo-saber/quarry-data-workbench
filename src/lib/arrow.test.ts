import { describe, expect, it } from 'vitest'
import { inferColumnKind, normalizeArrowValue } from './arrow'

describe('Arrow value normalization', () => {
  it('maps Arrow types to display kinds', () => {
    expect(inferColumnKind('Decimal[38e+2]')).toBe('number')
    expect(inferColumnKind('Timestamp<MICROSECOND>')).toBe('date')
    expect(inferColumnKind('Bool')).toBe('boolean')
    expect(inferColumnKind('Utf8')).toBe('text')
  })

  it('applies decimal scale from the Arrow field type', () => {
    const decimal = {
      [Symbol.for('isArrowBigNum')]: true,
      toString: () => '61400',
    }
    expect(normalizeArrowValue(decimal, 'Decimal[38e+2]')).toBe(614)
  })

  it('normalizes timestamps, big integers, and nulls', () => {
    expect(normalizeArrowValue(1735689600000n, 'Timestamp<MICROSECOND>')).toBe(
      '2025-01-01',
    )
    expect(normalizeArrowValue(1735689600000, 'Timestamp<MICROSECOND>')).toBe(
      '2025-01-01',
    )
    expect(normalizeArrowValue(42n, 'Int64')).toBe(42)
    expect(normalizeArrowValue(null, 'Utf8')).toBeNull()
  })
})
