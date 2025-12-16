/**
 * Adapters for converting domain-specific result types to QueryResultDisplayVM.
 *
 * These adapters bridge between domain VMs and the shared display model,
 * keeping domain types unchanged while enabling unified rendering.
 */

import type {
  ExampleExecutionState,
  ExampleRunResultVM,
} from "./learn/document-viewer.vm";
import type {
  QueryResultDisplayVM,
  QueryResultStatus,
} from "./query-results.vm";

/**
 * Converts ExampleBlock execution state and result to the unified display VM.
 */
export function mapExampleResultToDisplayVM(
  state: ExampleExecutionState,
  result: ExampleRunResultVM | null
): QueryResultDisplayVM {
  const status: QueryResultStatus =
    state.type === "running"
      ? "running"
      : state.type === "idle"
        ? "idle"
        : state.type === "success"
          ? "success"
          : "error";

  if (status === "idle" || status === "running") {
    return { status };
  }

  if (!result) {
    return { status };
  }

  return {
    status,
    meta: {
      executionTimeMs: result.executionTimeMs,
      resultCount: result.resultCount,
    },
    content: {
      logs: result.logLines,
      formattedRows: result.resultRows,
    },
    error:
      status === "error" && result.error
        ? { message: result.error }
        : undefined,
  };
}
