/**
 * TypeDB Service Interface
 *
 * Defines the contract for all TypeDB server operations.
 * This interface abstracts the TypeDB HTTP driver, allowing for:
 * - Mock implementations during development
 * - Real driver implementation in production
 * - Testing with fake data
 *
 * Transaction Model:
 * - TypeDB uses three transaction types: "read", "write", "schema"
 * - Transactions can be managed automatically (auto) or manually
 * - Auto mode: open → query → commit/close per query
 * - Manual mode: user explicitly opens, runs queries, commits, closes
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Transaction types supported by TypeDB.
 * - "read": Read-only queries (match, fetch)
 * - "write": Data modification queries (insert, delete, update)
 * - "schema": Schema modification queries (define, undefine, redefine)
 */
export type TransactionType = "read" | "write" | "schema";

/**
 * Transaction operation mode.
 * - "auto": Automatically manage transaction lifecycle per query
 * - "manual": User explicitly controls transaction open/commit/close
 */
export type OperationMode = "auto" | "manual";

/**
 * Connection status states.
 */
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

/**
 * Connection parameters for TypeDB server.
 */
export interface ConnectionParams {
  /** Server address (e.g., "http://localhost:8729") */
  address: string;
  /** Username for authentication */
  username: string;
  /** Password for authentication */
  password: string;
  /** Optional: initial database to select after connection */
  database?: string;
}

/**
 * Token-based connection parameters.
 * Used for pre-authenticated sessions (e.g., from URL parameters).
 */
export interface TokenConnectionParams {
  /** Server address */
  address: string;
  /** Pre-authenticated JWT token */
  token: string;
  /** Optional: database to select */
  database?: string;
}

/**
 * Database information.
 */
export interface Database {
  name: string;
}

/**
 * User information.
 */
export interface User {
  username: string;
}

/**
 * Active transaction handle.
 */
export interface Transaction {
  /** Transaction ID from server */
  id: string;
  /** Transaction type */
  type: TransactionType;
  /** When the transaction was opened */
  openedAt: number;
  /** Whether there are uncommitted changes */
  hasUncommittedChanges: boolean;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Query result from TypeDB.
 * Structure depends on query type (match returns concepts, insert returns confirmation, etc.)
 */
export interface QueryResponse {
  /** Query that was executed */
  query: string;
  /** Transaction type used */
  transactionType: TransactionType;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Result data - structure varies by query type */
  data: QueryResultData;
}

/**
 * Union type for different query result structures.
 */
export type QueryResultData =
  | MatchQueryResult
  | FetchQueryResult
  | InsertQueryResult
  | DeleteQueryResult
  | DefineQueryResult
  | AggregateQueryResult;

export interface MatchQueryResult {
  type: "match";
  /** Matched concept maps */
  answers: ConceptMap[];
}

export interface FetchQueryResult {
  type: "fetch";
  /** Fetched JSON documents */
  documents: Record<string, unknown>[];
}

export interface InsertQueryResult {
  type: "insert";
  /** Inserted concept maps */
  inserted: ConceptMap[];
}

export interface DeleteQueryResult {
  type: "delete";
  /** Number of concepts deleted */
  deletedCount: number;
}

export interface DefineQueryResult {
  type: "define" | "undefine" | "redefine";
  /** Success confirmation */
  success: boolean;
}

export interface AggregateQueryResult {
  type: "aggregate";
  /** Aggregation result */
  value: number | string;
}

/**
 * A map of variable names to concepts.
 */
export interface ConceptMap {
  [variable: string]: Concept;
}

/**
 * TypeDB concept (entity, relation, attribute, or type).
 */
export interface Concept {
  /** Concept type: entity, relation, attribute, entity_type, etc. */
  kind: ConceptKind;
  /** Type label (e.g., "person", "name") */
  type: string;
  /** IID for instances (entities, relations, attributes) */
  iid?: string;
  /** Value for attributes */
  value?: AttributeValue;
  /** Role players for relations */
  rolePlayers?: RolePlayer[];
}

export type ConceptKind =
  | "entity"
  | "relation"
  | "attribute"
  | "entity_type"
  | "relation_type"
  | "attribute_type"
  | "role_type";

export type AttributeValue = string | number | boolean | Date;

export interface RolePlayer {
  role: string;
  player: Concept;
}

// ============================================================================
// Schema Types
// ============================================================================

/**
 * Database schema representation.
 */
export interface DatabaseSchema {
  /** Entity types */
  entityTypes: SchemaType[];
  /** Relation types */
  relationTypes: SchemaRelationType[];
  /** Attribute types */
  attributeTypes: SchemaAttributeType[];
}

export interface SchemaType {
  label: string;
  /** Direct supertype label */
  supertype?: string;
  /** Whether this is abstract */
  isAbstract: boolean;
  /** Attributes owned by this type */
  owns: string[];
  /** Roles played by this type */
  plays: string[];
}

export interface SchemaRelationType extends SchemaType {
  /** Roles related to this relation */
  relates: string[];
}

export interface SchemaAttributeType {
  label: string;
  supertype?: string;
  isAbstract: boolean;
  /** Value type: string, long, double, boolean, datetime */
  valueType: "string" | "long" | "double" | "boolean" | "datetime";
  /** Whether attribute values must be unique */
  isUnique: boolean;
}

// ============================================================================
// Query Type Heuristics
// ============================================================================

/**
 * Detected query type from heuristic analysis.
 * Used to automatically select the appropriate transaction type.
 */
export interface QueryTypeHeuristic {
  /** Detected transaction type */
  transactionType: TransactionType;
  /** Confidence level */
  confidence: "high" | "medium" | "low";
  /** Keywords that triggered detection */
  detectedKeywords: string[];
  /** Warning if query seems mixed */
  warning?: string;
}

/**
 * Detects the appropriate transaction type for a query using heuristics.
 *
 * Rules:
 * - "define", "undefine", "redefine" → schema
 * - "insert", "delete", "update" → write
 * - "match", "fetch" (without write ops) → read
 *
 * @param query - TypeQL query string
 * @returns Detected query type with confidence
 */
export function detectQueryType(query: string): QueryTypeHeuristic {
  const normalizedQuery = query.toLowerCase().trim();

  // Schema keywords (highest priority)
  const schemaKeywords = ["define", "undefine", "redefine"];
  for (const keyword of schemaKeywords) {
    if (normalizedQuery.startsWith(keyword) || normalizedQuery.includes(`\n${keyword}`)) {
      return {
        transactionType: "schema",
        confidence: "high",
        detectedKeywords: [keyword],
      };
    }
  }

  // Write keywords
  const writeKeywords = ["insert", "delete"];
  const foundWriteKeywords: string[] = [];
  for (const keyword of writeKeywords) {
    // Check for standalone keyword (not part of another word)
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(normalizedQuery)) {
      foundWriteKeywords.push(keyword);
    }
  }

