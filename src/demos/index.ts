/**
 * Demo database definitions.
 *
 * Each demo includes:
 * - Schema definition (TypeQL define statements)
 * - Sample data (TypeQL insert statements)
 * - Example queries to showcase the demo
 */

export { SOCIAL_NETWORK_DEMO } from "./social-network";
export { ECOMMERCE_DEMO } from "./e-commerce";
export { KNOWLEDGE_GRAPH_DEMO } from "./knowledge-graph";

export interface DemoDefinition {
  /** Unique demo identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Icon identifier */
  icon: string;
  /** TypeQL schema definition */
  schema: string;
  /** TypeQL insert statements for sample data */
  sampleData: string;
  /** Example queries to showcase the demo */
  exampleQueries: ExampleQuery[];
}

export interface ExampleQuery {
  /** Query name */
  name: string;
  /** Description of what this query does */
  description: string;
  /** TypeQL query text */
  query: string;
}

/** All available demos */
export const DEMOS: DemoDefinition[] = [];

// Import and register demos
import { SOCIAL_NETWORK_DEMO } from "./social-network";
import { ECOMMERCE_DEMO } from "./e-commerce";
import { KNOWLEDGE_GRAPH_DEMO } from "./knowledge-graph";

DEMOS.push(SOCIAL_NETWORK_DEMO, ECOMMERCE_DEMO, KNOWLEDGE_GRAPH_DEMO);

/** Get a demo by ID */
export function getDemoById(id: string): DemoDefinition | undefined {
  return DEMOS.find((demo) => demo.id === id);
}
