/**
 * Learn Sidebar VM Scope
 *
 * Creates the LearnSidebarVM by composing reactive state from LiveStore
 * with curriculum content and search functionality.
 *
 * @module vm/learn/sidebar-scope
 */

import { computed } from "@livestore/livestore";
import type { Queryable, Store } from "@livestore/livestore";

import type { schema } from "../../livestore/schema";
import { readingProgressForProfile$ } from "../../livestore/queries";
import {
  buildSearchIndex,
  searchCurriculum,
  getTotalCount,
  type GroupedSearchResults,
} from "../../learn/search";
import type { CurriculumMeta, ParsedSection } from "../../curriculum/types";
import type {
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
  ProgressState,
} from "./learn-sidebar.vm";

// ============================================================================
// Configuration
// ============================================================================

const SIDEBAR_WIDTH_MIN = 200;
const SIDEBAR_WIDTH_MAX = 400;
const SIDEBAR_WIDTH_DEFAULT = 280;

// ============================================================================
// Helpers
// ============================================================================

/** Creates a queryable that always returns the same value */
function constant<T>(value: T, label: string): Queryable<T> {
  return computed((): T => value, { label });
}

/**
 * Computes progress state from section read counts.
 */
function computeProgressState(readCount: number, totalCount: number): ProgressState {
  if (readCount === 0) return "not-started";
  if (readCount >= totalCount) return "completed";
  return "in-progress";
}

/**
 * Computes progress percentage (0-100).
 */
function computeProgressPercent(readCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((readCount / totalCount) * 100);
}

// ============================================================================
// Sidebar Scope Types
// ============================================================================

export interface LearnSidebarScopeOptions {
  /** LiveStore instance */
  store: Store<typeof schema>;
  /** Current profile ID */
  profileId: string;
  /** Curriculum metadata (from virtual module) */
  curriculumMeta: CurriculumMeta;
  /** Parsed curriculum sections (from virtual module) */
  sections: Record<string, ParsedSection>;
  /** Navigation callback for selecting content */
  navigate: (sectionId: string, headingId?: string) => void;
  /** Getter for currently active section ID */
  getActiveSectionId: () => string | null;
}

// ============================================================================
// Main Factory
// ============================================================================

/**
 * Creates the LearnSidebarVM scope with all reactive state wired up.
 */
