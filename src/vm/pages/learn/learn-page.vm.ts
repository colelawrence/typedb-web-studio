/**
 * Learn page view model.
 *
 * Composes the learn sidebar and document viewer for the interactive
 * TypeQL learning experience.
 *
 * **Layout:**
 * ```
 * ┌──────────────────┬───────────────────────────────────┐
 * │ SIDEBAR          │ DOCUMENT VIEWER                   │
 * │                  │                                   │
 * │ [Search...]      │ # Your First Queries      [Close] │
 * │                  │                                   │
 * │ ▼ LEARN      75% │ The `match` clause finds data... │
 * │   Foundations    │                                   │
 * │   Querying       │ ```typeql                         │
 * │                  │ match $p isa person;    [▶ Run]  │
 * │ ▼ REFERENCE      │ ```                               │
 * │   Keywords       │                                   │
 * │   Types          │                                   │
 * └──────────────────┴───────────────────────────────────┘
 * ```
 *
 * @module vm/pages/learn
 */

import type { LearnSidebarVM } from "../../learn/learn-sidebar.vm";
import type { DocumentViewerVM } from "../../learn/document-viewer.vm";
import type { LearnNavigationVM } from "../../learn/navigation.vm";

/**
 * Learn page VM.
 *
 * Provides the combined sidebar + document viewer experience for learning TypeQL.
 */
export interface LearnPageVM {
  /**
   * Sidebar containing curriculum navigation, reference docs, and search.
   */
  sidebar: LearnSidebarVM;

  /**
   * Document viewer for displaying curriculum content.
   */
  viewer: DocumentViewerVM;

  /**
   * Navigation VM for cross-links and browser history.
   */
  navigation: LearnNavigationVM;
}
