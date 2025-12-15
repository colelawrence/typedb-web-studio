/**
 * Curriculum Markdown Parser
 *
 * Parses curriculum markdown files into structured content.
 * This module runs in Node.js during build/test, not in the browser.
 *
 * @module curriculum/parser
 */

import matter from 'gray-matter';
import type {
  ParsedSection,
  ParsedExample,
  ParsedHeading,
  ExampleType,
  ExampleExpectation,
} from './types';

/**
 * Regular expression to match TypeQL code fences with annotations.
 *
 * Matches patterns like:
 * ```typeql:example[id=foo, expect=results, min=1]
 * match $x isa person;
 * ```
 *
 * Groups:
 * 1. Type (example, invalid, schema, readonly)
 * 2. Attributes string (id=foo, expect=results, ...)
 * 3. Query content
 */
const CODE_FENCE_REGEX = /```typeql:(\w+)\[([^\]]*)\]\n([\s\S]*?)```/g;

/**
 * Regular expression to match markdown headings.
 *
 * Groups:
 * 1. Hash characters (determines level)
 * 2. Heading text
 */
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm;

/**
 * Parse a curriculum markdown file into structured content.
 *
 * @param markdown - The raw markdown content
 * @param sourceFile - Source file path for error reporting
 * @returns Parsed section data
 */
export function parseSection(markdown: string, sourceFile: string): ParsedSection {
  const { data: frontmatter, content } = matter(markdown);

  // Validate required frontmatter fields
  if (!frontmatter.id) {
    console.warn(`[Parser] Section in ${sourceFile} missing required 'id' field in frontmatter`);
  }
  if (!frontmatter.title) {
    console.warn(`[Parser] Section in ${sourceFile} missing required 'title' field in frontmatter`);
  }

  return {
    id: frontmatter.id ?? slugify(sourceFile),
    title: frontmatter.title ?? 'Untitled',
    context: frontmatter.context ?? null,
    requires: Array.isArray(frontmatter.requires) ? frontmatter.requires : [],
    headings: parseHeadings(content),
    examples: parseExamples(content, sourceFile),
    rawContent: content,
    sourceFile,
  };
}

/**
 * Extract all headings from markdown content.
 */
function parseHeadings(content: string): ParsedHeading[] {
  const headings: ParsedHeading[] = [];

  // Reset regex state for fresh matching
  HEADING_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = HEADING_REGEX.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const line = content.slice(0, match.index).split('\n').length;

    headings.push({
      id: slugify(text),
      text,
      level,
      line,
    });
  }

  return headings;
}

/**
 * Extract all TypeQL examples from markdown content.
 */
function parseExamples(content: string, sourceFile: string): ParsedExample[] {
  const examples: ParsedExample[] = [];

  // Reset regex state for fresh matching
  CODE_FENCE_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CODE_FENCE_REGEX.exec(content)) !== null) {
    const type = match[1] as ExampleType;
    const attrsString = match[2];
    const query = match[3].trim();
    const lineNumber = content.slice(0, match.index).split('\n').length;

    // Validate type
    if (!isValidExampleType(type)) {
      console.warn(
        `[Parser] Invalid example type '${type}' at ${sourceFile}:${lineNumber}. ` +
        `Valid types: example, invalid, schema, readonly`
      );
      continue;
    }

    const attrs = parseAttributes(attrsString);

    // Validate required id attribute
    if (!attrs.id) {
      console.warn(`[Parser] Example at ${sourceFile}:${lineNumber} missing required 'id' attribute`);
      continue;
    }

    examples.push({
      id: attrs.id,
      type,
      query,
      expect: parseExpectation(attrs),
      notes: attrs.notes,
      sourceFile,
      lineNumber,
    });
  }

  return examples;
}

/**
 * Parse attribute string from code fence annotation.
 *
 * Handles formats like:
 * - id=foo
 * - id="foo bar"
 * - expect=results, min=1, max=5
 */
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  if (!attrString.trim()) return attrs;

  // Match key=value or key="quoted value" patterns
  const regex = /(\w+)=(?:"([^"]*)"|'([^']*)'|([^\s,\]]+))/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(attrString)) !== null) {
    const key = match[1];
    // Value could be in group 2 (double quoted), 3 (single quoted), or 4 (unquoted)
    const value = match[2] ?? match[3] ?? match[4];
    attrs[key] = value;
  }

  return attrs;
}

/**
 * Parse expectation attributes into structured form.
 */
function parseExpectation(attrs: Record<string, string>): ExampleExpectation | undefined {
  const expect: ExampleExpectation = {};

  if (attrs.expect === 'results' || attrs.expect === 'success') {
    expect.results = true;
  }

  if (attrs.min !== undefined) {
    const min = parseInt(attrs.min, 10);
    if (!isNaN(min)) {
      expect.min = min;
    }
  }

  if (attrs.max !== undefined) {
    const max = parseInt(attrs.max, 10);
    if (!isNaN(max)) {
      expect.max = max;
    }
  }

  if (attrs.error) {
    expect.error = attrs.error;
  }

  // Return undefined if no expectations were set
  return Object.keys(expect).length > 0 ? expect : undefined;
}

/**
 * Convert text to URL-safe slug.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Type guard for valid example types.
 */
function isValidExampleType(type: string): type is ExampleType {
  return ['example', 'invalid', 'schema', 'readonly'].includes(type);
}

/**
 * Extract all example IDs from a parsed section.
 * Useful for validation and cross-referencing.
 */
export function getExampleIds(section: ParsedSection): string[] {
  return section.examples.map((e) => e.id);
}

/**
 * Find duplicate example IDs across multiple sections.
 * Returns map of duplicate ID to array of source locations.
 */
export function findDuplicateExampleIds(
  sections: ParsedSection[]
): Map<string, { sourceFile: string; lineNumber: number }[]> {
  const seen = new Map<string, { sourceFile: string; lineNumber: number }[]>();

  for (const section of sections) {
    for (const example of section.examples) {
      const locations = seen.get(example.id) ?? [];
      locations.push({ sourceFile: example.sourceFile, lineNumber: example.lineNumber });
      seen.set(example.id, locations);
    }
  }

  // Filter to only duplicates (more than one location)
  const duplicates = new Map<string, { sourceFile: string; lineNumber: number }[]>();
  for (const [id, locations] of seen) {
    if (locations.length > 1) {
      duplicates.set(id, locations);
    }
  }

  return duplicates;
}

/**
 * Validate a parsed section for common issues.
 * Returns array of warning messages.
 */
export function validateSection(section: ParsedSection): string[] {
  const warnings: string[] = [];

  // Check for missing IDs
  if (!section.id) {
    warnings.push(`Section in ${section.sourceFile} has no ID`);
  }

  // Check for missing title
  if (!section.title || section.title === 'Untitled') {
    warnings.push(`Section ${section.id} in ${section.sourceFile} has no title`);
  }

  // Check for examples without expectations
  for (const example of section.examples) {
    if (example.type === 'example' && !example.expect) {
      warnings.push(
        `Example '${example.id}' at ${example.sourceFile}:${example.lineNumber} ` +
        `has no expectations defined`
      );
    }

    if (example.type === 'invalid' && !example.expect?.error) {
      warnings.push(
        `Invalid example '${example.id}' at ${example.sourceFile}:${example.lineNumber} ` +
        `has no expected error pattern`
      );
    }
  }

  // Check for empty content
  if (section.headings.length === 0) {
    warnings.push(`Section ${section.id} in ${section.sourceFile} has no headings`);
  }

  return warnings;
}
