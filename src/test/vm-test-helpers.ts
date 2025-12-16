/**
 * VM Test Helpers
 *
 * Utilities for testing View Models at the app level.
 * These enable "headless UI tests" that drive the app purely through VM methods.
 */

import type { Queryable } from "../vm/types";
import type { TypeDBStudioAppVM, CurrentPageState } from "../vm/app.vm";

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
  return await waitFor(
    () => query(app.currentPage$),
    (current): current is Extract<CurrentPageState, { page: P }> =>
      current?.page === page,
    { label: `page=${page}` }
  );
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
  return await waitFor(
    () => query(items$).find((item) => item.key === key),
    (item): item is T => item !== undefined,
    { label: `item with key=${key}` }
  );
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
