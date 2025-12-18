# @typedb/studio

TypeDB Web Studio - A browser-based IDE for TypeDB with an embedded WASM database.

Run TypeDB queries directly in your browser with zero server setup required.

## Quick Start

```bash
# Run without installation
npx @typedb/studio

# Or install globally
npm install -g @typedb/studio
typedb-studio
```

The studio will open in your default browser at http://localhost:3500

## Features

- **Zero Setup** - Runs entirely in the browser using WebAssembly
- **Full TypeQL Support** - Schema definitions, queries, inserts, relations
- **Persistent Storage** - Save databases to browser IndexedDB
- **Offline Capable** - Works without internet connection after first load
- **Schema Visualization** - Explore your database schema graphically

## CLI Options

```bash
typedb-studio [options]

Options:
  --port <port>   Port to listen on (default: 3500)
  --host <host>   Host to bind to (default: 127.0.0.1)
  --no-open       Don't open browser automatically
  --help, -h      Show help message
```

## Examples

```bash
# Run on custom port
typedb-studio --port 8080

# Run without opening browser
typedb-studio --no-open

# Bind to all interfaces (for remote access)
typedb-studio --host 0.0.0.0
```

## How It Works

The studio uses TypeDB compiled to WebAssembly, running entirely in your browser. This means:

1. **No server required** - The CLI just serves static files
2. **Data stays local** - Your databases are stored in browser IndexedDB
3. **Fast startup** - No JVM or database server to boot

## Requirements

- Node.js 18 or later
- Modern browser with WebAssembly support (Chrome, Firefox, Safari, Edge)

## Related Packages

- [`@typedb/embedded`](https://www.npmjs.com/package/@typedb/embedded) - Use TypeDB WASM as a library in your JavaScript/TypeScript projects

## License

MPL-2.0
