# Dense UI Catalog - TypeDB Web Studio

This document inventories every UI surface through view models to derive Dense-Core spacing/typography rules.

---

## 1. Application Shell

### TopBar (`TopBarVM`)
**Layout:** Fixed horizontal bar, always visible
```
[Logo] [Navigation Tabs] ... [DB Selector] [Connection Status]
```

| Element | Spacing | Typography | Color Semantic |
|---------|---------|------------|----------------|
| Logo | `pl-4`, 40x40px clickable area | - | - |
| Nav tabs | `gap-1` between tabs | `text-sm font-medium` | `muted-foreground` / `foreground` active |
| DB selector | `mr-2` | `text-sm` | `muted-foreground` placeholder, `foreground` selected |
| Status beacon | `w-2 h-2` dot | `text-sm` | `error`/`ok`/`warn` beacon variants |

**Responsive:** Collapse to hamburger menu on narrow screens

### Snackbar (`SnackbarVM`)
**Position:** Fixed bottom-center, above floating UI
**Animation:** Slide up 200ms

| Variant | Background | Icon | Duration |
|---------|------------|------|----------|
| `success` | `chart-2` green | Checkmark | 4s auto |
| `warning` | `chart-4` amber | Warning | 4s auto |
| `error` | `destructive` red | Error | Persistent |

**Spacing:** `px-4 py-3`, max 80 chars, `rounded-lg`

---

## 2. Pages

### 2.1 Home Page (`HomePageVM`)

**Layout:**
```
┌─────────────────────────────────────────┐
│        Welcome to TypeDB Studio         │  ← h1
│          {connectionSummary}            │  ← text-muted
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │  ← cards grid
│  │ Connect │ │  Query  │ │ Schema  │   │
│  └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────┘
```

| Element | Spacing | Typography |
|---------|---------|------------|
| Page container | `py-12 px-6` | - |
| Welcome heading | `mb-2` | `text-3xl font-semibold` |
| Connection summary | `mb-8` | `text-base text-muted-foreground` |
| Cards grid | `gap-6`, 3 columns | - |
| Card | `p-6`, `rounded-xl` | - |
| Card icon | `w-10 h-10 mb-4` | - |
| Card title | `mb-2` | `text-lg font-medium` |
| Card description | - | `text-sm text-muted-foreground` |

### 2.2 Connect Page (`ConnectPageVM`)

**Sections:**
1. **Demos Section** - Pre-loaded databases
2. **Local Servers Section** - User WASM servers
3. **Remote Connection Section** - HTTP form (collapsible)

| Element | Spacing | Typography |
|---------|---------|------------|
| Section container | `mb-8` | - |
| Section heading | `mb-4` | `text-lg font-semibold` |
| Demo card | `p-4`, `gap-3` | - |
| Demo icon | `w-8 h-8` | - |
| Demo name | - | `text-base font-medium` |
| Demo description | - | `text-sm text-muted-foreground` |
| Local server row | `py-3 px-4` | - |
| Server name | - | `text-sm font-medium` |
| Server meta | - | `text-xs text-muted-foreground` |
| Form field label | `mb-1.5` | `text-sm font-medium` |
| Form input | `h-9 px-3` | `text-sm` |
| Form error | `mt-1` | `text-xs text-destructive` |
| Button primary | `h-9 px-4` | `text-sm font-medium` |

### 2.3 Query Page (`QueryPageVM`)

**Complex 4-panel layout:**
```
┌──────────────┬─────────────────────────────────────┐
│   Sidebar    │  Editor (code/chat)                 │
│   200-400px  │  ┌─────────────────────────────────┐│
│              │  │ Header + Actions                ││
│ ┌──────────┐ │  ├─────────────────────────────────┤│
│ │ Schema   │ │  │ Code/Chat Content              ││
│ └──────────┘ │  └─────────────────────────────────┘│
│ ┌──────────┐ │  Results (log/table/graph/raw)     │
│ │ Saved    │ │  ┌─────────────────────────────────┐│
│ │ Queries  │ │  │ Tab bar + Content              ││
│ └──────────┘ │  └─────────────────────────────────┘│
│              │  History Bar (collapsible)          │
└──────────────┴─────────────────────────────────────┘
```

