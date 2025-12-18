/**
 * Type declarations for the virtual:curriculum-content module.
 *
 * This module is generated at build time by the curriculum Vite plugin.
 * The actual content is parsed from docs/curriculum markdown files.
 */

declare module 'virtual:curriculum-content' {
  import type { ParsedSection, ParsedExample, ContextMeta, LoadedContext } from './types';

  /**
   * All parsed curriculum sections.
   */
  export const curriculumSections: ParsedSection[];

  /**
   * All available contexts (schema + seed data configurations).
   */
  export const curriculumContexts: ContextMeta[];

  /**
   * Loaded contexts with schema and seed content, keyed by context name.
   */
  export const curriculumLoadedContexts: Record<string, LoadedContext>;

  /**
   * Metadata about the curriculum content.
   */
  export const curriculumMetadata: {
    generatedAt: string;
    totalExamples: number;
    totalSections: number;
  };

  /**
   * Get a curriculum section by ID.
   */
  export function getCurriculumSection(id: string): ParsedSection | null;

  /**
   * Get all sections that use a specific context.
   */
  export function getCurriculumSectionsByContext(contextName: string): ParsedSection[];

  /**
   * Look up an example by its ID across all sections.
   */
  export function getExampleById(exampleId: string): { section: ParsedSection; example: ParsedExample } | null;

  /**
   * Get all examples from all sections, with section context.
   */
  export function getAllExamples(): Array<ParsedExample & { sectionId: string; sectionTitle: string }>;
}
