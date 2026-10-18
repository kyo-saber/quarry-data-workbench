import * as duckdb from '@duckdb/duckdb-wasm'
import duckdbMvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import duckdbEhWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { STARTER_SETUP_SQL } from '../data/starter'
import { inferColumnKind, normalizeArrowValue } from './arrow'
import { detectFileType, quoteIdentifier, quoteSqlString } from './sql'
import type {
  ImportedSource,
  QueryColumn,
  QueryResult,
  TableInfo,
} from '../types'

const MAX_RESULT_ROWS = 500

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdbMvpWasm,
    mainWorker: mvpWorker,
  },
  eh: {
    mainModule: duckdbEhWasm,
    mainWorker: ehWorker,
  },
}

let enginePromise: Promise<QueryEngine> | null = null

export class QueryEngine {
  private db: AsyncDuckDB
  private connection: AsyncDuckDBConnection

  constructor(db: AsyncDuckDB, connection: AsyncDuckDBConnection) {
    this.db = db
    this.connection = connection
  }

  async run(sql: string): Promise<QueryResult> {
    const trimmed = sql.trim()
    if (!trimmed) throw new Error('Write a SQL query before running it.')

    const startedAt = performance.now()
    const table = await this.connection.query(trimmed)
    const elapsedMs = performance.now() - startedAt
    const columns: QueryColumn[] = table.schema.fields.map((field) => ({
      name: field.name,
      rawType: String(field.type),
      kind: inferColumnKind(String(field.type)),
    }))
    const sourceRows = table.toArray()
    const rows = sourceRows.slice(0, MAX_RESULT_ROWS).map((row) =>
      columns.map((column) => normalizeArrowValue(row[column.name], column.rawType)),
    )

    return {
      columns,
      rows,
      rowCount: sourceRows.length,
      elapsedMs,
      sql: trimmed,
      truncated: sourceRows.length > MAX_RESULT_ROWS,
    }
  }

  async getTables(sources: ImportedSource[]): Promise<TableInfo[]> {
    const namesTable = await this.connection.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'main' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    )
    const names = namesTable.toArray().map((row) => String(row.table_name))
    if (names.length === 0) return []

    const columnCounts = await this.connection.query(
      `SELECT table_name, count(*) AS column_count
       FROM information_schema.columns
       WHERE table_schema = 'main'
       GROUP BY table_name`,
    )
    const countMap = new Map<string, number>(
      columnCounts.toArray().map((row) => [String(row.table_name), Number(row.column_count)]),
    )

    const countSql = names
      .map(
        (name) =>
          `SELECT ${quoteSqlString(name)} AS table_name, count(*)::BIGINT AS row_count FROM ${quoteIdentifier(name)}`,
      )
      .join(' UNION ALL ')
    const rowCounts = await this.connection.query(countSql)
    const rowCountMap = new Map<string, number>(
      rowCounts.toArray().map((row) => [String(row.table_name), Number(row.row_count)]),
    )

    return names.map((name) => {
      const imported = sources.find((source) => source.tableName === name)
      return {
        name,
        columns: countMap.get(name) ?? 0,
        rowCount: rowCountMap.get(name) ?? 0,
        origin: imported ? 'imported' : 'starter',
        sourceFileId: imported?.id,
      }
    })
  }

  async importSource(source: ImportedSource): Promise<void> {
    const fileType = detectFileType(source.fileName)
    if (!fileType) throw new Error('Only CSV, TSV, JSON, JSONL, and NDJSON files are supported.')

    // DuckDB's worker takes ownership of registered buffers, so keep the IndexedDB copy intact.
    await this.db.registerFileBuffer(source.fileName, source.bytes.slice())
    const reader = fileType === 'csv' ? 'read_csv_auto' : 'read_json_auto'
    await this.connection.query(
      `CREATE OR REPLACE TABLE ${quoteIdentifier(source.tableName)}
       AS SELECT * FROM ${reader}(${quoteSqlString(source.fileName)}, SAMPLE_SIZE = -1)`,
    )
  }

  async removeTable(source: ImportedSource): Promise<void> {
    await this.connection.query(`DROP TABLE IF EXISTS ${quoteIdentifier(source.tableName)}`)
    await this.db.dropFile(source.fileName)
  }

  async installStarterData(): Promise<void> {
    for (const statement of STARTER_SETUP_SQL) {
      await this.connection.query(statement)
    }
  }
}

export function getQueryEngine(): Promise<QueryEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)
      const worker = new Worker(bundle.mainWorker!)
      const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING)
      const db = new duckdb.AsyncDuckDB(logger, worker)
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
      const connection = await db.connect()
      return new QueryEngine(db, connection)
    })()
  }
  return enginePromise
}
