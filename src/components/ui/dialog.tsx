import * as React from 'react'

/**
 * Dense Dialog Primitives (Phase 3: Tasks 3.1-3.4)
 *
 * Standardized dialog components with Dense-Core tokens for:
 * - Consistent layout and spacing
 * - Proper typography hierarchy
 * - Focus trap and keyboard handling
 */

/**
 * DialogBackdrop - Modal backdrop
 */
export interface DialogBackdropProps {
  /** Called when backdrop is clicked (optional, dialogs may not close on backdrop click) */
  onClick?: () => void
  children: React.ReactNode
}

export function DialogBackdrop({ onClick, children }: DialogBackdropProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClick) {
        onClick()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClick])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        // Only close if clicking the backdrop itself, not the dialog content
        if (e.target === e.currentTarget && onClick) {
          onClick()
        }
      }}
      role="presentation"
    >
      {children}
    </div>
  )
}

/**
 * DialogContainer - Main dialog window
 */
export interface DialogContainerProps {
  /** Maximum width of dialog */
  maxWidth?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

const maxWidthClasses = {
  sm: 'max-w-[400px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[560px]',
}

export function DialogContainer({
  maxWidth = 'sm',
  className = '',
  children,
}: DialogContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Focus trap
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Focus first focusable element
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    // Trap focus within dialog
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusable = Array.from(focusableElements)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [])

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      className={`
        w-full ${maxWidthClasses[maxWidth]}
        bg-card border border-border
        rounded-lg shadow-lg
        animate-in zoom-in-95 duration-200
        ${className}
      `}
    >
      {children}
    </div>
  )
}

/**
 * DialogHeader - Header section with title
 */
export interface DialogHeaderProps {
  children: React.ReactNode
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="p-6 pb-0">{children}</div>
}

/**
 * DialogTitle - Dialog title text
 */
export interface DialogTitleProps {
  children: React.ReactNode
}

export function DialogTitle({ children }: DialogTitleProps) {
  return <h2 className="text-lg font-semibold text-foreground mb-2">{children}</h2>
}

/**
 * DialogDescription - Dialog body/description text
 */
export interface DialogDescriptionProps {
  children: React.ReactNode
}

export function DialogDescription({ children }: DialogDescriptionProps) {
  return <p className="text-dense-sm text-muted-foreground mb-4">{children}</p>
}

/**
 * DialogContent - Main content area
 */
export interface DialogContentProps {
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

export function DialogContent({ className = '', children }: DialogContentProps) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

/**
 * DialogFooter - Footer with actions
 */
export interface DialogFooterProps {
  children: React.ReactNode
}

export function DialogFooter({ children }: DialogFooterProps) {
  return <div className="p-6 pt-0 flex items-center justify-end gap-3">{children}</div>
}

/**
 * Dialog - Complete dialog component combining all parts
 */
export interface DialogProps {
  /** Whether dialog is open */
  open: boolean
  /** Called when dialog should close */
  onClose?: () => void
  /** Maximum width */
  maxWidth?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Dialog({ open, onClose, maxWidth = 'sm', children }: DialogProps) {
  if (!open) return null

  return (
    <DialogBackdrop onClick={onClose}>
      <DialogContainer maxWidth={maxWidth}>{children}</DialogContainer>
    </DialogBackdrop>
  )
}
