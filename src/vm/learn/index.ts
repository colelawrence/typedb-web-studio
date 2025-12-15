/**
 * Learn View Models
 *
 * VM interfaces and scope for the interactive learning sidebar.
 *
 * @module vm/learn
 */

// Types
export type {
  LearnSidebarVM,
  LearnSidebarViewState,
  LearnSearchVM,
  LearnSearchResultsVM,
  LearnSearchResultGroupVM,
  LearnSearchResultItemVM,
  LearnSectionVM,
  LearnFolderVM,
  LearnSectionItemVM,
  ReferenceSectionVM,
  ReferenceFolderVM,
  ReferenceItemVM,
  ProgressState,
} from "./learn-sidebar.vm";

// Scope
export {
  createLearnSidebarScope,
  type LearnSidebarScopeOptions,
} from "./sidebar-scope";
