import {
  AlertTriangle,
  BookmarkPlus,
  ChartNoAxesCombined,
  Check,
  Copy,
  Database,
  DatabaseZap,
  Download,
  HelpCircle,
  LoaderCircle,
  LockKeyhole,
  Menu,
  Play,
  Plus,
  RefreshCw,
  Rows3,
  ShieldCheck,
  TableProperties,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { DataTable } from './components/DataTable'
import { Dialog } from './components/Dialog'
import { InsightChart } from './components/InsightChart'
import { QueryEditor } from './components/QueryEditor'
import { Sidebar } from './components/Sidebar'
import { DEFAULT_QUERY, STARTER_QUERIES } from './data/starter'
import { getQueryEngine, type QueryEngine } from './lib/duckdb'
import { downloadText, formatDuration, resultToCsv } from './lib/format'
import { sanitizeTableName } from './lib/sql'
import {
  deleteImportedSource,
  loadImportedSources,
  loadSavedQueries,
  saveImportedSources,
  saveSavedQueries,
} from './lib/storage'
import type {
  ImportedSource,
  QueryResult,
  SavedQuery,
  TableInfo,
} from './types'

type MobileView = 'table' | 'chart'

function getSuggestedQueryName(sql: string): string {
  const firstComment = sql.match(/^\s*--\s*(.+)$/m)?.[1]?.trim()
  return firstComment?.slice(0, 42) || 'Untitled query'
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/^Error:\s*/i, '').trim()
  }
  return String(error)
}

function uniqueTableName(fileName: string, existingNames: Set<string>): string {
  const starterNames = new Set(['orders', 'products', 'customers'])
  const base = sanitizeTableName(fileName)
  const root = starterNames.has(base) ? `imported_${base}` : base
  let candidate = root
  let suffix = 2
  while (existingNames.has(candidate)) {
    candidate = `${root}_${suffix}`
    suffix += 1
  }
  return candidate
}

