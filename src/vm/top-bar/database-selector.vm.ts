/**
 * Database selector dropdown view model.
 *
 * Allows switching between databases on the connected server.
 * Only visible when connected to a TypeDB server.
 */

import type { Queryable } from "../types";
import type { DisabledState } from "../types";

/**
 * Database selector VM.
 *
 * **Visual states:**
 * - Hidden: When not connected to any server
 * - Enabled: Can click to open dropdown, select different database
 * - Disabled: Connected but cannot switch (query running, uncommitted changes)
 */
export interface DatabaseSelectorVM {
  /**
   * Whether the selector should be visible.
   * Only visible when connection status is "connected" or "reconnecting".
   */
  visible$: Queryable<boolean>;

  /**
   * Display text for the selector button.
   *
   * **Format:**
   * - When database selected: Database name (e.g., "my_database")
   * - When no database selected: "Select database..."
   *
   * **Styling:** Placeholder text should be muted/italic.
   */
  displayText$: Queryable<string>;

  /**
   * Whether a database is currently selected.
   * Used to determine if placeholder styling should apply.
   */
  hasSelection$: Queryable<boolean>;

  /**
   * Whether the dropdown is currently open.
   */
  isOpen$: Queryable<boolean>;

  /**
   * Opens or closes the dropdown.
   *
   * **Keyboard:** Enter/Space toggles when button is focused.
   * **Click outside:** Closes dropdown.
   * **Escape:** Closes dropdown.
   */
  toggle(): void;

  /**
   * Closes the dropdown without making a selection.
   */
  close(): void;

  /**
   * Disabled state with reason.
   *
   * **Disabled conditions:**
   * - "Query in progress" - Cannot switch databases while a query is running
   * - "Uncommitted changes" - Cannot switch with uncommitted transaction changes
   *
   * **Visual:** Button appears grayed out, shows tooltip on hover.
   */
  disabled$: Queryable<DisabledState>;

  /**
   * Available databases for selection.
   *
   * **Loading state:** While fetching, show skeleton items or "Loading..." text.
   * **Empty state:** If server has no databases, show message and create button.
   * **Sort order:** Alphabetically sorted by name, case-insensitive.
   */
  databases$: Queryable<DatabaseOptionVM[]>;

  /**
   * Databases grouped by type for sectioned display.
   * Lesson databases (learn_*) are shown separately from regular databases.
   */
  groupedDatabases$: Queryable<GroupedDatabasesVM>;

  /**
   * Opens the create database dialog.
   *
   * **Dialog flow:**
   * 1. Enter database name
   * 2. Validate (alphanumeric + underscore, no leading numbers, unique)
   * 3. Create on server
   * 4. Auto-select new database
   * 5. Show success toast
   */
  createNew(): void;

  /**
   * Refreshes the database list from the server.
   * Shows brief loading state in dropdown.
   * Does not change current selection.
   */
  refresh(): void;
}

/**
 * Individual database option in the dropdown.
 */
export interface DatabaseOptionVM {
  /** Unique key (database name) */
  key: string;

  /** Display name for the database */
  label: string;

  /**
   * Whether this is a lesson database (name starts with "learn_").
   */
  isLessonDatabase: boolean;

  /**
   * Context name for lesson databases (e.g., "S1" from "learn_S1").
   * Null for non-lesson databases.
   */
  lessonContextName: string | null;

  /**
   * Whether this is a demo database (name starts with "demo_").
   */
  isDemoDatabase: boolean;

  /**
   * Demo ID for demo databases (e.g., "social-network" from "demo_social_network").
   * Null for non-demo databases.
   */
  demoId: string | null;

  /**
   * Demo definition for demo databases.
   * Provides access to demo name, description, and example queries.
   * Null for non-demo databases.
   */
  demo: import("../../demos").DemoDefinition | null;

  /**
   * Whether this database is currently selected.
   * Visual: Checkmark icon or highlighted background.
   */
  isSelected$: Queryable<boolean>;

  /**
   * Selects this database and closes the dropdown.
   *
   * **Side effects:**
   * - Updates current database in connection state
   * - Clears cached schema for previous database
   * - Shows toast "Now using database '{name}'"
   * - Refreshes schema in sidebar (if on query/schema page)
   */
  select(): void;

  /**
   * Opens delete confirmation for this database.
   * Requires strong confirmation (type database name).
   *
   * **Post-delete:**
   * - If this was selected, selection is cleared
   * - Database list refreshes
   * - Toast shows "Database '{name}' deleted"
   */
  openDeleteDialog(): void;
}

/**
 * Databases grouped by type for display.
 */
export interface GroupedDatabasesVM {
  /** Regular user databases (not lesson or demo) */
  regularDatabases: DatabaseOptionVM[];
  /** Lesson databases (learn_* pattern) */
  lessonDatabases: DatabaseOptionVM[];
  /** Demo databases (demo_* pattern) */
  demoDatabases: DatabaseOptionVM[];
}