#### Sidebar (`QuerySidebarVM`)
| Element | Spacing | Typography |
|---------|---------|------------|
| Sidebar container | `w-[280px]` default, 200-50% | - |
| Section header | `py-2 px-3` | `text-xs font-semibold uppercase tracking-wider` |
| Collapse chevron | `w-4 h-4` | - |
| Tree item row | `py-1.5 px-3` | `text-sm` |
| Tree indent | `16-24px` per level | - |
| Tree icon | `w-4 h-4 mr-2` | - |
| Search input | `h-8 mx-3 my-2` | `text-sm` |

#### Editor (`QueryEditorVM`)
| Element | Spacing | Typography |
|---------|---------|------------|
| Header bar | `h-10 px-3 gap-2` | - |
| Title | - | `text-sm font-medium` |
| Dirty indicator (*) | `ml-0.5` | `text-destructive` |
| Mode tabs | `h-7 px-2` | `text-xs font-medium` |
| Action buttons | `h-7 w-7` icon-only, `h-7 px-3` with label | `text-xs` |
| Code editor | `p-4` | `font-mono text-sm` |
| Autocomplete popup | `py-1`, `max-h-[200px]` | - |
| Autocomplete item | `py-1.5 px-3` | `text-sm` |
| Autocomplete kind | `ml-auto` | `text-xs text-muted-foreground` |

#### Results (`QueryResultsVM`)
| Element | Spacing | Typography |
|---------|---------|------------|
| Tab bar | `h-9 px-2 gap-1` | - |
| Tab button | `h-7 px-3` | `text-xs font-medium` |
| Log content | `p-4` | `font-mono text-sm` |
| Table header | `h-8 px-3` | `text-xs font-semibold uppercase` |
| Table cell | `py-2 px-3` | `text-sm` |
| Graph container | Full available | - |
| Zoom controls | `bottom-4 right-4` position | `text-xs` |

#### History Bar (`QueryHistoryBarVM`)
| Element | Spacing | Typography |
|---------|---------|------------|
| Collapsed bar | `h-9 px-3` | - |
| Entry row | `py-2 px-3` | - |
| Status icon | `w-4 h-4` | - |
| Query summary | truncate 40 chars | `text-sm font-mono` |
| Time ago | `ml-auto` | `text-xs text-muted-foreground` |
| Duration | `ml-2` | `text-xs text-muted-foreground` |

### 2.4 Schema Page (`SchemaPageVM`)

**Layout:** Sidebar + Graph visualization
```
┌──────────────┬─────────────────────────────────────────┐
│  Schema      │                                         │
│  Tree        │        Graph (force-directed)           │
│  (resize)    │                                         │
│              │        - Entities: rectangles           │
│  [controls]  │        - Relations: diamonds            │
│  [tree]      │        - Attributes: ovals              │
└──────────────┴─────────────────────────────────────────┘
```

| Element | Spacing | Typography |
|---------|---------|------------|
| Sidebar | Same as Query sidebar | - |
| View mode dropdown | `h-8` | `text-sm` |
| Link toggles | `gap-2`, pill buttons | `text-xs` |
| Graph node label | - | `text-xs font-medium` |
| Graph tooltip | `p-2` | `text-xs` |
| Info panel | `w-[240px] p-4` | - |

### 2.5 Users Page (`UsersPageVM`)

**Layout:** Table with header action
```
┌─────────────────────────────────────────────────────────┐
│  User Management                        [+ Create User] │
├─────────────────────────────────────────────────────────┤
│  Username            Actions                            │
│  ────────────────────────────────────────────────────── │
│  admin               [Edit Password] [Delete]           │
│  analyst             [Edit Password] [Delete]           │
└─────────────────────────────────────────────────────────┘
```