  if (foundWriteKeywords.length > 0) {
    return {
      transactionType: "write",
      confidence: "high",
      detectedKeywords: foundWriteKeywords,
    };
  }

  // Read keywords (default)
  const readKeywords = ["match", "fetch"];
  const foundReadKeywords: string[] = [];
  for (const keyword of readKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(normalizedQuery)) {
      foundReadKeywords.push(keyword);
    }
  }

  if (foundReadKeywords.length > 0) {
    return {
      transactionType: "read",
      confidence: "high",
      detectedKeywords: foundReadKeywords,
    };
  }

  // Unknown/empty query defaults to read with low confidence
  return {
    transactionType: "read",
    confidence: "low",
    detectedKeywords: [],
    warning: "Could not detect query type, defaulting to read",
  };
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * TypeDB service interface.
 * Implementations must handle all TypeDB server interactions.
 */
export interface TypeDBService {
  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  /**
   * Connects to a TypeDB server.
   * @param params - Connection parameters
   * @returns Promise that resolves on successful connection
   * @throws Error if connection fails (invalid credentials, server unreachable, etc.)
   */
  connect(params: ConnectionParams): Promise<void>;

  /**
   * Connects using a pre-authenticated token.
   * Used for auto-login scenarios where JWT is provided.
   * @param params - Token-based connection parameters
   */
  connectWithToken(params: TokenConnectionParams): Promise<void>;

  /**
   * Disconnects from the current server.
   * Closes any open transaction first.
   */
  disconnect(): Promise<void>;

  /**
   * Gets the current connection status.
   */
  getStatus(): ConnectionStatus;

  /**
   * Checks if the server is healthy.
   * @returns Promise resolving to true if server responds
   */
  checkHealth(): Promise<boolean>;

  /**
   * Gets the server version.
   * @returns Version string (e.g., "3.3.0")
   */
  getServerVersion(): Promise<string>;

