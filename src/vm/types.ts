/**
 * Core types for the TypeDB Studio view-model layer.
 *
 * These types define the contract between business logic and UI components.
 * Following the view-model-interface-guidelines:
 * 1. Structure mirrors the UI hierarchy
 * 2. Fine-grained reactivity with Queryable<T> fields ($ suffix)
 * 3. UI-ready outputs (pre-formatted strings, no raw IDs)
 * 4. Opaque side-effectful handlers (return void, not Promise)
 */

import type { Queryable } from "@livestore/livestore";

/**
 * Reactive primitive from LiveStore representing a value that may change over time.
 * Fields ending with $ contain Queryable values.
 * Static fields (no $) are fixed for the lifetime of their parent VM instance.
 *
 * @example
 * ```tsx
 * // In React, use the Queryable component or useQuery hook:
 * <Queryable query={vm.connectionStatus$}>
 *   {(status) => <StatusBadge status={status} />}
 * </Queryable>
 * ```
 */
export type { Queryable };

/**
 * Icon component type abstracted from the UI library.
 * Allows VMs to specify icons without coupling to a specific icon library.
 */
export type IconComponent = React.ComponentType<{ className?: string }>;

/**
 * Standard form input view model.
 * Used for text inputs throughout the application.
 */
export interface FormInputVM {
  /** Current input value */
  value$: Queryable<string>;
  /** Updates the input value. Triggers validation if applicable. */
  update(value: string): void;
  /**
   * Validation error message, or null if valid.
   * Shown below the input field in red text.
   */
  error$: Queryable<string | null>;
  /** Placeholder text shown when input is empty */
  placeholder: string;
  /** Label text shown above the input */
  label: string;
}

/**
 * Password input with visibility toggle.
 * Extends FormInputVM with show/hide password functionality.
 */
export interface PasswordInputVM extends FormInputVM {
  /**
   * Whether password is currently visible (shown as plain text).
   * Default: false (password is masked)
   */
  showPassword$: Queryable<boolean>;
  /**
   * Toggles password visibility.
   * Visual: Eye icon changes to eye-slash when visible.
   */
  toggleVisibility(): void;
}

/**
 * Disabled state for interactive elements.
 * When non-null, the element is disabled with a tooltip showing the reason.
 *
 * @example
 * ```tsx
 * <Queryable query={vm.runDisabled$}>
 *   {(disabled) => (
 *     <button
 *       disabled={disabled !== null}
 *       title={disabled?.displayReason}
 *     >
 *       Run
 *     </button>
 *   )}
 * </Queryable>
 * ```
 */
export type DisabledState = null | { displayReason: string };

/**
 * Context menu action item.
 * Used in right-click menus throughout the application.
 */
export interface ContextMenuActionVM {
  /** Unique key for React list rendering */
  key: string;
  /** Display label for the action */
  label: string;
  /** Icon component to show before the label */
  icon: IconComponent;
  /**
   * Whether this is a destructive action (delete, remove, etc.).
   * Visual: Red text styling when true.
   */
  destructive?: boolean;
  /**
   * Disabled state with reason.
   * When non-null, action is grayed out with tooltip.
   */
  disabled$: Queryable<DisabledState>;
  /** Executes the action and closes the menu */
  execute(): void;
}
