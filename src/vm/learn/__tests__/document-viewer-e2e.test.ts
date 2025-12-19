/**
 * Document Viewer End-to-End Tests
 *
 * Tests the full document viewer flow from scope through REPL to TypeDB WASM:
 * 1. Start with no database (fresh state)
 * 2. Create TypeDB WASM service and set up database with schema + seed
 * 3. Create document viewer scope with real REPL bridge wired to TypeDB
 * 4. Open a curriculum section
 * 5. Find example via contentBlocks (the refactored VM pattern)
 * 6. Run the example through REPL bridge to TypeDB
 * 7. Verify execution state and results
 *
 * This validates that the contentBlocks refactor correctly wires example VMs
 * to the execution infrastructure.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createStore, provideOtel } from "@livestore/livestore";
import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { Effect } from "effect";

import { createDocumentViewerScope } from "../document-viewer-scope";
import { events, schema } from "../../../livestore/schema";
import { uiState$, executedExampleIds$ } from "../../../livestore/queries";
import { TypeDBEmbeddedService, createEmbeddedService } from "../../../services/typedb-embedded-service";
import { createReplBridge } from "../../../learn/repl-bridge";
import { lessonDatabaseNameForContext } from "../../../curriculum/lesson-db";
import type { ParsedSection } from "../../../curriculum/types";
import type { DocumentSectionContentBlockVM } from "../document-viewer.vm";

// ============================================================================
// Test Fixtures - Social Network Schema/Seed
// ============================================================================

const SOCIAL_NETWORK_SCHEMA = `define
attribute name value string;
attribute age value integer;
entity person owns name, owns age;`;

const SOCIAL_NETWORK_SEED = `insert
  $alice isa person, has name "Alice", has age 30;
  $bob isa person, has name "Bob", has age 25;
  $carol isa person, has name "Carol", has age 35;`;

// Mock curriculum section with examples that match the schema
const TEST_SECTION: ParsedSection = {
  id: "e2e-test-section",
  title: "End-to-End Test Section",
  context: "S1",
  requires: [],
  headings: [
    { id: "finding-people", text: "Finding People", level: 2, line: 5 },
  ],
  examples: [
    {
      id: "e2e-find-all-people",
      type: "example",
      query: "match $p isa person;",
      expect: { results: true, min: 1 },
      sourceFile: "e2e-test.md",
      lineNumber: 10,
    },
    {
      id: "e2e-find-alice",
      type: "example",
      query: 'match $p isa person, has name "Alice";',
      expect: { results: true, min: 1, max: 1 },
      sourceFile: "e2e-test.md",
      lineNumber: 15,
    },
  ],
  rawContent: `
# End-to-End Test Section

Let's test the document viewer end-to-end.

## Finding People

\`\`\`typeql:example[id=e2e-find-all-people, expect=results, min=1]
match $p isa person;
\`\`\`

\`\`\`typeql:example[id=e2e-find-alice, expect=results, min=1, max=1]
match $p isa person, has name "Alice";
\`\`\`
`,
  sourceFile: "docs/e2e-test.md",
};

const TEST_SECTIONS: Record<string, ParsedSection> = {
  "e2e-test-section": TEST_SECTION,
};

// ============================================================================
// Test Context Setup
// ============================================================================

let storeCounter = 0;

async function createTestStore() {
  return await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        return yield* createStore({
          schema,
          storeId: `document-viewer-e2e-${Date.now()}-${++storeCounter}`,
          adapter: makeInMemoryAdapter(),
        });
      })
    ).pipe(provideOtel({}))
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("Document Viewer End-to-End", () => {
  let service: TypeDBEmbeddedService;
  // Use the lesson database name so queries run against the correct database
  const testDbName = lessonDatabaseNameForContext("S1");

  beforeAll(async () => {
    // Create and connect to TypeDB WASM
    service = createEmbeddedService();
    await service.connect({
      address: "embedded://local",
      username: "test",
      password: "",
    });

    // Create database with schema and seed data
    await service.createDatabase(testDbName);
    await service.executeQuery(testDbName, SOCIAL_NETWORK_SCHEMA, { transactionType: "schema" });
    await service.executeQuery(testDbName, SOCIAL_NETWORK_SEED, { transactionType: "write" });

    console.log(`[E2E Test] Created database: ${testDbName}`);
  });

  afterAll(async () => {
    try {
      await service.deleteDatabase(testDbName);
    } catch {
      // Ignore cleanup errors
    }
    await service.disconnect();
  });

  it("runs example from contentBlocks through real TypeDB WASM", async () => {
    const store = await createTestStore();
    const navigate = vi.fn();
    const showSnackbar = vi.fn();
    const profileId = `test-profile-${Date.now()}`;

    // Create test profile
    store.commit(
      events.profileCreated({
        id: profileId,
        displayName: "Test User",
        createdAt: new Date(),
        lastActiveAt: new Date(),
      })
    );

    // Set connected state with our test database
    store.commit(
      events.connectionSessionSet({
        status: "connected",
        activeDatabase: testDbName,
      })
    );

    // Set lesson context to match the section's required context
    store.commit(
      events.lessonContextSet({
        currentContext: "S1",
        isLoading: false,
        lastError: null,
        lastLoadedAt: Date.now(),
      })
    );

    // Create a real REPL bridge that executes against TypeDB WASM
    const replBridge = createReplBridge({
      store,
      events,
      navigate,
      showSnackbar,
      executeQuery: async ({ query, database }: { query: string; database?: string | null }) => {
        const startTime = Date.now();
        const targetDb = database ?? testDbName;
        try {
          const response = await service.executeQuery(targetDb, query, {
            transactionType: "read",
          });

          let resultCount = 0;
          if (response.data.type === "match") {
            resultCount = response.data.answers.length;
          }

          return {
            success: true,
            resultCount,
            executionTimeMs: Date.now() - startTime,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTimeMs: Date.now() - startTime,
          };
        }
      },
    });

    // Create document viewer scope with real sections and REPL bridge
    const { vm: viewer, service: _viewerService } = createDocumentViewerScope({
      store,
      profileId,
      sections: TEST_SECTIONS,
      replBridge,
    });

    // -----------------------------------------------------------------------
    // 1. Verify initial state - no section open (note: isVisible defaults to true)
    // -----------------------------------------------------------------------
    expect(store.query(viewer.currentSection$)).toBeNull();

    // -----------------------------------------------------------------------
    // 2. Open section and verify contentBlocks are populated
    // -----------------------------------------------------------------------
    viewer.openSection("e2e-test-section");

    const section = store.query(viewer.currentSection$);
    expect(section).not.toBeNull();
    expect(section!.id).toBe("e2e-test-section");
    expect(section!.title).toBe("End-to-End Test Section");

    // -----------------------------------------------------------------------
    // 3. Verify contentBlocks contain heading and examples (the refactored pattern)
    // -----------------------------------------------------------------------
    expect(section!.contentBlocks.length).toBeGreaterThan(0);

    const headingBlocks = section!.contentBlocks.filter((b) => b.kind === "heading");
    const exampleBlocks = section!.contentBlocks.filter((b) => b.kind === "example");
    const proseBlocks = section!.contentBlocks.filter((b) => b.kind === "prose");

    expect(headingBlocks.length).toBe(1);
    expect(exampleBlocks.length).toBe(2);
    expect(proseBlocks.length).toBeGreaterThan(0);

    console.log(`[E2E Test] contentBlocks: ${headingBlocks.length} headings, ${exampleBlocks.length} examples, ${proseBlocks.length} prose`);

    // -----------------------------------------------------------------------
    // 4. Get first example from contentBlocks
    // -----------------------------------------------------------------------
    const firstExampleBlock = exampleBlocks[0] as Extract<DocumentSectionContentBlockVM, { kind: "example" }>;
    const exampleVM = firstExampleBlock.example;

    expect(exampleVM.id).toBe("e2e-find-all-people");
    expect(exampleVM.query).toBe("match $p isa person;");
    expect(exampleVM.isInteractive).toBe(true);

    // -----------------------------------------------------------------------
    // 5. Verify initial execution state
    // -----------------------------------------------------------------------
    const initialState = store.query(exampleVM.executionState$);
    expect(initialState.type).toBe("idle");
    expect(store.query(exampleVM.wasExecuted$)).toBe(false);

    // -----------------------------------------------------------------------
    // 6. Run the example through REPL bridge → TypeDB WASM
    // -----------------------------------------------------------------------
    console.log(`[E2E Test] Running query: ${exampleVM.query}`);
    await exampleVM.run();

    // Get result from currentResult$ queryable
    const result = store.query(exampleVM.currentResult$);
    console.log(`[E2E Test] Result: success=${result?.success}, resultCount=${result?.resultCount}`);

    // -----------------------------------------------------------------------
    // 7. Verify execution succeeded
    // -----------------------------------------------------------------------
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.resultCount).toBe(3); // Alice, Bob, Carol

    const finalState = store.query(exampleVM.executionState$);
    expect(finalState.type).toBe("success");
    if (finalState.type === "success") {
      expect(finalState.resultCount).toBe(3);
    }

    // -----------------------------------------------------------------------
    // 8. Verify wasExecuted$ is now true
    // -----------------------------------------------------------------------
    expect(store.query(exampleVM.wasExecuted$)).toBe(true);

    // -----------------------------------------------------------------------
    // 9. Verify execution was recorded in LiveStore
    // -----------------------------------------------------------------------
    const executions = store.query(executedExampleIds$(profileId));
    const thisExecution = executions.find((e) => e.exampleId === "e2e-find-all-people");

    expect(thisExecution).toBeDefined();
    expect(thisExecution!.source).toBe("docs-run");
    expect(thisExecution!.succeeded).toBe(true);

    // -----------------------------------------------------------------------
    // 10. Verify REPL bridge side effects
    // -----------------------------------------------------------------------
    // Query should be copied to editor
    const uiState = store.query(uiState$);
    expect(uiState.currentQueryText).toBe("match $p isa person;");

    // Navigation should be called
    expect(navigate).toHaveBeenCalledWith("/query");

    // Snackbar should show success
    expect(showSnackbar).toHaveBeenCalledWith("success", expect.stringContaining("3 results"));
  });

  it("runs second example (find Alice) and gets exactly 1 result", async () => {
    const store = await createTestStore();
    const navigate = vi.fn();
    const showSnackbar = vi.fn();
    const profileId = `test-profile-${Date.now()}`;

    store.commit(
      events.profileCreated({
        id: profileId,
        displayName: "Test User",
        createdAt: new Date(),
        lastActiveAt: new Date(),
      })
    );

    store.commit(
      events.connectionSessionSet({
        status: "connected",
        activeDatabase: testDbName,
      })
    );

    // Set lesson context to match the section's required context
    store.commit(
      events.lessonContextSet({
        currentContext: "S1",
        isLoading: false,
        lastError: null,
        lastLoadedAt: Date.now(),
      })
    );

    const replBridge = createReplBridge({
      store,
      events,
      navigate,
      showSnackbar,
      executeQuery: async ({ query, database }: { query: string; database?: string | null }) => {
        const startTime = Date.now();
        const targetDb = database ?? testDbName;
        try {
          const response = await service.executeQuery(targetDb, query, {
            transactionType: "read",
          });

          let resultCount = 0;
          if (response.data.type === "match") {
            resultCount = response.data.answers.length;
          }

          return {
            success: true,
            resultCount,
            executionTimeMs: Date.now() - startTime,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTimeMs: Date.now() - startTime,
          };
        }
      },
    });

    const { vm: viewer } = createDocumentViewerScope({
      store,
      profileId,
      sections: TEST_SECTIONS,
      replBridge,
    });

    viewer.openSection("e2e-test-section");
    const section = store.query(viewer.currentSection$);
    expect(section).not.toBeNull();

    // Get second example (find Alice)
    const exampleBlocks = section!.contentBlocks.filter((b) => b.kind === "example");
    const secondExampleBlock = exampleBlocks[1] as Extract<DocumentSectionContentBlockVM, { kind: "example" }>;
    const exampleVM = secondExampleBlock.example;

    expect(exampleVM.id).toBe("e2e-find-alice");
    expect(exampleVM.query).toContain("Alice");

    // Run and verify
    await exampleVM.run();

    const result = store.query(exampleVM.currentResult$);
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.resultCount).toBe(1); // Only Alice

    const finalState = store.query(exampleVM.executionState$);
    expect(finalState.type).toBe("success");
    if (finalState.type === "success") {
      expect(finalState.resultCount).toBe(1);
    }
  });

  it("verifies contentBlocks VM references are stable", async () => {
    const store = await createTestStore();
    const navigate = vi.fn();
    const showSnackbar = vi.fn();
    const profileId = `test-profile-${Date.now()}`;

    store.commit(
      events.profileCreated({
        id: profileId,
        displayName: "Test User",
        createdAt: new Date(),
        lastActiveAt: new Date(),
      })
    );

    store.commit(
      events.connectionSessionSet({
        status: "connected",
        activeDatabase: testDbName,
      })
    );

    // Set lesson context to match the section's required context
    store.commit(
      events.lessonContextSet({
        currentContext: "S1",
        isLoading: false,
        lastError: null,
        lastLoadedAt: Date.now(),
      })
    );

    const replBridge = createReplBridge({
      store,
      events,
      navigate,
      showSnackbar,
      executeQuery: async () => ({ success: true, resultCount: 0, executionTimeMs: 0 }),
    });

    const { vm: viewer } = createDocumentViewerScope({
      store,
      profileId,
      sections: TEST_SECTIONS,
      replBridge,
    });

    viewer.openSection("e2e-test-section");

    // Query section multiple times
    const section1 = store.query(viewer.currentSection$);
    const section2 = store.query(viewer.currentSection$);

    // Should be same cached VM instance
    expect(section1).toBe(section2);

    // contentBlocks should be same array
    expect(section1!.contentBlocks).toBe(section2!.contentBlocks);

    // Example VMs should be same instances
    const example1 = section1!.contentBlocks.find((b) => b.kind === "example");
    const example2 = section2!.contentBlocks.find((b) => b.kind === "example");

    if (example1?.kind === "example" && example2?.kind === "example") {
      expect(example1.example).toBe(example2.example);
      expect(example1.example.run).toBe(example2.example.run);
    }
  });
});
