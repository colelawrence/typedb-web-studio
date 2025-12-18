/**
 * Learn Navigation VM Scope
 *
 * Implements the LearnNavigationVM interface with reactive state
 * using LiveStore signals and browser history integration.
 *
 * @module vm/learn/navigation-scope
 */

import { computed, signal } from "@livestore/livestore";
import type { Store } from "@livestore/livestore";

import type { schema } from "../../livestore/schema";
import {
  type LearnNavigationVM,
  type NavigationTarget,
  NavigationHistory,
  targetsEqual,
  createNavigationPath,
  parseNavigationPath,
  HIGHLIGHT_DURATION_MS,
} from "./navigation.vm";

// ============================================================================
// Scope Options
// ============================================================================

export interface NavigationScopeOptions {
  /**
   * LiveStore instance for reactive signals.
   */
  store: Store<typeof schema>;

  /**
   * Callback to perform actual navigation (e.g., TanStack Router navigate).
   */
  navigate: (path: string) => void;

  /**
   * Callback when section is opened (for document viewer).
   */
  onSectionOpened?: (sectionId: string, headingId?: string) => void;

  /**
   * Callback when reference is opened.
   */
  onReferenceOpened?: (refId: string, headingId?: string) => void;

  /**
   * Whether to integrate with browser history (popstate).
   */
  useBrowserHistory?: boolean;

  /**
   * Initial navigation target (from URL).
   */
  initialTarget?: NavigationTarget | null;
}

// ============================================================================
// Scope Factory
// ============================================================================

/**
 * Create a navigation VM scope with reactive LiveStore signals.
 */
