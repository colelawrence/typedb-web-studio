/**
 * Unified query results display component.
 *
 * Handles all execution states (idle, running, success, error) with consistent
 * styling across:
 * - REPL results panel (mode="full")
 * - ExampleBlock in documentation (mode="compact")
 *
 * ```
 * Success:
 * ┌─────────────────────────────────────────────────┐
 * │ ✓ 5 results                              24ms   │
 * │ ┌─────────────────────────────────────────────┐ │
 * │ │ {"p": "person:123"}                         │ │
 * │ │ {"p": "person:456"}                         │ │
 * │ └─────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────┘
 *
 * Error:
 * ┌─────────────────────────────────────────────────┐
 * │ ⚠ Query failed                            12ms  │
 * │ ┌─────────────────────────────────────────────┐ │
 * │ │ Syntax error: unexpected token...           │ │
 * │ └─────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────┘
 * ```
 */

import { Loader2, Check, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  QueryResultDisplayVM,
  QueryResultStatus,
  QueryResultMetaVM,
  QueryResultContentVM,
} from "@/vm/query-results.vm";

export type QueryResultsDisplayMode = "compact" | "full";

export interface QueryResultsDisplayProps {
  /**
   * Display mode.
   * - compact: Smaller text, shorter max heights (for ExampleBlock)
   * - full: Larger text, more space for content (for REPL)
   */
  mode?: QueryResultsDisplayMode;

  /**
   * The result data to display.
   */
  result: QueryResultDisplayVM;

  /**
   * Additional CSS classes.
   */
  className?: string;
}

/**
 * Displays query execution results with appropriate styling for each state.
 */
export function QueryResultsDisplay({
  mode = "full",
  result,
  className,
}: QueryResultsDisplayProps) {
  const { status, meta, content, error } = result;

  if (status === "idle") {
    return null;
  }

  if (status === "running") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 border-t bg-muted/50 text-muted-foreground",
          mode === "compact" ? "px-3 py-2 text-dense-xs" : "px-3 py-2 text-xs",
          className
        )}
      >
        <Loader2 className="size-3.5 animate-spin" />
        <span>Running query...</span>
      </div>
    );
  }

  const isSuccess = status === "success";
  const isError = status === "error";
  const theme = getStatusTheme(status);

  return (
    <div className={cn("border-t", theme.container, className)}>
      {/* Header: status icon, message, timing */}
      <div
        className={cn(
          "flex items-center justify-between",
          mode === "compact" ? "px-3 py-2 text-dense-xs" : "px-3 py-2 text-xs"
        )}
      >
        <div className={cn("flex items-center gap-1.5", theme.headerText)}>
          {isSuccess && <Check className="size-3.5 shrink-0" />}
          {isError && <AlertCircle className="size-3.5 shrink-0" />}
          <span className="font-medium">{getHeaderText(status, meta)}</span>
        </div>

        {meta?.executionTimeMs != null && meta.executionTimeMs >= 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3" />
            <span>{formatExecutionTime(meta.executionTimeMs)}</span>
          </div>
        )}
      </div>

      {/* Body: error message or result content */}
      {isError && error?.message && (
        <div className={mode === "compact" ? "px-3 pb-2" : "px-3 pb-3"}>
          <pre
            className={cn(
              "whitespace-pre-wrap break-words font-mono rounded px-2 py-1.5",
              theme.bodyBg,
              theme.bodyText,
              mode === "compact" ? "text-dense-xs" : "text-xs"
            )}
          >
            {error.message}
          </pre>
        </div>
      )}

      {isSuccess && content && (
        <ResultContent mode={mode} content={content} theme={theme} />
      )}
    </div>
  );
}

/**
 * Renders the success result content.
 * Priority: logs > formattedRows > rawOutput > parsedRows
 */
function ResultContent({
  mode,
  content,
  theme,
}: {
  mode: QueryResultsDisplayMode;
  content: QueryResultContentVM;
  theme: StatusTheme;
}) {
  const hasLogs = content.logs && content.logs.length > 0;
  const hasFormattedRows =
    content.formattedRows && content.formattedRows.length > 0;
  const hasRawOutput = !!content.rawOutput;
  const hasParsedRows = content.parsedRows && content.parsedRows.length > 0;

  // Nothing to display
  if (!hasLogs && !hasFormattedRows && !hasRawOutput && !hasParsedRows) {
    return null;
  }

  const preClasses = cn(
    "whitespace-pre-wrap break-words font-mono rounded px-2 py-1.5 overflow-y-auto",
    theme.bodyBg,
    theme.bodyText,
    mode === "compact"
      ? "text-dense-xs max-h-48"
      : "text-xs max-h-64"
  );

  // Priority: logs first (most context), then formatted rows, then raw, then parsed
  let displayContent: string;

  if (hasLogs) {
    displayContent = content.logs!.join("\n");
  } else if (hasFormattedRows) {
    displayContent = content.formattedRows!.join("\n");
  } else if (hasRawOutput) {
    displayContent = content.rawOutput!;
  } else if (hasParsedRows) {
    // Fallback: stringify parsed rows
    displayContent = content
      .parsedRows!.map((row) => JSON.stringify(row))
      .join("\n");
  } else {
    return null;
  }

  return (
    <div className={mode === "compact" ? "px-3 pb-2" : "px-3 pb-3"}>
      <pre className={preClasses}>{displayContent}</pre>
    </div>
  );
}

/**
 * Generate header text based on status and metadata.
 */
function getHeaderText(
  status: QueryResultStatus,
  meta?: QueryResultMetaVM
): string {
  if (status === "error") {
    return "Query failed";
  }

  if (status === "success") {
    const count = meta?.resultCount;
    if (count == null || count === 0) {
      return "Query executed successfully";
    }
    return `${count} result${count === 1 ? "" : "s"}`;
  }

  return "";
}

/**
 * Format execution time for display.
 */
function formatExecutionTime(ms: number): string {
  if (ms < 1) {
    return "<1ms";
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

interface StatusTheme {
  container: string;
  headerText: string;
  bodyBg: string;
  bodyText: string;
}

/**
 * Get styling classes based on status.
 */
function getStatusTheme(status: QueryResultStatus): StatusTheme {
  if (status === "error") {
    return {
      container: "border-beacon-error/20 bg-beacon-error/5",
      headerText: "text-beacon-error",
      bodyBg: "bg-beacon-error/10",
      bodyText: "text-beacon-error/90",
    };
  }

  if (status === "success") {
    return {
      container: "border-beacon-ok/20 bg-beacon-ok/5",
      headerText: "text-beacon-ok",
      bodyBg: "bg-muted/30",
      bodyText: "text-foreground/80",
    };
  }

  // running/idle fallback
  return {
    container: "border-border bg-muted/20",
    headerText: "text-muted-foreground",
    bodyBg: "bg-muted/30",
    bodyText: "text-foreground/80",
  };
}
