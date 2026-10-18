import { Database, Rows3 } from 'lucide-react'
import { formatCell } from '../lib/format'
import type { QueryResult } from '../types'

interface DataTableProps {
  result: QueryResult | null
}

export function DataTable({ result }: DataTableProps) {
  if (!result) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Database size={20} strokeWidth={1.8} />
        </div>
        <strong>Your results will land here</strong>
        <span>Run a query to inspect the output.</span>
      </div>
    )
  }

  if (result.rows.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Rows3 size={20} strokeWidth={1.8} />
        </div>
        <strong>Query completed with no rows</strong>
        <span>Try widening a filter or checking the selected table.</span>
      </div>
    )
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="row-number-heading" aria-label="Row number">
              #
            </th>
            {result.columns.map((column, columnIndex) => (
              <th key={`${column.name}-${columnIndex}`} scope="col">
                <span className="column-name">{column.name}</span>
                <span className="column-type">{column.rawType}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td className="row-number">{rowIndex + 1}</td>
              {row.map((value, columnIndex) => (
                <td
                  className={value === null ? 'cell-null' : undefined}
                  key={`${rowIndex}-${columnIndex}`}
                >
                  {formatCell(value, result.columns[columnIndex].kind)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
