/**
 * Dense UI Primitives
 *
 * Centralized exports for all Dense-Core styled UI components.
 * These primitives implement the Dense-Core design system tokens
 * for consistent spacing, typography, heights, and colors.
 */

// Button primitives (Task 1.8)
export { Button, IconButton } from './button'
export type { ButtonProps, ButtonDensity, ButtonVariant, IconButtonProps } from './button'

// Input primitives (Task 1.9)
export { Input, Textarea, Select, PasswordInput } from './input'
export type { InputProps, TextareaProps, SelectProps, PasswordInputProps } from './input'

// Form field primitives (Task 1.9)
export { FormField, FormFieldGroup, FormActions } from './form-field'
export type { FormFieldProps, FormFieldGroupProps, FormActionsProps } from './form-field'

// Tabs primitives (Task 1.10)
export { Tabs, TabsList, TabsTrigger, TabsContent, SegmentedControl } from './tabs'
export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
  SegmentedControlProps,
} from './tabs'

// Table and list row primitives (Task 1.11)
export {
  DenseTable,
  DenseTableHeader,
  DenseTableBody,
  DenseTableRow,
  DenseTableHead,
  DenseTableCell,
  DenseRow,
} from './table'
export type {
  DenseTableProps,
  DenseTableRowProps,
  DenseTableHeadProps,
  DenseTableCellProps,
  DenseRowProps,
} from './table'

// Dialog primitives (Phase 3)
export {
  Dialog,
  DialogBackdrop,
  DialogContainer,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from './dialog'
export type {
  DialogProps,
  DialogBackdropProps,
  DialogContainerProps,
  DialogHeaderProps,
  DialogTitleProps,
  DialogDescriptionProps,
  DialogContentProps,
  DialogFooterProps,
} from './dialog'
