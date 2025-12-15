/**
 * Curriculum Module
 *
 * Provides access to parsed curriculum content for the interactive learning environment.
 *
 * Browser usage:
 * ```typescript
 * import { sections, getCurriculumSection, getAllExamples } from '@/curriculum';
 * ```
 *
 * Build-time / test usage:
 * ```typescript
 * import { parseSection, validateSection } from '@/curriculum/parser';
 * ```
 *
 * @module curriculum
 */

// Re-export types
export type {
  CurriculumMeta,
  SectionMeta,
  LessonMeta,
  ContextMeta,
  ParsedSection,
  ParsedHeading,
  ParsedExample,
  ExampleType,
  ExampleExpectation,
  LoadedContext,
  CurriculumBundle,
  CurriculumBundleJSON,
} from './types';

// Re-export browser-safe content accessors
export {
  sections,
  contexts,
  metadata,
  getCurriculumSection,
  getCurriculumSectionsByContext,
  getExampleById,
  getAllExamples,
  getExampleIdsForSection,
  hasContext,
  getContext,
  getSectionNavigation,
  type SectionNavItem,
} from './content';
