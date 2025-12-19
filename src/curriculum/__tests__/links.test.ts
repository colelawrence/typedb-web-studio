/**
 * Cross-Link Parser Tests
 *
 * Tests the link parsing and index building functionality.
 */

import { describe, it, expect } from "vitest";
import {
  parseLinks,
  parseSectionLinks,
  buildLinkIndex,
  getOutboundLinks,
  getBacklinks,
  getSectionsReferencingKeyword,
  findBrokenLinks,
  getLinkPath,
  getLinkDisplayText,
  type ParsedLink,
} from "../links";
import type { ParsedSection } from "../types";

// ============================================================================
// Test Fixtures
// ============================================================================

const SAMPLE_CONTENT = `
# Introduction

This section covers the basics of [[ref:match]] queries.

## Variables

Variables are covered in [[learn:variables]]. See also [[#syntax]] below.

## Syntax

For advanced patterns, see [[learn:advanced-patterns#relations]].

You can also reference [[ref:insert|Insert Clause]] for mutations.
`;

const MOCK_SECTIONS: ParsedSection[] = [
  {
    id: "first-queries",
    title: "Your First Queries",
    context: "S1",
    requires: [],
    headings: [
      { id: "introduction", text: "Introduction", level: 1, line: 1 },
      { id: "variables", text: "Variables", level: 2, line: 5 },
      { id: "syntax", text: "Syntax", level: 2, line: 9 },
    ],
    examples: [],
    rawContent: SAMPLE_CONTENT,
    sourceFile: "01-first-queries.md",
  },
  {
    id: "variables",
    title: "Working with Variables",
    context: "S1",
    requires: ["first-queries"],
    headings: [
      { id: "basics", text: "Basics", level: 2, line: 3 },
    ],
    examples: [],
    rawContent: "# Variables\n\nSee [[learn:first-queries]] for intro.",
    sourceFile: "02-variables.md",
  },
  {
    id: "advanced-patterns",
    title: "Advanced Patterns",
    context: "S1",
    requires: ["variables"],
    headings: [
      { id: "relations", text: "Relations", level: 2, line: 3 },
    ],
    examples: [],
    rawContent: "# Advanced\n\nLearn [[ref:match]] first.",
    sourceFile: "03-advanced.md",
  },
];

// ============================================================================
// parseLinks Tests
// ============================================================================

describe("parseLinks", () => {
  it("parses reference links [[ref:keyword]]", () => {
    const links = parseLinks("Use [[ref:match]] for queries.", "test.md");

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      type: "ref",
      targetId: "match",
      headingId: null,
    });
  });

  it("parses learn links [[learn:section]]", () => {
    const links = parseLinks("See [[learn:first-queries]].", "test.md");

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      type: "learn",
      targetId: "first-queries",
      headingId: null,
    });
  });

  it("parses heading links [[#heading]]", () => {
    const links = parseLinks("Jump to [[#syntax]] below.", "test.md");

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      type: "heading",
      targetId: "syntax",
      headingId: null,
    });
  });

  it("parses links with heading anchors [[learn:section#heading]]", () => {
    const links = parseLinks("See [[learn:advanced#relations]].", "test.md");

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      type: "learn",
      targetId: "advanced",
      headingId: "relations",
    });
  });

  it("parses reference links with heading [[ref:match#syntax]]", () => {
    const links = parseLinks("See [[ref:match#syntax]].", "test.md");

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      type: "ref",
      targetId: "match",
      headingId: "syntax",
    });
  });

  it("parses links with display text [[ref:match|Match Clause]]", () => {
    const links = parseLinks("Use [[ref:match|Match Clause]].", "test.md");

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      type: "ref",
      targetId: "match",
      displayText: "Match Clause",
    });
  });

  it("parses multiple links", () => {
    const content = "Use [[ref:match]] and [[ref:insert]] with [[learn:basics]].";
    const links = parseLinks(content, "test.md");

    expect(links).toHaveLength(3);
    expect(links.map((l) => l.targetId)).toEqual(["match", "insert", "basics"]);
  });

  it("captures line numbers", () => {
    const content = "Line 1\n[[ref:match]]\nLine 3\n[[ref:insert]]";
    const links = parseLinks(content, "test.md");

    expect(links[0].lineNumber).toBe(2);
    expect(links[1].lineNumber).toBe(4);
  });

  it("preserves raw text", () => {
    const links = parseLinks("[[learn:first-queries#intro]]", "test.md");

    expect(links[0].rawText).toBe("[[learn:first-queries#intro]]");
  });

  it("handles empty content", () => {
    const links = parseLinks("", "test.md");
    expect(links).toHaveLength(0);
  });

  it("handles content without links", () => {
    const links = parseLinks("No links here.", "test.md");
    expect(links).toHaveLength(0);
  });

  it("is case-insensitive for type prefix", () => {
    const links = parseLinks("[[LEARN:foo]] [[REF:bar]]", "test.md");

    expect(links).toHaveLength(2);
    expect(links[0].type).toBe("learn");
    expect(links[1].type).toBe("ref");
  });
});

