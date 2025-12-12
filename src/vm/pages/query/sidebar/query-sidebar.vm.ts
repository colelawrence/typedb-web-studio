/**
 * Query page sidebar view model.
 *
 * Contains the schema tree and saved queries sections.
 * Both sections are independently collapsible.
 */

import type { Queryable } from "../../../types";
import type { SchemaTreeVM } from "../../../shared/schema-tree.vm";
import type { SavedQueriesTreeVM } from "./saved-queries.vm";

/**
 * Query sidebar VM.
 *
 * **Layout:**
 * ```
 * ┌──────────────────┐
 * │ Schema        [−]│ ← collapse toggle
 * ├──────────────────┤
 * │ [View mode ▼]    │ ← flat/hierarchical
 * │ [sub][owns]...   │ ← link visibility toggles
 * │                  │
 * │ ▶ Entities (12)  │
 * │ ▶ Relations (5)  │
 * │ ▶ Attributes (8) │
 * ├──────────────────┤
 * │ Queries       [−]│ ← collapse toggle
 * ├──────────────────┤
 * │ [🔍 Search]      │
 * │                  │
 * │ 📁 My Queries    │
 * │   📄 Query 1     │
 * │   📄 Query 2     │
 * │ 📁 Shared        │
 * └──────────────────┘
 *        ║
 *     resize handle
 * ```
 */
export interface QuerySidebarVM {
  /**
   * Current sidebar width in pixels.
   *
   * **Constraints:**
   * - Minimum: 200px
   * - Maximum: 50% of viewport width
   * - Default: 280px
   *
   * **Persistence:** Width is saved to localStorage.
   */
  width$: Queryable<number>;

  /**
   * Updates the sidebar width during drag resize.
   *
   * **Behavior:**
   * - Clamps to min/max constraints
   * - Saves to localStorage on drag end (debounced)
   */
  setWidth(width: number): void;

  /**
   * Schema section containing database schema tree.
   */
  schemaSection: QuerySidebarSchemaSectionVM;

  /**
   * Saved queries section containing query tree.
   */
  savedQueriesSection: QuerySidebarSavedQueriesSectionVM;

  /**
   * Optional URL imports section.
   * Shown only when queries have been imported via URL hash.
   */
  urlImportsSection$: Queryable<QuerySidebarUrlImportsSectionVM | null>;
}

/**
 * Schema section in the query sidebar.
 */
export interface QuerySidebarSchemaSectionVM {
  /**
   * Section header label.
   * Fixed: "Schema"
   */
  label: string;

  /**
   * Whether this section is collapsed.
   *
   * **Collapsed state:** Only header visible, tree hidden.
   * **Persistence:** Collapse state saved to localStorage.
   */
  collapsed$: Queryable<boolean>;

  /**
   * Toggles collapsed state.
   *
   * **Animation:** Smooth height transition (150ms).
   * **Keyboard:** Enter/Space toggles when header is focused.
   */
  toggleCollapsed(): void;

  /**
   * Current view mode for the schema tree.
   *
   * **Modes:**
   * - `"flat"`: All types at same level, alphabetically sorted
   * - `"hierarchical"`: Types nested under their supertypes
   *
   * **Default:** "flat"
   */
  viewMode$: Queryable<"flat" | "hierarchical">;

  /**
   * Changes the view mode.
   * Preserves expansion state where possible.
   */
  setViewMode(mode: "flat" | "hierarchical"): void;

  /**
   * Link visibility toggles.
   * Control which relationship lines are shown in the tree/graph.
   */
  linksVisibility: {
    /** Show subtype relationships */
    sub$: Queryable<boolean>;
    toggleSub(): void;

    /** Show ownership relationships (entity/relation owns attribute) */
    owns$: Queryable<boolean>;
    toggleOwns(): void;

    /** Show role playing relationships */
    plays$: Queryable<boolean>;
    togglePlays(): void;

    /** Show relation role relationships */
    relates$: Queryable<boolean>;
    toggleRelates(): void;
  };

  /**
   * Schema tree displaying database types.
   */
  tree: SchemaTreeVM;
}

/**
 * Saved queries section in the query sidebar.
 */
export interface QuerySidebarSavedQueriesSectionVM {
  /**
   * Section header label.
   * Fixed: "Saved Queries"
   */
  label: string;

  /**
   * Whether this section is collapsed.
   */
  collapsed$: Queryable<boolean>;

  /**
   * Toggles collapsed state.
   */
  toggleCollapsed(): void;

  /**
   * Saved queries tree.
   */
  tree: SavedQueriesTreeVM;
}

/**
 * URL imports section (shown when queries imported via URL).
 */
export interface QuerySidebarUrlImportsSectionVM {
  /**
   * Display name for the imported set.
   * From the import file's `importName` field, or "URL Import" if not specified.
   */
  displayName$: Queryable<string>;

  /**
   * Whether this section is collapsed.
   */
  collapsed$: Queryable<boolean>;

  /**
   * Toggles collapsed state.
   */
  toggleCollapsed(): void;

  /**
   * Imported queries/folders tree.
   * Same structure as saved queries but read-only until saved.
   */
  tree: SavedQueriesTreeVM;

  /**
   * Saves all imported queries to user's saved queries.
   *
   * **Flow:**
   * 1. Opens folder selection dialog
   * 2. Copies all queries/folders to selected destination
   * 3. Removes URL imports section
   * 4. Shows toast "Imported {n} queries"
   */
  saveAllToLocal(): void;

  /**
   * Dismisses the URL imports without saving.
   *
   * **Behavior:**
   * - Removes section from sidebar
   * - Clears URL hash from browser
   * - No confirmation (imports are still in the URL if user navigates back)
   */
  dismiss(): void;
}

// Re-export
export type { SavedQueriesTreeVM } from "./saved-queries.vm";