export function createNavigationScope(
  options: NavigationScopeOptions
): LearnNavigationVM {
  const {
    store,
    navigate,
    onSectionOpened,
    onReferenceOpened,
    useBrowserHistory = true,
    initialTarget = null,
  } = options;

  // ---------------------------------------------------------------------------
  // State - Using LiveStore signals for reactivity
  // ---------------------------------------------------------------------------

  const history = new NavigationHistory();

  // Reactive signals for navigation state
  const currentTarget$ = signal<NavigationTarget | null>(
    initialTarget,
    { label: "navigation.currentTarget" }
  );

  const highlightTarget$ = signal<NavigationTarget | null>(
    null,
    { label: "navigation.highlightTarget" }
  );

  // Track history version to trigger reactivity on back/forward
  const historyVersion$ = signal<number>(
    0,
    { label: "navigation.historyVersion" }
  );

  let highlightTimeout: ReturnType<typeof setTimeout> | null = null;

  // Initialize with initial target
  if (initialTarget) {
    history.push(initialTarget);
  }

  // ---------------------------------------------------------------------------
  // Computed State - Derived from reactive signals
  // ---------------------------------------------------------------------------

  const canGoBack$ = computed(
    (get) => {
      get(historyVersion$); // Depend on history version for reactivity
      return history.canGoBack();
    },
    { label: "navigation.canGoBack" }
  );

  const canGoForward$ = computed(
    (get) => {
      get(historyVersion$); // Depend on history version for reactivity
      return history.canGoForward();
    },
    { label: "navigation.canGoForward" }
  );

  // ---------------------------------------------------------------------------
  // Helper to update reactive state
  // ---------------------------------------------------------------------------

  const setCurrentTarget = (target: NavigationTarget | null): void => {
    store.setSignal(currentTarget$, target);
  };

  const incrementHistoryVersion = (): void => {
    const current = store.query(historyVersion$);
    store.setSignal(historyVersion$, current + 1);
  };

  const setHighlight = (target: NavigationTarget): void => {
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
    }

    store.setSignal(highlightTarget$, target);

    highlightTimeout = setTimeout(() => {
      store.setSignal(highlightTarget$, null);
      highlightTimeout = null;
    }, HIGHLIGHT_DURATION_MS);
  };

  // ---------------------------------------------------------------------------
  // Navigation Actions
  // ---------------------------------------------------------------------------

  const navigateInternal = (
    target: NavigationTarget,
    addToHistory = true
  ): void => {
    const current = store.query(currentTarget$);

    // Skip if same target
    if (targetsEqual(target, current)) {
      // Still scroll to heading if specified
      if (target.headingId) {
        scrollToHeading(target.headingId);
      }
      return;
    }

    // Update reactive state
    setCurrentTarget(target);

    // Add to history
    if (addToHistory) {
      history.push(target);
      incrementHistoryVersion();
    }

    // Create path and navigate
    const path = createNavigationPath(target);
    navigate(path);

    // Trigger callbacks
    if (target.type === "learn") {
      onSectionOpened?.(target.sectionId, target.headingId ?? undefined);
    } else if (target.type === "ref") {
      onReferenceOpened?.(target.sectionId, target.headingId ?? undefined);
    }

    // Highlight target
    if (target.headingId || target.type === "heading") {
      setHighlight(target);
    }

    // Scroll to heading after a brief delay for render
    if (target.headingId) {
      setTimeout(() => scrollToHeading(target.headingId!), 50);
    }
  };

  const navigateToSection = (sectionId: string, headingId?: string): void => {
    navigateInternal({
      type: "learn",
      sectionId,
      headingId: headingId ?? null,
    });
  };

  const navigateToReference = (refId: string, headingId?: string): void => {
    navigateInternal({
      type: "ref",
      sectionId: refId,
      headingId: headingId ?? null,
    });
  };

  const navigateToHeading = (headingId: string): void => {
    const current = store.query(currentTarget$);
    if (current) {
      // Navigate within current section
      navigateInternal({
        type: current.type,
        sectionId: current.sectionId,
        headingId,
      });
    } else {
      // Just scroll and highlight
      scrollToHeading(headingId);
      setHighlight({
        type: "heading",
        sectionId: headingId,
        headingId: null,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // History Navigation
  // ---------------------------------------------------------------------------

  const goBack = (): void => {
    const entry = history.back();
    if (entry) {
      setCurrentTarget(entry.target);
      incrementHistoryVersion();

      const path = createNavigationPath(entry.target);
      navigate(path);

      // Restore scroll position after render
      setTimeout(() => {
        window.scrollTo(0, entry.scrollY);
      }, 100);

      // Trigger callbacks
      if (entry.target.type === "learn") {
        onSectionOpened?.(entry.target.sectionId, entry.target.headingId ?? undefined);
      } else if (entry.target.type === "ref") {
        onReferenceOpened?.(entry.target.sectionId, entry.target.headingId ?? undefined);
      }
    }
  };

  const goForward = (): void => {
    const entry = history.forward();
    if (entry) {
      setCurrentTarget(entry.target);
      incrementHistoryVersion();

      const path = createNavigationPath(entry.target);
      navigate(path);

      // Restore scroll position after render
      setTimeout(() => {
        window.scrollTo(0, entry.scrollY);
      }, 100);

      // Trigger callbacks
      if (entry.target.type === "learn") {
        onSectionOpened?.(entry.target.sectionId, entry.target.headingId ?? undefined);
      } else if (entry.target.type === "ref") {
        onReferenceOpened?.(entry.target.sectionId, entry.target.headingId ?? undefined);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Highlight Management
  // ---------------------------------------------------------------------------

  const clearHighlight = (): void => {
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
      highlightTimeout = null;
    }
    store.setSignal(highlightTarget$, null);
  };

  // ---------------------------------------------------------------------------
  // Scroll Management
  // ---------------------------------------------------------------------------

  const scrollToHeading = (headingId: string): void => {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getScrollPosition = (): number => {
    return history.current()?.scrollY ?? 0;
  };

  const saveScrollPosition = (scrollY: number): void => {
    history.saveScrollPosition(scrollY);
  };

  // ---------------------------------------------------------------------------
  // Browser History Integration
  // ---------------------------------------------------------------------------

  if (useBrowserHistory && typeof window !== "undefined") {
    window.addEventListener("popstate", (_event) => {
      const path = window.location.pathname + window.location.hash;
      const target = parseNavigationPath(path);

      if (target) {
        // Update reactive state without adding to our history (browser manages it)
        setCurrentTarget(target);

        // Trigger callbacks
        if (target.type === "learn") {
          onSectionOpened?.(target.sectionId, target.headingId ?? undefined);
        } else if (target.type === "ref") {
          onReferenceOpened?.(target.sectionId, target.headingId ?? undefined);
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Return VM
  // ---------------------------------------------------------------------------

  return {
    currentTarget$,
    canGoBack$,
    canGoForward$,
    highlightTarget$,
    navigateToSection,
    navigateToReference,
    navigateToHeading,
    goBack,
    goForward,
    clearHighlight,
    getScrollPosition,
    saveScrollPosition,
  };
}

// ============================================================================
// Mock Navigation Scope (for testing)
// ============================================================================

export interface MockNavigationScope extends LearnNavigationVM {
  navigateCalls: Array<{ type: string; sectionId: string; headingId?: string }>;
  setCurrentTarget(target: NavigationTarget | null): void;
}

/**
 * Create a mock navigation scope for testing.
 * Uses simple local state since tests don't need LiveStore reactivity.
 */
export function createMockNavigationScope(): MockNavigationScope {
  const navigateCalls: Array<{ type: string; sectionId: string; headingId?: string }> = [];
  let currentTarget: NavigationTarget | null = null;
  let highlightTarget: NavigationTarget | null = null;
  const history = new NavigationHistory();

  const currentTarget$ = computed(
    () => currentTarget,
    { label: "mockNavigation.currentTarget" }
  );

  const canGoBack$ = computed(
    () => history.canGoBack(),
    { label: "mockNavigation.canGoBack" }
  );

  const canGoForward$ = computed(
    () => history.canGoForward(),
    { label: "mockNavigation.canGoForward" }
  );

  const highlightTarget$ = computed(
    () => highlightTarget,
    { label: "mockNavigation.highlightTarget" }
  );

  return {
    currentTarget$,
    canGoBack$,
    canGoForward$,
    highlightTarget$,
    navigateCalls,

    navigateToSection(sectionId: string, headingId?: string) {
      const target: NavigationTarget = {
        type: "learn",
        sectionId,
        headingId: headingId ?? null,
      };
      currentTarget = target;
      history.push(target);
      navigateCalls.push({ type: "learn", sectionId, headingId });
    },

    navigateToReference(refId: string, headingId?: string) {
      const target: NavigationTarget = {
        type: "ref",
        sectionId: refId,
        headingId: headingId ?? null,
      };
      currentTarget = target;
      history.push(target);
      navigateCalls.push({ type: "ref", sectionId: refId, headingId });
    },

    navigateToHeading(headingId: string) {
      if (currentTarget) {
        currentTarget = { ...currentTarget, headingId };
        history.push(currentTarget);
      }
      navigateCalls.push({ type: "heading", sectionId: headingId });
    },

    goBack() {
      const entry = history.back();
      if (entry) {
        currentTarget = entry.target;
      }
    },

    goForward() {
      const entry = history.forward();
      if (entry) {
        currentTarget = entry.target;
      }
    },

    clearHighlight() {
      highlightTarget = null;
    },

    getScrollPosition() {
      return history.current()?.scrollY ?? 0;
    },

    saveScrollPosition(scrollY: number) {
      history.saveScrollPosition(scrollY);
    },

    setCurrentTarget(target: NavigationTarget | null) {
      currentTarget = target;
      if (target) {
        history.push(target);
      }
    },
  };
}