| Element | Spacing | Typography |
|---------|---------|------------|
| Page header | `py-4 px-6` | - |
| Page title | - | `text-xl font-semibold` |
| Create button | `h-9 px-4` | `text-sm font-medium` |
| Table container | `mx-6` | - |
| Table header | `h-10 px-4` | `text-xs font-semibold uppercase tracking-wider` |
| Table row | `h-12 px-4` | - |
| Username cell | - | `text-sm font-medium` |
| Action button | `h-7 px-2` | `text-xs` |

---

## 3. Dialogs (`DialogsVM`)

### Dialog Types Inventory

| Dialog | Width | Content Height |
|--------|-------|----------------|
| Confirmation | `max-w-[400px]` | Auto |
| Strong Confirmation | `max-w-[400px]` | Auto |
| Create Database | `max-w-[400px]` | Auto |
| Save Query | `max-w-[480px]` | Auto, scrollable folder list |
| Create Folder | `max-w-[400px]` | Auto |
| Move Query | `max-w-[400px]` | Auto, scrollable folder list |
| Import Queries | `max-w-[480px]` | Auto |
| Create User | `max-w-[400px]` | Auto |
| Edit Password | `max-w-[400px]` | Auto |

### Dialog Spacing Pattern

| Element | Spacing | Typography |
|---------|---------|------------|
| Backdrop | Full screen, `bg-black/50` | - |
| Container | `rounded-lg`, `shadow-lg` | - |
| Header | `p-6 pb-0` | - |
| Title | `mb-2` | `text-lg font-semibold` |
| Body text | `mb-4` | `text-sm text-muted-foreground` |
| Content | `px-6 py-4` | - |
| Form field | `mb-4` | - |
| Field label | `mb-1.5` | `text-sm font-medium` |
| Field input | `h-9` | `text-sm` |
| Field error | `mt-1` | `text-xs text-destructive` |
| Footer | `p-6 pt-0 gap-3 justify-end` | - |
| Cancel button | `h-9 px-4` secondary | `text-sm` |
| Confirm button | `h-9 px-4` primary/destructive | `text-sm font-medium` |

---

## 4. Shared Components

### Schema Tree (`SchemaTreeVM`)
Used in: Query Sidebar, Schema Page

| Element | Spacing | Typography |
|---------|---------|------------|
| Group header | `py-2 px-3` | `text-xs font-semibold uppercase tracking-wider` |
| Group count | `ml-1` | `text-xs text-muted-foreground` |
| Item row | `py-1.5 px-3` | `text-sm` |
| Item icon | `w-4 h-4 mr-2` | - |
| Abstract indicator | - | `italic` |
| Child item | `py-1 px-3 ml-4` | `text-xs` |
| Generate button (hover) | `w-6 h-6` | - |

### Saved Queries Tree (`SavedQueriesTreeVM`)
Used in: Query Sidebar

| Element | Spacing | Typography |
|---------|---------|------------|
| Search bar | `h-8 mx-3 my-2` | `text-sm` |
| Empty state | `py-8 px-4 text-center` | `text-sm text-muted-foreground` |
| Folder row | `py-1.5 px-3` | `text-sm font-medium` |
| Query row | `py-1.5 px-3` | `text-sm` |
| Selected indicator | `bg-accent` | - |
| Rename input | `h-6` inline | `text-sm` |
| Context menu | `py-1 min-w-[160px]` | - |
| Context item | `py-1.5 px-3` | `text-sm` |
| Context destructive | - | `text-destructive` |

### Form Inputs (`FormInputVM`, `PasswordInputVM`)

| Element | Spacing | Typography |
|---------|---------|------------|
| Label | `mb-1.5` | `text-sm font-medium` |
| Input | `h-9 px-3`, `rounded-md` | `text-sm` |
| Input focus | `ring-2 ring-ring` | - |
| Input disabled | `opacity-50` | - |
| Error text | `mt-1` | `text-xs text-destructive` |
| Password toggle | `absolute right-2` | - |

### Context Menu (`ContextMenuActionVM`)

| Element | Spacing | Typography |
|---------|---------|------------|
| Menu container | `py-1`, `rounded-md`, `shadow-md` | - |
| Menu item | `py-1.5 px-3` | `text-sm` |
| Item icon | `w-4 h-4 mr-2` | - |
| Destructive item | - | `text-destructive` |
| Disabled item | `opacity-50` | - |

