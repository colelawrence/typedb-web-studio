/**
 * TypeDB WASM Service Implementation
 *
 * Implements the TypeDBService interface using the WASM-compiled TypeDB
 * embedded database. This allows running TypeDB entirely in the browser
 * without any server connection.
 *
 * Usage:
 * ```typescript
 * const service = new TypeDBWasmService();
 * await service.connect({ address: 'wasm://local', username: 'user', password: '' });
 * const result = await service.executeQuery('mydb', 'match $x isa person;');
 * ```
 */

import type {
  TypeDBService,
  ConnectionParams,
  TokenConnectionParams,
  ConnectionStatus,
  Database,
  User,
  Transaction,
  TransactionType,
  QueryResponse,
  QueryResultData,
  MatchQueryResult,
  DefineQueryResult,
  InsertQueryResult,
  DatabaseSchema,
  TypeDBServiceError,
  ConceptMap,
  Concept,
  AttributeValue,
} from "./typedb-service";

// ============================================================================
// Types for WASM Playground API
// ============================================================================

/**
 * Result from wasm-playground query() method
 */
interface WasmQueryResult {
  success: boolean;
  columns: string[];
  rows: WasmResultRow[];
  row_count: number;
  error?: WasmError;
}

interface WasmResultRow {
  values: WasmColumnValue[];
}

interface WasmColumnValue {
  variable: string;
  value: WasmRichValue;
}

type WasmRichValue =
  | { kind: "Entity"; type_name: string; iid: string }
  | { kind: "Relation"; type_name: string; iid: string }
  | { kind: "Attribute"; type_name: string; value: WasmAttributeValue }
  | { kind: "Type"; category: string; label: string }
  | { kind: "Value"; type: string; value: unknown }
  | { kind: "ThingList"; items: WasmRichValue[] }
  | { kind: "ValueList"; items: WasmAttributeValue[] }
  | { kind: "None" };

interface WasmAttributeValue {
  type: "String" | "Integer" | "Double" | "Boolean" | "Date" | "DateTime" | "DateTimeTZ" | "Duration" | "Decimal" | "Struct";
  value: string | number | boolean;
}

/**
 * Result from wasm-playground write()/define_schema() methods
 */
interface WasmOperationResult {
  success: boolean;
  message: string;
  row_count?: number;
  error?: WasmError;
}

interface WasmError {
  kind: string;
  message: string;
  location?: { line: number; column: number; snippet?: string };
  hint?: string;
}

/**
 * Result from detect_query_type()
 */
interface WasmQueryTypeDetection {
  query_type: "schema" | "write" | "read" | "unknown";
  confident: boolean;
  keyword?: string;
}

/**
 * The TypeDBPlayground class from wasm-playground
 */
interface TypeDBPlayground {
  execute(query: string): WasmQueryResult | WasmOperationResult;
  execute_with_mode(query: string, mode: string): WasmQueryResult | WasmOperationResult;
  detect_query_type(query: string): WasmQueryTypeDetection;
  analyze(query: string): WasmAnalyzeResult;
  query(query: string): WasmQueryResult;
  write(query: string): WasmOperationResult;
  define_schema(schema: string): WasmOperationResult;
  info(): { name: string; status: string };
  free(): void;
}

interface WasmAnalyzeResult {
  source: string;
  diagnostics: WasmDiagnostic[];
  query_type?: string;
  valid: boolean;
}

interface WasmDiagnostic {
  severity: string;
  code: string;
  message: string;
  position?: { line: number; column: number };
  span?: { begin: number; end: number };
  formatted?: string;
}

/**
 * Dynamic import type for wasm-playground module
 */
interface WasmPlaygroundModule {
  default: () => Promise<unknown>;
  TypeDBPlayground: new (name: string) => TypeDBPlayground;
}

// ============================================================================
// WASM Service Implementation
// ============================================================================

/**
 * TypeDB service implementation using WebAssembly.
 *
 * Each "database" is a separate TypeDBPlayground instance running in memory.
 * Data is not persisted across page refreshes.
 */
export class TypeDBWasmService implements TypeDBService {
  private status: ConnectionStatus = "disconnected";
  private databases: Map<string, TypeDBPlayground> = new Map();
  private wasmModule: WasmPlaygroundModule | null = null;
  private initPromise: Promise<void> | null = null;

  // ---------------------------------------------------------------------------
  // WASM Initialization
  // ---------------------------------------------------------------------------

  /**
   * Lazily load and initialize the WASM module.
   */
  private async ensureWasmLoaded(): Promise<WasmPlaygroundModule> {
    if (this.wasmModule) {
      return this.wasmModule;
    }

    if (!this.initPromise) {
      this.initPromise = this.loadWasm();
    }

    await this.initPromise;
    return this.wasmModule!;
  }

