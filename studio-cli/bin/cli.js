#!/usr/bin/env node

/**
 * TypeDB Web Studio CLI
 *
 * Zero-dependency static server for TypeDB Web Studio.
 * Serves the pre-built SPA with proper WASM support.
 *
 * Usage:
 *   npx @typedb/studio
 *   npx @typedb/studio --port 8080
 *   npx @typedb/studio --no-open
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Parse CLI arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return defaultValue;
  const nextArg = args[index + 1];
  if (nextArg && !nextArg.startsWith('--')) return nextArg;
  return true;
};

const PORT = parseInt(getArg('port', process.env.PORT || '3000'), 10);
const HOST = getArg('host', '127.0.0.1');
const OPEN_BROWSER = !args.includes('--no-open');
const HELP = args.includes('--help') || args.includes('-h');

if (HELP) {
  console.log(`
TypeDB Web Studio

Usage:
  typedb-studio [options]

Options:
  --port <port>   Port to listen on (default: 3000)
  --host <host>   Host to bind to (default: 127.0.0.1)
  --no-open       Don't open browser automatically
  --help, -h      Show this help message

Examples:
  typedb-studio
  typedb-studio --port 8080
  typedb-studio --no-open
`);
  process.exit(0);
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

// Resolve dist directory (relative to this script)
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Check dist exists
if (!fs.existsSync(DIST_DIR)) {
  console.error('Error: dist/ directory not found.');
  console.error('The package may not have been built correctly.');
  process.exit(1);
}

// Find the index HTML file (TanStack Start uses _shell.html)
const INDEX_FILES = ['index.html', '_shell.html'];
let indexFile = null;
for (const file of INDEX_FILES) {
  const filePath = path.join(DIST_DIR, file);
  if (fs.existsSync(filePath)) {
    indexFile = filePath;
    break;
  }
}

if (!indexFile) {
  console.error('Error: No index.html or _shell.html found in dist/');
  process.exit(1);
}

/**
 * Serve a static file with proper headers
 */
function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const stat = fs.statSync(filePath);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    // CORS headers for WASM and worker loading
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    // Cache control
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });

  fs.createReadStream(filePath).pipe(res);
}

/**
 * Handle HTTP requests
 */
function handleRequest(req, res) {
  // Only handle GET requests
  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  // Parse URL and sanitize path
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  // Prevent directory traversal
  pathname = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');

  // Resolve file path
  let filePath = path.join(DIST_DIR, pathname);

  try {
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Try index.html in directory
      const dirIndex = path.join(filePath, 'index.html');
      if (fs.existsSync(dirIndex)) {
        serveFile(res, dirIndex);
        return;
      }
    } else if (stat.isFile()) {
      serveFile(res, filePath);
      return;
    }
  } catch (e) {
    // File doesn't exist - fall through to SPA handling
  }

  // SPA fallback: serve index for client-side routing
  // But NOT for asset requests (files with extensions)
  const hasExtension = path.extname(pathname).length > 0;
  if (!hasExtension) {
    serveFile(res, indexFile);
    return;
  }

  // 404 for missing assets
  res.writeHead(404);
  res.end('Not Found');
}

/**
 * Open URL in default browser
 */
function openBrowser(url) {
  const platform = process.platform;
  let command;

  switch (platform) {
    case 'darwin':
      command = `open "${url}"`;
      break;
    case 'win32':
      command = `start "" "${url}"`;
      break;
    default:
      command = `xdg-open "${url}"`;
  }

  exec(command, (err) => {
    if (err) {
      console.log(`Could not open browser automatically. Visit: ${url}`);
    }
  });
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;

  console.log(`
┌─────────────────────────────────────────────────┐
│                                                 │
│   TypeDB Web Studio                             │
│                                                 │
│   Local:   ${url.padEnd(35)}│
│                                                 │
│   Press Ctrl+C to stop                          │
│                                                 │
└─────────────────────────────────────────────────┘
`);

  if (OPEN_BROWSER) {
    openBrowser(url);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
