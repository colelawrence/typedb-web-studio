/**
 * VM Test Helpers
 *
 * Utilities for testing View Models at the app level.
 * These enable "headless UI tests" that drive the app purely through VM methods.
 */

import type { Queryable } from "../vm/types";
import type { TypeDBStudioAppVM, CurrentPageState } from "../vm/app.vm";
import type { LearnPageVM } from "../vm/pages/learn/learn-page.vm";
import type { ConnectPageVM } from "../vm/pages/connect/connect-page.vm";
import type {
  DocumentSectionVM,
  DocumentExampleVM,
  ExampleExecutionState,
} from "../vm/learn/document-viewer.vm";

/**
 * Type-safe query function wrapper.
 */
export type TestQueryFn = <T>(q: Queryable<T>) => T;

/**
 * Creates a query helper from a store.
 */
export function makeQuery(store: { query<T>(q: Queryable<T>): T }): TestQueryFn {
  return <T>(q: Queryable<T>) => store.query(q);
}

/**
 * Wait for a condition to become true, polling the query function.
 *
 * @param queryFn Function that returns the current value
 * @param predicate Condition to wait for
 * @param options Timeout and polling configuration
 * @returns The value when predicate becomes true
 * @throws Error if timeout is reached
 */
export async function waitFor<T>(
  queryFn: () => T,
  predicate: (value: T) => boolean,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
    label?: string;
  } = {}
): Promise<T> {
  const { timeoutMs = 2000, intervalMs = 10, label = "condition" } = options;
  const start = Date.now();

  while (true) {
    const value = queryFn();
    if (predicate(value)) return value;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timeout (${timeoutMs}ms) waiting for: ${label}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/**
 * Wait for the app to navigate to a specific page.
 *
 * @param app The root application VM
 * @param query Query function for reading state
 * @param page The page to wait for
 * @returns The page state when reached
 */
export async function waitForPage<P extends CurrentPageState["page"]>(
  app: TypeDBStudioAppVM,
  query: TestQueryFn,
  page: P
): Promise<Extract<CurrentPageState, { page: P }>> {
  const result = await waitFor(
    () => query(app.currentPage$),
    (current): current is Extract<CurrentPageState, { page: P }> =>
      current?.page === page,
    { label: `page=${page}` }
  );
  return result as Extract<CurrentPageState, { page: P }>;
}

/**
 * Wait for an item to appear in a reactive list by key.
 *
 * @param query Query function for reading state
 * @param items$ The reactive list queryable
 * @param key The key to find
 * @returns The item when found
 */
export async function waitForItem<T extends { key: string }>(
  query: TestQueryFn,
  items$: Queryable<T[]>,
  key: string
): Promise<T> {
  const result = await waitFor(
    () => query(items$).find((item) => item.key === key),
    (item): item is T => item !== undefined,
    { label: `item with key=${key}` }
  );
  return result as T;
}

/**
 * Find a navigation item by label and click it.
 *
 * @param app The root application VM
 * @param query Query function for reading state
 * @param label The navigation item label (e.g., "Connect", "Query", "Learn")
 */
export function clickNavItem(
  app: TypeDBStudioAppVM,
  query: TestQueryFn,
  label: string
): void {
  const items = query(app.topBar.navigation.items$);
  const item = items.find((i) => i.label === label);
  if (!item) {
    const available = items.map((i) => i.label).join(", ");
    throw new Error(`Navigation item "${label}" not found. Available: ${available}`);
  }
  item.click();
}

/**
 * Navigate to a page via the top bar navigation and wait for it.
 *
 * @param app The root application VM
 * @param query Query function for reading state
 * @param label The navigation item label
 * @param expectedPage The expected page after navigation
 */
export async function navigateToPage<P extends CurrentPageState["page"]>(
  app: TypeDBStudioAppVM,
  query: TestQueryFn,
  label: string,
  expectedPage: P
): Promise<Extract<CurrentPageState, { page: P }>> {
  clickNavItem(app, query, label);
  return await waitForPage(app, query, expectedPage);
}

// =============================================================================
// Learn-specific helpers
// =============================================================================

/**
 * Creates a local server, connects to it, and returns the server key.
 *
 * This is the standard setup for tests that need a connected server before
 * navigating to Learn or other connected-only pages.
 *
 * @param app The root application VM
 * @param query Query function for reading state
 * @returns The created server's key
 */
export async function setupConnectedServer(
  app: TypeDBStudioAppVM,
  query: TestQueryFn
): Promise<{ serverKey: string }> {
  // Navigate to Connect page
  clickNavItem(app, query, "Connect");
  const connectState = await waitForPage(app, query, "connect");
  const connectVm: ConnectPageVM = connectState.vm;

  // Create a new local server
  const { key: serverKey } = await connectVm.localServers.createNew();

  // Wait for server to appear in list
  const server = await waitForItem(query, connectVm.localServers.items$, serverKey);

  // Connect to the server
  await server.connect();

  // Wait for navigation to query page (connection triggers navigation)
  await waitForPage(app, query, "query");

  return { serverKey };
}

/**
 * Navigates to the Learn page.
 * Requires an active connection (use setupConnectedServer first).
 *
 * @param app The root application VM
 * @param query Query function for reading state
 * @returns The Learn page VM
 */
export async function navigateToLearn(
  app: TypeDBStudioAppVM,
  query: TestQueryFn
): Promise<LearnPageVM> {
  // Check if Learn is available in navigation
  const navItems = query(app.topBar.navigation.items$);
  const learnNavItem = navItems.find((item) => item.label === "Learn");

  if (!learnNavItem) {
    const available = navItems.map((i) => i.label).join(", ");
    throw new Error(`Learn page not available in navigation. Available: ${available}`);
  }

  learnNavItem.click();
  const learnState = await waitForPage(app, query, "learn");
  return learnState.vm;
}

/**
 * Opens a curriculum section by folder and section index.
 * Handles folder expansion and section selection.
 *
 * @param learnVm The Learn page VM
 * @param query Query function for reading state
 * @param options Folder and section indices (0-indexed)
 * @returns The loaded DocumentSectionVM
 */
export async function openCurriculumSection(
  learnVm: LearnPageVM,
  query: TestQueryFn,
  options: { folderIndex: number; sectionIndex: number }
): Promise<DocumentSectionVM> {
  const { folderIndex, sectionIndex } = options;

  // Get folders
  const folders = query(learnVm.sidebar.learnSection.folders$);
  if (folderIndex >= folders.length) {
    throw new Error(
      `Folder index ${folderIndex} out of range. Available folders: ${folders.length}`
    );
  }

  const folder = folders[folderIndex];

  // Expand folder if needed
  if (!query(folder.expanded$)) {
    folder.toggleExpanded();
  }

  // Get sections within folder
  const sections = query(folder.sections$);
  if (sectionIndex >= sections.length) {
    throw new Error(
      `Section index ${sectionIndex} out of range in folder "${folder.label}". ` +
        `Available sections: ${sections.length}`
    );
  }

  const sectionItem = sections[sectionIndex];

  // Select the section
  sectionItem.select();

  // Wait for section to load in viewer
  const section = await waitFor(
    () => query(learnVm.viewer.currentSection$),
    (s): s is DocumentSectionVM => s !== null && s.id === sectionItem.key,
    { label: `section "${sectionItem.title}" to load`, timeoutMs: 5000 }
  );

  return section as DocumentSectionVM;
}

/**
 * Gets all interactive examples from a section.
 * Interactive examples are those with type "example" or "invalid".
 *
 * @param section The document section VM
 * @returns Array of interactive examples
 */
export function getInteractiveExamples(section: DocumentSectionVM): DocumentExampleVM[] {
  return section.examples.filter((e) => e.isInteractive);
}

/**
 * Waits for an example execution to complete (success or error).
 *
 * @param query Query function for reading state
 * @param example The example VM
 * @param options Timeout configuration
 * @returns The final execution state
 */
export async function waitForExampleComplete(
  query: TestQueryFn,
  example: DocumentExampleVM,
  options?: { timeoutMs?: number }
): Promise<ExampleExecutionState> {
  const { timeoutMs = 10000 } = options ?? {};

  return await waitFor(
    () => query(example.executionState$),
    (state) => state.type === "success" || state.type === "error",
    { label: `example "${example.id}" to complete`, timeoutMs }
  );
}
