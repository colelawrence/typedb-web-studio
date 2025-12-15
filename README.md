# TypeDB Web Studio

A web-based IDE for TypeDB, built with React, TanStack Start, and LiveStore.

## Features

- **Connect** - Connect to TypeDB servers with URL or credential-based authentication
- **Query Editor** - Write and execute TypeQL queries with syntax highlighting (Monaco editor integration planned)
- **Schema Browser** - Explore database schema as a tree view and interactive graph
- **User Management** - Create, edit, and delete database users
- **Results Viewer** - View query results as logs, tables, graphs, or raw JSON

## Architecture

### Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React meta-framework)
- **State Management**: [LiveStore](https://livestore.dev) with OPFS persistence
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with OKLCH color system
- **Routing**: [TanStack Router](https://tanstack.com/router) (file-based)
- **Icons**: [Lucide React](https://lucide.dev/)

### View Model Pattern

The app uses a view-model architecture where:

- **VM Interfaces** (`src/vm/`) define the shape of reactive state for each component
- **Scope** (`src/vm/scope.ts`) implements business logic and connects to LiveStore
- **Components** (`src/components/`) consume VMs via the `Queryable` component for fine-grained reactivity

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   LiveStore     │────▶│   VM Scope      │────▶│   React UI      │
│   (State)       │     │   (Logic)       │     │   (Presentation)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Project Structure

```
src/
├── components/
│   ├── app/           # App shell (TopBar, Snackbar)
│   └── pages/         # Page components (Home, Connect, Query, Schema, Users)
├── livestore/         # LiveStore schema, events, and worker
├── vm/                # View model interfaces and scope
│   ├── pages/         # Page-specific VMs
│   ├── top-bar/       # Top bar VMs
│   ├── dialogs/       # Dialog VMs
│   └── shared/        # Shared VMs (schema tree)
├── routes/            # TanStack Router file-based routes
└── styles.css         # Tailwind + OKLCH design tokens
```

## Development

### Linting & Formatting

```bash
pnpm lint    # Run Biome linter
pnpm format  # Format code with Biome
pnpm check   # Run all checks
```

### Adding Components

This project is configured for [shadcn/ui](https://ui.shadcn.com/):

```bash
pnpm dlx shadcn@latest add button
```

## Testing

```bash
pnpm test        # Run all tests
pnpm test:watch  # Run tests in watch mode
```

This project uses **VM-first testing** - we test View Models, not React components. See [TESTING-PLAN.md](./TESTING-PLAN.md) for the full testing philosophy.

**Key principle**: React components are "dumb views" that render VM state. If the VM works correctly, the view works correctly. This makes tests more maintainable and meaningful.

```
┌─────────────────────────────────────────────────────────────┐
│                  VM INTEGRATION TESTS                       │  ← PRIMARY (90%)
│  Test full flows: VM ↔ Service ↔ TypeDB WASM               │
├─────────────────────────────────────────────────────────────┤
│              Service/Utility Tests                          │  ← SECONDARY (10%)
├─────────────────────────────────────────────────────────────┤
│           React Component Tests (NONE)                      │  ← NOT NEEDED
└─────────────────────────────────────────────────────────────┘
```

## Status

🚧 **Work in Progress** - The UI shell and VM interfaces are complete. Business logic implementation (TypeDB driver integration, actual queries, etc.) is pending.
