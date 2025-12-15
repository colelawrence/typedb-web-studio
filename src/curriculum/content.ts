/**
 * Curriculum Content Access
 *
 * This module provides typed access to curriculum content that was
 * parsed at build time by the Vite plugin. Browser code imports this
 * module to access pre-parsed sections, examples, and contexts.
 *
 * At build time, the virtual:curriculum-content module is populated
 * with parsed markdown content. This file re-exports that content
 * with proper TypeScript types.
 *
 * @module curriculum/content
 */

import type { ParsedSection, ParsedExample, ContextMeta } from './types';

// Import from virtual module (populated at build time by curriculum Vite plugin)
import {
  curriculumSections,
  curriculumContexts,
  curriculumMetadata,
  getCurriculumSection as _getCurriculumSection,
  getCurriculumSectionsByContext as _getCurriculumSectionsByContext,
  getExampleById as _getExampleById,
  getAllExamples as _getAllExamples,
} from 'virtual:curriculum-content';

/**
 * All parsed curriculum sections.
 */
export const sections: ParsedSection[] = curriculumSections;

/**
 * All available contexts (schema + seed data configurations).
 */
export const contexts: ContextMeta[] = curriculumContexts;

/**
 * Metadata about the curriculum content.
 */
export const metadata: {
  generatedAt: string;
  totalExamples: number;
  totalSections: number;
} = curriculumMetadata;

/**
 * Get a curriculum section by ID.
 *
 * @param id - Section ID from frontmatter
 * @returns The parsed section, or null if not found
 */
export function getCurriculumSection(id: string): ParsedSection | null {
  return _getCurriculumSection(id);
}

/**
 * Get all sections that use a specific context.
 *
 * @param contextName - Context name (e.g., 'social-network')
 * @returns Array of sections using that context
 */
export function getCurriculumSectionsByContext(contextName: string): ParsedSection[] {
  return _getCurriculumSectionsByContext(contextName);
}

/**
 * Look up an example by its ID across all sections.
 *
 * @param exampleId - Example ID from code fence annotation
 * @returns Object with section and example, or null if not found
 */
export function getExampleById(exampleId: string): { section: ParsedSection; example: ParsedExample } | null {
  return _getExampleById(exampleId);
}

/**
 * Get all examples from all sections, with section context.
 *
 * @returns Array of examples with their parent section info
 */
export function getAllExamples(): Array<ParsedExample & { sectionId: string; sectionTitle: string }> {
  return _getAllExamples();
}

/**
 * Get example IDs for a specific section.
 *
 * @param sectionId - Section ID
 * @returns Array of example IDs, or empty array if section not found
 */
export function getExampleIdsForSection(sectionId: string): string[] {
  const section = getCurriculumSection(sectionId);
  return section?.examples.map((e) => e.id) ?? [];
}

/**
 * Check if a context exists.
 *
 * @param contextName - Context name to check
 * @returns True if the context exists
 */
export function hasContext(contextName: string): boolean {
  return contexts.some((c) => c.name === contextName);
}

/**
 * Get context metadata by name.
 *
 * @param contextName - Context name
 * @returns Context metadata, or undefined if not found
 */
export function getContext(contextName: string): ContextMeta | undefined {
  return contexts.find((c) => c.name === contextName);
}

/**
 * Get the section navigation tree structure.
 *
 * Returns sections organized by their file path hierarchy.
 */
export interface SectionNavItem {
  id: string;
  title: string;
  path: string[];
  context: string | null;
  exampleCount: number;
}

export function getSectionNavigation(): SectionNavItem[] {
  return sections.map((s) => {
    // Extract path from sourceFile (e.g., "01-foundations/03-first-queries.md")
    const parts = s.sourceFile.split('/');
    const pathParts = parts.slice(0, -1); // Remove filename

    return {
      id: s.id,
      title: s.title,
      path: pathParts,
      context: s.context,
      exampleCount: s.examples.length,
    };
  });
}
