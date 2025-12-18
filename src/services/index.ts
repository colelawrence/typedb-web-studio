/**
 * TypeDB Service Provider
 *
 * Manages the active TypeDB service instance and provides a way to switch
 * between different service implementations (WASM for browser-only, HTTP for server).
 */

import type { TypeDBService, ConnectionStatus } from "./typedb-service";
import { TypeDBEmbeddedService } from "./typedb-embedded-service";

// Re-export types
export type { TypeDBService, ConnectionStatus, TypeDBServiceEvents } from "./typedb-service";
export type {
  TransactionType,
  OperationMode,
  ConnectionParams,
  Database,
  User,
  Transaction,
  QueryResponse,
  QueryResultData,
  DatabaseSchema,
  TypeDBServiceError,
} from "./typedb-service";
export { detectQueryType } from "./typedb-service";

/**
 * Service mode - determines which TypeDB service implementation to use.
 */
export type ServiceMode = "wasm" | "http";

/**
 * Service provider state.
 */
interface ServiceState {
  mode: ServiceMode;
  service: TypeDBService | null;
  status: ConnectionStatus;
}

/**
 * Event listeners for service provider events.
 */
interface ServiceProviderListeners {
  onModeChange: Set<(mode: ServiceMode) => void>;
  onStatusChange: Set<(status: ConnectionStatus) => void>;
  onServiceReady: Set<(service: TypeDBService) => void>;
}

/**
 * Global service state.
 */
const state: ServiceState = {
  mode: "wasm", // Default to WASM mode for zero-setup experience
  service: null,
  status: "disconnected",
};

const listeners: ServiceProviderListeners = {
  onModeChange: new Set(),
  onStatusChange: new Set(),
  onServiceReady: new Set(),
};

/**
 * Gets the current service mode.
 */
export function getServiceMode(): ServiceMode {
  return state.mode;
}

/**
 * Sets the service mode.
 * This will disconnect any existing service and prepare for the new mode.
 */
export async function setServiceMode(mode: ServiceMode): Promise<void> {
  if (state.mode === mode && state.service) {
    return; // Already in this mode
  }

  // Disconnect existing service
  if (state.service) {
    try {
      await state.service.disconnect();
    } catch (e) {
      console.warn("[ServiceProvider] Error disconnecting:", e);
    }
    state.service = null;
  }

  state.mode = mode;
  state.status = "disconnected";

  // Notify listeners
  for (const listener of listeners.onModeChange) {
    listener(mode);
  }
  for (const listener of listeners.onStatusChange) {
    listener(state.status);
  }

  console.log(`[ServiceProvider] Mode set to: ${mode}`);
}

/**
 * Gets or creates the TypeDB service for the current mode.
 */
export function getService(): TypeDBService {
  if (!state.service) {
    state.service = createServiceForMode(state.mode);
  }
  return state.service;
}

/**
 * Creates a service instance for the given mode.
 */
function createServiceForMode(mode: ServiceMode): TypeDBService {
  switch (mode) {
    case "wasm":
      console.log("[ServiceProvider] Creating embedded WASM service");
      return new TypeDBEmbeddedService();
    case "http":
      // TODO: Implement HTTP service
      console.log("[ServiceProvider] HTTP service not yet implemented, falling back to embedded WASM");
      return new TypeDBEmbeddedService();
    default:
      throw new Error(`Unknown service mode: ${mode}`);
  }
}

/**
 * Gets the current connection status.
 */
export function getConnectionStatus(): ConnectionStatus {
  if (state.service) {
    return state.service.getStatus();
  }
  return state.status;
}

/**
 * Updates the connection status and notifies listeners.
 */
export function updateConnectionStatus(status: ConnectionStatus): void {
  state.status = status;
  for (const listener of listeners.onStatusChange) {
    listener(status);
  }
}

/**
 * Subscribes to mode changes.
 */
export function onModeChange(listener: (mode: ServiceMode) => void): () => void {
  listeners.onModeChange.add(listener);
  return () => listeners.onModeChange.delete(listener);
}

/**
 * Subscribes to status changes.
 */
export function onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
  listeners.onStatusChange.add(listener);
  return () => listeners.onStatusChange.delete(listener);
}

/**
 * Subscribes to service ready events.
 */
export function onServiceReady(listener: (service: TypeDBService) => void): () => void {
  listeners.onServiceReady.add(listener);
  return () => listeners.onServiceReady.delete(listener);
}

/**
 * Quick connect for WASM mode (no credentials needed).
 * Optionally creates a database if databaseName is provided.
 * @param databaseName - Optional database to create on connect. If not provided, connects without a database.
 */
export async function quickConnectWasm(databaseName?: string): Promise<TypeDBService> {
  await setServiceMode("wasm");
  const service = getService();

  updateConnectionStatus("connecting");

  try {
    // Connect (this loads WASM)
    // If databaseName is provided, creates that database on connect
    await service.connect({
      address: "wasm://local",
      username: "browser",
      password: "",
      database: databaseName,
    });

    updateConnectionStatus("connected");

    // Notify listeners
    for (const listener of listeners.onServiceReady) {
      listener(service);
    }

    if (databaseName) {
      console.log(`[ServiceProvider] WASM connected with database '${databaseName}'`);
    } else {
      console.log(`[ServiceProvider] WASM connected (no database selected)`);
    }
    return service;
  } catch (error) {
    updateConnectionStatus("disconnected");
    throw error;
  }
}

/**
 * Connect to an HTTP TypeDB server.
 */
export async function connectHttp(
  address: string,
  username: string,
  password: string,
  database?: string
): Promise<TypeDBService> {
  await setServiceMode("http");
  const service = getService();

  updateConnectionStatus("connecting");

  try {
    await service.connect({ address, username, password, database });
    updateConnectionStatus("connected");

    // Notify listeners
    for (const listener of listeners.onServiceReady) {
      listener(service);
    }

    return service;
  } catch (error) {
    updateConnectionStatus("disconnected");
    throw error;
  }
}

/**
 * Disconnect from the current service.
 */
export async function disconnect(): Promise<void> {
  if (state.service) {
    await state.service.disconnect();
    updateConnectionStatus("disconnected");
  }
}
