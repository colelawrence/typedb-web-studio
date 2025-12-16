/**
 * TypeDB Embedded Service Implementation
 *
 * Implements the TypeDBService interface using @typedb/embedded.
 * This provides a cleaner API than wasm-playground and is primarily
 * intended for testing purposes.
 *
 * Key differences from TypeDBWasmService:
 * - Uses @typedb/embedded's clean Database API
 * - Supports snapshots for test fixtures
 * - Better error handling with typed errors
 */

import { Database, schemaFromDatabase, type SchemaBundle } from '@typedb/embedded'
import type {
  TypeDBService,
  ConnectionParams,
  TokenConnectionParams,
  ConnectionStatus,
  Database as DatabaseInfo,
  User,
  Transaction,
  TransactionType,
  QueryResponse,
  QueryResultData,
  MatchQueryResult,
  DefineQueryResult,
  InsertQueryResult,
  DeleteQueryResult,
  DatabaseSchema,
  TypeDBServiceError,
  ConceptMap,
  Concept,
  AttributeValue,
} from './typedb-service'
import { detectQueryType } from './typedb-service'

/**
 * TypeDB service implementation using @typedb/embedded.
 *
 * Each "database" is a separate Database instance running in memory.
 */
export class TypeDBEmbeddedService implements TypeDBService {
  private status: ConnectionStatus = 'disconnected'
  private databases: Map<string, Database> = new Map()

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  async connect(params: ConnectionParams): Promise<void> {
    this.status = 'connecting'

    try {
      // In embedded mode, we create a default database if one is specified
      if (params.database) {
        await this.createDatabase(params.database)
      }

      this.status = 'connected'
      console.log('[TypeDB Embedded] Connected (in-memory mode)')
    } catch (error) {
      this.status = 'disconnected'
      throw error
    }
  }

  async connectWithToken(_params: TokenConnectionParams): Promise<void> {
    throw this.notSupported('Token-based authentication')
  }

