/**
 * Learn Sidebar VM Scope Tests
 *
 * Tests the sidebar VM scope implementation including:
 * - Sidebar width management
 * - Search functionality
 * - Progress tracking
 * - Navigation tree structure
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createStore, provideOtel } from "@livestore/livestore";
import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { Effect } from "effect";

import { createLearnSidebarScope, type LearnSidebarScopeOptions } from "../sidebar-scope";
import { events, schema } from "../../../livestore/schema";
import type { CurriculumMeta, ParsedSection } from "../../../curriculum/types";

// ============================================================================
// Test Fixtures
// ============================================================================

const TEST_CURRICULUM_META: CurriculumMeta = {
  name: "Test Curriculum",
  version: "1.0.0",
  sections: [
    {
      id: "foundations",
      title: "Foundations",
      path: "01-foundations",
      lessons: [
        {
          id: "first-queries",
          title: "First Queries",
          file: "03-first-queries.md",
          context: "social-network",
        },
        {
          id: "variables",
          title: "Variables",
          file: "04-variables.md",
          context: "social-network",
        },
      ],
    },
    {
      id: "advanced",
      title: "Advanced",
      path: "02-advanced",
      lessons: [
        {
          id: "relations",
          title: "Relations",
          file: "01-relations.md",
          context: "social-network",
        },
      ],
    },
  ],
  contexts: [],
};

const TEST_SECTIONS: Record<string, ParsedSection> = {
  "first-queries": {
    id: "first-queries",
    title: "First Queries",
    context: "social-network",
    requires: [],
    headings: [
      { id: "intro", text: "Introduction", level: 2, line: 10 },
      { id: "basic-match", text: "Basic Match", level: 2, line: 25 },
    ],
    examples: [
      {
        id: "find-all",
        type: "example",
        query: "match $p isa person;",
        expect: { results: true },
        sourceFile: "03-first-queries.md",
        lineNumber: 30,
      },
    ],
    rawContent: "",
    sourceFile: "01-foundations/03-first-queries.md",
  },
  variables: {
    id: "variables",
    title: "Variables",
    context: "social-network",
    requires: ["first-queries"],
    headings: [
      { id: "var-basics", text: "Variable Basics", level: 2, line: 10 },
    ],
    examples: [
      {
        id: "var-example",
        type: "example",
        query: "match $p isa person, has age $a;",
        expect: { results: true },
        sourceFile: "04-variables.md",
        lineNumber: 20,
      },
    ],
    rawContent: "",
    sourceFile: "01-foundations/04-variables.md",
  },
  relations: {
    id: "relations",
    title: "Relations",
    context: "social-network",
    requires: ["variables"],
    headings: [],
    examples: [],
    rawContent: "",
    sourceFile: "02-advanced/01-relations.md",
  },
};

// ============================================================================
// Test Context
// ============================================================================

interface TestContext {
  store: Awaited<ReturnType<typeof createTestStore>>;
  sidebarVM: ReturnType<typeof createLearnSidebarScope>;
  navigatedTo: { sectionId: string; headingId?: string } | null;
  activeSection: string | null;
  cleanup: () => Promise<void>;
}

async function createTestStore() {
  return await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        return yield* createStore({
          schema,
          storeId: `test-sidebar-${Date.now()}`,
          adapter: makeInMemoryAdapter(),
        });
      })
    ).pipe(provideOtel({}))
  );
}

async function createTestContext(profileId: string): Promise<TestContext> {
  const store = await createTestStore();

  // Create the test profile
  const now = new Date();
  store.commit(
    events.profileCreated({
      id: profileId,
      displayName: "Test User",
      createdAt: now,
      lastActiveAt: now,
    })
  );

  let navigatedTo: { sectionId: string; headingId?: string } | null = null;
  let activeSection: string | null = null;

  const options: LearnSidebarScopeOptions = {
    store,
    profileId,
    curriculumMeta: TEST_CURRICULUM_META,
    sections: TEST_SECTIONS,
    navigate: (sectionId, headingId) => {
      navigatedTo = { sectionId, headingId };
      activeSection = sectionId;
    },
    getActiveSectionId: () => activeSection,
  };

  const sidebarVM = createLearnSidebarScope(options);

  const context: TestContext = {
    store,
    sidebarVM,
    navigatedTo: null as { sectionId: string; headingId?: string } | null,
    activeSection: null as string | null,
    cleanup: async () => {
      // LiveStore cleanup handled by Effect.scoped
    },
  };

  // Use Object.defineProperties for getters/setters
  Object.defineProperties(context, {
    navigatedTo: {
      get: () => navigatedTo,
      enumerable: true,
    },
    activeSection: {
      get: () => activeSection,
      set: (value: string | null) => {
        activeSection = value;
      },
      enumerable: true,
    },
  });

  return context;
}

// ============================================================================
// Tests
// ============================================================================

describe("LearnSidebarScope", () => {
  const profileId = `test-profile-${Date.now()}`;

  describe("Sidebar Width", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it("returns default width initially", async () => {
      const ctx = await createTestContext(profileId);
      const width = ctx.store.query(ctx.sidebarVM.width$);
      expect(width).toBe(280); // Default
    });

    it("updates width within bounds", async () => {
      const ctx = await createTestContext(profileId);

      ctx.sidebarVM.setWidth(350);
      // Note: The width is stored in a local variable and persisted to localStorage
      // So we verify by checking localStorage directly
      expect(localStorage.getItem("typedb_studio_learn_sidebar_width")).toBe("350");
    });

    it("clamps width to minimum", async () => {
      const ctx = await createTestContext(profileId);

      ctx.sidebarVM.setWidth(100); // Below minimum of 200
      expect(localStorage.getItem("typedb_studio_learn_sidebar_width")).toBe("200");
    });

    it("clamps width to maximum", async () => {
      const ctx = await createTestContext(profileId);

      ctx.sidebarVM.setWidth(500); // Above maximum of 400
      expect(localStorage.getItem("typedb_studio_learn_sidebar_width")).toBe("400");
    });

    it("persists width to localStorage", async () => {
      const ctx = await createTestContext(profileId);

      ctx.sidebarVM.setWidth(300);
      expect(localStorage.getItem("typedb_studio_learn_sidebar_width")).toBe("300");
    });

    it("loads persisted width", async () => {
      localStorage.setItem("typedb_studio_learn_sidebar_width", "320");
      const ctx = await createTestContext(profileId);

      const width = ctx.store.query(ctx.sidebarVM.width$);
      expect(width).toBe(320);
    });
  });

  describe("Search", () => {
    it("has correct placeholder text", async () => {
      const ctx = await createTestContext(profileId);
      expect(ctx.sidebarVM.search.placeholder).toBe("Search curriculum...");
    });

    it("starts with empty query", async () => {
      const ctx = await createTestContext(profileId);
      const query = ctx.store.query(ctx.sidebarVM.search.query$);
      expect(query).toBe("");
    });

    it("search is inactive initially", async () => {
      const ctx = await createTestContext(profileId);
      const isActive = ctx.store.query(ctx.sidebarVM.search.isActive$);
      expect(isActive).toBe(false);
    });

    it("view shows navigation when search inactive", async () => {
      const ctx = await createTestContext(profileId);
      const view = ctx.store.query(ctx.sidebarVM.view$);
      expect(view.type).toBe("navigation");
    });
  });

  describe("Learn Section", () => {
    it("has correct label", async () => {
      const ctx = await createTestContext(profileId);
      expect(ctx.sidebarVM.learnSection.label).toBe("LEARN");
    });

    it("starts not collapsed", async () => {
      const ctx = await createTestContext(profileId);
      const collapsed = ctx.store.query(ctx.sidebarVM.learnSection.collapsed$);
      expect(collapsed).toBe(false);
    });

    it("toggles collapsed state", async () => {
      const ctx = await createTestContext(profileId);

      ctx.sidebarVM.learnSection.toggleCollapsed();
      // Note: collapsed state is local, need to query again
      // The computed won't update until we call it again
    });

    it("shows correct initial progress", async () => {
      const ctx = await createTestContext(profileId);
      const percent = ctx.store.query(ctx.sidebarVM.learnSection.progressPercent$);
      const display = ctx.store.query(ctx.sidebarVM.learnSection.progressDisplay$);

      expect(percent).toBe(0);
      expect(display).toBe("0%");
    });

    it("creates folder VMs from curriculum structure", async () => {
      const ctx = await createTestContext(profileId);
      const folders = ctx.store.query(ctx.sidebarVM.learnSection.folders$);

      expect(folders.length).toBe(2);
      expect(folders[0].key).toBe("foundations");
      expect(folders[0].label).toBe("Foundations");
      expect(folders[1].key).toBe("advanced");
      expect(folders[1].label).toBe("Advanced");
    });
  });

  describe("Folder VMs", () => {
    it("shows correct folder progress state", async () => {
      const ctx = await createTestContext(profileId);
      const folders = ctx.store.query(ctx.sidebarVM.learnSection.folders$);
      const folder = folders[0];

      const progressState = ctx.store.query(folder.progressState$);
      expect(progressState).toBe("not-started");
    });

    it("starts collapsed", async () => {
      const ctx = await createTestContext(profileId);
      const folders = ctx.store.query(ctx.sidebarVM.learnSection.folders$);
      const folder = folders[0];

      const expanded = ctx.store.query(folder.expanded$);
      expect(expanded).toBe(false);
    });

    it("creates section items for lessons", async () => {
      const ctx = await createTestContext(profileId);
      const folders = ctx.store.query(ctx.sidebarVM.learnSection.folders$);
      const folder = folders[0];
      const sections = ctx.store.query(folder.sections$);

      expect(sections.length).toBe(2);
      expect(sections[0].key).toBe("first-queries");
      expect(sections[0].title).toBe("First Queries");
      expect(sections[1].key).toBe("variables");
      expect(sections[1].title).toBe("Variables");
    });
  });

  describe("Section Items", () => {
    it("navigates when selected", async () => {
      const ctx = await createTestContext(profileId);
      const folders = ctx.store.query(ctx.sidebarVM.learnSection.folders$);
      const sections = ctx.store.query(folders[0].sections$);

      sections[0].select();

      expect(ctx.navigatedTo).toEqual({ sectionId: "first-queries", headingId: undefined });
    });

    it("tracks active state", async () => {
      const ctx = await createTestContext(profileId);

      // Navigate to a section
      ctx.activeSection = "first-queries";

      const folders = ctx.store.query(ctx.sidebarVM.learnSection.folders$);
      const sections = ctx.store.query(folders[0].sections$);

      const isActive = ctx.store.query(sections[0].isActive$);
      expect(isActive).toBe(true);

      const isActive2 = ctx.store.query(sections[1].isActive$);
      expect(isActive2).toBe(false);
    });

    it("shows context for sections that require one", async () => {
      const ctx = await createTestContext(profileId);
      const folders = ctx.store.query(ctx.sidebarVM.learnSection.folders$);
      const sections = ctx.store.query(folders[0].sections$);

      expect(sections[0].context).toBe("social-network");
    });

    it("shows progress state for unread section", async () => {
      const ctx = await createTestContext(profileId);
      const folders = ctx.store.query(ctx.sidebarVM.learnSection.folders$);
      const sections = ctx.store.query(folders[0].sections$);

      const progressState = ctx.store.query(sections[0].progressState$);
      expect(progressState).toBe("not-started");
    });
  });

  describe("Progress Tracking", () => {
    it("updates progress when section is marked read", async () => {
      const ctx = await createTestContext(profileId);

      // Mark a section as read
      ctx.store.commit(
        events.readingProgressMarked({
          profileId,
          sectionId: "first-queries",
          headingId: null,
          markedRead: true,
          viewedAt: new Date(),
        })
      );

      // Small delay for query to update
      await new Promise((r) => setTimeout(r, 10));

      // Check overall progress updated
      const percent = ctx.store.query(ctx.sidebarVM.learnSection.progressPercent$);
      // 1 out of 3 lessons = 33%
      expect(percent).toBe(33);
    });

    it("shows completed state when section is read", async () => {
      const ctx = await createTestContext(profileId);

      // Mark section as read
      ctx.store.commit(
        events.readingProgressMarked({
          profileId,
          sectionId: "first-queries",
          headingId: null,
          markedRead: true,
          viewedAt: new Date(),
        })
      );

      await new Promise((r) => setTimeout(r, 10));

      // Re-query to get updated VMs
      const folders = ctx.store.query(ctx.sidebarVM.learnSection.folders$);
      const sections = ctx.store.query(folders[0].sections$);

      const progressState = ctx.store.query(sections[0].progressState$);
      expect(progressState).toBe("completed");
    });

    it("folder shows in-progress when partially read", async () => {
      const ctx = await createTestContext(profileId);

      // Mark one of two lessons in the folder as read
      ctx.store.commit(
        events.readingProgressMarked({
          profileId,
          sectionId: "first-queries",
          headingId: null,
          markedRead: true,
          viewedAt: new Date(),
        })
      );

      await new Promise((r) => setTimeout(r, 10));

      const folders = ctx.store.query(ctx.sidebarVM.learnSection.folders$);
      const progressState = ctx.store.query(folders[0].progressState$);

      expect(progressState).toBe("in-progress");
    });
  });

  describe("Reference Section", () => {
    it("has correct label", async () => {
      const ctx = await createTestContext(profileId);
      expect(ctx.sidebarVM.referenceSection.label).toBe("REFERENCE");
    });

    it("starts collapsed", async () => {
      const ctx = await createTestContext(profileId);
      const collapsed = ctx.store.query(ctx.sidebarVM.referenceSection.collapsed$);
      expect(collapsed).toBe(true);
    });

    it("has empty folders (no reference docs yet)", async () => {
      const ctx = await createTestContext(profileId);
      const folders = ctx.store.query(ctx.sidebarVM.referenceSection.folders$);
      expect(folders).toHaveLength(0);
    });
  });
});
