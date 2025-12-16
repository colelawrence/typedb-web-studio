/**
 * Document Viewer VM Scope
 *
 * Creates the DocumentViewerVM by composing reactive state from LiveStore
 * with curriculum content and REPL integration.
 *
 * @module vm/learn/document-viewer-scope
 */

import { computed } from "@livestore/livestore";
import type { Queryable, Store } from "@livestore/livestore";

import { events, type schema } from "../../livestore/schema";
import {
  uiState$,
  readingProgressForSection$,
  executedExampleIds$,
} from "../../livestore/queries";
import type { ParsedSection } from "../../curriculum/types";
import type { ReplBridge } from "../../learn/repl-bridge";
import {
  type DocumentViewerVM,
  type DocumentSectionVM,
  type DocumentProgressVM,
  type DocumentHeadingVM,
  type DocumentExampleVM,
  type ExampleExecutionState,
  type ExampleRunResultVM,
  type ContextSwitchPromptVM,
} from "./document-viewer.vm";
import type { ContextManager } from "../../curriculum/context-manager";
import { constant } from "./constant";


// ============================================================================
// Service Interface
// ============================================================================

/**
 * Service for programmatic control of the document viewer.
 * Used by other scopes (e.g., sidebar, query page) to interact with the viewer.
 */
export interface DocumentViewerService {
  /** Open a section by ID. */
  openSection(sectionId: string): void;
  /** Close the current section. */
  closeSection(): void;
  /** Get the currently open section ID, or null if none. */
  getCurrentSectionId(): string | null;
  /** Mark a section as fully read. */
  markSectionRead(sectionId: string): void;
}

// ============================================================================
// Scope Types
// ============================================================================

export interface DocumentViewerScopeOptions {
  /** LiveStore instance */
  store: Store<typeof schema>;
  /** Current profile ID */
  profileId: string;
  /** Parsed curriculum sections (from virtual module) */
  sections: Record<string, ParsedSection>;
  /** REPL bridge for document-to-REPL communication */
  replBridge: ReplBridge;
  /** Context manager for loading/switching lesson contexts */
  contextManager?: ContextManager;
  /** Callback when section is opened (for navigation) */
  onSectionOpened?: (sectionId: string) => void;
  /**
   * State keys configuration.
   * Allows different instances (Learn page vs Query page) to use separate state.
   */
  stateKeys?: {
    /** Key for viewer visibility in uiState. Default: "learnViewerVisible" */
    visibleKey: "learnViewerVisible" | "queryDocsViewerVisible";
    /** Key for current section ID in uiState. Default: "learnCurrentSectionId" */
    sectionIdKey: "learnCurrentSectionId" | "queryDocsCurrentSectionId";
    /** Label prefix for computed queryables. Default: "documentViewer" */
    labelPrefix: string;
  };
}

// ============================================================================
// Main Factory
// ============================================================================

/**
 * Creates the DocumentViewerVM scope with all reactive state wired up.
 * Returns both the VM (for UI consumption) and the service (for other scopes).
 */
