/**
 * Learn Sidebar VM Scope
 *
 * Creates the LearnSidebarVM by composing reactive state from LiveStore
 * with curriculum content and search functionality.
 *
 * @module vm/learn/sidebar-scope
 */

import { computed } from "@livestore/livestore";
import type { Store } from "@livestore/livestore";

import { events, type schema } from "../../livestore/schema";
import { readingProgressForProfile$, uiState$ } from "../../livestore/queries";
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
import { constant } from "./constant";

// ============================================================================
// Configuration
// ============================================================================

const SIDEBAR_WIDTH_MIN = 200;
const SIDEBAR_WIDTH_MAX = 400;
const SIDEBAR_WIDTH_DEFAULT = 280;

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
    store,
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

  // Create folder VMs once (memoized) since curriculumMeta is static
  const learnFolderVMs: LearnFolderVM[] = curriculumMeta.sections.map((sectionMeta): LearnFolderVM => {
    const lessonIds = sectionMeta.lessons.map((l) => l.id);

    // Create lesson VMs once per folder
    const lessonVMs: LearnSectionItemVM[] = sectionMeta.lessons.map((lesson): LearnSectionItemVM => ({
      key: lesson.id,
      title: lesson.title,

      isActive$: computed(
        () => getActiveSectionId() === lesson.id,
        { label: `learnLesson.${lesson.id}.isActive`, deps: [lesson.id] }
      ),

      progressState$: computed(
        (get): ProgressState => {
          // Get the parsed section to know the total heading count
          const parsedSection = sections[lesson.id];
          if (!parsedSection) {
            return "not-started";
          }

          const totalCount = parsedSection.headings.length;
          if (totalCount === 0) {
            // No headings - use binary completed/not-started based on any read entry
            const readIds = get(readSectionIds$);
            return readIds.has(lesson.id) ? "completed" : "not-started";
          }

          // Count read headings for this section (excluding root entry with null headingId)
          const allProgress = get(readingProgress$);
          const readCount = allProgress.filter(
            p => p.sectionId === lesson.id && p.headingId !== null && p.markedRead
          ).length;

          return computeProgressState(readCount, totalCount);
        },
        { label: `learnLesson.${lesson.id}.progressState`, deps: [lesson.id] }
      ),

      select: () => navigate(lesson.id),

      context: lesson.context,
    }));

    return {
      key: sectionMeta.id,
      label: sectionMeta.title,

      expanded$: computed(
        (get) => get(uiState$).learnExpandedFolders.includes(sectionMeta.id),
        { label: `learnFolder.${sectionMeta.id}.expanded`, deps: [sectionMeta.id] }
      ),

      toggleExpanded: () => {
        const current = store.query(uiState$);
        const currentExpanded = current.learnExpandedFolders;
        const newExpanded = currentExpanded.includes(sectionMeta.id)
          ? currentExpanded.filter((id: string) => id !== sectionMeta.id)
          : [...currentExpanded, sectionMeta.id];
        store.commit(events.uiStateSet({ learnExpandedFolders: newExpanded }));
      },

      progressPercent$: computed(
        (get) => {
          // Count actual heading progress across all sections in this folder
          const allProgress = get(readingProgress$);
          let totalHeadings = 0;
          let readHeadings = 0;

          for (const lessonId of lessonIds) {
            const parsedSection = sections[lessonId];
            if (parsedSection) {
              totalHeadings += parsedSection.headings.length;
              readHeadings += allProgress.filter(
                p => p.sectionId === lessonId && p.headingId !== null && p.markedRead
              ).length;
            }
          }

          return computeProgressPercent(readHeadings, totalHeadings);
        },
        { label: `learnFolder.${sectionMeta.id}.progressPercent`, deps: [sectionMeta.id] }
      ),

      progressState$: computed(
        (get) => {
          // Count actual heading progress across all sections in this folder
          const allProgress = get(readingProgress$);
          let totalHeadings = 0;
          let readHeadings = 0;

          for (const lessonId of lessonIds) {
            const parsedSection = sections[lessonId];
            if (parsedSection) {
              totalHeadings += parsedSection.headings.length;
              readHeadings += allProgress.filter(
                p => p.sectionId === lessonId && p.headingId !== null && p.markedRead
              ).length;
            }
          }

          return computeProgressState(readHeadings, totalHeadings);
        },
        { label: `learnFolder.${sectionMeta.id}.progressState`, deps: [sectionMeta.id] }
      ),

      sections$: constant(lessonVMs, `learnFolder.${sectionMeta.id}.sections`),
    };
  });

  const learnSection: LearnSectionVM = {
    label: "LEARN",

    collapsed$: computed(
      (get) => get(uiState$).learnSectionCollapsed,
      { label: "learnSection.collapsed" }
    ),

    toggleCollapsed: () => {
      const current = store.query(uiState$);
      store.commit(events.uiStateSet({ learnSectionCollapsed: !current.learnSectionCollapsed }));
    },

    progressPercent$: computed(
      (get) => {
        // Count actual heading progress across ALL sections
        const allProgress = get(readingProgress$);
        let totalHeadings = 0;
        let readHeadings = 0;

        for (const sectionMeta of curriculumMeta.sections) {
          for (const lesson of sectionMeta.lessons) {
            const parsedSection = sections[lesson.id];
            if (parsedSection) {
              totalHeadings += parsedSection.headings.length;
              readHeadings += allProgress.filter(
                p => p.sectionId === lesson.id && p.headingId !== null && p.markedRead
              ).length;
            }
          }
        }

        return computeProgressPercent(readHeadings, totalHeadings);
      },
      { label: "learnSection.progressPercent" }
    ),

    progressDisplay$: computed(
      (get) => {
        // Count actual heading progress across ALL sections
        const allProgress = get(readingProgress$);
        let totalHeadings = 0;
        let readHeadings = 0;

        for (const sectionMeta of curriculumMeta.sections) {
          for (const lesson of sectionMeta.lessons) {
            const parsedSection = sections[lesson.id];
            if (parsedSection) {
              totalHeadings += parsedSection.headings.length;
              readHeadings += allProgress.filter(
                p => p.sectionId === lesson.id && p.headingId !== null && p.markedRead
              ).length;
            }
          }
        }

        const percent = computeProgressPercent(readHeadings, totalHeadings);
        return `${percent}%`;
      },
      { label: "learnSection.progressDisplay" }
    ),

    folders$: constant(learnFolderVMs, "learnSection.folders"),
  };

  // ---------------------------------------------------------------------------
  // Reference Section (placeholder - no reference docs yet)
  // ---------------------------------------------------------------------------

  const referenceSection: ReferenceSectionVM = {
    label: "REFERENCE",

    collapsed$: computed(
      (get) => get(uiState$).referenceSectionCollapsed,
      { label: "referenceSection.collapsed" }
    ),

    toggleCollapsed: () => {
      const current = store.query(uiState$);
      store.commit(events.uiStateSet({ referenceSectionCollapsed: !current.referenceSectionCollapsed }));
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
