/**
 * Modal dialogs view model.
 *
 * Centralized dialog management. Only one dialog can be open at a time.
 */

import type { Queryable } from "../types";
import type { FormInputVM, PasswordInputVM, DisabledState } from "../types";

/**
 * Dialogs VM.
 *
 * **Behavior:**
 * - Only one dialog visible at a time
 * - Modal backdrop blocks interaction with page below
 * - Escape key closes dialog (same as Cancel)
 * - Click outside does NOT close dialog (prevents accidental dismissal)
 * - Focus is trapped within dialog
 */
export interface DialogsVM {
  /**
   * Currently active dialog, or null if none open.
   */
  active$: Queryable<ActiveDialogVM | null>;

  /**
   * Closes any active dialog without action.
   * Safe to call even if no dialog is open.
   */
  closeAll(): void;
}

/**
 * Discriminated union of all dialog types.
 */
export type ActiveDialogVM =
  | { type: "confirmation"; vm: ConfirmationDialogVM }
  | { type: "strongConfirmation"; vm: StrongConfirmationDialogVM }
  | { type: "createDatabase"; vm: CreateDatabaseDialogVM }
  | { type: "saveQuery"; vm: SaveQueryDialogVM }
  | { type: "createFolder"; vm: CreateFolderDialogVM }
  | { type: "moveQuery"; vm: MoveQueryDialogVM }
  | { type: "importQueries"; vm: ImportQueriesDialogVM }
  | { type: "createUser"; vm: CreateUserDialogVM }
  | { type: "editPassword"; vm: EditPasswordDialogVM };

/**
 * Simple confirmation dialog.
 *
 * Used for actions like "Discard changes?", "Sign out?", etc.
 */
export interface ConfirmationDialogVM {
  /**
   * Dialog title.
   * @example "Discard changes?", "Delete query?"
   */
  title: string;

  /**
   * Dialog body message.
   * Can be multi-line. Should explain consequences of action.
   *
   * @example "You have unsaved changes. Creating a new scratch query will discard them."
   */
  body: string;

  /**
   * Confirm button text.
   * @example "Discard", "Delete", "Sign Out"
   */
  confirmLabel: string;

  /**
   * Confirm button visual style.
   *
   * - `"primary"`: Default blue button
   * - `"destructive"`: Red button for destructive actions
   */
  confirmVariant: "primary" | "destructive";

  /**
   * Cancels and closes the dialog.
   * Initial focus is on this button (safer default).
   */
  cancel(): void;

  /**
   * Confirms the action and closes the dialog.
   */
  confirm(): void;
}

/**
 * Strong confirmation dialog requiring typed text.
 *
 * Used for highly destructive actions like deleting databases or users.
 */
export interface StrongConfirmationDialogVM {
  /**
   * Dialog title.
   * @example "Delete database?"
   */
  title: string;

  /**
   * Warning body message.
   * @example "This action cannot be undone. All data in 'my_database' will be permanently deleted."
   */
  body: string;

  /**
   * The exact text user must type to confirm.
   * Displayed with emphasis: 'Type "{text}" to confirm'
   *
   * @example Database name, username, etc.
   */
  confirmationText: string;

  /**
   * User's current input in the confirmation field.
   */
  inputText$: Queryable<string>;

  /**
   * Updates the confirmation input.
   */
  updateInput(text: string): void;

  /**
   * Whether the confirm button is enabled.
   * True only when input exactly matches confirmationText (case-sensitive).
   */
  confirmEnabled$: Queryable<boolean>;

  /**
   * Cancel and close dialog.
   */
  cancel(): void;

  /**
   * Confirm deletion (enabled only when text matches).
   */
  confirm(): void;

  /**
   * Whether the action is in progress.
   * Shows spinner on confirm button.
   */
  isProcessing$: Queryable<boolean>;
}

/**
 * Create database dialog.
 */
export interface CreateDatabaseDialogVM {
  /**
   * Database name input.
   *
   * **Validation:**
   * - Required
   * - Must start with a letter
   * - Only letters, numbers, underscores allowed
   * - Must be unique (not already exist on server)
   */
  nameInput: FormInputVM;

  /**
   * Disabled state for create button.
   *
   * **Disabled when:**
   * - Name is empty
   * - Name has validation error
   */
  createDisabled$: Queryable<DisabledState>;