  async disconnect(): Promise<void> {
    // Close all database instances
    for (const [name, db] of this.databases) {
      try {
        await db.close()
      } catch (e) {
        console.warn(`[TypeDB Embedded] Failed to close database '${name}':`, e)
      }
    }
    this.databases.clear()
    this.status = 'disconnected'
    console.log('[TypeDB Embedded] Disconnected')
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  async checkHealth(): Promise<boolean> {
    return this.status === 'connected'
  }

  async getServerVersion(): Promise<string> {
    return '3.0.0-embedded'
  }

  // ---------------------------------------------------------------------------
  // Database Management
  // ---------------------------------------------------------------------------

  async getDatabases(): Promise<DatabaseInfo[]> {
    return Array.from(this.databases.keys()).map((name) => ({ name }))
  }

  async createDatabase(name: string): Promise<void> {
    // Idempotent: if database already exists, just return
    if (this.databases.has(name)) {
      console.log(`[TypeDB Embedded] Database '${name}' already exists, reusing`)
      return
    }

    try {
      const db = await Database.open(name)
      this.databases.set(name, db)
      console.log(`[TypeDB Embedded] Created database '${name}'`)
    } catch (error) {
      throw this.error('DATABASE_CREATE_FAILED', `Failed to create database '${name}': ${error}`)
    }
  }

  async deleteDatabase(name: string): Promise<void> {
    const db = this.databases.get(name)
    if (!db) {
      throw this.error('DATABASE_NOT_FOUND', `Database '${name}' not found`)
    }

    try {
      await db.close()
    } catch (e) {
      // Ignore cleanup errors
    }

    this.databases.delete(name)
    console.log(`[TypeDB Embedded] Deleted database '${name}'`)
  }

  async getDatabaseSchemaText(database: string): Promise<string> {
    // Verify database exists
    this.getDatabase(database)
    // TODO: Execute schema query to get types
    return '# Schema export not yet implemented for embedded mode'
  }

  async getDatabaseSchema(database: string): Promise<DatabaseSchema> {
    // Verify database exists
    this.getDatabase(database)

    // TODO: Query schema from database
    return {
      entityTypes: [],
      relationTypes: [],
      attributeTypes: [],
    }
  }

  /**
   * Get full schema introspection for a database using TypeQL queries.
   * This provides complete schema information including ownership, roles, etc.
   */
  async getSchemaBundle(database: string): Promise<SchemaBundle> {
    const db = this.getDatabase(database)
    return schemaFromDatabase(db, { sampleForValueTypes: true, metaGraphPrefix: false })
  }

  // ---------------------------------------------------------------------------
  // Transaction Management
  // ---------------------------------------------------------------------------

  async openTransaction(database: string, type: TransactionType): Promise<Transaction> {
    // Embedded mode uses auto-transaction management
    // We return a fake transaction handle, but verify database exists
    this.getDatabase(database)

    return {
      id: `embedded-tx-${Date.now()}`,
      type,
      openedAt: Date.now(),
      hasUncommittedChanges: false,
    }
  }

  async commitTransaction(_transactionId: string): Promise<void> {
    // Embedded auto-commits
  }

  async closeTransaction(_transactionId: string): Promise<void> {
    // Embedded auto-closes
  }

  // ---------------------------------------------------------------------------
  // Query Execution
  // ---------------------------------------------------------------------------

  async query(_transactionId: string, query: string): Promise<QueryResponse> {
    const database = this.databases.keys().next().value
    if (!database) {
      throw this.error('NO_DATABASE', 'No database available')
    }
    return this.executeQuery(database, query)
  }

  async executeQuery(
    database: string,
    query: string,
    options?: { transactionType?: TransactionType }
  ): Promise<QueryResponse> {
    const db = this.getDatabase(database)
    const startTime = Date.now()

    // Detect or use provided transaction type
    let transactionType = options?.transactionType
    if (!transactionType) {
      const detection = detectQueryType(query)
      transactionType = detection.transactionType
    }

    try {
      let data: QueryResultData

      if (transactionType === 'schema') {
        await db.define(query)
        data = {
          type: 'define',
          success: true,
        } as DefineQueryResult
      } else if (transactionType === 'write') {
        const count = await db.execute(query)
        // For insert queries, we return empty inserted array
        // (full concept maps not available from embedded API)
        data = {
          type: 'insert',
          inserted: [],
        } as InsertQueryResult
        // If it was a delete query
        if (query.toLowerCase().includes('delete')) {
          data = {
            type: 'delete',
            deletedCount: count,
          } as DeleteQueryResult
        }
      } else {
        const result = await db.query(query)
        const answers = result.rows.map((row) => this.convertRow(row))
        data = {
          type: 'match',
          answers,
        } as MatchQueryResult
      }

      return {
        query,
        transactionType,
        executionTimeMs: Date.now() - startTime,
        data,
      }
    } catch (error) {
      if ((error as TypeDBServiceError).code) {
        throw error
      }
      throw this.error('QUERY_ERROR', `Query failed: ${error}`)
    }
  }

  // ---------------------------------------------------------------------------
  // User Management (Not Supported in Embedded)
  // ---------------------------------------------------------------------------

  async getUsers(): Promise<User[]> {
    throw this.notSupported('User management')
  }

  async createUser(_username: string, _password: string): Promise<void> {
    throw this.notSupported('User management')
  }

  async updateUserPassword(_username: string, _newPassword: string): Promise<void> {
    throw this.notSupported('User management')
  }

  async deleteUser(_username: string): Promise<void> {
    throw this.notSupported('User management')
  }

  // ---------------------------------------------------------------------------
  // Embedded-Specific Methods (for testing)
  // ---------------------------------------------------------------------------

  /**
   * Get the underlying Database instance for advanced operations.
   */
  getDatabaseInstance(name: string): Database {
    return this.getDatabase(name)
  }

  /**
   * Attach an existing Database instance.
   * Useful for setting up pre-populated test databases.
   */
  attachDatabase(name: string, db: Database): void {
    if (this.databases.has(name)) {
      throw this.error('DATABASE_EXISTS', `Database '${name}' already exists`)
    }
    this.databases.set(name, db)
    console.log(`[TypeDB Embedded] Attached database '${name}'`)
  }

  /**
   * Export a database snapshot for test fixtures.
   */
  async exportSnapshot(database: string): Promise<Uint8Array> {
    const db = this.getDatabase(database)
    return db.exportSnapshot()
  }

  /**
   * Import a database snapshot from test fixtures.
   */
  async importSnapshot(database: string, snapshot: Uint8Array): Promise<void> {
    const db = this.getDatabase(database)
    await db.importSnapshot(snapshot)
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private getDatabase(name: string): Database {
    const db = this.databases.get(name)
    if (!db) {
      throw this.error('DATABASE_NOT_FOUND', `Database '${name}' not found`)
    }
    return db
  }

  private convertRow(row: Record<string, unknown>): ConceptMap {
    const map: ConceptMap = {}
    for (const [key, value] of Object.entries(row)) {
      map[key] = this.convertValue(value)
    }
    return map
  }

  private convertValue(value: unknown): Concept {
    // The @typedb/embedded Value type has methods like isEntity(), asString(), etc.
    // We need to introspect it to convert to our Concept type
    const v = value as {
      kind: string
      typeName?: string
      iid?: string
      asString?: () => string
      asNumber?: () => number
      asBoolean?: () => boolean
    }

    if (v.kind === 'Entity') {
      return {
        kind: 'entity',
        type: v.typeName || 'unknown',
        iid: v.iid,
      }
    }

    if (v.kind === 'Relation') {
      return {
        kind: 'relation',
        type: v.typeName || 'unknown',
        iid: v.iid,
      }
    }

    if (v.kind === 'Attribute') {
      return {
        kind: 'attribute',
        type: v.typeName || 'unknown',
        value: this.extractAttributeValue(v),
      }
    }

    // Type concept
    if (v.kind === 'Type') {
      return {
        kind: 'entity_type',
        type: v.typeName || 'unknown',
      }
    }

    // Default - treat as unknown
    return {
      kind: 'entity',
      type: 'unknown',
    }
  }

  private extractAttributeValue(v: { asString?: () => string; asNumber?: () => number; asBoolean?: () => boolean }): AttributeValue {
    if (v.asString) {
      try {
        return v.asString()
      } catch {}
    }
    if (v.asNumber) {
      try {
        return v.asNumber()
      } catch {}
    }
    if (v.asBoolean) {
      try {
        return v.asBoolean()
      } catch {}
    }
    return 'unknown'
  }

  private error(code: string, message: string, details?: unknown): TypeDBServiceError {
    return { code, message, details }
  }

  private notSupported(feature: string): TypeDBServiceError {
    return this.error(
      'NOT_SUPPORTED',
      `${feature} is not supported in embedded mode.`
    )
  }
}

/**
 * Creates a new TypeDB Embedded service instance.
 */
export function createEmbeddedService(): TypeDBEmbeddedService {
  return new TypeDBEmbeddedService()
}
