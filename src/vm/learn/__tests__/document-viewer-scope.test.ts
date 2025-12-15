/**
 * Document Viewer VM Scope Tests
 *
 * Tests the DocumentViewerVM functionality:
 * - Section loading and navigation
 * - Reading progress tracking
 * - Example execution recording
 * - Visibility state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createStore, provideOtel } from "@livestore/livestore";
import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { Effect } from "effect";

import { createDocumentViewerScope, type DocumentViewerScopeOptions } from "../document-viewer-scope";
import { events, schema } from "../../../livestore/schema";
import { readingProgressForSection$, executedExampleIds$ } from "../../../livestore/queries";
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

interface TestContext {
  store: ReturnType<typeof createStore> extends Promise<infer T> ? T : never;
  viewerVM: ReturnType<typeof createDocumentViewerScope>;
  profileId: string;
  copyToRepl: ReturnType<typeof vi.fn>;
  runQuery: ReturnType<typeof vi.fn>;
  cleanup: () => Promise<void>;
}

let storeCounter = 0;

async function createTestContext(profileId = "test-profile"): Promise<TestContext> {
  const store = await Effect.runPromise(
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

  // Create test profile
  store.commit(events.profileCreated({
    id: profileId,
    displayName: "Test User",
    createdAt: new Date(),
    lastActiveAt: new Date(),
  }));

  const copyToRepl = vi.fn();
  const runQuery = vi.fn().mockResolvedValue({
    success: true,
    resultCount: 3,
    executionTimeMs: 100,
  });

  const viewerVM = createDocumentViewerScope({
    store,
    events,
    profileId,
    sections: MOCK_SECTIONS,
    copyToRepl,
    runQuery,
  });

  return {
    store,
    viewerVM,
    profileId,
    copyToRepl,
    runQuery,
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

      expect(ctx.copyToRepl).toHaveBeenCalledWith("match $p isa person;");
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

      const result = await example.run();

      expect(result.success).toBe(true);
      expect(result.resultCount).toBe(3);
      expect(ctx.runQuery).toHaveBeenCalledWith("match $p isa person;");
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
      ctx.runQuery.mockRejectedValueOnce(new Error("Connection failed"));

      ctx.viewerVM.openSection("first-queries");
      const section = ctx.store.query(ctx.viewerVM.currentSection$);
      const example = section!.examples[0];

      const result = await example.run();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection failed");
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
});