---

## 5. Dense-Core Token Derivation

### Spacing Scale (8px base)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-0` | 0 | - |
| `--space-0.5` | 2px | Micro gaps, icons in text |
| `--space-1` | 4px | Tight gaps between elements |
| `--space-1.5` | 6px | Form field margins |
| `--space-2` | 8px | Standard gap, button padding-y |
| `--space-3` | 12px | Section padding, card padding |
| `--space-4` | 16px | Panel padding, page margins |
| `--space-6` | 24px | Major section gaps |
| `--space-8` | 32px | Page-level spacing |

### Typography Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `--text-xs` | 11px | 16px | 400/500 | Badges, timestamps, counts |
| `--text-sm` | 13px | 20px | 400/500 | Body text, form inputs, buttons |
| `--text-base` | 15px | 24px | 400 | Descriptions, summaries |
| `--text-lg` | 17px | 26px | 500/600 | Section headings |
| `--text-xl` | 20px | 28px | 600 | Page titles |
| `--text-2xl` | 24px | 32px | 600 | Major headings |
| `--text-3xl` | 30px | 38px | 600 | Hero headings |

### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | System stack | All UI text |
| `--font-mono` | Source Code Pro, monospace | Code editor, query text, logs |

### Interactive Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--height-compact` | 28px (h-7) | Inline actions, small buttons |
| `--height-default` | 36px (h-9) | Form inputs, standard buttons |
| `--height-row` | 40px (h-10) | Table rows, list items |
| `--height-header` | 48px (h-12) | Section headers, top bar |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small buttons, badges |
| `--radius-md` | 6px | Inputs, cards |
| `--radius-lg` | 8px | Dialogs, panels |
| `--radius-xl` | 12px | Feature cards |
| `--radius-full` | 9999px | Avatars, pills |

---

## 6. Color Semantic Tokens

### Connection States (Beacon)

| State | Token | Current OKLCH | Semantic |
|-------|-------|---------------|----------|
| Disconnected | `--beacon-error` | `destructive` | Red dot |
| Connecting | `--beacon-warn` | `chart-4` | Amber dot + pulse |
| Connected | `--beacon-ok` | `chart-2` | Green dot |
| Reconnecting | `--beacon-warn` | `chart-4` | Amber dot + pulse |

### Snackbar Variants

| Variant | Background | Foreground | Icon |
|---------|------------|------------|------|
| Success | `--snack-success-bg` | `--snack-success-fg` | CheckCircle |
| Warning | `--snack-warning-bg` | `--snack-warning-fg` | AlertTriangle |
| Error | `--snack-error-bg` | `--snack-error-fg` | XCircle |

### Schema Graph Nodes

| Kind | Fill | Stroke | Shape |
|------|------|--------|-------|
| Entity | `--graph-entity` | darker variant | Rectangle |
| Relation | `--graph-relation` | darker variant | Diamond |
| Attribute | `--graph-attribute` | darker variant | Oval |
| Abstract | 50% opacity | dashed | Same |

### Disabled States

| State | Opacity | Cursor |
|-------|---------|--------|
| Disabled | 0.5 | not-allowed |
| Loading | 0.7 | wait |

---

## 7. Recommended CSS Variable Updates

Add to `src/styles.css` using Tailwind v4's CSS-first `@theme` directive:

