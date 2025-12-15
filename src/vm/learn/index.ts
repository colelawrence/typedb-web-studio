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

// Navigation types
export type {
  LearnNavigationVM,
  NavigationTarget,
  HistoryEntry,
  HighlightState,
} from "./navigation.vm";

export {
  NavigationHistory,
  targetsEqual,
  parseNavigationPath,
  createNavigationPath,
  HIGHLIGHT_DURATION_MS,
} from "./navigation.vm";

// Sidebar scope
export {
  createLearnSidebarScope,
  type LearnSidebarScopeOptions,
} from "./sidebar-scope";

// Document viewer scope
export {
  createDocumentViewerScope,
  type DocumentViewerScopeOptions,
  type DocumentViewerService,
} from "./document-viewer-scope";

// Navigation scope
export {
  createNavigationScope,
  createMockNavigationScope,
  type NavigationScopeOptions,
  type MockNavigationScope,
} from "./navigation-scope";