  /**
   * Whether creation is in progress.
   */
  isCreating$: Queryable<boolean>;

  /**
   * Cancel and close dialog.
   */
  cancel(): void;

  /**
   * Creates the database.
   *
   * **On success:**
   * - Closes dialog
   * - Selects new database
   * - Shows toast "Database '{name}' created"
   * - Refreshes database list
   *
   * **On error:**
   * - Shows inline error in dialog
   * - Does not close dialog
   */
  create(): void;
}

/**
 * Save query dialog.
 */
export interface SaveQueryDialogVM {
  /**
   * Dialog mode determining title and behavior.
   *
   * - `"create"`: "Save Query" - creating new query
   * - `"rename"`: "Rename Query" - renaming existing query
   */
  mode: "create" | "rename";

  /**
   * Query name input.
   *
   * **Pre-fill (create mode):**
   * Smart extraction from query text (first 60 chars, skipping comments).
   *
   * **Validation:**
   * - Required
   * - Must be unique within the selected folder
   */
  nameInput: FormInputVM;

  /**
   * Optional description input.
   */
  descriptionInput: FormInputVM;

  /**
   * Folder selection (create mode only).
   */
  folder: {
    /**
     * Selected folder ID, or null for root/"Unsorted".
     */
    selectedId$: Queryable<string | null>;

    /**
     * Available folders in a flat list with depth indicators.
     */
    options$: Queryable<FolderOptionVM[]>;

    /**
     * Selects a folder.
     */
    select(folderId: string | null): void;

    /**
     * Whether inline new folder creation is active.
     */
    isCreatingNew$: Queryable<boolean>;

    /**
     * Starts inline new folder creation.
     */
    startCreateNew(): void;

    /**
     * New folder name input (when creating inline).
     */
    newFolderName$: Queryable<string>;

    /**
     * Updates new folder name.
     */
    updateNewFolderName(name: string): void;

    /**
     * Confirms creating the new folder.
     * Selects the new folder after creation.
     */
    confirmCreateNew(): void;

    /**
     * Cancels inline folder creation.
     */
    cancelCreateNew(): void;
  };

  /**
   * Disabled state for save button.
   */
  saveDisabled$: Queryable<DisabledState>;

  /**
   * Cancel and close dialog.
   */
  cancel(): void;

  /**
   * Saves the query.
   *
   * **On success:**
   * - Closes dialog
   * - Toast shows 'Query "{name}" saved'
   * - Sidebar refreshes to show new/renamed query
   * - Editor updates header (if creating, switches from scratch to saved)
   */
  save(): void;
}

/**
 * Folder option for dropdown selection.
 */
export interface FolderOptionVM {
  /** Folder ID, or null for root/"Unsorted" */
  key: string | null;

  /**
   * Display label.
   * @example "My Queries", "  Work Projects" (indented for subfolder)
   */
  label: string;

  /**
   * Nesting depth for visual indentation.
   * 0 = root level.
   */
  depth: number;
}

/**
 * Create folder dialog.
 */
export interface CreateFolderDialogVM {
  /**
   * Folder name input.
   *
   * **Validation:**
   * - Required
   * - Must be unique within parent folder
   */
  nameInput: FormInputVM;

  /**
   * Parent folder selection.
   * Same structure as save query dialog folder selection.
   */
  parentFolder: {
    selectedId$: Queryable<string | null>;
    options$: Queryable<FolderOptionVM[]>;
    select(folderId: string | null): void;
  };

  /**
   * Disabled state for create button.
   */
  createDisabled$: Queryable<DisabledState>;

  /**
   * Cancel and close dialog.
   */
  cancel(): void;

  /**
   * Creates the folder.
   */
  create(): void;
}

/**
 * Move query/folder dialog.
 */
export interface MoveQueryDialogVM {
  /**
   * Name of item being moved.
   */
  itemName: string;

  /**
   * Type of item being moved.
   */
  itemType: "query" | "folder";

  /**
   * Destination folder selection.
   * Excludes the item itself and its descendants (for folders).
   */
  destinationFolder: {
    selectedId$: Queryable<string | null>;
    options$: Queryable<FolderOptionVM[]>;
    select(folderId: string | null): void;
  };

  /**
   * Disabled state for move button.
   *
   * **Disabled when:**
   * - Destination is same as current location
   * - Destination is a descendant of item (for folders)
   */
  moveDisabled$: Queryable<DisabledState>;

