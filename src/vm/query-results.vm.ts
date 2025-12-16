/**
 * Shared query results view model.
 *
 * Unified presentation model for displaying query results across:
 * - REPL results panel (full mode)
 * - ExampleBlock in documentation (compact mode)
 *
 * Separates three content channels:
 * - logs: Human-readable status lines
 * - rawOutput: Direct string output from query execution
 * - parsedRows: Structured data for tables/grids
 */

/**
 * High-level execution status.
 */
export type QueryResultStatus = "idle" | "running" | "success" | "error";

/**
 * Metadata about query execution.
 */
export interface QueryResultMetaVM {
  /**
   * Execution time in milliseconds.
   */
  executionTimeMs?: number;

  /**
   * Number of result rows returned.
   */
  resultCount?: number;

  /**
   * Short description of what ran (e.g., "Query: match ...; Transaction: read").
   */
  summaryLine?: string;
}

/**
 * Content channels for query results.
 * All are optional and orthogonal - display logic chooses which to show.
 */
export interface QueryResultContentVM {
  /**
   * Human-readable log lines (e.g., "Query: ...", "Transaction: read").
   */
  logs?: string[];

  /**
   * Raw string output from the engine.
   */
  rawOutput?: string;

  /**
   * Parsed results as structured objects for table/grid display.
   */
  parsedRows?: Record<string, unknown>[];

  /**
   * Pre-formatted strings for parsed rows (fallback/compact view).
   * Each entry is a JSON-stringified row.
   */
  formattedRows?: string[];
}

/**
 * Error details for failed queries.
 */
export interface QueryResultErrorVM {
  /**
   * Error message.
   */
  message: string;

  /**
   * Optional error code.
   */
  code?: string;

  /**
   * Additional error details.
   */
  details?: unknown;
}

/**
 * Unified view model for displaying query results.
 *
 * Presentation-oriented and decoupled from engine APIs.
 * Use adapters to convert domain-specific result types to this shape.
 */
export interface QueryResultDisplayVM {
  /**
   * Current execution status.
   */
  status: QueryResultStatus;

  /**
   * Execution metadata (timing, counts).
   */
  meta?: QueryResultMetaVM;

  /**
   * Result content (logs, raw output, parsed rows).
   */
  content?: QueryResultContentVM;

  /**
   * Error details if status is "error".
   */
  error?: QueryResultErrorVM;
}
