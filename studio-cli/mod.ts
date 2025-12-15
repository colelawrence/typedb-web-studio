/**
 * @module
 * TypeDB Web Studio - Browser-based IDE for TypeDB
 *
 * This module exports the CLI server functionality for programmatic use.
 * For CLI usage, run: npx @typedb/studio or deno run -A jsr:@phosphor/typedb-studio/cli
 *
 * @example
 * ```ts
 * import { startServer } from "@phosphor/typedb-studio";
 *
 * const server = await startServer({ port: 3000 });
 * console.log("Server running on port 3000");
 * ```
 */

export { startServer, type ServerOptions } from "./server.ts";
