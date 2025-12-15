/**
 * TypeDB Web Studio Server
 *
 * Zero-dependency HTTP server for serving TypeDB Web Studio static files.
 */

import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Server configuration options
 */
export interface ServerOptions {
  /** Port to listen on (default: 3000) */
  port?: number;
  /** Host to bind to (default: "127.0.0.1") */
  host?: string;
  /** Custom path to dist directory */
  distDir?: string;
}

/**
 * Running server instance
 */
export interface ServerInstance {
  /** The underlying HTTP server */
  server: http.Server;
  /** URL the server is listening on */
  url: string;
  /** Stop the server */
  close: () => Promise<void>;
}

// MIME types for static files
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/**
 * Start the TypeDB Web Studio server
 *
 * @param options - Server configuration
 * @returns Promise resolving to server instance
 *
 * @example
 * ```ts
 * const server = await startServer({ port: 8080 });
 * console.log(`Server running at ${server.url}`);
 *
 * // Later...
 * await server.close();
 * ```
 */
export function startServer(options: ServerOptions = {}): Promise<ServerInstance> {
  const port = options.port ?? 3000;
  const host = options.host ?? "127.0.0.1";
  const distDir = options.distDir ?? path.join(__dirname, "dist");

  // Validate dist directory
  if (!fs.existsSync(distDir)) {
    throw new Error(`dist directory not found: ${distDir}`);
  }

  // Find index file
  const indexFiles = ["index.html", "_shell.html"];
  let indexFile: string | null = null;
  for (const file of indexFiles) {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
      indexFile = filePath;
      break;
    }
  }

  if (!indexFile) {
    throw new Error("No index.html or _shell.html found in dist/");
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Only handle GET requests
      if (req.method !== "GET") {
        res.writeHead(405);
        res.end("Method Not Allowed");
        return;
      }

      // Parse URL
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      let pathname = decodeURIComponent(url.pathname);
      pathname = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");

      let filePath = path.join(distDir, pathname);

      try {
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          const dirIndex = path.join(filePath, "index.html");
          if (fs.existsSync(dirIndex)) {
            serveFile(res, dirIndex);
            return;
          }
        } else if (stat.isFile()) {
          serveFile(res, filePath);
          return;
        }
      } catch {
        // File doesn't exist
      }

      // SPA fallback
      const hasExtension = path.extname(pathname).length > 0;
      if (!hasExtension) {
        serveFile(res, indexFile!);
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    server.on("error", reject);

    server.listen(port, host, () => {
      const url = `http://${host}:${port}`;
      resolve({
        server,
        url,
        close: () =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
          }),
      });
    });
  });
}

function serveFile(res: http.ServerResponse, filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const stat = fs.statSync(filePath);

  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": stat.size,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });

  fs.createReadStream(filePath).pipe(res);
}
