/**
 * Learn View Models
 *
 * VM interfaces and scope for the interactive learning sidebar and document viewer.
 *
 * @module vm/learn
 */

// Sidebar types
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

// Document viewer types
export type {
  DocumentViewerVM,
  DocumentSectionVM,
  DocumentProgressVM,
  DocumentHeadingVM,
  DocumentExampleVM,
  ExampleExecutionState,
  ExampleRunResultVM,
  ContextSwitchPromptVM,
} from "./document-viewer.vm";

// Sidebar scope
export {
  createLearnSidebarScope,
  type LearnSidebarScopeOptions,
} from "./sidebar-scope";

// Document viewer scope
export {
  createDocumentViewerScope,
  type DocumentViewerScopeOptions,
} from "./document-viewer-scope";
