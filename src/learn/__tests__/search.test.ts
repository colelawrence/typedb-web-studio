/**
 * Search Index Tests
 *
 * Unit tests for the curriculum search functionality.
 * These are pure unit tests (no VM/browser required).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  buildSearchIndex,
  searchCurriculum,
  flattenResults,
  getTotalCount,
  createSearchIndexBuilder,
  type SearchableItem,
  type GroupedSearchResults,
} from "../search";
import type Fuse from "fuse.js";
import type {
  CurriculumMeta,
  ParsedSection,
} from "../../curriculum/types";

// Test fixtures
const TEST_META: CurriculumMeta = {
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
          title: "Variables and Patterns",
          file: "04-variables.md",
          context: "social-network",
        },
      ],
    },
    {
      id: "querying",
      title: "Querying",
      path: "02-querying",
      lessons: [
        {
          id: "match-patterns",
          title: "Match Patterns",
          file: "01-match-patterns.md",
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
      { id: "introduction", text: "Introduction", level: 2, line: 10 },
      { id: "basic-match", text: "Basic Match Queries", level: 2, line: 25 },
    ],
    examples: [
      {
        id: "find-all-people",
        type: "example",
        query: "match $p isa person;",
        expect: { results: true },
        sourceFile: "03-first-queries.md",
        lineNumber: 30,
      },
      {
        id: "find-alice",
        type: "example",
        query: 'match $p isa person, has name "Alice";',
        expect: { results: true, min: 1 },
        sourceFile: "03-first-queries.md",
        lineNumber: 45,
      },
    ],
    rawContent: "",
    sourceFile: "01-foundations/03-first-queries.md",
  },
  variables: {
    id: "variables",
    title: "Variables and Patterns",
    context: "social-network",
    requires: ["first-queries"],
    headings: [
      { id: "variable-basics", text: "Variable Basics", level: 2, line: 10 },
      { id: "pattern-matching", text: "Pattern Matching", level: 2, line: 30 },
    ],
    examples: [
      {
        id: "variable-example",
        type: "example",
        query: "match $p isa person, has age $a; $a > 25;",
        expect: { results: true },
        sourceFile: "04-variables.md",
        lineNumber: 35,
      },
      {
        id: "readonly-display",
        type: "readonly",
        query: "// This is just for display",
        sourceFile: "04-variables.md",
        lineNumber: 50,
      },
    ],
    rawContent: "",
    sourceFile: "01-foundations/04-variables.md",
  },
  "match-patterns": {
    id: "match-patterns",
    title: "Match Patterns",
    context: "social-network",
    requires: ["variables"],
    headings: [
      { id: "advanced-patterns", text: "Advanced Patterns", level: 2, line: 10 },
    ],
    examples: [
      {
        id: "relation-match",
        type: "example",
        query: "match $e (employee: $p, employer: $c) isa employment;",
        expect: { results: true },
        sourceFile: "01-match-patterns.md",
        lineNumber: 25,
      },
    ],
    rawContent: "",
    sourceFile: "02-querying/01-match-patterns.md",
  },
};

describe("buildSearchIndex", () => {
  let index: Fuse<SearchableItem>;

  beforeEach(() => {
    index = buildSearchIndex(TEST_META, TEST_SECTIONS);
  });

  it("creates an index with all sections", () => {
    // Search for a section title
    const results = index.search("First Queries");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.type).toBe("learn");
    expect(results[0].item.title).toBe("First Queries");
  });

  it("indexes section headings as searchable content", () => {
    // Search for heading text
    const results = index.search("Basic Match");
    expect(results.length).toBeGreaterThan(0);
    // Should find the "first-queries" section which has "Basic Match Queries" heading
    const learnResult = results.find((r) => r.item.type === "learn");
    expect(learnResult?.item.targetId).toBe("first-queries");
  });

  it("indexes examples with query text", () => {
    // Search for text in an example query
    const results = index.search("Alice");
    const exampleResult = results.find((r) => r.item.type === "example");
    expect(exampleResult).toBeDefined();
    expect(exampleResult?.item.id).toBe("example:find-alice");
  });

  it("excludes readonly examples from index", () => {
    // Search for readonly example ID - should not find it
    const results = index.search("readonly-display");
    const readonlyResult = results.find((r) => r.item.id === "example:readonly-display");
    expect(readonlyResult).toBeUndefined();
  });

  it("includes breadcrumb path for context", () => {
    const results = index.search("First Queries");
    const learnResult = results.find((r) => r.item.type === "learn");
    expect(learnResult?.item.breadcrumb).toEqual(["Foundations", "First Queries"]);
  });

  it("links examples to their parent section", () => {
    const results = index.search("person");
    const exampleResult = results.find((r) => r.item.type === "example");
    expect(exampleResult?.item.sectionId).toBe("first-queries");
  });
});

describe("searchCurriculum", () => {
  let index: Fuse<SearchableItem>;

  beforeEach(() => {
    index = buildSearchIndex(TEST_META, TEST_SECTIONS);
  });

  it("returns grouped results by type", () => {
    const grouped = searchCurriculum(index, "match");

    expect(grouped.learn).toBeDefined();
    expect(grouped.example).toBeDefined();
    expect(grouped.reference).toBeDefined();
  });

  it("returns empty groups for empty query", () => {
    const grouped = searchCurriculum(index, "");

    expect(grouped.learn).toHaveLength(0);
    expect(grouped.example).toHaveLength(0);
    expect(grouped.reference).toHaveLength(0);
  });

  it("returns empty groups for whitespace-only query", () => {
    const grouped = searchCurriculum(index, "   ");

    expect(grouped.learn).toHaveLength(0);
    expect(grouped.example).toHaveLength(0);
    expect(grouped.reference).toHaveLength(0);
  });

  it("limits results per group", () => {
    // With maxResults=1, each group should have at most 1 result
    const grouped = searchCurriculum(index, "match", 1);

    expect(grouped.learn.length).toBeLessThanOrEqual(1);
    expect(grouped.example.length).toBeLessThanOrEqual(1);
  });

  it("includes match scores", () => {
    const grouped = searchCurriculum(index, "First Queries");

    expect(grouped.learn.length).toBeGreaterThan(0);
    expect(grouped.learn[0].score).toBeDefined();
    expect(typeof grouped.learn[0].score).toBe("number");
  });
});

describe("flattenResults", () => {
  it("combines all groups into ordered array", () => {
    const grouped: GroupedSearchResults = {
      learn: [
        { item: { type: "learn", id: "1" } as SearchableItem, score: 0.1, refIndex: 0 },
      ],
      example: [
        { item: { type: "example", id: "2" } as SearchableItem, score: 0.2, refIndex: 1 },
      ],
      reference: [
        { item: { type: "reference", id: "3" } as SearchableItem, score: 0.3, refIndex: 2 },
      ],
    };

    const flat = flattenResults(grouped);

    expect(flat).toHaveLength(3);
    expect(flat[0].item.type).toBe("learn");
    expect(flat[1].item.type).toBe("example");
    expect(flat[2].item.type).toBe("reference");
  });

  it("handles empty groups", () => {
    const grouped: GroupedSearchResults = {
      learn: [],
      example: [
        { item: { type: "example", id: "1" } as SearchableItem, score: 0.1, refIndex: 0 },
      ],
      reference: [],
    };

    const flat = flattenResults(grouped);

    expect(flat).toHaveLength(1);
    expect(flat[0].item.type).toBe("example");
  });
});

describe("getTotalCount", () => {
  it("sums counts across all groups", () => {
    const grouped: GroupedSearchResults = {
      learn: [
        { item: {} as SearchableItem, score: 0, refIndex: 0 },
        { item: {} as SearchableItem, score: 0, refIndex: 1 },
      ],
      example: [
        { item: {} as SearchableItem, score: 0, refIndex: 2 },
      ],
      reference: [],
    };

    expect(getTotalCount(grouped)).toBe(3);
  });

  it("returns 0 for empty results", () => {
    const grouped: GroupedSearchResults = {
      learn: [],
      example: [],
      reference: [],
    };

    expect(getTotalCount(grouped)).toBe(0);
  });
});

describe("createSearchIndexBuilder", () => {
  it("creates builder with index and search function", () => {
    const builder = createSearchIndexBuilder(TEST_META, TEST_SECTIONS);

    expect(builder.index).toBeDefined();
    expect(typeof builder.search).toBe("function");
  });

  it("search function works correctly", () => {
    const builder = createSearchIndexBuilder(TEST_META, TEST_SECTIONS);

    const results = builder.search("person");

    expect(getTotalCount(results)).toBeGreaterThan(0);
  });

  it("respects maxResults parameter", () => {
    const builder = createSearchIndexBuilder(TEST_META, TEST_SECTIONS);

    const results = builder.search("match", 1);

    expect(results.learn.length).toBeLessThanOrEqual(1);
    expect(results.example.length).toBeLessThanOrEqual(1);
  });
});

describe("fuzzy matching", () => {
  let index: Fuse<SearchableItem>;

  beforeEach(() => {
    index = buildSearchIndex(TEST_META, TEST_SECTIONS);
  });

  it("matches with typos", () => {
    // "quries" instead of "queries"
    const results = index.search("quries");
    // Should still find "First Queries"
    expect(results.length).toBeGreaterThan(0);
  });

  it("matches partial words", () => {
    // "patt" should match "Patterns"
    const results = index.search("patt");
    const patternResult = results.find((r) =>
      r.item.title.toLowerCase().includes("pattern")
    );
    expect(patternResult).toBeDefined();
  });

  it("weights title matches higher", () => {
    // "Variables" is a title - should be ranked high
    const results = index.search("Variables");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.title).toContain("Variables");
  });
});
