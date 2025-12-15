import * as React from 'react'

/**
 * Dense Button Primitive (Task 1.8)
 *
 * Standardized button component with Dense-Core tokens for:
 * - Consistent heights via density prop
 * - Semantic color variants
 * - Proper typography and spacing
 */

export type ButtonDensity = 'compact' | 'default' | 'row'
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant
  /** Height density - maps to Dense-Core height tokens */
  density?: ButtonDensity
  /** Icon-only button (square aspect ratio) */
  iconOnly?: boolean
  /** Loading state */
  loading?: boolean
  /** Full width */
  fullWidth?: boolean
  children?: React.ReactNode
}

const densityClasses: Record<ButtonDensity, string> = {
  compact: 'h-compact text-dense-xs',
  default: 'h-default text-dense-sm',
  row: 'h-row text-dense-sm',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-secondary',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive',
  ghost: 'hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent',
  outline:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      density = 'default',
      iconOnly = false,
      loading = false,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    // Build class string
    const classes = [
      // Base styles
      'inline-flex items-center justify-center gap-1.5',
      'font-medium rounded-md',
      'transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      // Density (height + typography)
      densityClasses[density],
      // Variant (colors)
      variantClasses[variant],
      // Conditional styles
      iconOnly ? 'aspect-square px-0' : 'px-3',
      fullWidth ? 'w-full' : '',
      isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button ref={ref} className={classes} disabled={isDisabled} {...props}>
        {loading ? (
          <>
            <LoadingSpinner className="size-4 animate-spin" />
            {!iconOnly && children}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Simple loading spinner component
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * IconButton - Convenience wrapper for icon-only buttons
 */
export interface IconButtonProps extends Omit<ButtonProps, 'iconOnly'> {
  /** Accessible label for the icon button */
  'aria-label': string
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ density = 'compact', ...props }, ref) => {
    return <Button ref={ref} iconOnly density={density} {...props} />
  }
)

IconButton.displayName = 'IconButton'
