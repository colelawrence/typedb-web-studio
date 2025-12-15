/**
 * Learn Module
 *
 * Interactive learning sidebar with curriculum navigation and search.
 *
 * @module learn
 */

export {
  buildSearchIndex,
  searchCurriculum,
  flattenResults,
  getTotalCount,
  createSearchIndexBuilder,
  type SearchableItem,
  type SearchableItemType,
  type SearchResult,
  type GroupedSearchResults,
} from "./search";