function App() {
  const engineRef = useRef<QueryEngine | null>(null)
  const bootstrapStarted = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [bootState, setBootState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [bootError, setBootError] = useState('')
  const [tables, setTables] = useState<TableInfo[]>([])
  const [sources, setSources] = useState<ImportedSource[]>([])
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>(STARTER_QUERIES)
  const [activeQueryId, setActiveQueryId] = useState<string | null>('starter-revenue')
  const [sql, setSql] = useState(DEFAULT_QUERY)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isRefreshingTables, setIsRefreshingTables] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileView, setMobileView] = useState<MobileView>('chart')
  const [toast, setToast] = useState('')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [helpDialogOpen, setHelpDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TableInfo | null>(null)
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform)
  const runShortcut = isMac ? '⌘↵' : 'Ctrl↵'

  useEffect(() => {
    if (bootstrapStarted.current) return
    bootstrapStarted.current = true

    const boot = async () => {
      try {
        const engine = await getQueryEngine()
        engineRef.current = engine
        await engine.installStarterData()

        const [storedSources, storedQueries] = await Promise.all([
          loadImportedSources(),
          loadSavedQueries(),
        ])

        const restoredSources: ImportedSource[] = []
        for (const source of storedSources) {
          try {
            await engine.importSource(source)
            restoredSources.push(source)
          } catch {
            // Keep the workspace usable if a persisted browser file can no longer be parsed.
          }
        }

        if (restoredSources.length !== storedSources.length) {
          await saveImportedSources(restoredSources)
        }

        const initialQueries = storedQueries ?? STARTER_QUERIES
        const [nextTables, initialResult] = await Promise.all([
          engine.getTables(restoredSources),
          engine.run(DEFAULT_QUERY),
        ])

        setSources(restoredSources)
        setSavedQueries(initialQueries)
        setTables(nextTables)
        setResult(initialResult)
        setBootState('ready')
      } catch (bootFailure) {
        setBootError(getErrorMessage(bootFailure))
        setBootState('error')
      }
    }

    void boot()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3_000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const runQuery = async (queryText = sql) => {
    const engine = engineRef.current
    if (!engine || isRunning) return

    setIsRunning(true)
    setError('')
    try {
      const nextResult = await engine.run(queryText)
      setResult(nextResult)
    } catch (queryFailure) {
      setError(getErrorMessage(queryFailure))
    } finally {
      setIsRunning(false)
    }
  }

  const refreshTables = async (sourceList = sources) => {
    const engine = engineRef.current
    if (!engine) return
    setIsRefreshingTables(true)
    try {
      setTables(await engine.getTables(sourceList))
    } catch (refreshFailure) {
      setToast(getErrorMessage(refreshFailure))
    } finally {
      setIsRefreshingTables(false)
    }
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    const engine = engineRef.current
    if (!engine || files.length === 0) return

    setIsImporting(true)
    setError('')
    setToast('')
    const nextSources = [...sources]
    const existingNames = new Set(tables.map((table) => table.name))
    const failures: string[] = []
    let firstImportedTable = ''

    try {
      for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase()
        if (!extension || !['csv', 'tsv', 'json', 'jsonl', 'ndjson'].includes(extension)) {
          failures.push(`${file.name} is not a supported file type`)
          continue
        }

        const id = crypto.randomUUID()
        const tableName = uniqueTableName(file.name, existingNames)
        const source: ImportedSource = {
          id,
          tableName,
          fileName: `${id}.${extension}`,
          fileType: extension === 'csv' || extension === 'tsv' ? 'csv' : 'json',
          bytes: new Uint8Array(await file.arrayBuffer()),
          importedAt: Date.now(),
        }

        try {
          await engine.importSource(source)
          nextSources.push(source)
          existingNames.add(tableName)
          firstImportedTable ||= tableName
        } catch (importFailure) {
          failures.push(`${file.name}: ${getErrorMessage(importFailure)}`)
        }
      }

      await saveImportedSources(nextSources)
      setSources(nextSources)
      await refreshTables(nextSources)

      if (firstImportedTable) {
        const previewSql = `SELECT *\nFROM "${firstImportedTable}"\nLIMIT 100`
        setSql(previewSql)
        setActiveQueryId(null)
        setMobileView('table')
        await runQuery(previewSql)
      }

      if (failures.length > 0) {
        setToast(`Imported ${files.length - failures.length} file(s). ${failures[0]}`)
      } else if (firstImportedTable) {
        setToast(`Imported ${files.length} file${files.length === 1 ? '' : 's'} locally`)
      }
    } catch (importWorkflowFailure) {
      setToast(getErrorMessage(importWorkflowFailure))
    } finally {
      setIsImporting(false)
    }
  }

  const handleOpenTable = (table: TableInfo) => {
    const nextSql = `SELECT *\nFROM "${table.name}"\nLIMIT 100`
    setSql(nextSql)
    setActiveQueryId(null)
    setMobileView('table')
    setSidebarOpen(false)
    void runQuery(nextSql)
  }

  const handleOpenSavedQuery = (query: SavedQuery) => {
    setSql(query.sql)
    setActiveQueryId(query.id)
    setMobileView('chart')
    setSidebarOpen(false)
    void runQuery(query.sql)
  }

  const handleNewQuery = () => {
    setSql('')
    setActiveQueryId(null)
    setError('')
    setSidebarOpen(false)
  }

  const handleSaveDialog = () => {
    setSaveName(getSuggestedQueryName(sql))
    setSaveDialogOpen(true)
  }

  const handleSaveQuery = async () => {
    const name = saveName.trim()
    if (!name || !sql.trim()) return

    const query: SavedQuery = {
      id: crypto.randomUUID(),
      name,
      sql,
      createdAt: Date.now(),
    }
    const nextQueries = [query, ...savedQueries]
    setSavedQueries(nextQueries)
    setActiveQueryId(query.id)
    await saveSavedQueries(nextQueries)
    setSaveDialogOpen(false)
    setToast('Query saved in this browser')
  }

  const handleDeleteSource = async () => {
    if (!deleteTarget?.sourceFileId || !engineRef.current) return
    const source = sources.find((item) => item.id === deleteTarget.sourceFileId)
    if (!source) return

    try {
      await engineRef.current.removeTable(source)
      await deleteImportedSource(source.id)
      const nextSources = sources.filter((item) => item.id !== source.id)
      setSources(nextSources)
      await refreshTables(nextSources)
      setToast(`Removed ${source.tableName}`)
    } catch (removeFailure) {
      setToast(getErrorMessage(removeFailure))
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleCopySql = async () => {
    await navigator.clipboard.writeText(sql)
    setToast('SQL copied to clipboard')
  }

  const handleExport = () => {
    if (!result) return
    downloadText('quarry-results.csv', resultToCsv(result))
    setToast('Results exported as CSV')
  }

  if (bootState === 'loading') {
    return <BootScreen />
  }

  if (bootState === 'error') {
    return (
      <div className="boot-screen error-screen">
        <div className="boot-mark">
          <AlertTriangle size={24} />
        </div>
        <span className="boot-eyebrow">Local engine unavailable</span>
        <h1>Quarry could not start.</h1>
        <p>{bootError}</p>
        <button className="primary-button" onClick={() => window.location.reload()} type="button">
          Reload workspace
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <button
            aria-label="Open navigation"
            className="icon-button mobile-menu"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            <Menu size={19} />
          </button>
          <div className="brand">
            <span className="brand-mark">
              <DatabaseZap size={17} strokeWidth={2} />
            </span>
            <h1 className="brand-name">Quarry</h1>
          </div>
          <span className="topbar-divider" />
          <div className="workspace-switcher">
            <span>
              <small>Workspace</small>
              <strong>Northstar shop</strong>
            </span>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="local-status">
            <span className="status-dot" />
            Local session
          </div>
          <button
            className="topbar-text-button"
            onClick={() => setHelpDialogOpen(true)}
            type="button"
          >
            <HelpCircle size={15} />
            About
          </button>
          <button
            className="import-top-button"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Plus size={15} />
            Import
          </button>
        </div>
      </header>

      <div className="app-body">
        <Sidebar
          activeQueryId={activeQueryId}
          isLoadingTables={isRefreshingTables}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onCreateQuery={handleNewQuery}
          onImport={() => fileInputRef.current?.click()}
          onOpenQuery={handleOpenSavedQuery}
          onOpenTable={handleOpenTable}
          onRefresh={() => void refreshTables()}
          onRemoveTable={setDeleteTarget}
          savedQueries={savedQueries}
          tables={tables}
        />

        <main className="workbench">
          <section className="query-panel">
            <div className="query-toolbar">
              <div className="query-title">
                <span className="query-live-dot" />
                <strong>
                  {savedQueries.find((query) => query.id === activeQueryId)?.name ??
                    'Ad hoc query'}
                </strong>
                <span className="query-kind">SQL</span>
              </div>
              <div className="query-actions">
                <button className="toolbar-button" onClick={handleCopySql} type="button">
                  <Copy size={14} />
                  <span>Copy</span>
                </button>
                <button
                  className="toolbar-button"
                  disabled={!sql.trim()}
                  onClick={handleSaveDialog}
                  type="button"
                >
                  <BookmarkPlus size={14} />
                  <span>Save</span>
                </button>
                <button
                  className="run-button"
                  disabled={isRunning || !sql.trim()}
                  onClick={() => void runQuery()}
                  type="button"
                >
                  {isRunning ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Play fill="currentColor" size={14} />
                  )}
                  {isRunning ? 'Running' : 'Run query'}
                  <kbd>{runShortcut}</kbd>
                </button>
              </div>
            </div>

            <QueryEditor onChange={setSql} onRun={() => void runQuery()} value={sql} />

            <div className="query-footer">
              <div className="engine-state">
                <Database size={13} />
                DuckDB WASM
                <span>·</span>
                <span>Preview capped at 500 rows</span>
              </div>
              <span className="engine-state right">
                <LockKeyhole size={12} />
                Processed on device
              </span>
            </div>
          </section>

          <section className="results-panel">
            <div className="results-toolbar">
              <div className="results-tabs">
                <button
                  aria-pressed={mobileView === 'table'}
                  className={mobileView === 'table' ? 'active' : undefined}
                  onClick={() => setMobileView('table')}
                  type="button"
                >
                  <Rows3 size={14} />
                  Results
                  {result && <span>{result.rowCount.toLocaleString()}</span>}
                </button>
                <button
                  aria-pressed={mobileView === 'chart'}
                  className={`chart-tab ${mobileView === 'chart' ? 'active' : ''}`}
                  onClick={() => setMobileView('chart')}
                  type="button"
                >
                  <ChartNoAxesCombined size={14} />
                  Visual
                </button>
              </div>
              <div className="result-meta">
                {result && (
                  <>
                    <span>{formatDuration(result.elapsedMs)}</span>
                    {result.truncated && <span>Preview limited</span>}
                  </>
                )}
                <button
                  className="icon-button"
                  disabled={!result}
                  onClick={handleExport}
                  title="Export results as CSV"
                  type="button"
                >
                  <Download size={15} />
                </button>
              </div>
            </div>

            {error && (
              <div className="query-error" role="alert">
                <div className="query-error-icon">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <strong>Query failed</strong>
                  <pre>{error}</pre>
                </div>
              </div>
            )}

            <div className={`results-grid ${error ? 'has-error' : ''}`}>
              <div className={`table-pane mobile-${mobileView}`}>
                <DataTable result={result} />
              </div>
              <div className={`insight-pane mobile-${mobileView}`}>
                <InsightChart result={result} />
              </div>
            </div>
          </section>
        </main>
      </div>

      <input
        accept=".csv,.tsv,.json,.jsonl,.ndjson"
        className="visually-hidden"
        multiple
        onChange={(event) => void handleImport(event)}
        ref={fileInputRef}
        type="file"
      />

      {(isImporting || toast) && (
        <div
          aria-live="polite"
          className={`toast ${isImporting ? 'processing-toast' : ''}`}
          role="status"
        >
          {isImporting ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <Check size={15} />
          )}
          {isImporting ? 'Inspecting data locally…' : toast}
        </div>
      )}

      <Dialog
        description="Queries are stored in this browser, not on a server."
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onPrimary={() => void handleSaveQuery()}
        primaryLabel="Save query"
        title="Save this query"
      >
        <label className="field-label" htmlFor="query-name">
          Query name
        </label>
        <input
          autoComplete="off"
          className="text-field"
          id="query-name"
          maxLength={48}
          onChange={(event) => setSaveName(event.target.value)}
          placeholder="e.g. Weekly revenue"
          value={saveName}
        />
      </Dialog>

      <Dialog
        description={
          deleteTarget
            ? `This removes the "${deleteTarget.name}" table from your local workspace.`
            : undefined
        }
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onPrimary={() => void handleDeleteSource()}
        primaryLabel="Remove source"
        title="Remove imported data?"
      >
        <div className="dialog-note">
          <TableProperties size={17} />
          Saved queries are not affected.
        </div>
      </Dialog>

      <Dialog
        isOpen={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        title="A private SQL workbench"
      >
        <div className="about-dialog">
          <div className="about-intro">
            <div className="about-icon">
              <ShieldCheck size={20} />
            </div>
            <p>
              Quarry runs DuckDB in your browser. Files, query results, and saved SQL stay on
              this device.
            </p>
          </div>
          <div className="shortcut-list">
            <div>
              <span>Run query</span>
              <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd>
              <kbd>↵</kbd>
            </div>
            <div>
              <span>Supported sources</span>
              <strong>CSV · TSV · JSON</strong>
            </div>
            <div>
              <span>Powered by</span>
              <strong>React · DuckDB WASM</strong>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function BootScreen() {
  return (
    <div className="boot-screen">
      <div className="boot-mark">
        <DatabaseZap size={24} />
      </div>
      <span className="boot-eyebrow">Private analytics workspace</span>
      <h1>Opening your quarry.</h1>
      <p>Starting DuckDB locally. No data is sent anywhere.</p>
      <div className="boot-progress">
        <span />
      </div>
      <div className="boot-footnote">
        <RefreshCw className="spin" size={13} />
        Initializing SQL engine
      </div>
    </div>
  )
}

export default App
