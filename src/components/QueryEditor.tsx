import CodeMirror from '@uiw/react-codemirror'
import { PostgreSQL, sql } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import type { KeyboardEvent } from 'react'

interface QueryEditorProps {
  value: string
  onChange: (value: string) => void
  onRun: () => void
}

export function QueryEditor({ value, onChange, onRun }: QueryEditorProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      onRun()
    }
  }

  return (
    <div className="query-editor-shell" onKeyDownCapture={handleKeyDown}>
      <CodeMirror
        aria-label="SQL query editor"
        basicSetup={{
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          lineNumbers: true,
        }}
        className="query-editor"
        extensions={[
          sql({ dialect: PostgreSQL, upperCaseKeywords: true }),
          EditorView.lineWrapping,
        ]}
        onChange={onChange}
        value={value}
      />
    </div>
  )
}
