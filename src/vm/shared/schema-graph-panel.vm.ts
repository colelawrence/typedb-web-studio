/**
 * Schema graph panel view model.
 *
 * A panel that displays the database schema as a graph visualization.
 * Can be shown alongside the docs viewer in the Query page.
 */

import type { Queryable } from "../types";

/**
 * Schema graph panel VM.
 *
 * Provides visibility control and graph visualization for the schema panel
 * in the Query page. This panel appears above the docs viewer when visible.
 */
export interface SchemaGraphPanelVM {
  /**
   * Whether the panel is currently visible.
   */
  isVisible$: Queryable<boolean>;

  /**
   * Show the schema graph panel.
   */
  show(): void;

  /**
   * Hide the schema graph panel.
   */
  hide(): void;

  /**
   * Toggle the schema graph panel visibility.
   */
  toggle(): void;

  /**
   * The graph visualization VM.
   */
  graph: SchemaGraphVisualizationVM;
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