export function createLearnSidebarScope(
  options: LearnSidebarScopeOptions
): LearnSidebarVM {
  const {
    store: _store, // Reserved for future use with uiState
    profileId,
    curriculumMeta,
    sections,
    navigate,
    getActiveSectionId,
  } = options;

  // Build search index once
  const searchIndex = buildSearchIndex(curriculumMeta, sections);

  // ---------------------------------------------------------------------------
  // Sidebar Width (with localStorage persistence)
  // ---------------------------------------------------------------------------

  const STORAGE_KEY = "typedb_studio_learn_sidebar_width";

  const getSavedWidth = (): number => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const width = parseInt(saved, 10);
        if (width >= SIDEBAR_WIDTH_MIN && width <= SIDEBAR_WIDTH_MAX) {
          return width;
        }
      }
    } catch {
      // localStorage not available
    }
    return SIDEBAR_WIDTH_DEFAULT;
  };

  // Store width in a client-side state (not LiveStore since it's UI-local)
  let currentWidth = getSavedWidth();

  const width$ = computed(
    () => currentWidth,
    { label: "learnSidebar.width" }
  );

  const setWidth = (width: number) => {
    const clamped = Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, width));
    currentWidth = clamped;
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      // localStorage not available
    }
  };

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  // Search query stored in UI state
  const searchQuery$ = computed(
    () => "", // TODO: Wire to uiState once we add learn sidebar state
    { label: "learnSidebar.search.query" }
  );

  let searchQueryValue = "";

  const setSearchQuery = (query: string) => {
    searchQueryValue = query;
    // TODO: Store in uiState
  };

  const clearSearch = () => {
    searchQueryValue = "";
    // TODO: Store in uiState
  };

  const isSearchActive$ = computed(
    () => searchQueryValue.trim().length > 0,
    { label: "learnSidebar.search.isActive" }
  );

  // Search results computation
  const searchResults$ = computed(
    (): GroupedSearchResults => {
      if (!searchQueryValue.trim()) {
        return { learn: [], example: [], reference: [] };
      }
      return searchCurriculum(searchIndex, searchQueryValue, 10);
    },
    { label: "learnSidebar.search.results" }
  );

  // Search results VM
  const createSearchResultsVM = (): LearnSearchResultsVM => {
    const groups$ = computed(
      (get): LearnSearchResultGroupVM[] => {
        const results = get(searchResults$);
        const groups: LearnSearchResultGroupVM[] = [];

        if (results.learn.length > 0) {
          groups.push({
            key: "learn",
            label: "LEARN",
            items: results.learn.map((r): LearnSearchResultItemVM => ({
              key: r.item.id,
              type: "learn",
              title: r.item.title,
              breadcrumb: r.item.breadcrumb.join(" > "),
              preview: null,
              select: () => navigate(r.item.targetId),
            })),
          });
        }

        if (results.example.length > 0) {
          groups.push({
            key: "examples",
            label: "EXAMPLES",
            items: results.example.map((r): LearnSearchResultItemVM => ({
              key: r.item.id,
              type: "example",
              title: r.item.title,
              breadcrumb: r.item.breadcrumb.join(" > "),
              preview: r.item.preview,
              select: () => {
                if (r.item.sectionId) {
                  navigate(r.item.sectionId, r.item.targetId);
                }
              },
            })),
          });
        }

        if (results.reference.length > 0) {
          groups.push({
            key: "reference",
            label: "REFERENCE",
            items: results.reference.map((r): LearnSearchResultItemVM => ({
              key: r.item.id,
              type: "reference",
              title: r.item.title,
              breadcrumb: r.item.breadcrumb.join(" > "),
              preview: null,
              select: () => navigate(r.item.targetId),
            })),
          });
        }

        return groups;
      },
      { label: "learnSidebar.search.groups" }
    );

    const totalCount$ = computed(
      (get) => getTotalCount(get(searchResults$)),
      { label: "learnSidebar.search.totalCount" }
    );

    const isEmpty$ = computed(
      (get) => getTotalCount(get(searchResults$)) === 0,
      { label: "learnSidebar.search.isEmpty" }
    );

    return { groups$, totalCount$, isEmpty$ };
  };

  const search: LearnSearchVM = {
    query$: searchQuery$,
    setQuery: setSearchQuery,
    clear: clearSearch,
    placeholder: "Search curriculum...",
    isActive$: isSearchActive$,
  };

  // ---------------------------------------------------------------------------
  // View State (navigation vs search)
  // ---------------------------------------------------------------------------

  const view$ = computed(
    (get): LearnSidebarViewState => {
      if (get(isSearchActive$)) {
        return { type: "search", results: createSearchResultsVM() };
      }
      return { type: "navigation" };
    },
    { label: "learnSidebar.view" }
  );

  // ---------------------------------------------------------------------------
  // Progress Tracking
  // ---------------------------------------------------------------------------

  // Get reading progress for this profile
  const readingProgress$ = readingProgressForProfile$(profileId);

  // Create a set of read section IDs for efficient lookup
  const readSectionIds$ = computed(
    (get) => {
      const progress = get(readingProgress$);
      const readIds = new Set<string>();
      for (const entry of progress) {
        if (entry.markedRead || entry.firstViewedAt) {
          readIds.add(entry.sectionId);
        }
      }
      return readIds;
    },
    { label: "learnSidebar.readSectionIds" }
  );

  // ---------------------------------------------------------------------------
  // Learn Section (Curriculum)
  // ---------------------------------------------------------------------------

  // Collapsed state for learn section
  let learnSectionCollapsed = false;

  const learnSection: LearnSectionVM = {
    label: "LEARN",

    collapsed$: computed(
      () => learnSectionCollapsed,
      { label: "learnSection.collapsed" }
    ),

    toggleCollapsed: () => {
      learnSectionCollapsed = !learnSectionCollapsed;
    },

    progressPercent$: computed(
      (get) => {
        const readIds = get(readSectionIds$);
        const totalLessons = curriculumMeta.sections.reduce(
          (acc, s) => acc + s.lessons.length,
          0
        );
        return computeProgressPercent(readIds.size, totalLessons);
      },
      { label: "learnSection.progressPercent" }
    ),

    progressDisplay$: computed(
      (get) => {
        const readIds = get(readSectionIds$);
        const totalLessons = curriculumMeta.sections.reduce(
          (acc, s) => acc + s.lessons.length,
          0
        );
        const percent = computeProgressPercent(readIds.size, totalLessons);
        return `${percent}%`;
      },
      { label: "learnSection.progressDisplay" }
    ),

    folders$: computed(
      (get): LearnFolderVM[] => {
        const readIds = get(readSectionIds$);

        return curriculumMeta.sections.map((sectionMeta): LearnFolderVM => {
          const lessonIds = sectionMeta.lessons.map((l) => l.id);
          const readCount = lessonIds.filter((id) => readIds.has(id)).length;
          const totalCount = lessonIds.length;

          // Track folder expansion state
          let expanded = false;

          return {
            key: sectionMeta.id,
            label: sectionMeta.title,

            expanded$: computed(
              () => expanded,
              { label: `learnFolder.${sectionMeta.id}.expanded` }
            ),

            toggleExpanded: () => {
              expanded = !expanded;
            },

            progressPercent$: constant(
              computeProgressPercent(readCount, totalCount),
              `learnFolder.${sectionMeta.id}.progressPercent`
            ),

            progressState$: constant(
              computeProgressState(readCount, totalCount),
              `learnFolder.${sectionMeta.id}.progressState`
            ),

            sections$: computed(
              (get): LearnSectionItemVM[] => {
                const currentReadIds = get(readSectionIds$);

                return sectionMeta.lessons.map((lesson): LearnSectionItemVM => {
                  const isRead = currentReadIds.has(lesson.id);

                  return {
                    key: lesson.id,
                    title: lesson.title,

                    isActive$: computed(
                      () => getActiveSectionId() === lesson.id,
                      { label: `learnLesson.${lesson.id}.isActive` }
                    ),

                    progressState$: constant<ProgressState>(
                      isRead ? "completed" : "not-started",
                      `learnLesson.${lesson.id}.progressState`
                    ),

                    select: () => navigate(lesson.id),

                    context: lesson.context,
                  };
                });
              },
              { label: `learnFolder.${sectionMeta.id}.sections` }
            ),
          };
        });
      },
      { label: "learnSection.folders" }
    ),
  };

  // ---------------------------------------------------------------------------
  // Reference Section (placeholder - no reference docs yet)
  // ---------------------------------------------------------------------------

  let referenceSectionCollapsed = true;

  const referenceSection: ReferenceSectionVM = {
    label: "REFERENCE",

    collapsed$: computed(
      () => referenceSectionCollapsed,
      { label: "referenceSection.collapsed" }
    ),

    toggleCollapsed: () => {
      referenceSectionCollapsed = !referenceSectionCollapsed;
    },

    folders$: constant<ReferenceFolderVM[]>(
      [], // No reference docs yet
      "referenceSection.folders"
    ),
  };

  // ---------------------------------------------------------------------------
  // Root VM
  // ---------------------------------------------------------------------------

  return {
    width$,
    setWidth,
    search,
    view$,
    learnSection,
    referenceSection,
  };
}
