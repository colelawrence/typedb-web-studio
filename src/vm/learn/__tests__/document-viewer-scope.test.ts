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
import type { ParsedSection } from "../../../curriculum/types";

// ============================================================================
// Test Fixtures
// ============================================================================

const MOCK_SECTION: ParsedSection = {
  id: "first-queries",
  title: "Your First Queries",
  context: "social-network",
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

const MOCK_SECTIONS: Record<string, ParsedSection> = {
  "first-queries": MOCK_SECTION,
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
      expect(section!.context).toBe("social-network");
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
      ctx.viewerVM.openSection("first-queries");
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
  };

  beforeEach(async () => {
    // Create mock context manager
    mockContextManager = {
      currentContext: null,
      isLoading: false,
      lastError: null,
      loadContextCalls: [],
      loadContext: async (name: string) => {
        mockContextManager.loadContextCalls.push(name);
        mockContextManager.currentContext = name;
      },
      resetContext: async () => {},
      clearContext: async () => {
        mockContextManager.currentContext = null;
      },
      getStatus: () => ({
        isReady: mockContextManager.currentContext !== null,
        isLoading: false,
        name: mockContextManager.currentContext,
        error: null,
      }),
      isContextLoaded: (name: string | null) => mockContextManager.currentContext === name,
    };

    // Create context with context manager
    const store = await createTestStore();

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
      ctx.viewerVM.openSection("first-queries");
      const isVisible = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$);
      expect(isVisible).toBe(true);
    });

    it("is not visible when context matches", async () => {
      mockContextManager.currentContext = "social-network";
      ctx.viewerVM.openSection("first-queries");
      const isVisible = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$);
      expect(isVisible).toBe(false);
    });

    it("shows required context from section", () => {
      ctx.viewerVM.openSection("first-queries");
      const required = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.requiredContext$);
      expect(required).toBe("social-network");
    });

    it("shows current context from manager", () => {
      mockContextManager.currentContext = "e-commerce";
      const current = ctx.store.query(ctx.viewerVM.contextSwitchPrompt.currentContext$);
      expect(current).toBe("e-commerce");
    });

    it("switchContext calls context manager", async () => {
      ctx.viewerVM.openSection("first-queries");
      await ctx.viewerVM.contextSwitchPrompt.switchContext();
      expect(mockContextManager.loadContextCalls).toContain("social-network");
    });

    it("dismiss hides the prompt", () => {
      ctx.viewerVM.openSection("first-queries");
      expect(ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$)).toBe(true);

      ctx.viewerVM.contextSwitchPrompt.dismiss();
      expect(ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$)).toBe(false);
    });

    it("is not visible after switching context", async () => {
      ctx.viewerVM.openSection("first-queries");
      expect(ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$)).toBe(true);

      await ctx.viewerVM.contextSwitchPrompt.switchContext();
      expect(ctx.store.query(ctx.viewerVM.contextSwitchPrompt.isVisible$)).toBe(false);
    });
  });
});