  /**
   * Cancel and close dialog.
   */
  cancel(): void;

  /**
   * Moves the item.
   *
   * **On success:**
   * - Closes dialog
   * - Toast shows 'Moved "{name}" to {destination}'
   * - Sidebar refreshes
   */
  move(): void;
}

/**
 * Import queries dialog.
 */
export interface ImportQueriesDialogVM {
  /**
   * Import strategy selection.
   *
   * - `"merge"`: Add new items, update existing by ID
   * - `"replace"`: Clear existing, replace with imported
   * - `"skip"`: Add new items only, skip existing
   */
  strategy$: Queryable<"merge" | "replace" | "skip">;

  /**
   * Sets the import strategy.
   */
  setStrategy(strategy: "merge" | "replace" | "skip"): void;

  /**
   * Selected file info, or null if no file selected.
   */
  selectedFile$: Queryable<{ name: string; sizeDisplay: string } | null>;

  /**
   * Opens file picker.
   * Accepts .json files only.
   */
  selectFile(): void;

  /**
   * Clears selected file.
   */
  clearFile(): void;

  /**
   * File validation/parse error.
   *
   * @example "Invalid JSON format", "Missing required 'queries' field"
   */
  fileError$: Queryable<string | null>;

  /**
   * Preview of what will be imported.
   * Shown after file is selected and validated.
   */
  preview$: Queryable<ImportPreviewVM | null>;

  /**
   * Disabled state for import button.
   */
  importDisabled$: Queryable<DisabledState>;

  /**
   * Whether import is in progress.
   */
  isImporting$: Queryable<boolean>;

  /**
   * Cancel and close dialog.
   */
  cancel(): void;

  /**
   * Imports the queries.
   *
   * **On success:**
   * - Closes dialog
   * - Toast shows "Imported {n} queries, {m} folders"
   * - Sidebar refreshes
   */
  import(): void;
}

/**
 * Import preview information.
 */
export interface ImportPreviewVM {
  /** Number of folders to import */
  folderCount: number;
  /** Number of queries to import */
  queryCount: number;
  /** Number of existing items that will be updated (merge strategy) */
  updateCount: number;
  /** Number of existing items that will be skipped (skip strategy) */
  skipCount: number;
}

/**
 * Create user dialog.
 */
export interface CreateUserDialogVM {
  /**
   * Username input.
   *
   * **Validation:**
   * - Required
   * - Must be unique (not already exist)
   * - Alphanumeric + underscore only
   */
  usernameInput: FormInputVM;

  /**
   * Password input.
   */
  passwordInput: PasswordInputVM;

  /**
   * Confirm password input.
   */
  confirmPasswordInput: PasswordInputVM;

  /**
   * Whether passwords match.
   * Shows error on confirm field when false and both have content.
   */
  passwordsMatch$: Queryable<boolean>;

  /**
   * Disabled state for create button.
   *
   * **Disabled when:**
   * - Username is empty or invalid
   * - Password is empty
   * - Passwords don't match
   */
  createDisabled$: Queryable<DisabledState>;

  /**
   * Whether creation is in progress.
   */
  isCreating$: Queryable<boolean>;

  /**
   * Cancel and close dialog.
   */
  cancel(): void;

  /**
   * Creates the user.
   *
   * **On success:**
   * - Closes dialog
   * - Toast shows "User '{username}' created"
   * - User list refreshes
   */
  create(): void;
}

/**
 * Edit password dialog.
 */
export interface EditPasswordDialogVM {
  /**
   * Username being edited (display only).
   */
  usernameDisplay: string;

  /**
   * New password input.
   */
  newPasswordInput: PasswordInputVM;

  /**
   * Confirm new password input.
   */
  confirmPasswordInput: PasswordInputVM;

  /**
   * Whether passwords match.
   */
  passwordsMatch$: Queryable<boolean>;

  /**
   * Disabled state for save button.
   *
   * **Disabled when:**
   * - Password is empty
   * - Passwords don't match
   */
  saveDisabled$: Queryable<DisabledState>;

  /**
   * Whether save is in progress.
   */
  isSaving$: Queryable<boolean>;

  /**
   * Cancel and close dialog.
   */
  cancel(): void;

  /**
   * Saves the new password.
   *
   * **On success:**
   * - Closes dialog
   * - Toast shows "Password updated for '{username}'"
   */
  save(): void;
}
