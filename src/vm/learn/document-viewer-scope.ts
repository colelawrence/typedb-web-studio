/**
 * Document Viewer VM Scope
 *
 * Creates the DocumentViewerVM by composing reactive state from LiveStore
 * with curriculum content and REPL integration.
 *
 * @module vm/learn/document-viewer-scope
 */

import { computed, signal } from "@livestore/livestore";
import type { Store } from "@livestore/livestore";

import { events, type schema } from "../../livestore/schema";
import {
  uiState$,
  readingProgressForSection$,
  executedExampleIds$,
  lessonContext$,
  connectionSession$,
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
  type ExampleRunReadiness,
  type ExampleRunResultVM,
  type ContextSwitchPromptVM,
} from "./document-viewer.vm";
import type { ContextManager } from "../../curriculum/context-manager";
import { lessonDatabaseNameForContext } from "../../curriculum/lesson-db";
import { constant } from "./constant";
import { parseContentBlocks } from "./content-blocks";


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
        { label: `heading.isRead:${headingKey}`, deps: [headingKey] }
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
      const requiredContext = section.context;

      // Execution state (local, not persisted)
      const executionState$ = signal<ExampleExecutionState>(
        { type: "idle" },
        { label: `example.executionState:${exampleKey}` }
      );

      // Current result (local, not persisted)
      const currentResult$ = signal<ExampleRunResultVM | null>(
        null,
        { label: `example.currentResult:${exampleKey}` }
      );

      // Reactive: is the required context name currently loaded?
      // Note: This only checks the context NAME, not whether the DB is actually selected.
      const isContextReady$ = computed(
        (get) => {
          if (!requiredContext) return true; // No context required
          const contextState = get(lessonContext$);
          return contextState.currentContext === requiredContext;
        },
        { label: `example.isContextReady:${exampleKey}`, deps: [exampleKey, requiredContext] }
      );

      // Reactive: is the lesson ACTUALLY ready for query execution?
      // This checks both:
      // 1. Context name matches
      // 2. Connection is established
      // 3. The expected database is selected
      const isLessonReady$ = computed(
        (get) => {
          if (!requiredContext) return true; // No context required

          const lesson = get(lessonContext$);
          const session = get(connectionSession$);

          const expectedDb = lessonDatabaseNameForContext(requiredContext);

          return (
            lesson.currentContext === requiredContext &&
            lesson.isLoading === false &&
            lesson.lastError === null &&
            session.status === "connected" &&
            session.activeDatabase === expectedDb
          );
        },
        { label: `example.isLessonReady:${exampleKey}`, deps: [exampleKey, requiredContext] }
      );

      // Reactive: why can't this example run right now?
      // Returns null if it CAN run, or a string explaining why not.
      const hasContextManager = !!contextManager;
      const runDisabledReason$ = computed<string | null>(
        (get) => {
          if (!isInteractive) {
            return "This example is read-only";
          }

          const state = get(executionState$);
          if (state.type === "running") {
            return "Running...";
          }

          // If context is required but no contextManager is provided,
          // we cannot auto-load it. However, if the context is already loaded
          // and ready, we should allow execution (e.g., E2E tests or Query page
          // where context was loaded via Learn page first).
          if (requiredContext && !hasContextManager) {
            const isReady = get(isLessonReady$);
            if (!isReady) {
              return `Requires "${requiredContext}" lesson context (open Learn page to load it)`;
            }
          }

          // The context manager can only auto-setup connection/database if there's
          // actually a context to load. For sections without a context requirement,
          // we must still check connection status and database selection.
          const canAutoLoad = requiredContext && hasContextManager;

          // Check connection status and database selection
          const session = get(connectionSession$);

          if (session.status !== "connected") {
            // Only skip this guard if context manager will auto-connect for us
            if (!canAutoLoad) {
              return "Not connected to database";
            }
          } else {
            // We're connected - check if a database is selected
            // Only skip this guard if context manager will auto-select the lesson DB
            if (!session.activeDatabase && !canAutoLoad) {
              return "Select a database first";
            }
          }

          // Can run (context will be auto-loaded if needed)
          return null;
        },
        { label: `example.runDisabledReason:${exampleKey}`, deps: [exampleKey, requiredContext, hasContextManager ? 1 : 0, isInteractive ? 1 : 0] }
      );

      // Reactive: can this example be run right now?
      const canRun$ = computed(
        (get) => {
          return get(runDisabledReason$) === null;
        },
        { label: `example.canRun:${exampleKey}`, deps: [exampleKey] }
      );

      const wasExecuted$ = computed(
        (get) => {
          const executed = get(executedQuery$);
          return executed.some(e => e.exampleId === example.id);
        },
        { label: `example.wasExecuted:${exampleKey}`, deps: [exampleKey] }
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

      const runAction = async (): Promise<void> => {
        // Guard: Check if we can actually run before doing anything
        const disabledReason = store.query(runDisabledReason$);

        console.log(
          `[ExampleBlock.run] Pre-flight check:`,
          `\n  exampleId: ${example.id}`,
          `\n  runDisabledReason: ${disabledReason}`,
          `\n  hasContextManager: ${hasContextManager}`
        );

        if (disabledReason !== null) {
          console.warn(`[ExampleBlock.run] Cannot run: ${disabledReason}`);
          return;
        }

        store.setSignal(executionState$, { type: "running" });
        store.setSignal(currentResult$, null);

        // Compute expected database name for this context
        const expectedDb = requiredContext
          ? lessonDatabaseNameForContext(requiredContext)
          : null;

        // DEBUG: Log the state when run is clicked
        const debugSession = store.query(connectionSession$);
        const debugLesson = store.query(lessonContext$);
        console.log(
          `[ExampleBlock.run] Starting execution:`,
          `\n  exampleId: ${example.id}`,
          `\n  requiredContext: ${requiredContext}`,
          `\n  expectedDb: ${expectedDb}`,
          `\n  hasContextManager: ${!!contextManager}`,
          `\n  connectionSession.status: ${debugSession.status}`,
          `\n  connectionSession.activeDatabase: ${debugSession.activeDatabase}`,
          `\n  lessonContext.currentContext: ${debugLesson.currentContext}`,
          `\n  lessonContext.isLoading: ${debugLesson.isLoading}`
        );

        try {
          // Auto-load context if section requires one and it's not already FULLY ready
          // Use the reactive isLessonReady$ signal which checks both context AND database
          if (requiredContext && contextManager) {
            const isReady = store.query(isLessonReady$);
            console.log(`[ExampleBlock.run] isLessonReady: ${isReady}`);
            if (!isReady) {
              console.log(`[ExampleBlock.run] Loading context: ${requiredContext}`);
              await contextManager.loadContext(requiredContext);
              console.log(`[ExampleBlock.run] Context loaded`);
            }
          }

          // Run the query, passing the expected database for lesson queries
          console.log(`[ExampleBlock.run] Running query on database: ${expectedDb}`);
          const result = await replBridge.runQuery(example.query, { database: expectedDb });

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
            store.setSignal(executionState$, { type: "success", resultCount: result.resultCount ?? 0 });
          } else {
            store.setSignal(executionState$, { type: "error", message: result.error ?? "Unknown error" });
          }

          store.setSignal(currentResult$, {
            success: result.success,
            resultCount: result.resultCount,
            error: result.error,
            executionTimeMs: result.executionTimeMs,
            resultRows: result.resultRows,
            logLines: result.logLines,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          store.setSignal(executionState$, { type: "error", message: errorMessage });

          store.commit(events.exampleExecuted({
            profileId,
            exampleId: example.id,
            succeeded: false,
            source: "docs-run",
            executedAt: new Date(),
            durationMs: null,
            errorMessage,
          }));

          store.setSignal(currentResult$, {
            success: false,
            error: errorMessage,
            executionTimeMs: 0,
          });
        }
      };

      // Whether context can be loaded programmatically
      const canLoadContext$ = computed(
        (get) => {
          if (!requiredContext) return false;
          if (!contextManager) return false;

          const ctx = get(lessonContext$);
          // Don't claim we can load while a load is already in progress
          if (ctx.isLoading) return false;

          return true;
        },
        { label: `example.canLoadContext:${exampleKey}`, deps: [exampleKey, requiredContext] }
      );

      // High-level readiness state for UI
      const runReadiness$ = computed<ExampleRunReadiness>(
        (get) => {
          // Non-interactive examples don't show run UI
          if (!isInteractive) return "blocked";

          const lessonReady = get(isLessonReady$);
          const canRunNow = get(canRun$);

          // If lesson is ready and we can run, we're ready
          if (lessonReady && canRunNow) {
            return "ready";
          }

          // If we're not ready but CAN load context, expose "needs-context" state
          const canLoad = get(canLoadContext$);
          if (!lessonReady && canLoad && canRunNow) {
            return "needs-context";
          }

          // Everything else is blocked (no connection, no context manager, etc.)
          return "blocked";
        },
        { label: `example.runReadiness:${exampleKey}`, deps: [exampleKey, requiredContext, hasContextManager ? 1 : 0] }
      );

      // Helper to load context without running
      const loadContextAction = async (): Promise<void> => {
        if (!contextManager || !requiredContext) return;

        const ctx = store.query(lessonContext$);
        // If already on the right context and not loading, nothing to do
        if (ctx.currentContext === requiredContext && !ctx.isLoading) return;

        // Delegates to the ContextManager (creates DB, populates, selects)
        await contextManager.loadContext(requiredContext);
      };

      return {
        id: example.id,
        type: example.type,
        query: example.query,
        expect: example.expect ?? null,
        sourceFile: example.sourceFile,
        lineNumber: example.lineNumber,
        isInteractive,
        requiredContext,
        isContextReady$,
        isLessonReady$,
        canRun$,
        runDisabledReason$,
        wasExecuted$,
        copyToRepl: copyToReplAction,
        run: runAction,
        executionState$,
        currentResult$,
        runReadiness$,
        canLoadContext$,
        loadContext: loadContextAction,
      };
    });

    // Overall section progress
    const progress$ = computed(
      (get): DocumentProgressVM => {
        const progress = get(progressQuery$);
        // Only count headings (not root entry where headingId is null)
        const readCount = progress.filter(p => p.markedRead && p.headingId !== null).length;
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

    // Parse content blocks from raw markdown using the heading/example VMs
    const contentBlocks = parseContentBlocks(
      section.rawContent,
      headingVMs,
      exampleVMs
    );

    return {
      id: section.id,
      title: section.title,
      context: section.context,
      requires: section.requires,
      contentBlocks,
      headings: headingVMs,
      examples: exampleVMs,
      progress$,
      markAllRead,
      markAllUnread,
    };
  };

  // ---------------------------------------------------------------------------
  // Context Switch Prompt - Dismissal State
  // ---------------------------------------------------------------------------

  // Dismissal state as a signal for reactivity.
  // When dismissed, stores the sectionId it was dismissed for.
  // Gets cleared when navigating to a different section to restore the
  // "reminder on revisit" behavior.
  const contextPromptDismissedFor$ = signal<string | null>(
    null,
    { label: `${labelPrefix}.contextPromptDismissedFor` }
  );

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const openSection = (sectionId: string) => {
    const currentSectionId = store.query(uiState$)[sectionIdKey];
    if (sectionId === currentSectionId) {
      // Already open, just ensure visible
      show();
      return;
    }

    // Reset dismissal state when changing sections.
    // This restores the "reminder on revisit" behavior: if the user dismisses
    // the prompt for section A, navigates to B, then back to A, the prompt
    // should appear again for A.
    store.setSignal(contextPromptDismissedFor$, null);

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
  // Context Switch Prompt - Visibility & Actions
  // ---------------------------------------------------------------------------

  // Helper to get current section (non-reactive, for imperative code)
  const getCurrentSection = (): DocumentSectionVM | null => {
    return store.query(currentSection$);
  };

  const contextPromptIsVisible$ = computed(
    (get) => {
      // Not visible if no context manager
      if (!contextManager) return false;

      // Get current section reactively
      const section = get(currentSection$);

      // Not visible if no section loaded
      if (!section) return false;

      // Not visible if section doesn't require a context
      if (!section.context) return false;

      // Read dismissal state reactively
      const dismissedForSection = get(contextPromptDismissedFor$);

      // Not visible if dismissed for THIS section
      if (dismissedForSection === section.id) {
        return false;
      }

      // Read context state from LiveStore (REACTIVE!)
      const contextState = get(lessonContext$);

      // Not visible if context is currently loading
      if (contextState.isLoading) return false;

      // Visible if context doesn't match required
      return contextState.currentContext !== section.context;
    },
    { label: `${labelPrefix}.contextSwitchPrompt.isVisible` }
  );

  const currentContext$ = computed(
    (get) => get(lessonContext$).currentContext,
    { label: `${labelPrefix}.contextSwitchPrompt.currentContext` }
  );

  const requiredContext$ = computed(
    (get) => get(currentSection$)?.context ?? null,
    { label: `${labelPrefix}.contextSwitchPrompt.requiredContext` }
  );

  const contextIsLoading$ = computed(
    (get) => get(lessonContext$).isLoading,
    { label: `${labelPrefix}.contextSwitchPrompt.isLoading` }
  );

  const contextError$ = computed(
    (get) => get(lessonContext$).lastError,
    { label: `${labelPrefix}.contextSwitchPrompt.error` }
  );

  const switchContext = async () => {
    const section = getCurrentSection();
    if (!contextManager || !section?.context) return;
    await contextManager.loadContext(section.context);
    // Clear dismissal after successful switch (prompt should hide because context now matches)
    store.setSignal(contextPromptDismissedFor$, null);
  };

  const dismissContextPrompt = () => {
    const section = getCurrentSection();
    // Set dismissal for current section (reactive!)
    store.setSignal(contextPromptDismissedFor$, section?.id ?? null);
  };

  const contextSwitchPrompt: ContextSwitchPromptVM = {
    isVisible$: contextPromptIsVisible$,
    currentContext$,
    requiredContext$,
    isLoading$: contextIsLoading$,
    error$: contextError$,
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