  // ---------------------------------------------------------------------------
  // Database Management
  // ---------------------------------------------------------------------------

  /**
   * Lists all databases on the server.
   * @returns Array of database objects
   */
  getDatabases(): Promise<Database[]>;

  /**
   * Creates a new database.
   * @param name - Database name (alphanumeric + underscore, no leading numbers)
   * @throws Error if database already exists or name is invalid
   */
  createDatabase(name: string): Promise<void>;

  /**
   * Deletes a database.
   * @param name - Database name
   * @throws Error if database doesn't exist
   */
  deleteDatabase(name: string): Promise<void>;

  /**
   * Gets the schema for a database as TypeQL text.
   * @param database - Database name
   * @returns Schema as TypeQL define statements
   */
  getDatabaseSchemaText(database: string): Promise<string>;

  /**
   * Gets the parsed schema for a database.
   * @param database - Database name
   * @returns Structured schema representation
   */
  getDatabaseSchema(database: string): Promise<DatabaseSchema>;

  // ---------------------------------------------------------------------------
  // Transaction Management
  // ---------------------------------------------------------------------------

  /**
   * Opens a new transaction.
   * @param database - Database name
   * @param type - Transaction type (read, write, schema)
   * @returns Transaction handle
   */
  openTransaction(database: string, type: TransactionType): Promise<Transaction>;

  /**
   * Commits the current transaction.
   * Only applicable for write and schema transactions.
   * @param transactionId - Transaction ID
   */
  commitTransaction(transactionId: string): Promise<void>;

  /**
   * Closes/rolls back the current transaction.
   * @param transactionId - Transaction ID
   */
  closeTransaction(transactionId: string): Promise<void>;

  // ---------------------------------------------------------------------------
  // Query Execution
  // ---------------------------------------------------------------------------

  /**
   * Executes a query within a transaction.
   * @param transactionId - Transaction ID
   * @param query - TypeQL query string
   * @returns Query response with results
   */
  query(transactionId: string, query: string): Promise<QueryResponse>;

  /**
   * Executes a query with automatic transaction management.
   *
   * This is a convenience method that:
   * 1. Detects query type using heuristics (or uses override)
   * 2. Opens appropriate transaction
   * 3. Executes query
   * 4. Commits (for write/schema) or closes (for read)
   *
   * @param database - Database name
   * @param query - TypeQL query string
   * @param options - Optional transaction type override
   * @returns Query response
   */
  executeQuery(
    database: string,
    query: string,
    options?: {
      /** Override auto-detected transaction type */
      transactionType?: TransactionType;
    }
  ): Promise<QueryResponse>;

  // ---------------------------------------------------------------------------
  // User Management
  // ---------------------------------------------------------------------------

  /**
   * Lists all users on the server.
   * Requires admin privileges.
   * @returns Array of user objects
   */
  getUsers(): Promise<User[]>;

  /**
   * Creates a new user.
   * @param username - Username
   * @param password - Initial password
   */
  createUser(username: string, password: string): Promise<void>;

  /**
   * Updates a user's password.
   * @param username - Username
   * @param newPassword - New password
   */
  updateUserPassword(username: string, newPassword: string): Promise<void>;

  /**
   * Deletes a user.
   * @param username - Username
   */
  deleteUser(username: string): Promise<void>;
}

// ============================================================================
// Service Events (for reactive UI integration)
// ============================================================================

/**
 * Events emitted by the TypeDB service.
 * These can be observed by the UI layer for reactive updates.
 */
export interface TypeDBServiceEvents {
  /** Connection status changed */
  onStatusChange: (status: ConnectionStatus) => void;
  /** Database list updated */
  onDatabasesChange: (databases: Database[]) => void;
  /** User list updated */
  onUsersChange: (users: User[]) => void;
  /** Transaction opened */
  onTransactionOpen: (transaction: Transaction) => void;
  /** Transaction committed */
  onTransactionCommit: (transactionId: string) => void;
  /** Transaction closed/rolled back */
  onTransactionClose: (transactionId: string) => void;
  /** Query executed */
  onQueryExecuted: (response: QueryResponse) => void;
  /** Error occurred */
  onError: (error: TypeDBServiceError) => void;
}

/**
 * Structured error from TypeDB service.
 */
export interface TypeDBServiceError {
  /** Error code (e.g., "CONNECTION_FAILED", "QUERY_ERROR") */
  code: string;
  /** Human-readable message */
  message: string;
  /** Original error details */
  details?: unknown;
}
