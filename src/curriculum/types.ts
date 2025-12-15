/**
 * Curriculum Content Types
 *
 * Type definitions for the interactive learning curriculum.
 * These types are used by both the build-time parser and the runtime browser bundle.
 */

/**
 * Top-level curriculum metadata from _meta.yaml
 */
export interface CurriculumMeta {
  name: string;
  version: string;
  sections: SectionMeta[];
  contexts: ContextMeta[];
}

/**
 * Section metadata from _meta.yaml
 */
export interface SectionMeta {
  id: string;
  title: string;
  path: string;
  lessons: LessonMeta[];
}

/**
 * Lesson metadata from _meta.yaml
 */
export interface LessonMeta {
  id: string;
  title: string;
  file: string;
  context: string | null;
  requires?: string[];
}

/**
 * Context metadata (schema + seed data setup)
 */
export interface ContextMeta {
  /** Context name (directory name under _contexts) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Path to schema.tql file */
  schemaFile: string;
  /** Path to seed.tql file */
  seedFile: string;
}

/**
 * A parsed curriculum section/lesson from markdown
 */
export interface ParsedSection {
  /** Unique identifier from frontmatter */
  id: string;
  /** Display title from frontmatter */
  title: string;
  /** Which DB context to use (e.g., "social-network") */
  context: string | null;
  /** Prerequisite section IDs */
  requires: string[];
  /** Extracted headings for navigation */
  headings: ParsedHeading[];
  /** Interactive code examples */
  examples: ParsedExample[];
  /** Original markdown content (post-frontmatter) */
  rawContent: string;
  /** Source file path for error reporting */
  sourceFile: string;
}

/**
 * A heading extracted from markdown content
 */
export interface ParsedHeading {
  /** Slugified heading text for anchor links */
  id: string;
  /** Original heading text */
  text: string;
  /** Heading level (1-6) */
  level: number;
  /** Source line number for navigation */
  line: number;
}

/**
 * An interactive code example from a markdown code fence
 */
export interface ParsedExample {
  /** Unique identifier (required in code fence attributes) */
  id: string;
  /** Type determines how the example is handled */
  type: ExampleType;
  /** The TypeQL query text */
  query: string;
  /** Expected behavior for validation */
  expect?: ExampleExpectation;
  /** Optional notes or explanation */
  notes?: string;
  /** Source file path for error reporting */
  sourceFile: string;
  /** Source line number for error reporting */
  lineNumber: number;
}

/**
 * Example type determines behavior and validation
 *
 * - example: Runnable query that should succeed
 * - invalid: Query that should fail (demonstrates errors)
 * - schema: Schema definition query
 * - readonly: Display only, not interactive
 */
export type ExampleType = 'example' | 'invalid' | 'schema' | 'readonly';

/**
 * Expected behavior for example validation
 */
export interface ExampleExpectation {
  /** Whether the query should return results */
  results?: boolean;
  /** Minimum number of results expected */
  min?: number;
  /** Maximum number of results expected */
  max?: number;
  /** Error pattern to match (for 'invalid' type) */
  error?: string;
}

/**
 * Loaded context with schema and seed data
 */
export interface LoadedContext {
  name: string;
  description: string;
  schema: string;
  seed: string;
}

/**
 * Build-time curriculum bundle for browser consumption
 */
export interface CurriculumBundle {
  meta: CurriculumMeta;
  sections: Map<string, ParsedSection>;
  contexts: Map<string, LoadedContext>;
}

/**
 * JSON-serializable version of CurriculumBundle for static import
 */
export interface CurriculumBundleJSON {
  meta: CurriculumMeta;
  sections: Record<string, ParsedSection>;
  contexts: Record<string, LoadedContext>;
}
