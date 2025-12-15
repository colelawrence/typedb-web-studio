import * as React from 'react'

/**
 * Dense Table & List Row Primitives (Task 1.11)
 *
 * Standardized table and row components with Dense-Core tokens for:
 * - Consistent row heights (h-row = 40px)
 * - Proper typography
 * - Zebra striping, hover, and selection states
 * - Tree indentation support
 */

/**
 * DenseTable - Table container with Dense styling
 */
export interface DenseTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Enable zebra striping */
  striped?: boolean
}

export const DenseTable = React.forwardRef<HTMLTableElement, DenseTableProps>(
  ({ className = '', striped = false, children, ...props }, ref) => {
    const classes = [
      'w-full border-collapse',
      'text-dense-sm',
      striped ? '[&_tbody_tr:nth-child(even)]:bg-muted/30' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <table ref={ref} className={classes} {...props}>
        {children}
      </table>
    )
  }
)

DenseTable.displayName = 'DenseTable'

/**
 * DenseTableHeader - Table header with Dense styling
 */
export const DenseTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => {
  return (
    <thead
      ref={ref}
      className={`border-b border-border bg-muted/50 ${className}`}
      {...props}
    />
  )
})

DenseTableHeader.displayName = 'DenseTableHeader'

/**
 * DenseTableBody - Table body
 */
export const DenseTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => {
  return <tbody ref={ref} className={className} {...props} />
})

DenseTableBody.displayName = 'DenseTableBody'

/**
 * DenseTableRow - Table row with Dense styling
 */
export interface DenseTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Selected state */
  selected?: boolean
  /** Clickable row */
  clickable?: boolean
}

export const DenseTableRow = React.forwardRef<HTMLTableRowElement, DenseTableRowProps>(
  ({ className = '', selected = false, clickable = false, ...props }, ref) => {
    const classes = [
      'h-row',
      'border-b border-border last:border-b-0',
      'transition-colors duration-150',
      clickable ? 'cursor-pointer' : '',
      selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return <tr ref={ref} className={classes} {...props} />
  }
)

DenseTableRow.displayName = 'DenseTableRow'

/**
 * DenseTableHead - Table header cell
 */
export interface DenseTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Sortable column */
  sortable?: boolean
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc' | null
  /** Callback when sort is requested */
  onSort?: () => void
}

export const DenseTableHead = React.forwardRef<HTMLTableCellElement, DenseTableHeadProps>(
  ({ className = '', sortable, sortDirection, onSort, children, ...props }, ref) => {
    const classes = [
      'h-row px-3',
      'text-left',
      'text-dense-xs font-semibold uppercase tracking-wider',
      'text-muted-foreground',
      sortable ? 'cursor-pointer select-none hover:text-foreground' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    const handleClick = sortable ? onSort : undefined

    return (
      <th ref={ref} className={classes} onClick={handleClick} {...props}>
        <span className="inline-flex items-center gap-1">
          {children}
          {sortable && sortDirection && (
            <SortIcon direction={sortDirection} className="size-4" />
          )}
        </span>
      </th>
    )
  }
)

DenseTableHead.displayName = 'DenseTableHead'

/**
 * DenseTableCell - Table data cell
 */
export interface DenseTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Truncate text with ellipsis */
  truncate?: boolean
  /** Monospace font */
  mono?: boolean
}

export const DenseTableCell = React.forwardRef<HTMLTableCellElement, DenseTableCellProps>(
  ({ className = '', truncate = false, mono = false, ...props }, ref) => {
    const classes = [
      'py-2 px-3',
      'text-dense-sm',
      truncate ? 'truncate max-w-0' : '',
      mono ? 'font-mono' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return <td ref={ref} className={classes} {...props} />
  }
)

DenseTableCell.displayName = 'DenseTableCell'

// Sort direction icon
function SortIcon({
  direction,
  className,
}: {
  direction: 'asc' | 'desc'
  className?: string
}) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      )}
    </svg>
  )
}

/**
 * DenseRow - Generic list/tree row with Dense styling
 * Used for sidebar trees, history entries, dropdown items, etc.
 */
export interface DenseRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Selected state */
  selected?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Tree depth level for indentation */
  depth?: number
  /** Icon element */
  icon?: React.ReactNode
  /** Show expand/collapse chevron */
  expandable?: boolean
  /** Expanded state (if expandable) */
  expanded?: boolean
  /** Callback for expand toggle */
  onExpandToggle?: () => void
}

export const DenseRow = React.forwardRef<HTMLDivElement, DenseRowProps>(
  (
    {
      className = '',
      selected = false,
      disabled = false,
      depth = 0,
      icon,
      expandable = false,
      expanded = false,
      onExpandToggle,
      children,
      ...props
    },
    ref
  ) => {
    // Calculate indentation: 16px per level
    const paddingLeft = 12 + depth * 16

    const classes = [
      'h-row px-3',
      'flex items-center gap-2',
      'text-dense-sm',
      'transition-colors duration-150',
      selected
        ? 'bg-accent text-accent-foreground'
        : disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground cursor-pointer',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        ref={ref}
        role="treeitem"
        aria-selected={selected}
        aria-disabled={disabled}
        aria-expanded={expandable ? expanded : undefined}
        className={classes}
        style={{ paddingLeft }}
        {...props}
      >
        {expandable && (
          <button
            type="button"
            className="size-4 flex items-center justify-center -ml-1 hover:bg-accent rounded-sm"
            onClick={(e) => {
              e.stopPropagation()
              onExpandToggle?.()
            }}
            tabIndex={-1}
          >
            <ChevronIcon expanded={expanded} className="size-3" />
          </button>
        )}
        {icon && <span className="size-4 flex-shrink-0">{icon}</span>}
        <span className="truncate flex-1">{children}</span>
      </div>
    )
  }
)

DenseRow.displayName = 'DenseRow'

// Chevron icon for expandable rows
function ChevronIcon({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <svg
      className={`${className} transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
