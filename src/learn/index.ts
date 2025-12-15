/**
 * Learn Module
 *
 * Interactive learning sidebar with curriculum navigation, search, and REPL integration.
 *
 * @module learn
 */

// Search
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

// REPL Bridge
export {
  createReplBridge,
  createMockReplBridge,
  type ReplBridge,
  type ReplQueryResult,
  type ReplBridgeOptions,
} from "./repl-bridge";
