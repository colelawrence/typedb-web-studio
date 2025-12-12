/**
 * Schema page view model.
 *
 * Displays the database schema as both a tree view and a graph visualization.
 */

import type { Queryable } from "../../types";
import type { SchemaTreeVM } from "../../shared/schema-tree.vm";

/**
 * Schema page VM.
 *
 * **Layout:**
 * ```
 * ┌──────────────┬─────────────────────────────────────────┐
 * │  Schema      │                                         │
 * │  Tree        │        Graph Visualization              │
 * │  (resize)    │        (force-directed layout)          │
 * │              │                                         │
 * │  [controls]  │        - Entities as rectangles         │
 * │  [tree]      │        - Relations as diamonds          │
 * │              │        - Attributes as ovals            │
 * │              │        - Lines showing relationships    │
 * │              │                                         │
 * └──────────────┴─────────────────────────────────────────┘
 * ```
 */
export interface SchemaPageVM {
  /**
   * Left sidebar containing schema tree.
   */
  sidebar: SchemaSidebarVM;

  /**
   * Main content area with graph visualization.
   */
  graph: SchemaGraphVisualizationVM;

  /**
   * Placeholder state when page cannot function.
   *
   * **Placeholder types:**
   * - `"noServer"`: Not connected to any server
   * - `"noDatabase"`: Connected but no database selected
   */
  placeholder$: Queryable<SchemaPagePlaceholder | null>;
}

/**
 * Placeholder state for the schema page.
 */
export type SchemaPagePlaceholder =
  | { type: "noServer"; message: string; actionLabel: string; action: () => void }
  | { type: "noDatabase"; message: string; actionLabel: string; action: () => void };

/**
 * Schema sidebar containing tree view and controls.
 */
export interface SchemaSidebarVM {
  /**
   * Current sidebar width in pixels.
   *
   * **Constraints:**
   * - Minimum: 200px
   * - Maximum: 50% of viewport width
   * - Default: 280px
   */
  width$: Queryable<number>;

  /**
   * Updates sidebar width during drag resize.
   */
  setWidth(width: number): void;

  /**
   * View mode for the schema tree.
   *
   * **Modes:**
   * - `"flat"`: All types at same level, alphabetically sorted
   * - `"hierarchical"`: Types nested under their supertypes
   */
  viewMode$: Queryable<"flat" | "hierarchical">;

  /**
   * Changes the view mode.
   */
  setViewMode(mode: "flat" | "hierarchical"): void;

  /**
   * Link visibility toggles.
   * Control which relationships are shown in tree and graph.
   */
  linksVisibility: {
    /** Show subtype relationships */
    sub$: Queryable<boolean>;
    toggleSub(): void;

    /** Show ownership relationships */
    owns$: Queryable<boolean>;
    toggleOwns(): void;

    /** Show role playing relationships */
    plays$: Queryable<boolean>;
    togglePlays(): void;

    /** Show relation role relationships */
    relates$: Queryable<boolean>;
    toggleRelates(): void;
  };

  /**
   * Schema tree shared with query sidebar.
   */
  tree: SchemaTreeVM;
}

/**
 * Schema graph visualization VM.
 *
 * Interactive force-directed graph showing schema relationships.
 */
export interface SchemaGraphVisualizationVM {
  /**
   * Current graph status.
   *
   * **States:**
   * - `"loading"`: Fetching schema from server
   * - `"ready"`: Graph rendered and interactive
   * - `"empty"`: Database has no schema types
   * - `"error"`: Failed to load or render schema
   */
  status$: Queryable<SchemaGraphStatus>;

  /**
   * Message for non-ready states.
   *
   * **Messages:**
   * - loading: "Loading schema..."
   * - empty: "No schema types defined. Use 'define' queries to create types."
   * - error: "Failed to load schema: {errorMessage}"
   */
  statusMessage$: Queryable<string | null>;

  /**
   * Retry button for error state.
   */
  retry(): void;

  /**
   * Ref setter for canvas container.
   * Graph library renders into this element.
   */
  setCanvasRef(element: HTMLElement | null): void;

  /**
   * Zoom controls.
   */
  zoom: {
    /** Current zoom level (1.0 = 100%) */
    level$: Queryable<number>;

    /** Zoom in by 25% */
    zoomIn(): void;

    /** Zoom out by 25% */
    zoomOut(): void;

    /** Reset to 100% and center */
    reset(): void;
  };

  /**
   * Currently selected node.
   * Clicking a node selects it; clicking canvas deselects.
   */
  selectedNode$: Queryable<SchemaGraphNodeVM | null>;

  /**
   * Currently hovered node (for tooltip).
   */
  hoveredNode$: Queryable<SchemaGraphNodeVM | null>;

  /**
   * Node highlight filter.
   * When set, only nodes matching the filter are fully visible.
   * Other nodes are dimmed.
   */
  highlightFilter$: Queryable<string | null>;

  /**
   * Sets the highlight filter.
   * Pass null to clear highlighting.
   */
  setHighlightFilter(filter: string | null): void;
}

export type SchemaGraphStatus = "loading" | "ready" | "empty" | "error";

/**
 * Schema graph node representation.
 */
export interface SchemaGraphNodeVM {
  /** Unique key (type label) */
  key: string;

  /**
   * Display label for the node.
   * Usually the type name (e.g., "person", "friendship").
   */
  label: string;

  /**
   * Node kind for visual styling.
   *
   * **Shapes:**
   * - `"entity"`: Rectangle (solid border)
   * - `"relation"`: Diamond
   * - `"attribute"`: Oval/ellipse
   *
   * **Colors:** Can vary based on abstract status or user preference.
   */
  kind: "entity" | "relation" | "attribute";

  /**
   * Whether this type is abstract.
   *
   * **Visual:** Abstract types may have dashed border or different fill.
   */
  isAbstract: boolean;

  /**
   * Supertype label, if any.
   * @example "person sub entity" → supertype is "entity"
   */
  supertype: string | null;

  /**
   * Formatted details for info panel/tooltip.
   *
   * **Contents vary by kind:**
   * - Entity: subtypes, owned attributes, played roles
   * - Relation: subtypes, owned attributes, related roles
   * - Attribute: value type, subtypes, owners
   */
  details: Record<string, string>;

  /**
   * Generates a fetch query for this type.
   * Copies query to clipboard and shows toast.
   *
   * @example
   * For entity "person": `match $x isa person; fetch $x: *;`
   */
  generateFetchQuery(): void;

  /**
   * Highlights this node and its relationships in the graph.
   * Dims other nodes.
   */
  highlight(): void;
}

// Re-export
export type { SchemaTreeVM } from "../../shared/schema-tree.vm";