export function createDocumentViewerScope(
  options: DocumentViewerScopeOptions
): { vm: DocumentViewerVM; service: DocumentViewerService } {
  const {
    store,
    profileId,
    sections,
    replBridge,
    contextManager,
    onSectionOpened,
    stateKeys = {
      visibleKey: "learnViewerVisible",
      sectionIdKey: "learnCurrentSectionId",
      labelPrefix: "documentViewer",
    },
  } = options;

  const { visibleKey, sectionIdKey, labelPrefix } = stateKeys;

  // ---------------------------------------------------------------------------
  // Visibility State (from LiveStore)
  // ---------------------------------------------------------------------------

  const isVisible$ = computed(
    (get) => get(uiState$)[visibleKey],
    { label: `${labelPrefix}.isVisible` }
  );

  const show = () => {
    store.commit(events.uiStateSet({ [visibleKey]: true }));
  };
  const hide = () => {
    store.commit(events.uiStateSet({ [visibleKey]: false }));
  };
  const toggle = () => {
    const current = store.query(uiState$)[visibleKey];
    store.commit(events.uiStateSet({ [visibleKey]: !current }));
  };

  // ---------------------------------------------------------------------------
  // Current Section State (from LiveStore)
  // ---------------------------------------------------------------------------

  const isLoading$ = constant(false, `${labelPrefix}.isLoading`);
  const error$ = constant(null as string | null, `${labelPrefix}.error`);

  // Cache for section VMs to avoid recreating them on every computed run
  const sectionVMCache = new Map<string, DocumentSectionVM>();

  const currentSection$ = computed(
    (get): DocumentSectionVM | null => {
      const sectionId = get(uiState$)[sectionIdKey];
      if (!sectionId) return null;

      // Check cache first
      let sectionVM = sectionVMCache.get(sectionId);
      if (!sectionVM) {
        sectionVM = createSectionVM(sectionId) ?? undefined;
        if (sectionVM) {
          sectionVMCache.set(sectionId, sectionVM);
        }
      }
      return sectionVM ?? null;
    },
    { label: `${labelPrefix}.currentSection` }
  );

  // ---------------------------------------------------------------------------
  // Section Creation
  // ---------------------------------------------------------------------------

  const createSectionVM = (sectionId: string): DocumentSectionVM | null => {
    const section = sections[sectionId];
    if (!section) return null;

    // Get reading progress for this section
    const progressQuery$ = readingProgressForSection$(profileId, sectionId);
    const executedQuery$ = executedExampleIds$(profileId);

    // Create heading VMs
    const headingVMs = section.headings.map((heading): DocumentHeadingVM => {
      const headingKey = `${profileId}:${sectionId}:${heading.id}`;

      const isRead$ = computed(
        (get) => {
          const progress = get(progressQuery$);
          return progress.some(p => p.headingId === heading.id && p.markedRead);
        },
        { label: `heading.isRead:${headingKey}` }
      );

      const markRead = () => {
        store.commit(events.readingProgressMarked({
          profileId,
          sectionId,
          headingId: heading.id,
          markedRead: true,
          viewedAt: new Date(),
        }));
      };

      const markUnread = () => {
        store.commit(events.readingProgressMarked({
          profileId,
          sectionId,
          headingId: heading.id,
          markedRead: false,
          viewedAt: new Date(),
        }));
      };

      const toggleRead = () => {
        const isCurrentlyRead = store.query(isRead$);
        if (isCurrentlyRead) {
          markUnread();
        } else {
          markRead();
        }
      };

      return {
        id: heading.id,
        text: heading.text,
        level: heading.level,
        lineNumber: heading.line,
        isRead$,
        markRead,
        markUnread,
        toggleRead,
      };
    });

    // Create example VMs
    const exampleVMs = section.examples.map((example): DocumentExampleVM => {
      const exampleKey = `${profileId}:${example.id}`;
      const isInteractive = example.type === "example" || example.type === "invalid";

      // Execution state (local, not persisted)
      let executionState: ExampleExecutionState = { type: "idle" };
      const executionState$ = computed(
        () => executionState,
        { label: `example.executionState:${exampleKey}` }
      );

      const wasExecuted$ = computed(
        (get) => {
          const executed = get(executedQuery$);
          return executed.some(e => e.exampleId === example.id);
        },
        { label: `example.wasExecuted:${exampleKey}` }
      );

      const copyToReplAction = () => {
        replBridge.copyToRepl(example.query);
        // Record as docs-copy execution (not a full run)
        store.commit(events.exampleExecuted({
          profileId,
          exampleId: example.id,
          succeeded: true,
          source: "docs-copy",
          executedAt: new Date(),
          durationMs: null,
          errorMessage: null,
        }));
      };

      const runAction = async (): Promise<ExampleRunResultVM> => {
        executionState = { type: "running" };

        try {
          const result = await replBridge.runQuery(example.query);

          // Record execution
          store.commit(events.exampleExecuted({
            profileId,
            exampleId: example.id,
            succeeded: result.success,
            source: "docs-run",
            executedAt: new Date(),
            durationMs: result.executionTimeMs,
            errorMessage: result.error ?? null,
          }));

          if (result.success) {
            executionState = { type: "success", resultCount: result.resultCount ?? 0 };
          } else {
            executionState = { type: "error", message: result.error ?? "Unknown error" };
          }

          return {
            success: result.success,
            resultCount: result.resultCount,
            error: result.error,
            executionTimeMs: result.executionTimeMs,
          };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          executionState = { type: "error", message: errorMessage };

          store.commit(events.exampleExecuted({
            profileId,
            exampleId: example.id,
            succeeded: false,
            source: "docs-run",
            executedAt: new Date(),
            durationMs: null,
            errorMessage,
          }));

          return {
            success: false,
            error: errorMessage,
            executionTimeMs: 0,
          };
        }
      };

      return {
        id: example.id,
        type: example.type,
        query: example.query,
        expect: example.expect ?? null,
        sourceFile: example.sourceFile,
        lineNumber: example.lineNumber,
        isInteractive,
        wasExecuted$,
        copyToRepl: copyToReplAction,
        run: runAction,
        executionState$,
      };
    });

    // Overall section progress
    const progress$ = computed(
      (get): DocumentProgressVM => {
        const progress = get(progressQuery$);
        const readCount = progress.filter(p => p.markedRead).length;
        const totalCount = section.headings.length || 1; // At least 1 for the root section
        const percent = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;

        return {
          readCount,
          totalCount,
          percent,
          isComplete: readCount >= totalCount,
        };
      },
      { label: `section.progress:${sectionId}` }
    );

    const markAllRead = () => {
      // Mark root section
      store.commit(events.readingProgressMarked({
        profileId,
        sectionId,
        headingId: null,
        markedRead: true,
        viewedAt: new Date(),
      }));

      // Mark all headings
      for (const heading of section.headings) {
        store.commit(events.readingProgressMarked({
          profileId,
          sectionId,
          headingId: heading.id,
          markedRead: true,
          viewedAt: new Date(),
        }));
      }
    };

    const markAllUnread = () => {
      store.commit(events.readingProgressCleared({
        profileId,
        sectionId,
      }));
    };

    return {
      id: section.id,
      title: section.title,
      context: section.context,
      requires: section.requires,
      rawContent: section.rawContent,
      headings: headingVMs,
      examples: exampleVMs,
      progress$,
      markAllRead,
      markAllUnread,
    };
  };

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const openSection = (sectionId: string) => {
    const currentSectionId = store.query(uiState$).learnCurrentSectionId;
    if (sectionId === currentSectionId) {
      // Already open, just ensure visible
      show();
      return;
    }

    // Check if section exists before updating state
    const section = sections[sectionId];
    if (section) {
      store.commit(events.uiStateSet({
        [sectionIdKey]: sectionId,
        [visibleKey]: true,
      }));
      onSectionOpened?.(sectionId);
    }
  };

  const closeSection = () => {
    store.commit(events.uiStateSet({ [sectionIdKey]: null }));
  };

  // ---------------------------------------------------------------------------
  // Context Switch Prompt
  // ---------------------------------------------------------------------------

  let contextPromptDismissed = false;

  // Helper to get current section (non-reactive, for imperative code)
  const getCurrentSection = (): DocumentSectionVM | null => {
    return store.query(currentSection$);
  };

  const contextPromptIsVisible$ = computed(
    (get) => {
      // Not visible if dismissed for this section
      if (contextPromptDismissed) return false;

      // Not visible if no context manager
      if (!contextManager) return false;

      // Get current section reactively
      const section = get(currentSection$);

      // Not visible if no section loaded
      if (!section) return false;

      // Not visible if section doesn't require a context
      if (!section.context) return false;

      // Visible if context doesn't match
      return !contextManager.isContextLoaded(section.context);
    },
    { label: "contextSwitchPrompt.isVisible" }
  );

  const currentContext$ = computed(
    () => contextManager?.currentContext ?? null,
    { label: "contextSwitchPrompt.currentContext" }
  );

  const requiredContext$ = computed(
    (get) => get(currentSection$)?.context ?? null,
    { label: "contextSwitchPrompt.requiredContext" }
  );

  const switchContext = async () => {
    const section = getCurrentSection();
    if (!contextManager || !section?.context) return;
    await contextManager.loadContext(section.context);
    contextPromptDismissed = false; // Reset dismissal after successful switch
  };

  const dismissContextPrompt = () => {
    contextPromptDismissed = true;
  };

  const contextSwitchPrompt: ContextSwitchPromptVM = {
    isVisible$: contextPromptIsVisible$,
    currentContext$,
    requiredContext$,
    switchContext,
    dismiss: dismissContextPrompt,
  };

  // ---------------------------------------------------------------------------
  // Service Methods
  // ---------------------------------------------------------------------------

  const getCurrentSectionId = (): string | null => {
    return store.query(uiState$)[sectionIdKey] ?? null;
  };

  const markSectionRead = (sectionId: string): void => {
    const section = sections[sectionId];
    if (!section) return;

    // Mark root section
    store.commit(events.readingProgressMarked({
      profileId,
      sectionId,
      headingId: null,
      markedRead: true,
      viewedAt: new Date(),
    }));

    // Mark all headings
    for (const heading of section.headings) {
      store.commit(events.readingProgressMarked({
        profileId,
        sectionId,
        headingId: heading.id,
        markedRead: true,
        viewedAt: new Date(),
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // Return VM and Service
  // ---------------------------------------------------------------------------

  const vm: DocumentViewerVM = {
    isVisible$,
    show,
    hide,
    toggle,
    currentSection$,
    openSection,
    closeSection,
    isLoading$,
    error$,
    contextSwitchPrompt,
  };

  const service: DocumentViewerService = {
    openSection,
    closeSection,
    getCurrentSectionId,
    markSectionRead,
  };

  return { vm, service };
}
