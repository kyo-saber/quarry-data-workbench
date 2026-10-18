export type CellValue = string | number | boolean | null

export type ColumnKind = 'number' | 'date' | 'boolean' | 'text' | 'unknown'

export interface QueryColumn {
  name: string
  rawType: string
  kind: ColumnKind
}

export interface QueryResult {
  columns: QueryColumn[]
  rows: CellValue[][]
  rowCount: number
  elapsedMs: number
  sql: string
  truncated: boolean
}

export type TableOrigin = 'starter' | 'imported'

export interface TableInfo {
  name: string
  columns: number
  rowCount: number
  origin: TableOrigin
  sourceFileId?: string
}

export interface SavedQuery {
  id: string
  name: string
  sql: string
  createdAt: number
}

export interface ImportedSource {
  id: string
  tableName: string
  fileName: string
  fileType: 'csv' | 'json'
  bytes: Uint8Array
  importedAt: number
}

export interface WorkspaceSnapshot {
  tables: TableInfo[]
  history: QueryResult[]
  savedQueries: SavedQuery[]
}