  private async loadWasm(): Promise<void> {
    try {
      // Dynamic import of the WASM module
      // This will be resolved by Vite/bundler at build time
      const module = await import("typedb-wasm-playground") as WasmPlaygroundModule;

      // Initialize the WASM runtime
      await module.default();

      this.wasmModule = module;
      console.log("[TypeDB WASM] Module loaded successfully");
    } catch (error) {
      console.error("[TypeDB WASM] Failed to load module:", error);
      throw new Error(`Failed to load TypeDB WASM module: ${error}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  async connect(params: ConnectionParams): Promise<void> {
    this.status = "connecting";

    try {
      await this.ensureWasmLoaded();

      // In WASM mode, we create a default database if one is specified
      if (params.database) {
        await this.createDatabase(params.database);
      }

      this.status = "connected";
      console.log("[TypeDB WASM] Connected (browser-only mode)");
    } catch (error) {
      this.status = "disconnected";
      throw error;
    }
  }

  async connectWithToken(_params: TokenConnectionParams): Promise<void> {
    // Token auth doesn't apply to WASM mode
    throw this.notSupported("Token-based authentication");
  }

  async disconnect(): Promise<void> {
    // Clean up all playground instances
    for (const [name, playground] of this.databases) {
      try {
        playground.free();
      } catch (e) {
        console.warn(`[TypeDB WASM] Failed to free database '${name}':`, e);
      }
    }
    this.databases.clear();
    this.status = "disconnected";
    console.log("[TypeDB WASM] Disconnected");
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  async checkHealth(): Promise<boolean> {
    return this.status === "connected" && this.wasmModule !== null;
  }

  async getServerVersion(): Promise<string> {
    // Return embedded TypeDB version
    return "3.0.0-wasm";
  }

  // ---------------------------------------------------------------------------
  // Database Management
  // ---------------------------------------------------------------------------

  async getDatabases(): Promise<Database[]> {
    return Array.from(this.databases.keys()).map((name) => ({ name }));
  }

  async createDatabase(name: string): Promise<void> {
    if (this.databases.has(name)) {
      throw this.error("DATABASE_EXISTS", `Database '${name}' already exists`);
    }

    const module = await this.ensureWasmLoaded();

    try {
      const playground = new module.TypeDBPlayground(name);
      this.databases.set(name, playground);
      console.log(`[TypeDB WASM] Created database '${name}'`);
    } catch (error) {
      throw this.error("DATABASE_CREATE_FAILED", `Failed to create database '${name}': ${error}`);
    }
  }

  async deleteDatabase(name: string): Promise<void> {
    const playground = this.databases.get(name);
    if (!playground) {
      throw this.error("DATABASE_NOT_FOUND", `Database '${name}' not found`);
    }

    try {
      playground.free();
    } catch (e) {
      // Ignore cleanup errors
    }

    this.databases.delete(name);
    console.log(`[TypeDB WASM] Deleted database '${name}'`);
  }

  async getDatabaseSchemaText(database: string): Promise<string> {
    // Verify database exists
    this.getPlayground(database);
    // TODO: Execute schema query to get types
    return "# Schema not yet implemented for WASM mode";
  }

  async getDatabaseSchema(database: string): Promise<DatabaseSchema> {
    // Verify database exists
    this.getPlayground(database);

    // TODO: Query schema from database
    // For now return empty schema
    return {
      entityTypes: [],
      relationTypes: [],
      attributeTypes: [],
    };
  }

  // ---------------------------------------------------------------------------
  // Transaction Management
  // ---------------------------------------------------------------------------

  async openTransaction(database: string, type: TransactionType): Promise<Transaction> {
    // WASM mode uses auto-transaction management
    // We return a fake transaction handle, but verify database exists
    this.getPlayground(database);

    return {
      id: `wasm-tx-${Date.now()}`,
      type,
      openedAt: Date.now(),
      hasUncommittedChanges: false,
    };
  }

  async commitTransaction(_transactionId: string): Promise<void> {
    // WASM auto-commits, nothing to do
  }

  async closeTransaction(_transactionId: string): Promise<void> {
    // WASM auto-closes, nothing to do
  }

  // ---------------------------------------------------------------------------
  // Query Execution
  // ---------------------------------------------------------------------------

  async query(_transactionId: string, query: string): Promise<QueryResponse> {
    // In WASM mode, we use auto-transaction management
    // Get the first available database (transaction tracking not implemented)
    const database = this.databases.keys().next().value;
    if (!database) {
      throw this.error("NO_DATABASE", "No database available");
    }
    return this.executeQuery(database, query);
  }

  async executeQuery(
    database: string,
    query: string,
    options?: { transactionType?: TransactionType }
  ): Promise<QueryResponse> {
    const playground = this.getPlayground(database);
    const startTime = Date.now();

    // Detect or use provided transaction type
    let transactionType = options?.transactionType;
    if (!transactionType) {
      const detection = playground.detect_query_type(query);
      transactionType = this.mapWasmQueryType(detection.query_type);
    }

    try {
      let result: WasmQueryResult | WasmOperationResult;

      if (transactionType === "schema") {
        result = playground.define_schema(query);
      } else if (transactionType === "write") {
        result = playground.write(query);
      } else {
        result = playground.query(query);
      }

      const executionTimeMs = Date.now() - startTime;

      if (!result.success) {
        throw this.error(
          "QUERY_ERROR",
          result.error?.message || "Query execution failed",
          result.error
        );
      }

      return {
        query,
        transactionType,
        executionTimeMs,
        data: this.convertResult(result, transactionType),
      };
    } catch (error) {
      if ((error as TypeDBServiceError).code) {
        throw error;
      }
      throw this.error("QUERY_ERROR", `Query failed: ${error}`);
    }
  }

  // ---------------------------------------------------------------------------
  // User Management (Not Supported in WASM)
  // ---------------------------------------------------------------------------

  async getUsers(): Promise<User[]> {
    throw this.notSupported("User management");
  }

  async createUser(_username: string, _password: string): Promise<void> {
    throw this.notSupported("User management");
  }

  async updateUserPassword(_username: string, _newPassword: string): Promise<void> {
    throw this.notSupported("User management");
  }

  async deleteUser(_username: string): Promise<void> {
    throw this.notSupported("User management");
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private getPlayground(database: string): TypeDBPlayground {
    const playground = this.databases.get(database);
    if (!playground) {
      throw this.error("DATABASE_NOT_FOUND", `Database '${database}' not found`);
    }
    return playground;
  }

  private mapWasmQueryType(type: string): TransactionType {
    switch (type) {
      case "schema":
        return "schema";
      case "write":
        return "write";
      case "read":
      default:
        return "read";
    }
  }

  private convertResult(
    result: WasmQueryResult | WasmOperationResult,
    transactionType: TransactionType
  ): QueryResultData {
    // Check if it's a query result (has rows)
    if ("rows" in result && result.rows) {
      const answers = result.rows.map((row) => this.convertRow(row));
      return {
        type: "match",
        answers,
      } as MatchQueryResult;
    }

    // Operation result (schema/write)
    if (transactionType === "schema") {
      return {
        type: "define",
        success: result.success,
      } as DefineQueryResult;
    }

    return {
      type: "insert",
      inserted: [],
    } as InsertQueryResult;
  }

  private convertRow(row: WasmResultRow): ConceptMap {
    const map: ConceptMap = {};
    for (const col of row.values) {
      map[col.variable] = this.convertValue(col.value);
    }
    return map;
  }

  private convertValue(value: WasmRichValue): Concept {
    switch (value.kind) {
      case "Entity":
        return {
          kind: "entity",
          type: value.type_name,
          iid: value.iid,
        };
      case "Relation":
        return {
          kind: "relation",
          type: value.type_name,
          iid: value.iid,
        };
      case "Attribute":
        return {
          kind: "attribute",
          type: value.type_name,
          value: this.convertAttributeValue(value.value),
        };
      case "Type":
        return {
          kind: value.category.toLowerCase().replace(" ", "_") as "entity_type" | "relation_type" | "attribute_type" | "role_type",
          type: value.label,
        };
      case "Value":
        return {
          kind: "attribute",
          type: "value",
          value: value.value as AttributeValue,
        };
      case "None":
      default:
        return {
          kind: "entity",
          type: "unknown",
        };
    }
  }

  private convertAttributeValue(value: WasmAttributeValue): AttributeValue {
    switch (value.type) {
      case "String":
        return value.value as string;
      case "Integer":
      case "Double":
      case "Decimal":
        return value.value as number;
      case "Boolean":
        return value.value as boolean;
      case "Date":
      case "DateTime":
      case "DateTimeTZ":
        return new Date(value.value as string);
      default:
        return value.value as string;
    }
  }

  private error(code: string, message: string, details?: unknown): TypeDBServiceError {
    return { code, message, details };
  }

  private notSupported(feature: string): TypeDBServiceError {
    return this.error(
      "NOT_SUPPORTED",
      `${feature} is not supported in browser-only (WASM) mode. Connect to a TypeDB server for full functionality.`
    );
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new TypeDB WASM service instance.
 */
export function createWasmService(): TypeDBService {
  return new TypeDBWasmService();
}
