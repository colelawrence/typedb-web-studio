/**
 * Query Execution Helpers
 *
 * Extracted from scope.ts for better maintainability.
 * Contains query execution logic and result processing.
 */

import type { Store } from "@livestore/livestore";
import type { QueryResponse } from "../../services";
import { getService, detectQueryType } from "../../services";
import { events, type schema } from "../../livestore/schema";
import { connectionSession$ } from "../../livestore/queries";

/**
 * Creates an ID with the given prefix.
 */
export const createID = (prefix: string, nanoid: (size?: number) => string) =>
  `${prefix}_${nanoid(12)}`;

/**
 * Processes query response into display-friendly formats.
 */
export function processQueryResults(response: QueryResponse): {
  logLines: string[];
  tableColumns: string[];
  tableRows: string[];
  resultCount: number;
} {
  const logLines: string[] = [];
  const tableColumns: string[] = [];
  const tableRows: string[] = [];
  let resultCount = 0;

  logLines.push(`Query: ${response.query}`);
  logLines.push(`Transaction: ${response.transactionType}`);
  logLines.push(`Time: ${response.executionTimeMs}ms`);
  logLines.push("");

  switch (response.data.type) {
    case "match": {
      const answers = response.data.answers;
      resultCount = answers.length;
      logLines.push(`Results: ${resultCount} row${resultCount !== 1 ? "s" : ""}`);
      logLines.push("");

      // Extract columns from first result
      if (answers.length > 0) {
        const firstRow = answers[0];
        tableColumns.push(...Object.keys(firstRow));
      }

      // Format each row
      for (const answer of answers) {
        const row: Record<string, unknown> = {};
        for (const [key, concept] of Object.entries(answer)) {
          if (concept.value !== undefined) {
            row[key] = concept.value;
          } else if (concept.iid) {
            row[key] = `${concept.type}:${concept.iid.slice(0, 8)}`;
          } else {
            row[key] = concept.type;
          }
        }
        tableRows.push(JSON.stringify(row));
        logLines.push(JSON.stringify(row));
      }
      break;
    }

    case "fetch": {
      const documents = response.data.documents;
      resultCount = documents.length;
      logLines.push(`Results: ${resultCount} document${resultCount !== 1 ? "s" : ""}`);
      logLines.push("");

      // Extract columns from first document
      if (documents.length > 0) {
        tableColumns.push(...Object.keys(documents[0]));
      }

      // Format each document
      for (const doc of documents) {
        tableRows.push(JSON.stringify(doc));
        logLines.push(JSON.stringify(doc, null, 2));
      }
      break;
    }

    case "insert": {
      const inserted = response.data.inserted;
      resultCount = inserted.length;
      logLines.push(`Inserted: ${resultCount} concept${resultCount !== 1 ? "s" : ""}`);
      break;
    }

    case "delete": {
      resultCount = response.data.deletedCount;
      logLines.push(`Deleted: ${resultCount} concept${resultCount !== 1 ? "s" : ""}`);
      break;
    }

    case "define":
    case "undefine":
    case "redefine": {
      resultCount = response.data.success ? 1 : 0;
      logLines.push(response.data.success ? "Schema updated successfully" : "Schema update failed");
      break;
    }

    case "aggregate": {
      resultCount = 1;
      logLines.push(`Result: ${response.data.value}`);
      tableColumns.push("value");
      tableRows.push(JSON.stringify({ value: response.data.value }));
      break;
    }
  }

  return { logLines, tableColumns, tableRows, resultCount };
}

/**
 * Options for query execution.
 */
export interface ExecuteQueryOptions {
  store: Store<typeof schema>;
  showSnackbar: (type: "success" | "warning" | "error", message: string) => void;
  createHistoryId: () => string;
}

/**
 * Executes a query and updates the results state.
 * This is the core function that handles query execution, result processing,
 * and history recording.
 */
export async function executeQueryAndUpdateResults(
  queryText: string,
  options: ExecuteQueryOptions
): Promise<void> {
  const { store, showSnackbar, createHistoryId } = options;
  const session = store.query(connectionSession$);
  const database = session.activeDatabase;

  if (!database) {
    showSnackbar("error", "No database selected");
    return;
  }

  // Set running state
  store.commit(events.queryResultsSet({
    isRunning: true,
    query: queryText,
    errorMessage: null,
  }));

  const startTime = Date.now();

  try {
    const service = getService();
    const detection = detectQueryType(queryText);
    const response = await service.executeQuery(database, queryText, {
      transactionType: detection.transactionType,
    });

    // Process results and update state
    const { logLines, tableColumns, tableRows, resultCount } = processQueryResults(response);

    store.commit(events.queryResultsSet({
      isRunning: false,
      query: queryText,
      transactionType: response.transactionType,
      executionTimeMs: response.executionTimeMs,
      completedAt: Date.now(),
      errorMessage: null,
      resultType: response.data.type,
      resultCount,
      rawJson: JSON.stringify(response.data, null, 2),
      logLines,
      tableColumns,
      tableRows,
    }));

    // Add to history
    store.commit(events.historyEntryAdded({
      id: createHistoryId(),
      connectionId: session.savedConnectionId,
      databaseName: database,
      queryText,
      executedAt: new Date(),
      status: "success",
      durationMs: response.executionTimeMs,
      rowCount: resultCount,
      errorMessage: null,
    }));

    // Show success notification
    const typeLabel = response.data.type === "define" ? "Schema updated" :
                     response.data.type === "insert" ? "Data inserted" :
                     response.data.type === "delete" ? "Data deleted" :
                     `${resultCount} result${resultCount !== 1 ? "s" : ""}`;
    showSnackbar("success", `${typeLabel} (${response.executionTimeMs}ms)`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message :
                        (error as { message?: string })?.message || String(error);

    store.commit(events.queryResultsSet({
      isRunning: false,
      query: queryText,
      transactionType: null,
      executionTimeMs: Date.now() - startTime,
      completedAt: Date.now(),
      errorMessage,
      resultType: null,
      resultCount: null,
      rawJson: null,
      logLines: [`Error: ${errorMessage}`],
      tableColumns: [],
      tableRows: [],
    }));

    // Add failed entry to history
    store.commit(events.historyEntryAdded({
      id: createHistoryId(),
      connectionId: session.savedConnectionId,
      databaseName: database,
      queryText,
      executedAt: new Date(),
      status: "error",
      durationMs: Date.now() - startTime,
      rowCount: null,
      errorMessage,
    }));

    showSnackbar("error", `Query failed: ${errorMessage}`);
  }
}

/**
 * Formats a relative time string from a date.
 */
export function formatRelativeTime(date: Date | null): string {
  if (!date) return "Never used";
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Formats a folder title from a folder name.
 * e.g., "01-foundations" -> "Foundations"
 */
export function formatFolderTitle(folder: string): string {
  return folder
    .replace(/^\d+-/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