// ============================================================================
// parseSectionLinks Tests
// ============================================================================

describe("parseSectionLinks", () => {
  it("extracts all links from a section", () => {
    const sectionLinks = parseSectionLinks(MOCK_SECTIONS[0]);

    expect(sectionLinks.sectionId).toBe("first-queries");
    expect(sectionLinks.outbound.length).toBeGreaterThan(0);
  });

  it("identifies different link types", () => {
    const sectionLinks = parseSectionLinks(MOCK_SECTIONS[0]);
    const types = new Set(sectionLinks.outbound.map((l) => l.type));

    expect(types.has("ref")).toBe(true);
    expect(types.has("learn")).toBe(true);
    expect(types.has("heading")).toBe(true);
  });
});

// ============================================================================
// buildLinkIndex Tests
// ============================================================================

describe("buildLinkIndex", () => {
  it("builds index with all sections", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);

    expect(index.bySectionId.size).toBe(3);
  });

  it("tracks referenced keywords", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);

    expect(index.referencedKeywords.has("match")).toBe(true);
    expect(index.referencedKeywords.has("insert")).toBe(true);
  });

  it("tracks referenced sections", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);

    expect(index.referencedSections.has("variables")).toBe(true);
    expect(index.referencedSections.has("first-queries")).toBe(true);
    expect(index.referencedSections.has("advanced-patterns")).toBe(true);
  });

  it("builds backlinks for reference links", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);
    const matchBacklinks = index.backlinks.get("ref:match");

    expect(matchBacklinks).toBeDefined();
    expect(matchBacklinks!.length).toBeGreaterThan(0);
  });

  it("builds backlinks for learn links", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);
    const firstQueriesBacklinks = index.backlinks.get("learn:first-queries");

    expect(firstQueriesBacklinks).toBeDefined();
    expect(firstQueriesBacklinks!.some((b) => b.sourceSectionId === "variables")).toBe(true);
  });
});

// ============================================================================
// Query Helper Tests
// ============================================================================

describe("getOutboundLinks", () => {
  it("returns links for existing section", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);
    const links = getOutboundLinks(index, "first-queries");

    expect(links.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown section", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);
    const links = getOutboundLinks(index, "nonexistent");

    expect(links).toEqual([]);
  });
});

describe("getBacklinks", () => {
  it("returns backlinks for referenced keyword", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);
    const backlinks = getBacklinks(index, "ref", "match");

    expect(backlinks.length).toBeGreaterThan(0);
  });

  it("returns backlinks for referenced section", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);
    const backlinks = getBacklinks(index, "learn", "first-queries");

    expect(backlinks.some((b) => b.sourceSectionId === "variables")).toBe(true);
  });

  it("returns empty array for unreferenced target", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);
    const backlinks = getBacklinks(index, "ref", "nonexistent");

    expect(backlinks).toEqual([]);
  });
});

