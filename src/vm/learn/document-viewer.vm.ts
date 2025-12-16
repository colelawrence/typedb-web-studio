/**
 * Document viewer view model.
 *
 * Displays curriculum content with interactive code blocks and progress tracking.
 * The viewer shows markdown content rendered with styled components, and
 * code blocks have "Copy to REPL" and "Run" buttons for interactivity.
 *
 * **Layout:**
 * ```
 * ┌────────────────────────────────────────────────┐
 * │ Your First Queries                         [×] │ ← header with close
 * ├────────────────────────────────────────────────┤
 * │                                                │
 * │ # Your First Queries              [✓ Mark]    │ ← heading with checkmark
 * │                                                │
 * │ The `match` clause finds data...              │
 * │                                                │
 * │ ┌──────────────────────────────────────────┐  │
 * │ │ match $p isa person;        [→REPL] [▶]  │  │ ← example block
 * │ └──────────────────────────────────────────┘  │
 * │                                                │
 * │ ## Variables                      [✓ Mark]    │
 * │                                                │
 * │ Variables in TypeQL start with `$`...         │
 * │                                                │
 * └────────────────────────────────────────────────┘
 * ```
 *
 * **Collapsed state:**
 * When collapsed, only shows the header bar which can be clicked to expand.
 */

import type { Queryable } from "../types";

/**
 * Document viewer VM.
 *
 * Main interface for displaying curriculum content with interactivity.
 */
export interface DocumentViewerVM {
  /**
   * Whether the document viewer is visible.
   * When false, only shows a collapsed header or is completely hidden.
   */
  isVisible$: Queryable<boolean>;

  /**
   * Shows the document viewer.
   */
  show(): void;

  /**
   * Hides the document viewer (collapses the pane).
   */
  hide(): void;

  /**
   * Toggles visibility.
   */
  toggle(): void;

  /**
   * Currently loaded section, or null if none is selected.
   */
  currentSection$: Queryable<DocumentSectionVM | null>;

  /**
   * Opens a specific section by ID.
   * Loads the section content and makes it visible.
   */
  openSection(sectionId: string): void;

  /**
   * Closes the current section (returns to no section selected).
   */
  closeSection(): void;

  /**
   * Loading state while fetching section content.
   */
  isLoading$: Queryable<boolean>;

  /**
   * Error state if section failed to load.
   */
  error$: Queryable<string | null>;

  /**
   * Context switch prompt VM.
   * Shows when the current database context doesn't match the section's required context.
   */
  contextSwitchPrompt: ContextSwitchPromptVM;
}

/**
 * A loaded document section with all its content and interactivity.
 */
export interface DocumentSectionVM {
  /**
   * Section ID.
   */
  id: string;

  /**
   * Section title.
   */
  title: string;

  /**
   * Context this section requires (e.g., "social-network"), or null if none.
   */
  context: string | null;

  /**
   * Prerequisite section IDs.
   */
  requires: readonly string[];

  /**
   * Ordered content blocks in display order.
   * Contains headings, examples, and prose blocks ready for rendering.
   */
  contentBlocks: DocumentSectionContentBlockVM[];

  /**
   * All headings in the document (for TOC, navigation).
   */
  headings: DocumentHeadingVM[];

  /**
   * All examples in the document (for progress tracking).
   */
  examples: DocumentExampleVM[];

  /**
   * Overall read progress for this section.
   * Based on how many headings have been marked as read.
   */
  progress$: Queryable<DocumentProgressVM>;

  /**
   * Marks the entire section as read.
   */
  markAllRead(): void;

  /**
   * Marks the entire section as unread.
   */
  markAllUnread(): void;
}

/**
 * Progress information for a document section.
 */
export interface DocumentProgressVM {
  /**
   * Number of headings marked as read.
   */
  readCount: number;

  /**
   * Total number of headings.
   */
  totalCount: number;

  /**
   * Progress percentage (0-100).
   */
  percent: number;

  /**
   * Whether all headings are read.
   */
  isComplete: boolean;
}

/**
 * A heading within a document section.
 */
export interface DocumentHeadingVM {
  /**
   * Heading ID (slugified text).
   */
  id: string;

  /**
   * Heading text.
   */
  text: string;

  /**
   * Heading level (1-6).
   */
  level: number;

  /**
   * Source line number (for scrolling).
   */
  lineNumber: number;

  /**
   * Whether this heading has been marked as read.
   */
  isRead$: Queryable<boolean>;

  /**
   * Marks this heading as read.
   */
  markRead(): void;

  /**
   * Marks this heading as unread.
   */
  markUnread(): void;

  /**
   * Toggles read state.
   */
  toggleRead(): void;
}

/**
 * An interactive example code block within a document.
 */
export interface DocumentExampleVM {
  /**
   * Example ID.
   */
  id: string;

  /**
   * Example type.
   * - example: Runnable query that should succeed
   * - invalid: Demonstrates wrong syntax (should fail)
   * - schema: Schema definition
   * - readonly: Display only, not interactive
   */
  type: "example" | "invalid" | "schema" | "readonly";

  /**
   * The TypeQL query code.
   */
  query: string;

  /**
   * Expected results configuration.
   */
  expect: {
    results?: boolean;
    min?: number;
    max?: number;
    error?: string;
  } | null;

  /**
   * Source file for error reporting.
   */
  sourceFile: string;

  /**
   * Line number in source file.
   */
  lineNumber: number;

  /**
   * Whether this is an interactive example (can run/copy).
   */
  isInteractive: boolean;

  /**
   * Whether the example has been executed by the user.
   */
  wasExecuted$: Queryable<boolean>;

  /**
   * Copies the query to the REPL editor without running.
   */
  copyToRepl(): void;

  /**
   * Runs the query. Updates currentResult$ when complete.
   */
  run(): Promise<void>;

  /**
   * Current execution state.
   */
  executionState$: Queryable<ExampleExecutionState>;

  /**
   * Result of the last run, or null if not yet executed.
   */
  currentResult$: Queryable<ExampleRunResultVM | null>;
}

/**
 * Execution state for an example.
 */
export type ExampleExecutionState =
  | { type: "idle" }
  | { type: "running" }
  | { type: "success"; resultCount: number }
  | { type: "error"; message: string };

/**
 * Result of running an example.
 */
export interface ExampleRunResultVM {
  /**
   * Whether execution succeeded.
   */
  success: boolean;

  /**
   * Number of results returned (for match queries).
   */
  resultCount?: number;

  /**
   * Error message if failed.
   */
  error?: string;

  /**
   * Execution time in milliseconds.
   */
  executionTimeMs: number;
}

/**
 * A content block within a document section.
 *
 * Represents a single renderable unit in display order:
 * - heading: A section heading with progress tracking
 * - example: An interactive code example
 * - prose: Markdown text content
 */
export type DocumentSectionContentBlockVM =
  | { kind: "heading"; heading: DocumentHeadingVM }
  | { kind: "example"; example: DocumentExampleVM }
  | { kind: "prose"; content: string };

/**
 * Context switch prompt VM.
 *
 * Shown when the current database context doesn't match the section's required context.
 */
export interface ContextSwitchPromptVM {
  /**
   * Whether the prompt should be visible.
   */
  isVisible$: Queryable<boolean>;

  /**
   * Current context name (or null if none).
   */
  currentContext$: Queryable<string | null>;

  /**
   * Required context for the current section.
   */
  requiredContext$: Queryable<string | null>;

  /**
   * Switches to the required context.
   */
  switchContext(): Promise<void>;

  /**
   * Dismisses the prompt without switching.
   */
  dismiss(): void;
}
