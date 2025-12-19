/**
 * Document Viewer VM Scope Tests
 *
 * Tests the DocumentViewerVM functionality:
 * - Section loading and navigation
 * - Reading progress tracking
 * - Example execution recording
 * - Visibility state
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createStore, provideOtel } from "@livestore/livestore";
import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { Effect } from "effect";

import { createDocumentViewerScope, type DocumentViewerService } from "../document-viewer-scope";
import type { DocumentViewerVM } from "../document-viewer.vm";
import { events, schema } from "../../../livestore/schema";
import { readingProgressForSection$, executedExampleIds$ } from "../../../livestore/queries";
import { createMockReplBridge } from "../../../learn/repl-bridge";
import { lessonDatabaseNameForContext } from "../../../curriculum/lesson-db";
import type { ParsedSection } from "../../../curriculum/types";

// ============================================================================
// Test Fixtures
// ============================================================================

const MOCK_SECTION: ParsedSection = {
  id: "first-queries",
  title: "Your First Queries",
  context: null, // No context required for basic execution tests
  requires: ["types-intro"],
  headings: [
    { id: "finding-entities", text: "Finding Entities", level: 2, line: 10 },
    { id: "adding-constraints", text: "Adding Constraints", level: 2, line: 25 },
    { id: "common-mistakes", text: "Common Mistakes", level: 2, line: 40 },
  ],
  examples: [
    {
      id: "find-all-people",
      type: "example",
      query: "match $p isa person;",
      expect: { results: true },
      sourceFile: "01-first-queries.md",
      lineNumber: 15,
    },
    {
      id: "find-alice",
      type: "example",
      query: 'match $p isa person, has name "Alice";',
      expect: { results: true, min: 1 },
      sourceFile: "01-first-queries.md",
      lineNumber: 30,
    },
    {
      id: "bad-syntax",
      type: "invalid",
      query: "match $p person;",
      expect: { error: "expecting" },
      sourceFile: "01-first-queries.md",
      lineNumber: 45,
    },
  ],
  rawContent: `
# Your First Queries

Let's learn to query TypeDB!

## Finding Entities

\`\`\`typeql:example[id=find-all-people, expect=results]
match $p isa person;
\`\`\`

## Adding Constraints

\`\`\`typeql:example[id=find-alice, expect=results, min=1]
match $p isa person, has name "Alice";
\`\`\`

## Common Mistakes

\`\`\`typeql:invalid[id=bad-syntax, error="expecting"]
match $p person;
\`\`\`
`,
  sourceFile: "docs/curriculum/01-foundations/03-first-queries.md",
};

// Section with context requirement for context manager tests
const MOCK_SECTION_WITH_CONTEXT: ParsedSection = {
  ...MOCK_SECTION,
  id: "context-queries",
  context: "social-network", // Requires context for loading tests
};

const MOCK_SECTIONS: Record<string, ParsedSection> = {
  "first-queries": MOCK_SECTION,
  "context-queries": MOCK_SECTION_WITH_CONTEXT,
};

// ============================================================================
// Test Context
// ============================================================================

let storeCounter = 0;

async function createTestStore() {
  return await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        return yield* createStore({
          schema,
          storeId: `document-viewer-test-${Date.now()}-${++storeCounter}`,
          adapter: makeInMemoryAdapter(),
        });
      })
    ).pipe(provideOtel({}))
  );
}

interface TestContext {
  store: Awaited<ReturnType<typeof createTestStore>>;
  viewerVM: DocumentViewerVM;
  viewerService: DocumentViewerService;
  profileId: string;
  replBridge: ReturnType<typeof createMockReplBridge>;
  cleanup: () => Promise<void>;
}

async function createTestContext(profileId = "test-profile"): Promise<TestContext> {
  const store = await createTestStore();

  // Create test profile
  store.commit(events.profileCreated({
    id: profileId,
    displayName: "Test User",
    createdAt: new Date(),
    lastActiveAt: new Date(),
  }));

  // Set up connection state for basic tests (so examples can run)
  store.commit(events.connectionSessionSet({
    status: "connected",
    activeDatabase: "test-db",
    lastStatusChange: Date.now(),
  }));

  const replBridge = createMockReplBridge();

  const { vm: viewerVM, service: viewerService } = createDocumentViewerScope({
    store,
    profileId,
    sections: MOCK_SECTIONS,
    replBridge,
  });

  return {
    store,
    viewerVM,
    viewerService,
    profileId,
    replBridge,
    cleanup: async () => {
      // Cleanup is handled by Effect.scoped
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("DocumentViewerScope", () => {
  let ctx: TestContext;
  const profileId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  beforeEach(async () => {
    ctx = await createTestContext(profileId);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  // --------------------------------------------------------------------------
  // Visibility
  // --------------------------------------------------------------------------

  describe("Visibility", () => {
    it("starts visible by default", () => {
      const isVisible = ctx.store.query(ctx.viewerVM.isVisible$);
      expect(isVisible).toBe(true);
    });

    it("can be hidden", () => {
      ctx.viewerVM.hide();
      const isVisible = ctx.store.query(ctx.viewerVM.isVisible$);
      expect(isVisible).toBe(false);
    });

    it("can be shown after hiding", () => {
      ctx.viewerVM.hide();
      ctx.viewerVM.show();
      const isVisible = ctx.store.query(ctx.viewerVM.isVisible$);
      expect(isVisible).toBe(true);
    });

    it("can toggle visibility", () => {
      ctx.viewerVM.toggle();
      expect(ctx.store.query(ctx.viewerVM.isVisible$)).toBe(false);
      ctx.viewerVM.toggle();
      expect(ctx.store.query(ctx.viewerVM.isVisible$)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Section Loading
  // --------------------------------------------------------------------------

  describe("Section Loading", () => {
    it("starts with no section loaded", () => {
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      expect(section).toBeNull();
    });

    it("loads a section by ID", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);

      expect(section).not.toBeNull();
      expect(section!.id).toBe("first-queries");
      expect(section!.title).toBe("Your First Queries");
      expect(section!.context).toBeNull();
    });

    it("makes viewer visible when opening a section", () => {
      ctx.viewerVM.hide();
      ctx.viewerVM.openSection("first-queries");
      expect(ctx.store.query(ctx.viewerVM.isVisible$)).toBe(true);
    });

    it("loads headings with correct structure", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);

      expect(section!.headings).toHaveLength(3);
      expect(section!.headings[0]).toMatchObject({
        id: "finding-entities",
        text: "Finding Entities",
        level: 2,
      });
    });

    it("loads examples with correct structure", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);

      expect(section!.examples).toHaveLength(3);
      expect(section!.examples[0]).toMatchObject({
        id: "find-all-people",
        type: "example",
        isInteractive: true,
      });
      expect(section!.examples[2]).toMatchObject({
        id: "bad-syntax",
        type: "invalid",
        isInteractive: true,
      });
    });

    it("returns null for unknown section", () => {
      ctx.viewerVM.openSection("unknown-section");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      expect(section).toBeNull();
    });

    it("closes section", () => {
      ctx.viewerVM.openSection("first-queries");
      ctx.viewerVM.closeSection();
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      expect(section).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Reading Progress
  // --------------------------------------------------------------------------

  describe("Reading Progress", () => {
    it("headings start as unread", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const heading = section!.headings[0];

      const isRead = ctx.store.query(heading.isRead$);
      expect(isRead).toBe(false);
    });

    it("marks heading as read", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const heading = section!.headings[0];

      heading.markRead();

      const isRead = ctx.store.query(heading.isRead$);
      expect(isRead).toBe(true);
    });

    it("marks heading as unread", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const heading = section!.headings[0];

      heading.markRead();
      heading.markUnread();

      const isRead = ctx.store.query(heading.isRead$);
      expect(isRead).toBe(false);
    });

    it("toggles heading read state", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const heading = section!.headings[0];

      heading.toggleRead();
      expect(ctx.store.query(heading.isRead$)).toBe(true);

      heading.toggleRead();
      expect(ctx.store.query(heading.isRead$)).toBe(false);
    });

    it("persists reading progress to LiveStore", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const heading = section!.headings[0];

      heading.markRead();

      // Query LiveStore directly
      const progress = ctx.store.query(readingProgressForSection$(profileId, "first-queries"));
      expect(progress.some(p => p.headingId === "finding-entities" && p.markedRead)).toBe(true);
    });

    it("calculates section progress correctly", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);

      // Initially 0%
      let progress = ctx.store.query(section!.progress$);
      expect(progress.percent).toBe(0);
      expect(progress.isComplete).toBe(false);

      // Mark one heading
      section!.headings[0].markRead();
      progress = ctx.store.query(section!.progress$);
      expect(progress.readCount).toBe(1);
      expect(progress.percent).toBe(33); // 1/3

      // Mark all headings
      section!.headings[1].markRead();
      section!.headings[2].markRead();
      progress = ctx.store.query(section!.progress$);
      expect(progress.percent).toBe(100);
      expect(progress.isComplete).toBe(true);
    });

    it("marks all headings as read", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);

      section!.markAllRead();

      const progress = ctx.store.query(section!.progress$);
      expect(progress.isComplete).toBe(true);
    });

    it("clears reading progress", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);

      section!.markAllRead();
      section!.markAllUnread();

      const progress = ctx.store.query(section!.progress$);
      expect(progress.readCount).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Example Execution
  // --------------------------------------------------------------------------

  describe("Example Execution", () => {
    it("examples start as not executed", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      const wasExecuted = ctx.store.query(example.wasExecuted$);
      expect(wasExecuted).toBe(false);
    });

    it("copies query to REPL", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      example.copyToRepl();

      expect(ctx.replBridge.copyToReplCalls).toContain("match $p isa person;");
    });

    it("records copy-to-REPL as execution", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      example.copyToRepl();

      const wasExecuted = ctx.store.query(example.wasExecuted$);
      expect(wasExecuted).toBe(true);
    });

    it("runs query and records result", async () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      await example.run();
      const result = ctx.store.query(example.currentResult$);

      expect(result?.success).toBe(true);
      expect(result?.resultCount).toBe(3);
      expect(ctx.replBridge.runQueryCalls).toContain("match $p isa person;");
    });

    it("records execution to LiveStore", async () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      await example.run();

      const executions = ctx.store.query(executedExampleIds$(profileId));
      expect(executions.some(e => e.exampleId === "find-all-people")).toBe(true);
    });

    it("handles execution errors", async () => {
      ctx.replBridge.setQueryResult({
        success: false,
        error: "Connection failed",
        executionTimeMs: 0,
      });

      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      await example.run();
      const result = ctx.store.query(example.currentResult$);

      expect(result?.success).toBe(false);
      expect(result?.error).toBe("Connection failed");
    });

    it("tracks execution state", async () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      // Initially idle
      let state = ctx.store.query(example.executionState$);
      expect(state.type).toBe("idle");

      // Run and check result
      await example.run();
      state = ctx.store.query(example.executionState$);
      expect(state.type).toBe("success");
    });
  });

  // --------------------------------------------------------------------------
  // Example Types
  // --------------------------------------------------------------------------

  describe("Example Types", () => {
    it("identifies interactive examples", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);

      expect(section!.examples[0].isInteractive).toBe(true); // example
      expect(section!.examples[2].isInteractive).toBe(true); // invalid
    });

    it("preserves example metadata", () => {
      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[1];

      expect(example.expect).toEqual({ results: true, min: 1 });
      expect(example.sourceFile).toBe("01-first-queries.md");
      expect(example.lineNumber).toBe(30);
    });
  });

  // --------------------------------------------------------------------------
  // Context Switch Prompt (without ContextManager)
  // --------------------------------------------------------------------------

  describe("Context Switch Prompt (no manager)", () => {
    it("is not visible when no context manager provided", () => {
      ctx.viewerVM.openSection("first-queries");
      const isVisible = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$);
      expect(isVisible).toBe(false);
    });

    it("returns null for current context", () => {
      const current = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.currentContext$);
      expect(current).toBeNull();
    });

    it("returns null for required context when no section", () => {
      const required = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.requiredContext$);
      expect(required).toBeNull();
    });

    it("returns required context when section loaded", () => {
      ctx.viewerVM.openSection("context-queries");
      const required = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.requiredContext$);
      expect(required).toBe("social-network");
    });

    it("dismiss does nothing without manager", () => {
      ctx.viewerVM.openSection("first-queries");
      // Should not throw
      ctx.viewerVM.contextSwitchPrompt.dismiss();
      const isVisible = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$);
      expect(isVisible).toBe(false);
    });

    it("switchContext resolves without manager", async () => {
      ctx.viewerVM.openSection("first-queries");
      // Should not throw
      await ctx.viewerVM.contextSwitchPrompt.switchContext();
    });
  });
});

// ============================================================================
// Context Switch Prompt Tests (with ContextManager)
// ============================================================================

describe("DocumentViewerScope with ContextManager", () => {
  let ctx: TestContext;
  let mockContextManager: {
    currentContext: string | null;
    isLoading: boolean;
    lastError: string | null;
    loadContextCalls: string[];
    loadContext: (name: string) => Promise<void>;
    resetContext: () => Promise<void>;
    clearContext: () => Promise<void>;
    getStatus: () => { isReady: boolean; isLoading: boolean; name: string | null; error: string | null };
    isContextLoaded: (name: string | null) => boolean;
    setContext: (name: string | null) => void;
  };

  beforeEach(async () => {
    // Create context with context manager
    const store = await createTestStore();

    // Create mock context manager that updates LiveStore
    mockContextManager = {
      currentContext: null,
      isLoading: false,
      lastError: null,
      loadContextCalls: [],
      loadContext: async (name: string) => {
        mockContextManager.loadContextCalls.push(name);
        mockContextManager.currentContext = name;
        // Update LiveStore for reactive visibility
        store.commit(events.lessonContextSet({
          currentContext: name,
          isLoading: false,
          lastError: null,
          lastLoadedAt: Date.now(),
        }));
        // Also set the active database and connection status to match
        store.commit(events.connectionSessionSet({
          status: "connected",
          activeDatabase: lessonDatabaseNameForContext(name),
        }));
      },
      resetContext: async () => {},
      clearContext: async () => {
        mockContextManager.currentContext = null;
        store.commit(events.lessonContextSet({
          currentContext: null,
          isLoading: false,
          lastError: null,
          lastLoadedAt: null,
        }));
      },
      getStatus: () => ({
        isReady: mockContextManager.currentContext !== null,
        isLoading: false,
        name: mockContextManager.currentContext,
        error: null,
      }),
      isContextLoaded: (name: string | null) => mockContextManager.currentContext === name,
      // Helper to set context AND update LiveStore (including active database + connection status)
      setContext: (name: string | null) => {
        mockContextManager.currentContext = name;
        store.commit(events.lessonContextSet({
          currentContext: name,
          isLoading: false,
          lastError: null,
          lastLoadedAt: name ? Date.now() : null,
        }));
        // Also set the active database and connection status, simulating what loadContext does
        if (name) {
          store.commit(events.connectionSessionSet({
            status: "connected",
            activeDatabase: lessonDatabaseNameForContext(name),
          }));
        }
      },
    };

    store.commit(events.profileCreated({
      id: "test-profile-ctx",
      displayName: "Test User",
      createdAt: new Date(),
      lastActiveAt: new Date(),
    }));

    const replBridge = createMockReplBridge();

    const { vm: viewerVM, service: viewerService } = createDocumentViewerScope({
      store,
      profileId: "test-profile-ctx",
      sections: MOCK_SECTIONS,
      replBridge,
      contextManager: mockContextManager,
    });

    ctx = {
      store,
      viewerVM,
      viewerService,
      profileId: "test-profile-ctx",
      replBridge,
      cleanup: async () => {},
    };
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe("Context Switch Prompt", () => {
    it("is visible when context doesn't match", () => {
      ctx.viewerVM.openSection("context-queries");
      const isVisible = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$);
      expect(isVisible).toBe(true);
    });

    it("is not visible when context matches", async () => {
      mockContextManager.setContext("social-network");
      ctx.viewerVM.openSection("context-queries");
      const isVisible = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$);
      expect(isVisible).toBe(false);
    });

    it("shows required context from section", () => {
      ctx.viewerVM.openSection("context-queries");
      const required = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.requiredContext$);
      expect(required).toBe("social-network");
    });

    it("shows current context from manager", () => {
      mockContextManager.setContext("e-commerce");
      const current = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.currentContext$);
      expect(current).toBe("e-commerce");
    });

    it("switchContext calls context manager", async () => {
      ctx.viewerVM.openSection("context-queries");
      await ctx.viewerVM.contextSwitchPrompt.switchContext();
      expect(mockContextManager.loadContextCalls).toContain("social-network");
    });

    it("dismiss hides the prompt", () => {
      ctx.viewerVM.openSection("context-queries");
      expect(ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$)).toBe(true);

      ctx.viewerVM.contextSwitchPrompt.dismiss();
      expect(ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$)).toBe(false);
    });

    it("is not visible after switching context", async () => {
      ctx.viewerVM.openSection("context-queries");
      expect(ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$)).toBe(true);

      await ctx.viewerVM.contextSwitchPrompt.switchContext();
      expect(ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$)).toBe(false);
    });

    it("exposes isLoading$ from lesson context", () => {
      // Initially not loading
      const isLoading = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isLoading$);
      expect(isLoading).toBe(false);
    });

    it("exposes error$ from lesson context", () => {
      // Initially no error
      const error = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.error$);
      expect(error).toBeNull();
    });

    it("isLoading$ reflects loading state during context switch", async () => {
      ctx.viewerVM.openSection("context-queries");

      // Before switch - not loading
      expect(ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isLoading$)).toBe(false);

      // After switch completes - not loading (context is now loaded)
      await ctx.viewerVM.contextSwitchPrompt.switchContext();
      expect(ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isLoading$)).toBe(false);
    });

    it("error$ shows error when context loading fails", () => {
      ctx.viewerVM.openSection("context-queries");

      // Simulate an error by setting it directly in LiveStore
      ctx.store.commit(events.lessonContextSet({
        currentContext: null,
        isLoading: false,
        lastError: "Failed to create database",
        lastLoadedAt: null,
      }));

      const error = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.error$);
      expect(error).toBe("Failed to create database");
    });
  });

  describe("Auto-Context Loading on Run", () => {
    it("auto-loads context when running an example", async () => {
      // Context is not loaded initially
      expect(mockContextManager.currentContext).toBeNull();

      // Open section and run an example
      ctx.viewerVM.openSection("context-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      expect(section).not.toBeNull();
      expect(section!.examples.length).toBeGreaterThan(0);

      // Run the first example
      const example = section!.examples[0];
      await example.run();

      // Context should have been auto-loaded
      expect(mockContextManager.loadContextCalls).toContain("social-network");
    });

    it("does not reload context if already loaded", async () => {
      // Pre-load the context
      mockContextManager.setContext("social-network");
      expect(mockContextManager.loadContextCalls).toHaveLength(0);

      // Open section and run an example
      ctx.viewerVM.openSection("context-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];
      await example.run();

      // Context should NOT have been loaded again (already matches)
      expect(mockContextManager.loadContextCalls).toHaveLength(0);
    });

    it("loads correct context for section that requires it", async () => {
      ctx.viewerVM.openSection("context-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);

      // Verify section requires social-network context
      expect(section!.context).toBe("social-network");

      // Run example - should trigger context load
      await section!.examples[0].run();

      // Verify the correct context was loaded
      expect(mockContextManager.loadContextCalls).toEqual(["social-network"]);
    });
  });

  // --------------------------------------------------------------------------
  // Reactive Context Signals
  // --------------------------------------------------------------------------

  describe("Reactive Context Signals", () => {
    it("example exposes requiredContext from section", () => {
      ctx.viewerVM.openSection("context-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      // Should inherit context requirement from section
      expect(example.requiredContext).toBe("social-network");
    });

    it("isContextReady$ is false when context not loaded", () => {
      ctx.viewerVM.openSection("context-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      const isReady = ctx.store.query(example.isContextReady$);
      expect(isReady).toBe(false);
    });

    it("isContextReady$ becomes true when matching context is loaded", () => {
      ctx.viewerVM.openSection("context-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      // Initially not ready
      expect(ctx.store.query(example.isContextReady$)).toBe(false);

      // Load the required context
      mockContextManager.setContext("social-network");

      // Now should be ready
      expect(ctx.store.query(example.isContextReady$)).toBe(true);
    });

    it("isContextReady$ stays false when wrong context is loaded", () => {
      ctx.viewerVM.openSection("context-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      // Load a different context
      mockContextManager.setContext("e-commerce");

      // Should still not be ready (requires social-network)
      expect(ctx.store.query(example.isContextReady$)).toBe(false);
    });

    it("canRun$ is true when not currently running", () => {
      ctx.viewerVM.openSection("context-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      const canRun = ctx.store.query(example.canRun$);
      expect(canRun).toBe(true);
    });

    it("canRun$ is false for non-interactive examples", async () => {
      // Add a readonly example to test
      const sectionsWithReadonly: Record<string, ParsedSection> = {
        "readonly-section": {
          id: "readonly-section",
          title: "Readonly Section",
          context: null,
          requires: [],
          headings: [],
          examples: [
            {
              id: "readonly-example",
              type: "readonly",
              query: "# This is just for display",
              sourceFile: "test.md",
              lineNumber: 1,
            },
          ],
          rawContent: "# Readonly\n\n```typeql:readonly[id=readonly-example]\n# This is just for display\n```",
          sourceFile: "test.md",
        },
      };

      const { store } = ctx;
      const replBridge = createMockReplBridge();
      const { vm } = createDocumentViewerScope({
        store,
        profileId: "test-profile-ctx",
        sections: sectionsWithReadonly,
        replBridge,
      });

      vm.openSection("readonly-section");
      const section = ctx.store.query(vm.currentSection$);
      const readonlyExample = section!.examples[0];

      // Readonly examples should not be runnable
      expect(readonlyExample.isInteractive).toBe(false);
      expect(ctx.store.query(readonlyExample.canRun$)).toBe(false);
    });

    it("isContextReady$ is true when no context is required", async () => {
      // Create a section without context requirement
      const sectionsNoContext: Record<string, ParsedSection> = {
        "no-context-section": {
          id: "no-context-section",
          title: "No Context Needed",
          context: null, // No context required
          requires: [],
          headings: [],
          examples: [
            {
              id: "generic-example",
              type: "example",
              query: "match $x isa thing;",
              expect: { results: true },
              sourceFile: "test.md",
              lineNumber: 1,
            },
          ],
          rawContent: "# No Context\n\n```typeql:example[id=generic-example]\nmatch $x isa thing;\n```",
          sourceFile: "test.md",
        },
      };

      const { store } = ctx;
      const replBridge = createMockReplBridge();
      const { vm } = createDocumentViewerScope({
        store,
        profileId: "test-profile-ctx",
        sections: sectionsNoContext,
        replBridge,
        contextManager: mockContextManager,
      });

      vm.openSection("no-context-section");
      const section = ctx.store.query(vm.currentSection$);
      const example = section!.examples[0];

      // Should be ready since no context is required
      expect(example.requiredContext).toBeNull();
      expect(ctx.store.query(example.isContextReady$)).toBe(true);
    });

    it("reactive signals update when context changes", () => {
      ctx.viewerVM.openSection("context-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      // Initially not ready
      expect(ctx.store.query(example.isContextReady$)).toBe(false);

      // Load wrong context
      mockContextManager.setContext("e-commerce");
      expect(ctx.store.query(example.isContextReady$)).toBe(false);

      // Load correct context
      mockContextManager.setContext("social-network");
      expect(ctx.store.query(example.isContextReady$)).toBe(true);

      // Clear context
      mockContextManager.setContext(null);
      expect(ctx.store.query(example.isContextReady$)).toBe(false);
    });

    it("canRun$ is false when context is required but no contextManager provided (Query page scenario)", async () => {
      // This simulates the Query page's document viewer which has no contextManager
      // Examples that require a context should NOT be runnable
      const { store } = ctx;
      const replBridge = createMockReplBridge();

      // Create scope WITHOUT contextManager (like Query page)
      const { vm } = createDocumentViewerScope({
        store,
        profileId: "test-profile-no-cm",
        sections: MOCK_SECTIONS, // context-queries requires "social-network" context
        replBridge,
        // NOTE: No contextManager provided!
      });

      vm.openSection("context-queries");
      const section = store.query(vm.currentSection$);
      expect(section).not.toBeNull();

      const example = section!.examples[0];

      // The example requires social-network context
      expect(example.requiredContext).toBe("social-network");

      // Without contextManager, canRun should be FALSE
      // because we can't auto-load the context
      const canRun = store.query(example.canRun$);
      expect(canRun).toBe(false);

      // Check the disabled reason
      const reason = store.query(example.runDisabledReason$);
      expect(reason).toContain("Requires");
      expect(reason).toContain("social-network");
    });

    it("canRun$ is true when no context required even without contextManager", async () => {
      // Sections without context requirements should be runnable
      // even when there's no contextManager
      const sectionsNoContext: Record<string, ParsedSection> = {
        "generic-section": {
          id: "generic-section",
          title: "Generic Section",
          context: null, // No context required
          requires: [],
          headings: [],
          examples: [
            {
              id: "generic-query",
              type: "example",
              query: "match $x isa thing;",
              expect: { results: true },
              sourceFile: "test.md",
              lineNumber: 1,
            },
          ],
          rawContent: "# Generic\n\n```typeql:example[id=generic-query]\nmatch $x isa thing;\n```",
          sourceFile: "test.md",
        },
      };

      const { store } = ctx;
      const replBridge = createMockReplBridge();

      // Create scope WITHOUT contextManager
      const { vm } = createDocumentViewerScope({
        store,
        profileId: "test-profile-no-cm-2",
        sections: sectionsNoContext,
        replBridge,
        // NOTE: No contextManager provided!
      });

      // Set up connection status (required for running queries)
      store.commit(events.connectionSessionSet({
        status: "connected",
        activeDatabase: "some-db",
      }));

      vm.openSection("generic-section");
      const section = store.query(vm.currentSection$);
      const example = section!.examples[0];

      // No context required
      expect(example.requiredContext).toBeNull();

      // Should be runnable (no context required, so contextManager doesn't matter)
      const canRun = store.query(example.canRun$);
      expect(canRun).toBe(true);

      // No disabled reason
      const reason = store.query(example.runDisabledReason$);
      expect(reason).toBeNull();
    });

    it("canRun$ is false when connected but no database selected (Query page scenario)", async () => {
      // This tests Bug 2: connected status but no activeDatabase
      const sectionsNoContext: Record<string, ParsedSection> = {
        "generic-section": {
          id: "generic-section",
          title: "Generic Section",
          context: null, // No context required
          requires: [],
          headings: [],
          examples: [
            {
              id: "generic-query",
              type: "example",
              query: "match $x isa thing;",
              expect: { results: true },
              sourceFile: "test.md",
              lineNumber: 1,
            },
          ],
          rawContent: "# Generic\n\n```typeql:example[id=generic-query]\nmatch $x isa thing;\n```",
          sourceFile: "test.md",
        },
      };

      const { store } = ctx;
      const replBridge = createMockReplBridge();

      // Create scope WITHOUT contextManager (Query page scenario)
      const { vm } = createDocumentViewerScope({
        store,
        profileId: "test-profile-no-db",
        sections: sectionsNoContext,
        replBridge,
      });

      // Connected but NO database selected
      store.commit(events.connectionSessionSet({
        status: "connected",
        activeDatabase: null,
      }));

      vm.openSection("generic-section");
      const section = store.query(vm.currentSection$);
      const example = section!.examples[0];

      // Should NOT be runnable - no database selected
      expect(store.query(example.canRun$)).toBe(false);

      // Should show database selection message
      const reason = store.query(example.runDisabledReason$);
      expect(reason).toBe("Select a database first");

      // Now select a database
      store.commit(events.connectionSessionSet({
        status: "connected",
        activeDatabase: "test-db",
      }));

      // Now should be runnable
      expect(store.query(example.canRun$)).toBe(true);
      expect(store.query(example.runDisabledReason$)).toBeNull();
    });

    it("canRun$ is false for context-less sections when disconnected (even with contextManager)", async () => {
      // This tests the fix: sections without context requirements should still
      // check connection status, even when contextManager is present.
      // The contextManager can only auto-load when there's a context to load.
      const sectionsNoContext: Record<string, ParsedSection> = {
        "intro-section": {
          id: "intro-section",
          title: "Introduction",
          context: null, // No context required - intro lesson
          requires: [],
          headings: [],
          examples: [
            {
              id: "intro-query",
              type: "example",
              query: "match $x isa thing;",
              expect: { results: true },
              sourceFile: "test.md",
              lineNumber: 1,
            },
          ],
          rawContent: "# Intro\n\n```typeql:example[id=intro-query]\nmatch $x isa thing;\n```",
          sourceFile: "test.md",
        },
      };

      const { store } = ctx;
      const replBridge = createMockReplBridge();

      // Create scope WITH contextManager (Learn page scenario)
      const { vm } = createDocumentViewerScope({
        store,
        profileId: "test-profile-intro",
        sections: sectionsNoContext,
        replBridge,
        contextManager: mockContextManager, // Has context manager, but section has no context
      });

      // Disconnected - should NOT be runnable even with contextManager
      // because there's no context to auto-load
      store.commit(events.connectionSessionSet({
        status: "disconnected",
        activeDatabase: null,
      }));

      vm.openSection("intro-section");
      const section = store.query(vm.currentSection$);
      const example = section!.examples[0];

      // No context required
      expect(example.requiredContext).toBeNull();

      // Should NOT be runnable - not connected and contextManager can't help
      expect(store.query(example.canRun$)).toBe(false);
      expect(store.query(example.runDisabledReason$)).toBe("Not connected to database");

      // Now connect but no database selected
      store.commit(events.connectionSessionSet({
        status: "connected",
        activeDatabase: null,
      }));

      // Still not runnable - no database selected
      expect(store.query(example.canRun$)).toBe(false);
      expect(store.query(example.runDisabledReason$)).toBe("Select a database first");

      // Now select a database
      store.commit(events.connectionSessionSet({
        status: "connected",
        activeDatabase: "test-db",
      }));

      // Now should be runnable
      expect(store.query(example.canRun$)).toBe(true);
      expect(store.query(example.runDisabledReason$)).toBeNull();
    });

    it("dismiss is section-specific and resets when switching sections", () => {
      // Create a second section to test dismissal across sections
      const multiSections: Record<string, ParsedSection> = {
        "section-a": {
          id: "section-a",
          title: "Section A",
          context: "social-network",
          requires: [],
          headings: [],
          examples: [{
            id: "example-a",
            type: "example",
            query: "match $a isa person;",
            sourceFile: "test.md",
            lineNumber: 1,
          }],
          rawContent: "# A\n\n```typeql:example[id=example-a]\nmatch $a isa person;\n```",
          sourceFile: "a.md",
        },
        "section-b": {
          id: "section-b",
          title: "Section B",
          context: "social-network",
          requires: [],
          headings: [],
          examples: [{
            id: "example-b",
            type: "example",
            query: "match $b isa person;",
            sourceFile: "test.md",
            lineNumber: 1,
          }],
          rawContent: "# B\n\n```typeql:example[id=example-b]\nmatch $b isa person;\n```",
          sourceFile: "b.md",
        },
      };

      const { store } = ctx;
      const replBridge = createMockReplBridge();

      const { vm } = createDocumentViewerScope({
        store,
        profileId: "test-profile-dismiss",
        sections: multiSections,
        replBridge,
        contextManager: mockContextManager,
      });

      // Open section A - prompt should be visible (context not loaded)
      vm.openSection("section-a");
      expect(store.query(vm.contextSwitchPrompt.isVisible$)).toBe(true);

      // Dismiss the prompt for section A
      vm.contextSwitchPrompt.dismiss();
      expect(store.query(vm.contextSwitchPrompt.isVisible$)).toBe(false);

      // Switch to section B - prompt should be visible again (different section)
      // The dismissal state is reset when navigating to a different section
      vm.openSection("section-b");
      expect(store.query(vm.contextSwitchPrompt.isVisible$)).toBe(true);

      // Go back to section A - prompt should reappear because dismissal was reset
      // when we navigated to section B. This is the "reminder on revisit" behavior.
      vm.openSection("section-a");
      expect(store.query(vm.contextSwitchPrompt.isVisible$)).toBe(true);
    });
  });
});
