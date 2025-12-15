/**
 * Learn Navigation View Model
 *
 * Manages navigation state for the learn section including:
 * - Current section and heading
 * - Navigation history (back/forward)
 * - Scroll position restoration
 * - Link highlighting on navigation
 *
 * @module vm/learn/navigation
 */

import type { Queryable } from "../types";

// ============================================================================
// Types
// ============================================================================

/**
 * Navigation target representing a location in the curriculum.
 */
export interface NavigationTarget {
  /** Target type */
  type: "learn" | "ref" | "heading";
  /** Section or reference ID */
  sectionId: string;
  /** Optional heading anchor */
  headingId: string | null;
}

/**
 * Navigation history entry.
 */
export interface HistoryEntry {
  /** Navigation target */
  target: NavigationTarget;
  /** Scroll position when leaving this entry */
  scrollY: number;
  /** Timestamp when navigated to */
  timestamp: number;
}

/**
 * Highlight state for a navigated target.
 */
export interface HighlightState {
  /** Target being highlighted */
  target: NavigationTarget;
  /** When the highlight started */
  startTime: number;
  /** Whether the highlight is still active */
  isActive: boolean;
}

// ============================================================================
// VM Interface
// ============================================================================

/**
 * Navigation VM interface.
 */
export interface LearnNavigationVM {
  /**
   * Current navigation target.
   */
  currentTarget$: Queryable<NavigationTarget | null>;

  /**
   * Whether we can go back in history.
   */
  canGoBack$: Queryable<boolean>;

  /**
   * Whether we can go forward in history.
   */
  canGoForward$: Queryable<boolean>;

  /**
   * Currently highlighted target (if any).
   */
  highlightTarget$: Queryable<NavigationTarget | null>;

  /**
   * Navigate to a learn section.
   */
  navigateToSection(sectionId: string, headingId?: string): void;

  /**
   * Navigate to a reference entry.
   */
  navigateToReference(refId: string, headingId?: string): void;

  /**
   * Navigate to a heading within the current section.
   */
  navigateToHeading(headingId: string): void;

  /**
   * Go back in navigation history.
   */
  goBack(): void;

  /**
   * Go forward in navigation history.
   */
  goForward(): void;

  /**
   * Clear the highlight state.
   */
  clearHighlight(): void;

  /**
   * Get the current scroll position for the current target.
   */
  getScrollPosition(): number;

  /**
   * Save the current scroll position.
   */
  saveScrollPosition(scrollY: number): void;
}

// ============================================================================
// History Stack
// ============================================================================

/**
 * Navigation history stack with back/forward support.
 */
export class NavigationHistory {
  private entries: HistoryEntry[] = [];
  private currentIndex = -1;
  private maxEntries: number;

  constructor(maxEntries = 50) {
    this.maxEntries = maxEntries;
  }

  /**
   * Push a new entry, clearing forward history.
   */
  push(target: NavigationTarget): void {
    // Save scroll position for current entry if exists
    if (this.currentIndex >= 0 && this.entries[this.currentIndex]) {
      // Scroll position is saved separately via saveScrollPosition
    }

    // Clear forward history
    this.entries = this.entries.slice(0, this.currentIndex + 1);

    // Add new entry
    this.entries.push({
      target,
      scrollY: 0,
      timestamp: Date.now(),
    });

    // Limit history size
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    } else {
      this.currentIndex++;
    }
  }

  /**
   * Go back in history.
   */
  back(): HistoryEntry | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.entries[this.currentIndex];
    }
    return null;
  }

  /**
   * Go forward in history.
   */
  forward(): HistoryEntry | null {
    if (this.currentIndex < this.entries.length - 1) {
      this.currentIndex++;
      return this.entries[this.currentIndex];
    }
    return null;
  }

  /**
   * Check if we can go back.
   */
  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if we can go forward.
   */
  canGoForward(): boolean {
    return this.currentIndex < this.entries.length - 1;
  }

  /**
   * Get the current entry.
   */
  current(): HistoryEntry | null {
    return this.entries[this.currentIndex] ?? null;
  }

  /**
   * Update scroll position for current entry.
   */
  saveScrollPosition(scrollY: number): void {
    if (this.currentIndex >= 0 && this.entries[this.currentIndex]) {
      this.entries[this.currentIndex].scrollY = scrollY;
    }
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this.entries = [];
    this.currentIndex = -1;
  }

  /**
   * Get the number of entries.
   */
  get length(): number {
    return this.entries.length;
  }

  /**
   * Get the current index.
   */
  get index(): number {
    return this.currentIndex;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if two navigation targets are equal.
 */
export function targetsEqual(
  a: NavigationTarget | null,
  b: NavigationTarget | null
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return (
    a.type === b.type &&
    a.sectionId === b.sectionId &&
    a.headingId === b.headingId
  );
}

/**
 * Create a navigation target from URL path.
 */
export function parseNavigationPath(path: string): NavigationTarget | null {
  // Match /learn/:sectionId or /learn/:sectionId#headingId
  const learnMatch = path.match(/^\/learn\/([a-z0-9-]+)(?:#([a-z0-9-]+))?$/i);
  if (learnMatch) {
    return {
      type: "learn",
      sectionId: learnMatch[1],
      headingId: learnMatch[2] ?? null,
    };
  }

  // Match /reference/:refId or /reference/:refId#headingId
  const refMatch = path.match(/^\/reference\/([a-z0-9-]+)(?:#([a-z0-9-]+))?$/i);
  if (refMatch) {
    return {
      type: "ref",
      sectionId: refMatch[1],
      headingId: refMatch[2] ?? null,
    };
  }

  return null;
}

/**
 * Create a URL path from navigation target.
 */
export function createNavigationPath(target: NavigationTarget): string {
  let path: string;

  switch (target.type) {
    case "learn":
      path = `/learn/${target.sectionId}`;
      break;
    case "ref":
      path = `/reference/${target.sectionId}`;
      break;
    case "heading":
      return `#${target.sectionId}`;
  }

  if (target.headingId) {
    path += `#${target.headingId}`;
  }

  return path;
}

/**
 * Highlight duration in milliseconds.
 */
export const HIGHLIGHT_DURATION_MS = 2000;
