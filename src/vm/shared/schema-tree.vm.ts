/**
 * Schema tree view model.
 *
 * Shared tree component used in both query sidebar and schema page.
 * Displays database schema types organized by kind.
 */

import type { Queryable } from "../types";
import type { IconComponent } from "../types";

/**
 * Schema tree VM.
 *
 * **Structure:**
 * ```
 * ├── Entities (12)
 * │   ├── person
 * │   ├── organization
 * │   └── ...
 * ├── Relations (5)
 * │   ├── employment
 * │   └── ...
 * └── Attributes (8)
 *     ├── name
 *     └── ...
 * ```
 */
export interface SchemaTreeVM {
  /**
   * Loading/error/ready state.
   *
   * **States:**
   * - `"loading"`: Fetching schema from server
   * - `"ready"`: Schema loaded, tree populated
   * - `"error"`: Failed to load schema
   * - `"empty"`: Schema loaded but no types defined
   */
  status$: Queryable<SchemaTreeStatus>;

  /**
   * Message for non-ready states.
   */
  statusMessage$: Queryable<string | null>;

  /**
   * Retry loading schema after error.
   */
  retry(): void;

  /**
   * Root-level type groups.
   */
  entities: SchemaTreeGroupVM;
  relations: SchemaTreeGroupVM;
  attributes: SchemaTreeGroupVM;
}

export type SchemaTreeStatus = "loading" | "ready" | "error" | "empty";

/**
 * Schema tree group (Entities, Relations, or Attributes).
 */
export interface SchemaTreeGroupVM {
  /**
   * Group label.
   * @example "Entities", "Relations", "Attributes"
   */
  label: string;

  /**
   * Number of types in this group.
   * Shown in parentheses: "Entities (12)"
   */
  count$: Queryable<number>;

  /**
   * Whether this group is collapsed.
   *
   * **Default:** All groups expanded.
   * **Persistence:** Collapse state saved to localStorage.
   */
  collapsed$: Queryable<boolean>;

  /**
   * Toggles collapsed state.
   *
   * **Animation:** Smooth height transition (150ms).
   * **Keyboard:** Arrow keys expand/collapse.
   */
  toggleCollapsed(): void;

  /**
   * Type items in this group.
   *
   * **Order:**
   * - Flat mode: Alphabetically sorted
   * - Hierarchical mode: Sorted within each hierarchy level
   */
  items$: Queryable<SchemaTreeItemVM[]>;
}

/**
 * Individual schema type in the tree.
 */
export interface SchemaTreeItemVM {
  /** Unique key (type label) */
  key: string;

  /**
   * Display label (type name).
   * @example "person", "friendship", "name"
   */
  label: string;

  /**
   * Icon based on type kind.
   *
   * **Icons:**
   * - entity: BoxIcon or similar
   * - relation: NetworkIcon or diamond
   * - attribute: TagIcon or oval
   */
  icon: IconComponent;

  /**
   * Type kind for styling and behavior.
   */
  kind: "entity" | "relation" | "attribute";

  /**
   * Whether this type is abstract.
   *
   * **Visual:** Italic text, different icon variant.
   */
  isAbstract: boolean;

  /**
   * Nesting level for indentation (hierarchical mode).
   * 0 = top level (entity, relation, attribute base types).
   */
  level: number;

  /**
   * Whether this item is expandable (has child details).
   *
   * **Expandable content by kind:**
   * - Entity: owned attributes, played roles
   * - Relation: owned attributes, related roles, players
   * - Attribute: owners, value type info
   */
  hasChildren$: Queryable<boolean>;

  /**
   * Whether this item is expanded (showing children).
   * `null` if not expandable.
   */
  expanded$: Queryable<boolean | null>;

  /**
   * Toggles expansion.
   * No-op if not expandable.
   */
  toggleExpanded(): void;

  /**
   * Child items (attribute types, role types, etc.).
   * Empty if collapsed or no children.
   */
  children$: Queryable<SchemaTreeChildItemVM[]>;

  /**
   * Whether hover shows the "generate query" button.
   * Always true in query page, false in schema page (uses click instead).
   */
  showPlayOnHover: boolean;

  /**
   * Generates and immediately executes a fetch query for this type.
   *
   * **Generated queries:**
   * - Entity: `match $x isa {type}; fetch $x: *;`
   * - Relation: `match $r ({type}:$x) isa {type}; fetch $r: *;`
   * - Attribute: `match $x has {type} $a; fetch $a;`
   *
   * **Behavior:**
   * 1. Generates the appropriate fetch query
   * 2. Loads it into the query editor
   * 3. Immediately executes it (read-only, safe to auto-run)
   *
   * **Feedback:** Toast shows execution result
   */
  runFetchQuery(): void;
}

/**
 * Child item within an expanded schema tree item.
 */
export interface SchemaTreeChildItemVM {
  /** Unique key */
  key: string;

  /**
   * Display label.
   * @example "name (string)", "employee", "friend"
   */
  label: string;

  /**
   * Child item kind for styling.
   *
   * **Kinds:**
   * - `"attribute"`: Owned attribute (shows value type)
   * - `"role"`: Related role (for relations)
   * - `"player"`: Type that plays a role
   * - `"owner"`: Type that owns this attribute (for attributes)
   */
  kind: "attribute" | "role" | "player" | "owner";

  /**
   * Additional type information.
   *
   * **By kind:**
   * - attribute: Value type (string, long, double, boolean, datetime)
   * - role: Relation that defines this role
   * - player: Entity/relation that plays this role
   * - owner: Entity/relation that owns this attribute
   */
  typeInfo: string | null;

  /**
   * Generates a query involving this child element.
   * Behavior varies by kind.
   */
  generateQuery(): void;
}
