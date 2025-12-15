/**
 * Learn sidebar view model.
 *
 * Contains the curriculum navigation tree, reference section, and search.
 * The sidebar shows progress indicators and supports local search.
 *
 * **Layout:**
 * ```
 * ┌──────────────────────┐
 * │ [🔍 Search...]       │ ← search input
 * ├──────────────────────┤
 * │                      │
 * │ ▼ LEARN           75%│ ← curriculum section with progress
 * │   ▶ Foundations   100%│
 * │     ✓ First Queries  │
 * │     ○ Variables      │
 * │   ▶ Querying      50%│
 * │                      │
 * │ ▼ REFERENCE          │ ← reference docs section
 * │   ▶ Keywords         │
 * │   ▶ Types            │
 * │                      │
 * └──────────────────────┘
 * ```
 *
 * **When searching:**
 * ```
 * ┌──────────────────────┐
 * │ [🔍 match      ] [×] │ ← search with clear button
 * ├──────────────────────┤
 * │ LEARN                │
 * │   First Queries      │ ← matching section
 * │   Variables          │
 * │ EXAMPLES             │
 * │   match $p isa per...│ ← matching example
 * │ REFERENCE            │
 * │   match keyword      │
 * └──────────────────────┘
 * ```
 */

import type { Queryable } from "../types";

/**
 * Learn sidebar VM.
 *
 * Provides curriculum navigation, reference docs, and search functionality.
 */
export interface LearnSidebarVM {
  /**
   * Current sidebar width in pixels.
   *
   * **Constraints:**
   * - Minimum: 200px
   * - Maximum: 400px
   * - Default: 280px
   *
   * **Persistence:** Width is saved to localStorage.
   */
  width$: Queryable<number>;

  /**
   * Updates the sidebar width during drag resize.
   */
  setWidth(width: number): void;

  /**
   * Search input VM for filtering sidebar content.
   */
  search: LearnSearchVM;

  /**
   * Current view state - either navigation tree or search results.
   * Changes based on whether search query is active.
   */
  view$: Queryable<LearnSidebarViewState>;

  /**
   * Curriculum (Learn) section containing lesson navigation.
   */
  learnSection: LearnSectionVM;

  /**
   * Reference documentation section.
   */
  referenceSection: ReferenceSectionVM;
}

/**
 * Discriminated union of sidebar view states.
 */
export type LearnSidebarViewState =
  | { type: "navigation" }
  | { type: "search"; results: LearnSearchResultsVM };

/**
 * Search input VM for the learn sidebar.
 */
export interface LearnSearchVM {
  /**
   * Current search query.
   */
  query$: Queryable<string>;

  /**
   * Updates the search query.
   * Triggers search results update.
   */
  setQuery(query: string): void;

  /**
   * Clears the search query and returns to navigation view.
   */
  clear(): void;

  /**
   * Placeholder text for the search input.
   */
  placeholder: string;

  /**
   * Whether search is currently active (query is non-empty).
   */
  isActive$: Queryable<boolean>;
}

/**
 * Search results view model.
 */
export interface LearnSearchResultsVM {
  /**
   * Grouped search results.
   */
  groups$: Queryable<LearnSearchResultGroupVM[]>;

  /**
   * Total number of results across all groups.
   */
  totalCount$: Queryable<number>;

  /**
   * Whether there are no results for the current query.
   */
  isEmpty$: Queryable<boolean>;
}

/**
 * A group of search results (e.g., "Learn", "Examples", "Reference").
 */
export interface LearnSearchResultGroupVM {
  /**
   * Unique key for the group.
   */
  key: string;

  /**
   * Display label for the group header.
   */
  label: string;

  /**
   * Results in this group.
   */
  items: LearnSearchResultItemVM[];
}

/**
 * Individual search result item.
 */
export interface LearnSearchResultItemVM {
  /**
   * Unique key for React list rendering.
   */
  key: string;

  /**
   * Result type for styling/icons.
   */
  type: "learn" | "example" | "reference";

  /**
   * Display title (may contain highlighting).
   */
  title: string;

  /**
   * Optional breadcrumb path (e.g., "Foundations > First Queries").
   */
  breadcrumb: string | null;

  /**
   * Preview text snippet (for examples, shows query text).
   */
  preview: string | null;

  /**
   * Navigate to this result.
   */
  select(): void;
}

/**
 * Curriculum (Learn) section VM.
 */
export interface LearnSectionVM {
  /**
   * Section header label.
   * Fixed: "LEARN"
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
   * Overall progress percentage (0-100).
   */
  progressPercent$: Queryable<number>;

  /**
   * Progress display text (e.g., "75%").
   */
  progressDisplay$: Queryable<string>;

  /**
   * Curriculum folder tree.
   */
  folders$: Queryable<LearnFolderVM[]>;
}

/**
 * A folder in the curriculum tree (e.g., "Foundations", "Querying").
 */
export interface LearnFolderVM {
  /**
   * Unique key for the folder.
   */
  key: string;

  /**
   * Display label.
   */
  label: string;

  /**
   * Whether this folder is expanded.
   */
  expanded$: Queryable<boolean>;

  /**
   * Toggles expanded state.
   */
  toggleExpanded(): void;

  /**
   * Progress percentage for this folder (0-100).
   */
  progressPercent$: Queryable<number>;

  /**
   * Progress state for icon display.
   */
  progressState$: Queryable<ProgressState>;

  /**
   * Sections within this folder.
   */
  sections$: Queryable<LearnSectionItemVM[]>;
}

/**
 * Progress state for visual indicators.
 */
export type ProgressState =
  | "not-started"  // ○ - No sections read
  | "in-progress"  // ◐ - Some sections read
  | "completed";   // ✓ - All sections read

/**
 * A section/lesson item in the curriculum tree.
 */
export interface LearnSectionItemVM {
  /**
   * Unique key (section ID).
   */
  key: string;

  /**
   * Display title.
   */
  title: string;

  /**
   * Whether this section is currently active/selected.
   */
  isActive$: Queryable<boolean>;

  /**
   * Progress state for this section.
   */
  progressState$: Queryable<ProgressState>;

  /**
   * Navigate to this section.
   */
  select(): void;

  /**
   * Context name if section requires specific context.
   */
  context: string | null;
}

/**
 * Reference documentation section VM.
 */
export interface ReferenceSectionVM {
  /**
   * Section header label.
   * Fixed: "REFERENCE"
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
   * Reference folder tree.
   */
  folders$: Queryable<ReferenceFolderVM[]>;
}

/**
 * A folder in the reference tree (e.g., "Keywords", "Types").
 */
export interface ReferenceFolderVM {
  /**
   * Unique key for the folder.
   */
  key: string;

  /**
   * Display label.
   */
  label: string;

  /**
   * Whether this folder is expanded.
   */
  expanded$: Queryable<boolean>;

  /**
   * Toggles expanded state.
   */
  toggleExpanded(): void;

  /**
   * Items within this folder.
   */
  items$: Queryable<ReferenceItemVM[]>;
}

/**
 * A reference documentation item.
 */
export interface ReferenceItemVM {
  /**
   * Unique key (entry ID).
   */
  key: string;

  /**
   * Display title.
   */
  title: string;

  /**
   * Whether this item is currently active/selected.
   */
  isActive$: Queryable<boolean>;

  /**
   * Navigate to this reference item.
   */
  select(): void;
}
