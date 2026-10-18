import { X } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useRef } from 'react'

interface DialogProps {
  isOpen: boolean
  title: string
  description?: string
  children: ReactNode
  primaryLabel?: string
  onClose: () => void
  onPrimary?: () => void
}

export function Dialog({
  isOpen,
  title,
  description,
  children,
  primaryLabel,
  onClose,
  onPrimary,
}: DialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onPrimary?.()
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose} role="presentation">
      <form
        aria-modal="true"
        className="dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="dialog-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            aria-label="Close dialog"
            className="icon-button"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {primaryLabel && (
          <div className="dialog-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-button" type="submit">
              {primaryLabel}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
