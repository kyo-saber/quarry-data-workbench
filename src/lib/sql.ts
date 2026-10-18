export function sanitizeTableName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, '')
  const cleaned = stem
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
  const safe = cleaned || 'imported_data'
  return /^[0-9]/.test(safe) ? `data_${safe}` : safe
}

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

export function quoteSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

export function detectFileType(fileName: string): 'csv' | 'json' | null {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension === 'csv' || extension === 'tsv') return 'csv'
  if (extension === 'json' || extension === 'jsonl' || extension === 'ndjson') {
    return 'json'
  }
  return null
}