```css
@theme inline {
  /* Dense-Core Spacing Scale (compact) */
  --spacing-0: 0;
  --spacing-0-5: 0.125rem;  /* 2px */
  --spacing-1: 0.25rem;     /* 4px */
  --spacing-1-5: 0.375rem;  /* 6px */
  --spacing-2: 0.5rem;      /* 8px */
  --spacing-3: 0.75rem;     /* 12px */
  --spacing-4: 1rem;        /* 16px */
  --spacing-6: 1.5rem;      /* 24px */
  --spacing-8: 2rem;        /* 32px */

  /* Dense-Core Typography (compact sizes) */
  --font-size-dense-xs: 0.6875rem;   /* 11px */
  --font-size-dense-sm: 0.8125rem;   /* 13px */
  --font-size-dense-base: 0.9375rem; /* 15px */
  --font-size-dense-lg: 1.0625rem;   /* 17px */
  --font-size-dense-xl: 1.25rem;     /* 20px */

  /* Dense-Core Interactive Heights */
  --height-compact: 1.75rem;  /* 28px - inline actions */
  --height-default: 2.25rem;  /* 36px - form inputs */
  --height-row: 2.5rem;       /* 40px - table rows */
  --height-header: 3rem;      /* 48px - section headers */

  /* Connection Beacon Colors (semantic) */
  --color-beacon-error: var(--destructive);
  --color-beacon-warn: var(--chart-4);
  --color-beacon-ok: var(--chart-2);

  /* Schema Graph Node Colors (OKLCH for wide gamut) */
  --color-graph-entity: oklch(0.65 0.15 250);     /* blue-ish */
  --color-graph-relation: oklch(0.65 0.15 320);   /* magenta-ish */
  --color-graph-attribute: oklch(0.65 0.15 140);  /* green-ish */

  /* TypeQL Operation Colors (semantic by operation type) */
  --color-op-read: oklch(0.65 0.18 220);          /* cyan - match, fetch */
  --color-op-write: oklch(0.70 0.18 60);          /* amber - insert, delete, update */
  --color-op-schema: oklch(0.65 0.18 290);        /* violet - define, undefine, redefine */
  --color-op-commit: oklch(0.65 0.18 145);        /* green - commit transaction */
  --color-op-rollback: oklch(0.65 0.20 25);       /* red - rollback transaction */
}
```

### TypeQL Syntax Highlighting Colors

Add semantic tokens for the code editor:

```css
:root {
  /* TypeQL Keywords by category */
  --syntax-keyword-read: var(--color-op-read);       /* match, fetch, get */
  --syntax-keyword-write: var(--color-op-write);     /* insert, delete, update */
  --syntax-keyword-schema: var(--color-op-schema);   /* define, undefine, redefine */

  /* TypeQL Structural Keywords */
  --syntax-keyword-struct: oklch(0.60 0.15 280);     /* sub, owns, plays, relates */
  --syntax-keyword-modifier: oklch(0.55 0.10 250);   /* abstract, @key, @unique */

  /* TypeQL Values & Identifiers */
  --syntax-type: oklch(0.70 0.15 180);               /* entity, relation, attribute names */
  --syntax-variable: oklch(0.75 0.12 60);            /* $x, $person, $_ */
  --syntax-string: oklch(0.65 0.15 140);             /* "strings" */
  --syntax-number: oklch(0.70 0.18 40);              /* 123, 45.67 */
  --syntax-comment: oklch(0.55 0.03 250);            /* # comments */
  --syntax-punctuation: var(--muted-foreground);     /* ;, :, {, } */
}

.dark {
  /* Adjusted for dark mode (higher lightness for readability) */
  --syntax-keyword-read: oklch(0.75 0.18 220);
  --syntax-keyword-write: oklch(0.80 0.18 60);
  --syntax-keyword-schema: oklch(0.75 0.18 290);
  --syntax-type: oklch(0.80 0.15 180);
  --syntax-variable: oklch(0.85 0.12 60);
  --syntax-string: oklch(0.75 0.15 140);
  --syntax-number: oklch(0.80 0.18 40);
  --syntax-comment: oklch(0.50 0.03 250);
}
```

---

## 8. Tailwind v4 Component Patterns

Using the project's semantic color system (auto-adapts to dark mode):

### Connection Beacon
```tsx
// Use semantic colors, no dark: variants needed
const beaconClasses = {
  error: "bg-beacon-error", // disconnected
  warn: "bg-beacon-warn animate-pulse", // connecting/reconnecting
  ok: "bg-beacon-ok", // connected
};

<span className={`size-2 rounded-full ${beaconClasses[state]}`} />
```

