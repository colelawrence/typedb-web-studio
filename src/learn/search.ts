/**
 * Learn Sidebar Search Index
 *
 * Provides instant client-side search across curriculum content, examples,
 * and reference documentation using Fuse.js fuzzy search.
 *
 * **Index Structure:**
 * - Learn sections: title, breadcrumb, heading text
 * - Examples: query text, example ID
 * - Reference entries: title, keyword text
 *
 * @module learn/search
 */

import Fuse, { type IFuseOptions } from "fuse.js";
import type {
  CurriculumMeta,
  ParsedSection,
} from "../curriculum/types";

/**
 * Types of searchable items in the index.
 */
export type SearchableItemType = "learn" | "example" | "reference";

/**
 * A searchable item in the Fuse.js index.
 */
export interface SearchableItem {
  /** Type determines grouping and display */
  type: SearchableItemType;
  /** Unique identifier for the item */
  id: string;
  /** Display title */
  title: string;
  /** Breadcrumb path for context (e.g., ["Foundations", "First Queries"]) */
  breadcrumb: string[];
  /** Searchable content (headings, query text, etc.) */
  content: string;
  /** Preview text to show in results */
  preview: string | null;
  /** Navigation target - section or example ID */
  targetId: string;
  /** For examples: the parent section ID */
  sectionId: string | null;
}

/**
 * Search result from Fuse.js.
 */
export interface SearchResult {
  /** The matched item */
  item: SearchableItem;
  /** Match score (0 = perfect match, 1 = no match) */
  score: number;
  /** Fuse.js reference index */
  refIndex: number;
}

/**
 * Grouped search results for display.
 */
export interface GroupedSearchResults {
  learn: SearchResult[];
  example: SearchResult[];
  reference: SearchResult[];
}

/**
 * Fuse.js options optimized for curriculum search.
 *
 * - Title is heavily weighted (3x)
 * - Content and breadcrumb have equal weight
 * - Threshold of 0.4 balances fuzzy matching with relevance
 */
const FUSE_OPTIONS: IFuseOptions<SearchableItem> = {
  keys: [
    { name: "title", weight: 3 },
    { name: "content", weight: 1 },
    { name: "breadcrumb", weight: 1 },
    { name: "preview", weight: 0.5 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

/**
 * Builds a Fuse.js search index from curriculum content.
 *
 * Indexes:
 * - All curriculum sections (title, headings)
 * - All runnable examples (query text)
 * - All reference documentation entries
 *
 * @param meta - Curriculum metadata with section structure
 * @param sections - Map of section ID to parsed content
 * @returns Configured Fuse.js instance
 */
export function buildSearchIndex(
  meta: CurriculumMeta,
  sections: Record<string, ParsedSection>
): Fuse<SearchableItem> {
  const items: SearchableItem[] = [];

  // Index curriculum sections
  for (const sectionMeta of meta.sections) {
    for (const lesson of sectionMeta.lessons) {
      const section = sections[lesson.id];
      if (!section) continue;

      const breadcrumb = [sectionMeta.title, lesson.title];

      // Add the section itself
      items.push({
        type: "learn",
        id: `learn:${lesson.id}`,
        title: lesson.title,
        breadcrumb,
        content: section.headings.map((h) => h.text).join(" "),
        preview: null,
        targetId: lesson.id,
        sectionId: null,
      });

      // Add runnable examples from this section
      for (const example of section.examples) {
        if (example.type === "readonly") continue; // Skip display-only examples

        items.push({
          type: "example",
          id: `example:${example.id}`,
          title: example.id,
          breadcrumb,
          content: example.query,
          preview: truncateQuery(example.query, 60),
          targetId: example.id,
          sectionId: lesson.id,
        });
      }
    }
  }

  return new Fuse(items, FUSE_OPTIONS);
}

/**
 * Performs a search and returns grouped results.
 *
 * @param index - Fuse.js search index
 * @param query - Search query string
 * @param maxResults - Maximum results per group (default: 10)
 * @returns Results grouped by type
 */
export function searchCurriculum(
  index: Fuse<SearchableItem>,
  query: string,
  maxResults = 10
): GroupedSearchResults {
  if (!query.trim()) {
    return { learn: [], example: [], reference: [] };
  }

  const results = index.search(query);

  const grouped: GroupedSearchResults = {
    learn: [],
    example: [],
    reference: [],
  };

  for (const result of results) {
    const type = result.item.type;
    if (grouped[type].length < maxResults) {
      grouped[type].push({
        item: result.item,
        score: result.score ?? 1,
        refIndex: result.refIndex,
      });
    }
  }

  return grouped;
}

/**
 * Flattens grouped results into a single ordered list.
 *
 * Order: learn results first, then examples, then reference.
 *
 * @param grouped - Grouped search results
 * @returns Flat array of results
 */
export function flattenResults(grouped: GroupedSearchResults): SearchResult[] {
  return [...grouped.learn, ...grouped.example, ...grouped.reference];
}

/**
 * Gets total count across all groups.
 */
export function getTotalCount(grouped: GroupedSearchResults): number {
  return grouped.learn.length + grouped.example.length + grouped.reference.length;
}

/**
 * Truncates a query string for preview display.
 *
 * Removes newlines and truncates to maxLength with ellipsis.
 */
function truncateQuery(query: string, maxLength: number): string {
  const oneLine = query.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLength) {
    return oneLine;
  }
  return oneLine.slice(0, maxLength - 3) + "...";
}

/**
 * Creates a search index builder bound to curriculum data.
 *
 * This is a factory function for use with React context or VM scope.
 */
export function createSearchIndexBuilder(
  meta: CurriculumMeta,
  sections: Record<string, ParsedSection>
): {
  index: Fuse<SearchableItem>;
  search: (query: string, maxResults?: number) => GroupedSearchResults;
} {
  const index = buildSearchIndex(meta, sections);

  return {
    index,
    search: (query: string, maxResults = 10) =>
      searchCurriculum(index, query, maxResults),
  };
}
