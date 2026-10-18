import type { CellValue, ColumnKind, QueryResult } from '../types'

const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const regularNumber = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
})

export function formatMetric(value: number): string {
  if (Math.abs(value) >= 10_000) return compactNumber.format(value)
  return regularNumber.format(value)
}

export function formatCell(value: CellValue, kind: ColumnKind): string {
  if (value === null) return 'NULL'
  if (kind === 'number' && typeof value === 'number') {
    return regularNumber.format(value)
  }
  if (kind === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1) return '<1 ms'
  if (milliseconds < 1_000) return `${Math.round(milliseconds)} ms`
  return `${(milliseconds / 1_000).toFixed(2)} s`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

export function quoteCsvCell(value: CellValue): string {
  if (value === null) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

export function resultToCsv(result: QueryResult): string {
  const header = result.columns.map((column) => quoteCsvCell(column.name)).join(',')
  const rows = result.rows.map((row) => row.map(quoteCsvCell).join(','))
  return [header, ...rows].join('\n')
}

export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1_000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
