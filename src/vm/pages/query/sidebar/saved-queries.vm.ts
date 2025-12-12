/**
 * Saved queries tree view model.
 *
 * Hierarchical tree of folders and queries.
 * Supports context menus, drag-drop, and search filtering.
 */

import type { Queryable, IconComponent, ContextMenuActionVM } from "../../../types";

/**
 * Saved queries tree VM.
 *
 * **Structure:**
 * - Root level contains folders and "Unsorted" special folder
 * - Folders can contain queries and subfolders (unlimited nesting)
 * - Queries are leaf nodes
 */
export interface SavedQueriesTreeVM {
  /**
   * Root-level tree items.
   *
   * **Order:**
   * 1. "Unsorted" folder (if has queries without parent)
   * 2. User folders (alphabetically sorted)
   *
   * **Empty state:**
   * - Message: "No saved queries yet"
   * - Call-to-action: "Save your first query using Cmd+S"
   */
  items$: Queryable<SavedQueryTreeItemVM[]>;

  /**
   * Whether the tree is empty (no saved queries at all).
   */
  isEmpty$: Queryable<boolean>;

  /**
   * Search/filter functionality.
   */
  search: {
    /**
     * Current search text.
     * Empty string means no filter active.
     */
    text$: Queryable<string>;

    /**
     * Updates search filter with debounce.
     *
     * **Behavior (200ms debounce):**
     * - Filters queries by name AND query text content
     * - Folders shown if they contain matching queries
     * - Matching folders auto-expand to reveal results
     * - Highlights matching text in results
     */
    update(text: string): void;

    /**
     * Clears search and restores original tree state.
     */
    clear(): void;

    /**
     * Whether search is active.
     */
    isActive$: Queryable<boolean>;

    /**
     * Number of matching queries.
     * Shown as "N results" when search is active.
     */
    resultCount$: Queryable<number>;
  };

  /**
   * Creates a new folder at root level.
   * Opens inline rename UI for the new folder.
   */
  createFolder(): void;

  /**
   * Creates a new query at root level.
   * Opens save dialog with empty name field.
   */
  createQuery(): void;

  /**
   * Exports all queries as JSON file download.
   *
   * **File format:**
   * ```json
   * {
   *   "version": "1.0",
   *   "exportedAt": "2024-01-15T10:30:00Z",
   *   "folders": [...],
   *   "queries": [...]
   * }
   * ```
   */
  exportAll(): void;

  /**
   * Opens import dialog for JSON file.
   *
   * **Import strategies:**
   * - Merge: Add new, update existing by ID
   * - Replace: Clear all, import fresh
   * - Skip: Add new only, ignore existing
   */
  openImportDialog(): void;
}

/**
 * Individual item in the saved queries tree.
 */
export interface SavedQueryTreeItemVM {
  /**
   * Unique key for React rendering.
   * Format: folder ID or query ID.
   */
  key: string;

  /**
   * Item type for icon and behavior selection.
   *
   * **Types:**
   * - `"folder"`: User-created folder
   * - `"query"`: Saved query
   * - `"unsorted"`: Special folder for queries without parent (cannot be renamed/deleted)
   */
  type: "folder" | "query" | "unsorted";

  /**
   * Display name.
   */
  label: string;

  /**
   * Icon component based on type and state.
   *
   * **Icon mapping:**
   * - unsorted: InboxIcon
   * - folder (collapsed): FolderIcon
   * - folder (expanded): FolderOpenIcon
   * - query: FileCodeIcon
   */
  icon$: Queryable<IconComponent>;

  /**
   * Nesting level for indentation.
   * 0 = root level, each level adds 16-24px indent.
   */
  level: number;

  /**
   * Whether this folder is expanded (children visible).
   * `null` for query items (not expandable).
   */
  expanded$: Queryable<boolean | null>;

  /**
   * Toggles expansion state.
   * No-op for query items.
   *
   * **Animation:** Smooth height transition (150ms).
   * **Keyboard:** Arrow Right expands, Arrow Left collapses.
   */
  toggleExpanded(): void;

  /**
   * Whether this item has children.
   * Used to show expand/collapse chevron.
   */
  hasChildren$: Queryable<boolean>;

  /**
   * Child items (subfolders and queries).
   * Empty array for query items or empty folders.
   */
  children$: Queryable<SavedQueryTreeItemVM[]>;

  /**
   * Whether this query is currently loaded in the editor.
   * Used for visual highlight (e.g., bold text, background color).
   * Always false for folders.
   */
  isSelected$: Queryable<boolean>;

  /**
   * Whether this item is being renamed (inline edit mode).
   */
  isRenaming$: Queryable<boolean>;

  /**
   * Loads this query into the editor.
   * Only applicable to query type items.
   *
   * **Behavior:**
   * - Sets editor content to query text
   * - Switches to "editing saved query" mode
   * - Updates header to show query name
   * - Does NOT prompt about unsaved changes (VS Code-style behavior)
   *
   * No-op for folder items (folders don't load, they expand/collapse).
   */
  select(): void;

  /**
   * Opens context menu at the specified position.
   *
   * **Trigger:**
   * - Right-click (desktop)
   * - Long-press (touch)
   * - Context menu key (keyboard)
   */
  openContextMenu(position: { x: number; y: number }): void;

  /**
   * Context menu for this item.
   */
  contextMenu: SavedQueryContextMenuVM;

  /**
   * Drag-and-drop support.
   */
  dragDrop: {
    /**
     * Whether this item is currently being dragged.
     */
    isDragging$: Queryable<boolean>;

    /**
     * Whether this item is a valid drop target.
     * Folders are valid targets; queries are not.
     */
    isDropTarget$: Queryable<boolean>;

    /**
     * Whether something is currently hovering over this item.
     */
    isDragOver$: Queryable<boolean>;

    /**
     * Initiates drag operation.
     */
    onDragStart(): void;

    /**
     * Handles drag entering this item's area.
     */
    onDragEnter(): void;

    /**
     * Handles drag leaving this item's area.
     */
    onDragLeave(): void;

    /**
     * Handles drop on this item.
     * Moves dragged item into this folder.
     */
    onDrop(): void;
  };
}

/**
 * Context menu for saved query tree items.
 */
export interface SavedQueryContextMenuVM {
  /**
   * Whether the context menu is currently open.
   */
  isOpen$: Queryable<boolean>;

  /**
   * Menu position (screen coordinates).
   */
  position$: Queryable<{ x: number; y: number }>;

  /**
   * Available actions based on item type.
   *
   * **Folder actions:**
   * - New Query (creates query in this folder)
   * - New Folder (creates subfolder)
   * - Rename
   * - Move to...
   * - Export
   * - Share (copies URL)
   * - Delete (cascades to children)
   *
   * **Query actions:**
   * - Run
   * - Rename
   * - Move to...
   * - Duplicate (creates copy with " (Copy)" suffix)
   * - Export
   * - Share (copies URL)
   * - Delete
   *
   * **Unsorted folder actions:**
   * - New Query
   * - Organize All (moves all to named folder)
   */
  actions$: Queryable<ContextMenuActionVM[]>;

  /**
   * Closes the context menu.
   * Called on click outside, Escape key, or action execution.
   */
  close(): void;
}
