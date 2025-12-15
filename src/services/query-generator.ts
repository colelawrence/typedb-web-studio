/**
 * Auto-query generation utilities.
 *
 * Generates TypeQL queries from schema types, similar to the TypeDB Studio
 * "query type" feature that creates fetch queries when clicking on schema items.
 */

/**
 * Schema type info needed for query generation.
 */
export interface SchemaTypeInfo {
  label: string;
  kind: "entity" | "relation" | "attribute";
  ownedAttributes?: readonly string[];
  relatedRoles?: readonly string[];
}

/**
 * Generates a fetch query for a given schema type.
 *
 * @param type - The schema type information
 * @param limit - Maximum number of results (default: 20)
 * @returns TypeQL query string
 *
 * @example
 * // Entity with attributes
 * generateFetchQuery({ label: "person", kind: "entity", ownedAttributes: ["name", "email"] })
 * // Returns:
 * // match $p isa person;
 * // limit 20;
 * // fetch {
 * //     "name": $p.name,
 * //     "email": $p.email
 * // };
 *
 * @example
 * // Relation
 * generateFetchQuery({ label: "friendship", kind: "relation" })
 * // Returns:
 * // match $f isa friendship ($player);
 * // limit 20;
 */
export function generateFetchQuery(type: SchemaTypeInfo, limit = 20): string {
  const varName = getVariableName(type.label);
  const matchClause = getMatchClause(type, varName);

  // If type has owned attributes, generate fetch clause
  if (type.ownedAttributes && type.ownedAttributes.length > 0) {
    const fetchEntries = type.ownedAttributes
      .map((attr) => `    "${attr}": $${varName}.${attr}`)
      .join(",\n");

    return `${matchClause}\nlimit ${limit};\nfetch {\n${fetchEntries}\n};`;
  }

  // Simple match with limit
  return `${matchClause}\nlimit ${limit};`;
}

/**
 * Generates a simple match query to list all instances of a type.
 *
 * @param typeLabel - The type name
 * @param kind - Entity, relation, or attribute
 * @param limit - Maximum number of results
 */
export function generateMatchQuery(
  typeLabel: string,
  kind: "entity" | "relation" | "attribute",
  limit = 20
): string {
  const varName = getVariableName(typeLabel);

  if (kind === "attribute") {
    return `match $x has ${typeLabel} $${varName};\nlimit ${limit};`;
  }

  if (kind === "relation") {
    return `match $${varName} isa ${typeLabel} ($player);\nlimit ${limit};`;
  }

  return `match $${varName} isa ${typeLabel};\nlimit ${limit};`;
}

/**
 * Generates a query to explore instances with all their attributes.
 *
 * @param typeLabel - The type name
 */
export function generateExploreQuery(typeLabel: string): string {
  const varName = getVariableName(typeLabel);
  return `match $${varName} isa ${typeLabel};\nlimit 10;\nfetch $${varName}: *;`;
}

/**
 * Generates a query to explore an instance's relationships.
 *
 * @param typeLabel - The type name
 */
export function generateRelationshipsQuery(typeLabel: string): string {
  const varName = getVariableName(typeLabel);
  return `match
$${varName} isa ${typeLabel};
$rel ($${varName}, $other);
limit 20;`;
}

/**
 * Generates a variable name from a type label.
 * Uses first character, or first two for common prefixes.
 *
 * @example
 * getVariableName("person") // "p"
 * getVariableName("PersonDetails") // "pd"
 */
function getVariableName(label: string): string {
  // For camelCase or PascalCase, use initials
  const initials = label.replace(/([A-Z])/g, " $1").trim().split(" ");
  if (initials.length > 1) {
    return initials.map((s) => s[0].toLowerCase()).join("");
  }

  // For snake_case or hyphenated
  const parts = label.split(/[-_]/);
  if (parts.length > 1) {
    return parts.map((s) => s[0].toLowerCase()).join("");
  }

  // Simple: first character
  return label[0].toLowerCase();
}

/**
 * Gets the match clause for a type.
 */
function getMatchClause(type: SchemaTypeInfo, varName: string): string {
  if (type.kind === "relation") {
    return `match $${varName} isa ${type.label} ($player);`;
  }
  if (type.kind === "attribute") {
    return `match $x has ${type.label} $${varName};`;
  }
  return `match $${varName} isa ${type.label};`;
}

/**
 * Pre-defined query templates for common operations.
 */
export const QUERY_TEMPLATES = {
  /** Count instances of a type */
  count: (typeLabel: string) =>
    `match $x isa ${typeLabel};\nreduce $count = count;`,

  /** Get schema definition for a type */
  schema: (typeLabel: string) =>
    `match $t label ${typeLabel};\nfetch $t: *;`,

  /** Find instances by attribute value */
  findByAttribute: (typeLabel: string, attrName: string, value: string) =>
    `match $x isa ${typeLabel}, has ${attrName} "${value}";\nfetch $x: *;`,

  /** Delete all instances of a type (use with caution!) */
  deleteAll: (typeLabel: string) =>
    `match $x isa ${typeLabel};\ndelete $x isa ${typeLabel};`,
};
