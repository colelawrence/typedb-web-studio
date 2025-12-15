/**
 * Schema parser for TypeQL define statements.
 *
 * Extracts entity, relation, and attribute type information from schema definitions.
 */

/**
 * Parsed schema type information.
 */
export interface ParsedSchemaType {
  label: string;
  kind: "entity" | "relation" | "attribute";
  isAbstract: boolean;
  supertype: string | null;
  ownedAttributes: string[];
  playedRoles: string[];
  relatedRoles: string[];
  valueType: string | null;
}

/**
 * Parsed schema containing all types.
 */
export interface ParsedSchema {
  entities: ParsedSchemaType[];
  relations: ParsedSchemaType[];
  attributes: ParsedSchemaType[];
}

/**
 * Parses a TypeQL schema string and extracts type definitions.
 *
 * @param schemaText - TypeQL define statements
 * @returns Parsed schema with entities, relations, and attributes
 *
 * @example
 * ```typescript
 * const schema = parseSchema(`
 *   define
 *   attribute name value string;
 *   entity person, owns name;
 *   relation friendship, relates friend;
 * `);
 * // Returns:
 * // {
 * //   entities: [{ label: "person", kind: "entity", ownedAttributes: ["name"], ... }],
 * //   relations: [{ label: "friendship", kind: "relation", relatedRoles: ["friend"], ... }],
 * //   attributes: [{ label: "name", kind: "attribute", valueType: "string", ... }]
 * // }
 * ```
 */
export function parseSchema(schemaText: string): ParsedSchema {
  const entities: ParsedSchemaType[] = [];
  const relations: ParsedSchemaType[] = [];
  const attributes: ParsedSchemaType[] = [];

  // Normalize and split into statements
  const normalized = schemaText
    .replace(/\n\s*#[^\n]*/g, "") // Remove comments
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Extract individual type definitions
  // Match: entity|relation|attribute name [sub parent] [, properties] ;
  const typePattern =
    /(entity|relation|attribute)\s+(\w+(?:-\w+)*)\s*(sub\s+\w+(?:-\w+)*)?\s*(?:,([^;]*)|([^;]*))?;/gi;

  let match: RegExpExecArray | null;
  while ((match = typePattern.exec(normalized)) !== null) {
    const [, kindRaw, label, subClause, properties1, properties2] = match;
    const kind = kindRaw.toLowerCase() as "entity" | "relation" | "attribute";
    const properties = (properties1 || properties2 || "").trim();

    const type: ParsedSchemaType = {
      label,
      kind,
      isAbstract: properties.includes("abstract"),
      supertype: subClause
        ? subClause.replace(/sub\s+/i, "").trim()
        : null,
      ownedAttributes: [],
      playedRoles: [],
      relatedRoles: [],
      valueType: null,
    };

    // Parse properties based on kind
    if (kind === "attribute") {
      // Extract value type: value string|long|integer|double|boolean|datetime
      const valueMatch = /value\s+(string|long|integer|double|boolean|datetime)/i.exec(
        properties
      );
      if (valueMatch) {
        type.valueType = valueMatch[1].toLowerCase();
      }
    } else {
      // Extract owned attributes: owns attr1, owns attr2 @unique, ...
      const ownsPattern = /owns\s+(\w+(?:-\w+)*)/gi;
      let ownsMatch: RegExpExecArray | null;
      while ((ownsMatch = ownsPattern.exec(properties)) !== null) {
        type.ownedAttributes.push(ownsMatch[1]);
      }

      // Extract played roles: plays relation:role
      const playsPattern = /plays\s+(\w+(?:-\w+)*):(\w+(?:-\w+)*)/gi;
      let playsMatch: RegExpExecArray | null;
      while ((playsMatch = playsPattern.exec(properties)) !== null) {
        type.playedRoles.push(`${playsMatch[1]}:${playsMatch[2]}`);
      }

      // For relations, extract related roles: relates role1, relates role2
      if (kind === "relation") {
        const relatesPattern = /relates\s+(\w+(?:-\w+)*)/gi;
        let relatesMatch: RegExpExecArray | null;
        while ((relatesMatch = relatesPattern.exec(properties)) !== null) {
          type.relatedRoles.push(relatesMatch[1]);
        }
      }
    }

    // Add to appropriate list
    switch (kind) {
      case "entity":
        entities.push(type);
        break;
      case "relation":
        relations.push(type);
        break;
      case "attribute":
        attributes.push(type);
        break;
    }
  }

  // Sort by label
  entities.sort((a, b) => a.label.localeCompare(b.label));
  relations.sort((a, b) => a.label.localeCompare(b.label));
  attributes.sort((a, b) => a.label.localeCompare(b.label));

  return { entities, relations, attributes };
}

/**
 * Gets all type labels from a parsed schema.
 */
export function getSchemaTypeLabels(schema: ParsedSchema): string[] {
  return [
    ...schema.entities.map((e) => e.label),
    ...schema.relations.map((r) => r.label),
    ...schema.attributes.map((a) => a.label),
  ].sort();
}

/**
 * Gets a type by label from a parsed schema.
 */
export function getTypeByLabel(
  schema: ParsedSchema,
  label: string
): ParsedSchemaType | undefined {
  return (
    schema.entities.find((e) => e.label === label) ||
    schema.relations.find((r) => r.label === label) ||
    schema.attributes.find((a) => a.label === label)
  );
}
