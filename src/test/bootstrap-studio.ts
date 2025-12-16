/**
 * Bootstrap Studio for Testing
 *
 * Creates a fully wired TypeDB Studio application for end-to-end VM testing.
 * The app is completely functional - TypeDB WASM, LiveStore, navigation all work.
 */

import { vi } from "vitest";
import { createStore, provideOtel } from "@livestore/livestore";
import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { Effect } from "effect";

import { schema, events } from "../livestore/schema";
import { createStudioScope, type StudioServices } from "../vm/scope";
import type { TypeDBStudioAppVM } from "../vm/app.vm";
import { makeQuery, type TestQueryFn } from "./vm-test-helpers";

/**
 * A fully bootstrapped TypeDB Studio for testing.
 */
export interface TestStudio {
  /** The root application VM - the main interface for testing */
  app: TypeDBStudioAppVM;

  /** Services exposed by the scope (for advanced assertions) */
  services: StudioServices;

  /** Query helper for reading reactive state */
  query: TestQueryFn;

  /** Mock navigate function - tracks navigation calls */
  navigate: ReturnType<typeof vi.fn>;

  /** Cleanup function - call after test */
  cleanup: () => Promise<void>;
}

let storeCounter = 0;

/**
 * Creates a fully functional TypeDB Studio for end-to-end testing.
 *
 * This bootstraps the complete application:
 * - LiveStore with in-memory adapter
 * - Full VM scope (TypeDBStudioAppVM)
 * - TypeDB WASM service (via internal wiring)
 *
 * Tests should interact ONLY through the `app` VM, not through direct
 * store manipulation. This ensures tests validate the actual user experience.
 *
 * @example
 * ```ts
 * const { app, query, cleanup } = await bootstrapStudioForTest();
 * try {
 *   // Navigate to Connect page
 *   clickNavItem(app, query, "Connect");
 *   const connectState = await waitForPage(app, query, "connect");
 *
 *   // Create a local server via VM
 *   const { key } = await connectState.vm.localServers.createNew();
 *
 *   // Verify it appears
 *   await waitForItem(query, connectState.vm.localServers.items$, key);
 * } finally {
 *   await cleanup();
 * }
 * ```
 */
export async function bootstrapStudioForTest(): Promise<TestStudio> {
  const storeId = `studio-e2e-${Date.now()}-${++storeCounter}`;

  const store = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        return yield* createStore({
          schema,
          storeId,
          adapter: makeInMemoryAdapter(),
          debug: { instanceId: storeId },
        });
      })
    ).pipe(
      provideOtel({}),
      Effect.catchAllCause((cause) => {
        console.error("[Bootstrap Studio] Store creation failed:", cause);
        return Effect.fail(new Error(`Store creation failed`));
      })
    )
  );

  // Mock navigate function - tests can assert navigation calls
  const navigate = vi.fn();

  // Create the full studio scope
  const { vm: app, services } = createStudioScope(store, navigate);

  // Query helper
  const query = makeQuery(store);

  // Cleanup
  const cleanup = async () => {
    // Store cleanup is handled by Effect.scoped
    // Any additional cleanup (like WASM service) would go here
  };

  return {
    app,
    services,
    query,
    navigate,
    cleanup,
  };
}
