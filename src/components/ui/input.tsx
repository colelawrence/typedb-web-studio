import * as React from 'react'

/**
 * Dense Input Primitives (Task 1.9)
 *
 * Standardized form input components with Dense-Core tokens for:
 * - Consistent heights (h-default = 36px)
 * - Proper typography (text-dense-sm)
 * - Consistent padding and borders
 */

// Shared base styles for all input types
const baseInputClasses = [
  'h-default px-3 w-full',
  'text-dense-sm bg-background',
  'border border-input rounded-md',
  'placeholder:text-muted-foreground',
  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'transition-colors duration-150',
].join(' ')

/**
 * Input - Standard text input
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error state styling */
  error?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    const classes = [
      baseInputClasses,
      error ? 'border-destructive focus:ring-destructive' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return <input ref={ref} className={classes} {...props} />
  }
)

Input.displayName = 'Input'

/**
 * Textarea - Multi-line text input
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Error state styling */
  error?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    const classes = [
      // Override h-default with auto height for textarea
      'px-3 py-2 w-full min-h-[80px]',
      'text-dense-sm bg-background',
      'border border-input rounded-md',
      'placeholder:text-muted-foreground',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'transition-colors duration-150',
      'resize-y',
      error ? 'border-destructive focus:ring-destructive' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return <textarea ref={ref} className={classes} {...props} />
  }
)

Textarea.displayName = 'Textarea'

/**
 * Select - Dropdown select input
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Error state styling */
  error?: boolean
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    const classes = [
      baseInputClasses,
      'appearance-none cursor-pointer',
      'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E")]',
      'bg-no-repeat bg-[right_0.5rem_center]',
      'pr-8',
      error ? 'border-destructive focus:ring-destructive' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <select ref={ref} className={classes} {...props}>
        {children}
      </select>
    )
  }
)

Select.displayName = 'Select'

/**
 * PasswordInput - Password input with visibility toggle
 */
export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /** Show password visibility toggle button */
  showToggle?: boolean
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = '', showToggle = true, error, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={showToggle ? 'pr-10' : className}
          error={error}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setVisible(!visible)}
            tabIndex={-1}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

// Simple eye icons for password toggle
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  )
}
