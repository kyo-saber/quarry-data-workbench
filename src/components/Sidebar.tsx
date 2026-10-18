import {
  Bookmark,
  ChevronRight,
  Database,
  FileJson,
  FileSpreadsheet,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ShieldCheck,
  Table2,
  Trash2,
} from 'lucide-react'
import { formatRelativeTime } from '../lib/format'
import type { SavedQuery, TableInfo } from '../types'

interface SidebarProps {
  isOpen: boolean
  tables: TableInfo[]
  savedQueries: SavedQuery[]
  activeQueryId: string | null
  isLoadingTables: boolean
  onClose: () => void
  onImport: () => void
  onRefresh: () => void
  onOpenTable: (table: TableInfo) => void
  onRemoveTable: (table: TableInfo) => void
  onOpenQuery: (query: SavedQuery) => void
  onCreateQuery: () => void
}

export function Sidebar({
  isOpen,
  tables,
  savedQueries,
  activeQueryId,
  isLoadingTables,
  onClose,
  onImport,
  onRefresh,
  onOpenTable,
  onRemoveTable,
  onOpenQuery,
  onCreateQuery,
}: SidebarProps) {
  const starterTables = tables.filter((table) => table.origin === 'starter')
  const importedTables = tables.filter((table) => table.origin === 'imported')

  return (
    <>
      <button
        aria-label="Close navigation"
        className={`sidebar-scrim ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        type="button"
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <button className="import-button" onClick={onImport} type="button">
          <span className="import-icon">
            <Plus size={16} />
          </span>
          Import data
          <span className="import-formats">CSV, JSON</span>
        </button>

        <div className="sidebar-scroll">
          <section className="sidebar-section">
            <div className="sidebar-section-heading">
              <span>Sources</span>
              <button
                aria-label="Refresh table list"
                className={isLoadingTables ? 'spin' : undefined}
                onClick={onRefresh}
                title="Refresh sources"
                type="button"
              >
                <RefreshCw size={13} />
              </button>
            </div>
            <div className="source-list">
              {starterTables.map((table) => (
                <TableRow key={table.name} table={table} onOpen={onOpenTable} />
              ))}
              {importedTables.length > 0 && <span className="source-divider">Imported</span>}
              {importedTables.map((table) => (
                <TableRow
                  canDelete
                  key={table.name}
                  onDelete={() => onRemoveTable(table)}
                  onOpen={onOpenTable}
                  table={table}
                />
              ))}
            </div>
          </section>

          <section className="sidebar-section saved-section">
            <div className="sidebar-section-heading">
              <span>Saved queries</span>
              <button aria-label="Create query" onClick={onCreateQuery} type="button">
                <Plus size={14} />
              </button>
            </div>
            <div className="saved-list">
              {savedQueries.map((query) => (
                <button
                  className={`saved-query ${activeQueryId === query.id ? 'active' : ''}`}
                  key={query.id}
                  onClick={() => onOpenQuery(query)}
                  type="button"
                >
                  <Bookmark size={14} />
                  <span>
                    <strong>{query.name}</strong>
                    <small>{formatRelativeTime(query.createdAt)}</small>
                  </span>
                  <ChevronRight className="saved-chevron" size={13} />
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="privacy-note">
          <div className="privacy-icon">
            <ShieldCheck size={16} />
          </div>
          <div>
            <strong>Private by design</strong>
            <span>Your data never leaves this browser.</span>
          </div>
          <MoreHorizontal size={15} />
        </div>
      </aside>
    </>
  )
}

function TableRow({
  table,
  canDelete = false,
  onOpen,
  onDelete,
}: {
  table: TableInfo
  canDelete?: boolean
  onOpen: (table: TableInfo) => void
  onDelete?: () => void
}) {
  const Icon = table.origin === 'starter' ? Table2 : table.name.endsWith('json') ? FileJson : FileSpreadsheet

  return (
    <div className="source-row">
      <button className="source-main" onClick={() => onOpen(table)} type="button">
        <Icon size={15} />
        <span>
          <strong>{table.name}</strong>
          <small>
            {table.rowCount.toLocaleString()} rows · {table.columns} cols
          </small>
        </span>
      </button>
      {canDelete ? (
        <button
          aria-label={`Remove ${table.name}`}
          className="source-delete"
          onClick={onDelete}
          title="Remove source"
          type="button"
        >
          <Trash2 size={13} />
        </button>
      ) : (
        <Database className="source-end-icon" size={12} />
      )}
    </div>
  )
}
