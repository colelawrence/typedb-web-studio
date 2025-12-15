import * as React from 'react'

/**
 * Dense Form Field Primitive (Task 1.9)
 *
 * Wrapper component that provides consistent layout for:
 * - Labels with proper typography
 * - Description/help text
 * - Error messages
 * - Consistent spacing
 */

export interface FormFieldProps {
  /** Field label */
  label?: string
  /** Optional description/help text */
  description?: string
  /** Error message */
  error?: string
  /** Whether the field is required */
  required?: boolean
  /** HTML for attribute to associate label with input */
  htmlFor?: string
  /** Additional CSS classes */
  className?: string
  /** The form input element */
  children: React.ReactNode
}

export function FormField({
  label,
  description,
  error,
  required,
  htmlFor,
  className = '',
  children,
}: FormFieldProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block mb-1.5 text-dense-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      {children}
      {description && !error && (
        <p className="mt-1 text-dense-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="mt-1 text-dense-xs text-destructive">{error}</p>}
    </div>
  )
}

/**
 * FormFieldGroup - Group multiple form fields in a row
 */
export interface FormFieldGroupProps {
  /** Gap between fields */
  gap?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
}

export function FormFieldGroup({ gap = 'md', className = '', children }: FormFieldGroupProps) {
  return <div className={`flex ${gapClasses[gap]} ${className}`}>{children}</div>
}

/**
 * FormActions - Footer area for form buttons
 */
export interface FormActionsProps {
  /** Alignment of buttons */
  align?: 'left' | 'center' | 'right' | 'between'
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

const alignClasses = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
}

export function FormActions({ align = 'right', className = '', children }: FormActionsProps) {
  return (
    <div className={`flex items-center gap-3 pt-4 ${alignClasses[align]} ${className}`}>
      {children}
    </div>
  )
}
