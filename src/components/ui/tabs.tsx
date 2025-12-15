import * as React from 'react'

/**
 * Dense Tabs Primitive (Task 1.10)
 *
 * Standardized tabs/segmented control components with Dense-Core tokens for:
 * - Consistent heights (h-compact for triggers)
 * - Proper typography (text-dense-xs/sm)
 * - Consistent padding and spacing
 * - Icon + label support
 */

type TabsContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider')
  }
  return context
}

/**
 * Tabs - Root container for tabbed interface
 */
export interface TabsProps {
  /** Currently active tab value */
  value: string
  /** Callback when tab changes */
  onValueChange: (value: string) => void
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

export function Tabs({ value, onValueChange, className = '', children }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

/**
 * TabsList - Container for tab triggers
 */
export interface TabsListProps {
  /** Visual variant */
  variant?: 'default' | 'pills' | 'underline'
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

const listVariantClasses = {
  default: 'bg-muted p-1 rounded-md',
  pills: 'gap-1',
  underline: 'border-b border-border gap-0',
}

export function TabsList({ variant = 'default', className = '', children }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center ${listVariantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * TabsTrigger - Individual tab button
 */
export interface TabsTriggerProps {
  /** Value that identifies this tab */
  value: string
  /** Disabled state */
  disabled?: boolean
  /** Icon element to display before label */
  icon?: React.ReactNode
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

export function TabsTrigger({
  value,
  disabled = false,
  icon,
  className = '',
  children,
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext()
  const isSelected = selectedValue === value

  const classes = [
    // Base styles
    'h-compact px-3',
    'inline-flex items-center justify-center gap-1.5',
    'text-dense-xs font-medium',
    'rounded-sm',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    // State styles
    isSelected
      ? 'bg-background text-foreground shadow-sm'
      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
    disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isSelected}
      aria-disabled={disabled}
      tabIndex={isSelected ? 0 : -1}
      className={classes}
      onClick={() => !disabled && onValueChange(value)}
    >
      {icon && <span className="size-4">{icon}</span>}
      {children}
    </button>
  )
}

/**
 * TabsContent - Content panel for a tab
 */
export interface TabsContentProps {
  /** Value that identifies this content panel */
  value: string
  /** Force mount even when not active (for animations) */
  forceMount?: boolean
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

export function TabsContent({
  value,
  forceMount = false,
  className = '',
  children,
}: TabsContentProps) {
  const { value: selectedValue } = useTabsContext()
  const isSelected = selectedValue === value

  if (!isSelected && !forceMount) {
    return null
  }

  return (
    <div
      role="tabpanel"
      hidden={!isSelected}
      tabIndex={0}
      className={`focus-visible:outline-none ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * SegmentedControl - Alternative presentation as a segmented button group
 */
export interface SegmentedControlProps<T extends string> {
  /** Current selected value */
  value: T
  /** Callback when selection changes */
  onValueChange: (value: T) => void
  /** Segments to display */
  segments: Array<{
    value: T
    label: string
    icon?: React.ReactNode
    disabled?: boolean
  }>
  /** Density variant */
  density?: 'compact' | 'default'
  /** Additional CSS classes */
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  segments,
  density = 'compact',
  className = '',
}: SegmentedControlProps<T>) {
  const densityClasses = density === 'compact' ? 'h-compact text-dense-xs' : 'h-default text-dense-sm'

  return (
    <div
      role="group"
      className={`inline-flex items-center bg-muted p-0.5 rounded-md ${className}`}
    >
      {segments.map((segment) => {
        const isSelected = value === segment.value
        const classes = [
          densityClasses,
          'px-3',
          'inline-flex items-center justify-center gap-1.5',
          'font-medium rounded-sm',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isSelected
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
          segment.disabled
            ? 'opacity-50 cursor-not-allowed pointer-events-none'
            : 'cursor-pointer',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={segment.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={segment.disabled}
            className={classes}
            onClick={() => !segment.disabled && onValueChange(segment.value)}
          >
            {segment.icon && <span className="size-4">{segment.icon}</span>}
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}