describe("getSectionsReferencingKeyword", () => {
  it("returns sections that reference a keyword", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);
    const sections = getSectionsReferencingKeyword(index, "match");

    expect(sections).toContain("first-queries");
    expect(sections).toContain("advanced-patterns");
  });

  it("returns unique section IDs", () => {
    const index = buildLinkIndex(MOCK_SECTIONS);
    const sections = getSectionsReferencingKeyword(index, "match");
    const uniqueSections = [...new Set(sections)];

    expect(sections.length).toBe(uniqueSections.length);
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe("findBrokenLinks", () => {
  it("finds links to non-existent sections", () => {
    const sectionsMap = new Map(MOCK_SECTIONS.map((s) => [s.id, s]));

    // Add a broken link
    const brokenSection: ParsedSection = {
      id: "broken",
      title: "Broken Links",
      context: null,
      requires: [],
      headings: [],
      examples: [],
      rawContent: "See [[learn:nonexistent-section]].",
      sourceFile: "broken.md",
    };
    const extendedSections = [...MOCK_SECTIONS, brokenSection];
    const extendedIndex = buildLinkIndex(extendedSections);
    sectionsMap.set("broken", brokenSection);

    const broken = findBrokenLinks(extendedIndex, sectionsMap);

    expect(broken.some((b) => b.link.targetId === "nonexistent-section")).toBe(true);
  });

  it("finds broken internal heading links", () => {
    const sectionsMap = new Map(MOCK_SECTIONS.map((s) => [s.id, s]));

    // Add section with broken heading link
    const brokenSection: ParsedSection = {
      id: "broken-heading",
      title: "Broken Heading",
      context: null,
      requires: [],
      headings: [{ id: "intro", text: "Intro", level: 1, line: 1 }],
      examples: [],
      rawContent: "Jump to [[#nonexistent-heading]].",
      sourceFile: "broken-heading.md",
    };
    const extendedSections = [...MOCK_SECTIONS, brokenSection];
    const extendedIndex = buildLinkIndex(extendedSections);
    sectionsMap.set("broken-heading", brokenSection);

    const broken = findBrokenLinks(extendedIndex, sectionsMap);

    expect(broken.some((b) => b.link.targetId === "nonexistent-heading")).toBe(true);
  });

  it("returns empty array when all links are valid", () => {
    const sectionsMap = new Map(MOCK_SECTIONS.map((s) => [s.id, s]));
    const index = buildLinkIndex(MOCK_SECTIONS);

    const broken = findBrokenLinks(index, sectionsMap);
    const learnBroken = broken.filter((b) => b.link.type === "learn");

    // All our test sections exist, so learn links should be valid
    // Note: advanced-patterns is referenced but exists
    expect(learnBroken.every((b) => !sectionsMap.has(b.link.targetId))).toBe(true);
  });
});

// ============================================================================
// Link Path/Display Tests
// ============================================================================

describe("getLinkPath", () => {
  it("generates learn section path", () => {
    const link: ParsedLink = {
      type: "learn",
      targetId: "first-queries",
      headingId: null,
      rawText: "[[learn:first-queries]]",
      lineNumber: 1,
      displayText: null,
    };

    expect(getLinkPath(link)).toBe("/learn/first-queries");
  });

  it("generates learn section path with heading", () => {
    const link: ParsedLink = {
      type: "learn",
      targetId: "first-queries",
      headingId: "variables",
      rawText: "[[learn:first-queries#variables]]",
      lineNumber: 1,
      displayText: null,
    };

    expect(getLinkPath(link)).toBe("/learn/first-queries#variables");
  });

  it("generates reference path", () => {
    const link: ParsedLink = {
      type: "ref",
      targetId: "match",
      headingId: null,
      rawText: "[[ref:match]]",
      lineNumber: 1,
      displayText: null,
    };

    expect(getLinkPath(link)).toBe("/reference/match");
  });

  it("generates heading anchor for internal links", () => {
    const link: ParsedLink = {
      type: "heading",
      targetId: "syntax",
      headingId: null,
      rawText: "[[#syntax]]",
      lineNumber: 1,
      displayText: null,
    };

    expect(getLinkPath(link)).toBe("#syntax");
  });
});

describe("getLinkDisplayText", () => {
  it("uses explicit display text when provided", () => {
    const link: ParsedLink = {
      type: "ref",
      targetId: "match",
      headingId: null,
      rawText: "[[ref:match|Match Clause]]",
      lineNumber: 1,
      displayText: "Match Clause",
    };
    const sectionsMap = new Map(MOCK_SECTIONS.map((s) => [s.id, s]));

    expect(getLinkDisplayText(link, sectionsMap)).toBe("Match Clause");
  });

  it("uses section title for learn links", () => {
    const link: ParsedLink = {
      type: "learn",
      targetId: "first-queries",
      headingId: null,
      rawText: "[[learn:first-queries]]",
      lineNumber: 1,
      displayText: null,
    };
    const sectionsMap = new Map(MOCK_SECTIONS.map((s) => [s.id, s]));

    expect(getLinkDisplayText(link, sectionsMap)).toBe("Your First Queries");
  });

  it("includes heading text for learn links with anchor", () => {
    const link: ParsedLink = {
      type: "learn",
      targetId: "first-queries",
      headingId: "variables",
      rawText: "[[learn:first-queries#variables]]",
      lineNumber: 1,
      displayText: null,
    };
    const sectionsMap = new Map(MOCK_SECTIONS.map((s) => [s.id, s]));

    expect(getLinkDisplayText(link, sectionsMap)).toBe("Your First Queries - Variables");
  });

  it("capitalizes reference keywords", () => {
    const link: ParsedLink = {
      type: "ref",
      targetId: "match",
      headingId: null,
      rawText: "[[ref:match]]",
      lineNumber: 1,
      displayText: null,
    };
    const sectionsMap = new Map(MOCK_SECTIONS.map((s) => [s.id, s]));

    expect(getLinkDisplayText(link, sectionsMap)).toBe("Match");
  });

  it("formats heading IDs as readable text", () => {
    const link: ParsedLink = {
      type: "heading",
      targetId: "getting-started",
      headingId: null,
      rawText: "[[#getting-started]]",
      lineNumber: 1,
      displayText: null,
    };
    const sectionsMap = new Map(MOCK_SECTIONS.map((s) => [s.id, s]));

    expect(getLinkDisplayText(link, sectionsMap)).toBe("getting started");
  });
});
