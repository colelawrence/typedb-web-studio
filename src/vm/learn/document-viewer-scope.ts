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

import type { schema, events } from "../../livestore/schema";
import {
  readingProgressForSection$,
  executedExampleIds$,
} from "../../livestore/queries";
import type { ParsedSection } from "../../curriculum/types";
import type {
  DocumentViewerVM,
  DocumentSectionVM,
  DocumentProgressVM,
  DocumentHeadingVM,
  DocumentExampleVM,
  ExampleExecutionState,
  ExampleRunResultVM,
} from "./document-viewer.vm";

// ============================================================================
// Helpers
// ============================================================================

/** Creates a queryable that always returns the same value */
function constant<T>(value: T, label: string): Queryable<T> {
  return computed((): T => value, { label });
}

// ============================================================================
// Scope Types
// ============================================================================

export interface DocumentViewerScopeOptions {
  /** LiveStore instance */
  store: Store<typeof schema>;
  /** LiveStore events for committing changes */
  events: typeof events;
  /** Current profile ID */
  profileId: string;
  /** Parsed curriculum sections (from virtual module) */
  sections: Record<string, ParsedSection>;
  /** Callback to copy query to REPL editor */
  copyToRepl: (query: string) => void;
  /** Callback to run query and get result */
  runQuery: (query: string) => Promise<{ success: boolean; resultCount?: number; error?: string; executionTimeMs: number }>;
  /** Callback when section is opened (for navigation) */
  onSectionOpened?: (sectionId: string) => void;
}

// ============================================================================
// Main Factory
// ============================================================================

/**
 * Creates the DocumentViewerVM scope with all reactive state wired up.
 */
export function createDocumentViewerScope(
  options: DocumentViewerScopeOptions
): DocumentViewerVM {
  const {
    store,
    events: storeEvents,
    profileId,
    sections,
    copyToRepl,
    runQuery,
    onSectionOpened,
  } = options;

  // ---------------------------------------------------------------------------
  // Visibility State
  // ---------------------------------------------------------------------------

  let isVisible = true;
  const isVisible$ = computed(() => isVisible, { label: "documentViewer.isVisible" });

  const show = () => { isVisible = true; };
  const hide = () => { isVisible = false; };
  const toggle = () => { isVisible = !isVisible; };

  // ---------------------------------------------------------------------------
  // Current Section State
  // ---------------------------------------------------------------------------

  let currentSectionId: string | null = null;
  let currentSectionVM: DocumentSectionVM | null = null;

  const isLoading$ = constant(false, "documentViewer.isLoading");
  const error$ = constant(null as string | null, "documentViewer.error");

  const currentSection$ = computed(
    () => currentSectionVM,
    { label: "documentViewer.currentSection" }
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
        store.commit(storeEvents.readingProgressMarked({
          profileId,
          sectionId,
          headingId: heading.id,
          markedRead: true,
          viewedAt: new Date(),
        }));
      };

      const markUnread = () => {
        store.commit(storeEvents.readingProgressMarked({
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
        copyToRepl(example.query);
        // Record as docs-copy execution (not a full run)
        store.commit(storeEvents.exampleExecuted({
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
          const result = await runQuery(example.query);

          // Record execution
          store.commit(storeEvents.exampleExecuted({
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

          store.commit(storeEvents.exampleExecuted({
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
      store.commit(storeEvents.readingProgressMarked({
        profileId,
        sectionId,
        headingId: null,
        markedRead: true,
        viewedAt: new Date(),
      }));

      // Mark all headings
      for (const heading of section.headings) {
        store.commit(storeEvents.readingProgressMarked({
          profileId,
          sectionId,
          headingId: heading.id,
          markedRead: true,
          viewedAt: new Date(),
        }));
      }
    };

    const markAllUnread = () => {
      store.commit(storeEvents.readingProgressCleared({
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
    if (sectionId === currentSectionId) {
      // Already open, just ensure visible
      show();
      return;
    }

    const sectionVM = createSectionVM(sectionId);
    if (sectionVM) {
      currentSectionId = sectionId;
      currentSectionVM = sectionVM;
      show();
      onSectionOpened?.(sectionId);
    }
  };

  const closeSection = () => {
    currentSectionId = null;
    currentSectionVM = null;
  };

  // ---------------------------------------------------------------------------
  // Return VM
  // ---------------------------------------------------------------------------

  return {
    isVisible$,
    show,
    hide,
    toggle,
    currentSection$,
    openSection,
    closeSection,
    isLoading$,
    error$,
  };
}