### TypeQL Operation Badge
```tsx
// Color-coded by operation type
const opClasses = {
  read: "bg-op-read/10 text-op-read border-op-read/30",
  write: "bg-op-write/10 text-op-write border-op-write/30",
  schema: "bg-op-schema/10 text-op-schema border-op-schema/30",
};

<span className={`px-2 py-0.5 text-xs font-medium rounded border ${opClasses[type]}`}>
  {keyword}
</span>
```

### Dense Interactive Row
```tsx
// Compact row with hover states
<div className="
  h-row px-3
  flex items-center gap-2
  text-sm text-muted-foreground
  hover:bg-accent hover:text-accent-foreground
  transition-colors cursor-pointer
">
  {children}
</div>
```

### Dense Form Input
```tsx
<input className="
  h-default px-3 w-full
  text-sm bg-background
  border border-input rounded-md
  focus:ring-2 focus:ring-ring focus:border-transparent
  placeholder:text-muted-foreground
" />
```

### Sidebar Section Header
```tsx
<button className="
  w-full h-header px-3
  flex items-center justify-between gap-2
  text-xs font-semibold uppercase tracking-wider
  text-muted-foreground hover:text-foreground
  transition-colors
">
  <span>{label}</span>
  <ChevronIcon className="size-4" />
</button>
```

### Schema Graph Node (Entity)
```tsx
<div className="
  px-3 py-1.5 rounded-md
  bg-graph-entity/20 border border-graph-entity/50
  text-xs font-medium text-graph-entity
">
  {typeName}
</div>
```

### Snackbar Notification
```tsx
const snackVariants = {
  success: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  warning: "bg-chart-4/10 text-chart-4 border-chart-4/30",
  error: "bg-destructive/10 text-destructive border-destructive/30",
};

<div className={`
  px-4 py-3 rounded-lg border
  flex items-center gap-3
  shadow-lg backdrop-blur-sm
  ${snackVariants[variant]}
`}>
```

---

## 9. Open Questions / Ambiguities

1. **Tailwind v4 Config Location**: Per Tailwind v4 best practices, CSS-first configuration via `@theme inline` in `src/styles.css` is the **recommended approach**:
   - **Recommendation**: Keep all Dense-Core tokens in `src/styles.css` using `@theme inline`
   - **Reasoning**: v4 is designed for CSS-first config; JS config is legacy compatibility only
   - **Tooling**: VS Code Tailwind IntelliSense works with CSS `@theme` definitions
   - Only use `@config "./tailwind.config.js"` if integrating with tools requiring JS config

2. **TypeQL Operation Colors**: TypeDB uses READ/WRITE semantics, not HTTP verbs. Need operation-semantic colors:
   - **READ operations** (`match`, `fetch`): blue/cyan - safe, idempotent queries
   - **WRITE operations** (`insert`, `delete`, `update`): orange/amber - modifying data
   - **SCHEMA operations** (`define`, `undefine`, `redefine`): purple/violet - structural changes
   - **TRANSACTION markers** (`commit`, `rollback`): green (commit) / red (rollback)

3. **Code Syntax Palette**: TypeQL editor needs syntax highlighting colors. Need to define:
   - Keywords (match, fetch, define, etc.)
   - Types (entity, relation, attribute)
   - Variables ($x, $p)
   - Strings
   - Comments

4. **External Dense UI References**: Would benefit from reviewing:
   - Linear's UI density patterns
   - Vercel dashboard spacing
   - VS Code's compact mode
   - Discord's information density

---

## 10. Component Count Summary

| Category | Count | Examples |
|----------|-------|----------|
| Pages | 5 | Home, Connect, Query, Schema, Users |
| Dialogs | 9 | Confirmation, Save Query, Create User, etc. |
| Panels | 6 | Sidebar, Editor, Results, History, Graph, etc. |
| Trees | 2 | Schema Tree, Saved Queries Tree |
| Forms | 4 | Connection, Create DB, Create User, Edit Password |
| Tables | 2 | Users table, Results table |
| Notifications | 1 | Snackbar with 3 variants |
| Status Indicators | 3 | Connection beacon, Graph status, Table status |

**Total unique VM interfaces: 47**
