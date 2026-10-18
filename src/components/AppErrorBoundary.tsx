import { DatabaseZap, RefreshCw, Trash2 } from 'lucide-react'
import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  error: Error | null
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Quarry recovered from a render error.', error, info)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReset = async () => {
    localStorage.clear()
    if ('databases' in indexedDB) {
      const databases = await indexedDB.databases()
      await Promise.all(
        databases
          .filter((database) => database.name)
          .map(
            (database) =>
              new Promise<void>((resolve, reject) => {
                const request = indexedDB.deleteDatabase(database.name!)
                request.onsuccess = () => resolve()
                request.onerror = () => reject(request.error)
                request.onblocked = () => resolve()
              }),
          ),
      )
    }
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="boot-screen error-screen">
        <div className="boot-mark">
          <DatabaseZap size={24} />
        </div>
        <span className="boot-eyebrow">Workspace recovered</span>
        <h1>Quarry hit a rendering error.</h1>
        <p>
          Your data is still in browser storage. Reload first. If the error repeats, reset the
          local workspace.
        </p>
        <details className="boundary-details">
          <summary>Technical details</summary>
          <code>{this.state.error.message}</code>
        </details>
        <div className="boundary-actions">
          <button className="primary-button" onClick={this.handleReload} type="button">
            <RefreshCw size={14} />
            Reload workspace
          </button>
          <button className="secondary-button" onClick={() => void this.handleReset()} type="button">
            <Trash2 size={14} />
            Reset local data
          </button>
        </div>
      </div>
    )
  }
}
