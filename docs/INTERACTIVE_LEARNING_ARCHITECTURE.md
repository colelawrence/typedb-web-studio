# Interactive TypeQL Learning Environment

## Document Guidelines

**Purpose**: This document defines the architecture and phased implementation plan for an interactive TypeQL learning environment within TypeDB Web Studio.

**How to use this document**:
1. Work through phases sequentially - each builds on the previous
2. Each phase includes verification tests that MUST pass before proceeding
3. Write test code directly into the codebase as you implement
4. Update the "Artifacts" section of each phase with implementation notes, gotchas, and links to key files
5. Mark phases as `[DONE]`, `[IN PROGRESS]`, or `[TODO]`

**Core Design Principles**:
- Profile ID is the universal isolation boundary (state, DB, tests)
- Curriculum content must be testable (all examples run in CI)
- Free-form exploration over gated progression
- Documentation is an overlay on the reference-REPL dyad

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         THREE-PANE LAYOUT                           │
│                                                                      │
│  ┌─────────────┐  ┌─────────────────────────┐  ┌─────────────────┐  │
│  │  SIDEBAR    │  │  DOCUMENTATION          │  │  QUERY REPL     │  │
│  │             │  │  (collapsible)          │  │                 │  │
│  │  Search     │  │                         │  │  Editor         │  │
│  │  ──────     │  │  Content with           │  │  Results        │  │
│  │  LEARN      │  │  interactive examples   │  │  History        │  │
│  │  (progress) │  │                         │  │                 │  │
│  │  ──────     │  │  [→ REPL] [▶ Run]       │  │                 │  │
│  │  REFERENCE  │  │  buttons on code        │  │                 │  │
│  │             │  │                         │  │                 │  │
│  └─────────────┘  └─────────────────────────┘  └─────────────────┘  │
│                                                                      │
│  When docs collapsed: Sidebar + REPL only                           │
└─────────────────────────────────────────────────────────────────────┘
```

### State Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PROFILE-SCOPED ISOLATION                        │
│                                                                      │
│  Profile ID: "user_abc123" | "test_xyz789"                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  LiveStore (SQLite)        TypeDB (In-Memory)                │   │
│  │  ├─ reading_progress       ├─ lesson domain data             │   │
│  │  ├─ example_executions     └─ (isolated per profile)         │   │
│  │  ├─ annotations                                              │   │
│  │  └─ query_history                                            │   │
│  │                                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Profile Context Foundation [DONE]

### Goals
- Treat profile ID as the isolation primitive in LiveStore (state + events)
- Expose profile progress/querying through the VM instead of ad-hoc React state
- Keep profile-aware tests parallelizable by reusing our embedded TypeDB tooling

### Implementation

#### 1.1 LiveStore Schema Integration

Extended `src/livestore/schema.ts` using the existing `State.SQLite.table` / `Events.synced` helpers. New tables live alongside the other `tables` entries:

```typescript
// Profile root
profiles: State.SQLite.table({
  name: "profiles",
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    displayName: State.SQLite.text({ nullable: true }),
    createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    lastActiveAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
  },
}),

readingProgress: State.SQLite.table({
  name: "readingProgress",
  columns: {
    id: State.SQLite.text({ primaryKey: true }), // `${profileId}:${sectionId}:${headingId ?? "root"}`
    profileId: State.SQLite.text({}),
    sectionId: State.SQLite.text({}),
    headingId: State.SQLite.text({ nullable: true }),
    markedRead: State.SQLite.boolean({ default: false }),
    firstViewedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
    lastViewedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
  },
}),
```

Also added `exampleExecutions` and `annotations` tables, plus events (`profileCreated`, `profileUpdated`, `profileDeleted`, `readingProgressMarked`, `readingProgressCleared`, `exampleExecuted`, `annotationCreated`, `annotationUpdated`, `annotationDeleted`) and their materializers. Queryables are exposed in `src/livestore/queries.ts`.

#### 1.2 VM Exposure & Profile Persistence

Instead of introducing a parallel React context, extend `createStudioScope` (`src/vm/scope.ts`) to:

1. Discover or create the active profile ID (localStorage `typedb_studio_profile` is fine) and upsert the `profiles` table via LiveStore events.
2. Provide queryables such as `vm.learn.profile$`, `vm.learn.progressStats$`, and imperative helpers (`vm.learn.markSectionRead`) that internally call `store.commit(events.readingProgressMarked(...))`.
3. Surface these hooks through the VM tree so UI components consume profile state the same way they consume connection/query data. This keeps progress observable, makes SSR/testing possible, and avoids duplicate persistence layers.

#### 1.3 Test Utilities

Create `src/profile/__tests__/profile-test-utils.ts` to wrap our existing LiveStore test harness:

```typescript
import { createStore } from "@livestore/livestore";
import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { schema, events } from "@/livestore";

export interface TestProfileContext {
  profileId: string;
  store: Store<typeof schema>;
  cleanup: () => Promise<void>;
}

export async function createTestProfile(): Promise<TestProfileContext> {
  const store = await createStore({ schema, adapter: makeInMemoryAdapter(), storeId: ... });
  const profileId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  store.commit(events.profileCreated({ id: profileId, createdAt: new Date(), lastActiveAt: new Date() }));
  return {
    profileId,
    store,
    cleanup: async () => store.destroy?.(),
  };
}
```

Use this helper inside Vitest suites to assert isolation (two profiles in the same store never see each other’s progress) and to verify cleanup removes all state. Because LiveStore already isolates state per store, we can run these tests in parallel without extra locking.

### Verification Tests

Create `src/profile/__tests__/profile-isolation.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestProfile, type TestProfile } from './profile-test-utils';

describe('Profile Isolation', () => {
  let profileA: TestProfile;
  let profileB: TestProfile;

  beforeEach(async () => {
    profileA = await createTestProfile();
    profileB = await createTestProfile();
  });

  afterEach(async () => {
    await profileA.cleanup();
    await profileB.cleanup();
  });

  it('profiles have unique IDs', () => {
    expect(profileA.id).not.toBe(profileB.id);
    expect(profileA.id).toMatch(/^test_\d+_[a-z0-9]+$/);
  });

  it('reading progress is isolated between profiles', async () => {
    // Mark section read in profile A
    await markSectionRead(profileA.id, 'match-basics', 'variables');

    // Profile B should not see it
    const isReadA = await isSectionRead(profileA.id, 'match-basics', 'variables');
    const isReadB = await isSectionRead(profileB.id, 'match-basics', 'variables');

    expect(isReadA).toBe(true);
    expect(isReadB).toBe(false);
  });

  it('example executions are isolated between profiles', async () => {
    // Record execution in profile A
    await recordExecution(profileA.id, 'first-match', true, 'docs-run');

    // Profile B should not see it
    const executedA = await getExecutedExamples(profileA.id);
    const executedB = await getExecutedExamples(profileB.id);

    expect(executedA).toContain('first-match');
    expect(executedB).not.toContain('first-match');
  });

  it('cleanup removes all profile data', async () => {
    await markSectionRead(profileA.id, 'match-basics');
    await recordExecution(profileA.id, 'first-match', true, 'docs-run');

    await profileA.cleanup();

    // All data should be gone
    const progress = await getReadingProgress(profileA.id);
    const executions = await getExecutedExamples(profileA.id);

    expect(progress).toHaveLength(0);
    expect(executions).toHaveLength(0);
  });
});

describe('Profile Persistence', () => {
  it('profile ID persists in localStorage', async () => {
    // Clear any existing profile
    localStorage.removeItem('typedb_studio_profile');

    // First "visit" - should create new profile
    const profile1 = await initializeProfile();
    const storedId = localStorage.getItem('typedb_studio_profile');

    expect(storedId).toBe(profile1.id);

    // Second "visit" - should reuse profile
    const profile2 = await initializeProfile();

    expect(profile2.id).toBe(profile1.id);
  });
});
```

### Acceptance Criteria
- [x] All tests in `profile-isolation.test.ts` pass (22 tests)
- [x] Multiple test files can run in parallel without interference
- [x] Profile ID is generated on first visit and persisted (localStorage `typedb_studio_profile`)
- [x] LiveStore tables are created with profile ID as isolation key

### Artifacts

#### Key files created:
- `src/livestore/schema.ts` - Added 4 tables (profiles, readingProgress, exampleExecutions, annotations), 9 events, and 9 materializers
- `src/livestore/queries.ts` - Added 9 profile-related query functions
- `src/profile/__tests__/profile-test-utils.ts` - Test utilities for profile creation and state management
- `src/profile/__tests__/profile-isolation.test.ts` - 22 comprehensive tests covering isolation and CRUD operations

#### Implementation notes:
- **No upsert in LiveStore**: Used delete + insert pattern for `readingProgressMarked` since LiveStore SQLite doesn't have an `upsert` method
- **Composite keys**: Reading progress uses `${profileId}:${sectionId}:${headingId ?? "root"}` as the primary key
- **Store lifecycle in tests**: Added small delays between rapid store operations to avoid Effect.scoped cleanup race conditions
- **Query pattern**: Functions like `isSectionRead$()` return arrays (not single items) since `.first()` was causing issues - consumers check `results.length > 0`

#### Related PRs:
- (to be created)

---

## Phase 2: Curriculum Content Format [DONE]

### Goals
- Define markdown format with typed code fences
- Build parser + metadata extractor that runs under Node (Vitest “tools” suite)
- Create curriculum content types that can be imported both by the tooling and by the browser bundle
- Set up a build step (Vite `import.meta.glob`) so curriculum ships as static JSON

> **Test Environment**: parser/tests run with Vitest’s Node environment (`environment: 'node'`) so they can use `fs/promises`, `glob`, and the Embedded TypeDB service while still sharing the same runner as our browser suites.

### Implementation

#### 2.1 Content Types

Create `src/curriculum/types.ts`:

```typescript
export interface CurriculumMeta {
  sections: SectionMeta[];
  contexts: ContextMeta[];
}

export interface SectionMeta {
  id: string;
  title: string;
  path: string[];  // Breadcrumb: ["Basics", "Querying"]
  order: number;
  file: string;    // Relative path to markdown file
}

export interface ContextMeta {
  name: string;
  description: string;
  schemaFile: string;
  seedFile: string;
}

export interface ParsedSection {
  id: string;
  title: string;
  context: string;           // Which DB context to use
  requires: string[];        // Prerequisite section IDs
  headings: ParsedHeading[];
  examples: ParsedExample[];
  rawContent: string;        // Original markdown
}

export interface ParsedHeading {
  id: string;         // Slugified heading text
  text: string;
  level: number;      // 1-6
  line: number;       // Source line number
}

export interface ParsedExample {
  id: string;
  type: 'example' | 'invalid' | 'schema' | 'readonly';
  query: string;
  expect?: {
    results?: boolean;    // Should return results
    min?: number;         // Minimum result count
    max?: number;         // Maximum result count
    error?: string;       // Expected error pattern (for 'invalid' type)
  };
  notes?: string;         // Explanation text
  sourceFile: string;
  lineNumber: number;
}

export type ExampleType = ParsedExample['type'];
```

#### 2.2 Markdown Format Specification

Curriculum markdown files use this format:

```markdown
---
id: match-basics
title: Basic Pattern Matching
context: social-network
requires: [types-intro]
---

# Pattern Matching

The `match` clause finds data that fits a pattern you describe.

## Variables

Variables in TypeQL start with `$`. They're placeholders that TypeDB fills in.

```typeql:example[id=first-match, expect=results]
match $p isa person;
get $p;
```

## Constraining Matches

Add constraints to narrow your results:

```typeql:example[id=match-with-name, expect=results, min=1]
match
  $p isa person,
    has name "Alice";
get $p;
```

### What Not To Do

```typeql:invalid[id=bad-syntax, error="expecting 'isa'"]
match $p person;
```
```

**Code fence annotations**:
- `typeql:example[...]` - Runnable example, should succeed
- `typeql:invalid[...]` - Demonstrates wrong syntax
- `typeql:schema[...]` - Schema definition
- `typeql:readonly[...]` - Display only, not interactive

**Annotation attributes**:
- `id=string` - Unique identifier (required)
- `expect=results|success` - What to expect
- `min=number` - Minimum result count
- `max=number` - Maximum result count
- `error="pattern"` - Expected error (for invalid examples)

#### 2.3 Parser Implementation

Create `src/curriculum/parser.ts` (Node-only module imported by tests and build tools). Add `gray-matter` and `yaml` to `package.json` devDependencies so the parser can read frontmatter during tooling. The browser never imports this file directly; instead we emit typed JSON via the build step below.

```typescript
import matter from 'gray-matter';
import type { ParsedSection, ParsedExample, ParsedHeading } from './types';

const CODE_FENCE_REGEX = /```typeql:(\w+)\[([^\]]*)\]\n([\s\S]*?)```/g;
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm;

export function parseSection(markdown: string, sourceFile: string): ParsedSection {
  const { data: frontmatter, content } = matter(markdown);

  return {
    id: frontmatter.id,
    title: frontmatter.title,
    context: frontmatter.context ?? 'default',
    requires: frontmatter.requires ?? [],
    headings: parseHeadings(content),
    examples: parseExamples(content, sourceFile),
    rawContent: content,
  };
}

function parseHeadings(content: string): ParsedHeading[] {
  const headings: ParsedHeading[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  HEADING_REGEX.lastIndex = 0;

  while ((match = HEADING_REGEX.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const line = content.slice(0, match.index).split('\n').length;

    headings.push({
      id: slugify(text),
      text,
      level,
      line,
    });
  }

  return headings;
}

function parseExamples(content: string, sourceFile: string): ParsedExample[] {
  const examples: ParsedExample[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  CODE_FENCE_REGEX.lastIndex = 0;

  while ((match = CODE_FENCE_REGEX.exec(content)) !== null) {
    const type = match[1] as ParsedExample['type'];
    const attrs = parseAttributes(match[2]);
    const query = match[3].trim();
    const lineNumber = content.slice(0, match.index).split('\n').length;

    if (!attrs.id) {
      console.warn(`Example at ${sourceFile}:${lineNumber} missing id attribute`);
      continue;
    }

    examples.push({
      id: attrs.id,
      type,
      query,
      expect: parseExpectation(attrs),
      sourceFile,
      lineNumber,
    });
  }

  return examples;
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /(\w+)=(?:"([^"]*)"|(\S+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2] ?? match[3];
  }

  // Handle bare attributes like "expect=results"
  const bareRegex = /(\w+)=(\w+)/g;
  while ((match = bareRegex.exec(attrString)) !== null) {
    if (!attrs[match[1]]) {
      attrs[match[1]] = match[2];
    }
  }

  return attrs;
}

function parseExpectation(attrs: Record<string, string>): ParsedExample['expect'] {
  const expect: ParsedExample['expect'] = {};

  if (attrs.expect === 'results') expect.results = true;
  if (attrs.min) expect.min = parseInt(attrs.min, 10);
  if (attrs.max) expect.max = parseInt(attrs.max, 10);
  if (attrs.error) expect.error = attrs.error;

  return Object.keys(expect).length > 0 ? expect : undefined;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
```

#### 2.4 Build Integration & Directory Structure

- Use `import.meta.glob('../docs/curriculum/**/*.md', { as: 'raw', eager: true })` inside a Vite plugin (e.g. `src/curriculum/content.ts`) to convert Markdown files into structured JSON at build time.
- Export lightweight helpers (`getCurriculumSections()`, `getContextFiles()`) that browser code can import without touching the filesystem.
- The same glob paths are reused by the Node tooling/tests so we never drift between what ships and what we validate.

```
docs/
├── curriculum/
│   ├── _meta.yaml                    # Curriculum structure
│   ├── _contexts/
│   │   ├── social-network/
│   │   │   ├── context.yaml          # Name, description
│   │   │   ├── schema.tql            # TypeQL schema
│   │   │   └── seed.tql              # Initial data
│   │   └── e-commerce/
│   │       ├── context.yaml
│   │       ├── schema.tql
│   │       └── seed.tql
│   ├── 01-foundations/
│   │   ├── _section.yaml             # Section metadata
│   │   ├── 01-what-is-typedb.md
│   │   ├── 02-types-and-entities.md
│   │   └── 03-first-queries.md
│   └── 02-querying/
│       ├── _section.yaml
│       ├── 01-match-basics.md
│       └── 02-variables.md
└── reference/
    ├── _meta.yaml
    ├── keywords/
    │   ├── match.md
    │   └── insert.md
    └── types/
        ├── entity.md
        └── relation.md
```

### Verification Tests

Create `src/curriculum/__tests__/parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseSection } from '../parser';

const SAMPLE_MARKDOWN = `---
id: match-basics
title: Basic Pattern Matching
context: social-network
requires: [types-intro]
---

# Pattern Matching

The match clause finds data.

## Variables

Variables start with \`$\`.

\`\`\`typeql:example[id=first-match, expect=results]
match $p isa person;
get $p;
\`\`\`

## Invalid Examples

\`\`\`typeql:invalid[id=bad-syntax, error="expecting 'isa'"]
match $p person;
\`\`\`
`;

describe('Curriculum Parser', () => {
  it('parses frontmatter correctly', () => {
    const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

    expect(section.id).toBe('match-basics');
    expect(section.title).toBe('Basic Pattern Matching');
    expect(section.context).toBe('social-network');
    expect(section.requires).toEqual(['types-intro']);
  });

  it('extracts all headings with correct levels', () => {
    const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

    expect(section.headings).toHaveLength(3);
    expect(section.headings[0]).toMatchObject({
      text: 'Pattern Matching',
      level: 1,
      id: 'pattern-matching',
    });
    expect(section.headings[1]).toMatchObject({
      text: 'Variables',
      level: 2,
      id: 'variables',
    });
  });

  it('extracts example code blocks with attributes', () => {
    const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

    expect(section.examples).toHaveLength(2);

    const firstMatch = section.examples.find(e => e.id === 'first-match');
    expect(firstMatch).toMatchObject({
      type: 'example',
      query: 'match $p isa person;\nget $p;',
      expect: { results: true },
    });
  });

  it('extracts invalid examples with error patterns', () => {
    const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

    const badSyntax = section.examples.find(e => e.id === 'bad-syntax');
    expect(badSyntax).toMatchObject({
      type: 'invalid',
      expect: { error: "expecting 'isa'" },
    });
  });

  it('includes source location for examples', () => {
    const section = parseSection(SAMPLE_MARKDOWN, 'test.md');

    const firstMatch = section.examples.find(e => e.id === 'first-match');
    expect(firstMatch?.sourceFile).toBe('test.md');
    expect(firstMatch?.lineNumber).toBeGreaterThan(0);
  });
});

describe('Parser Edge Cases', () => {
  it('handles missing optional frontmatter fields', () => {
    const minimal = `---
id: minimal
title: Minimal Section
---

# Content
`;
    const section = parseSection(minimal, 'test.md');

    expect(section.context).toBe('default');
    expect(section.requires).toEqual([]);
  });

  it('handles multiline queries', () => {
    const multiline = `---
id: multiline
title: Multiline
---

\`\`\`typeql:example[id=multi, expect=results]
match
  $p isa person,
    has name $n,
    has age $a;
get $p, $n, $a;
\`\`\`
`;
    const section = parseSection(multiline, 'test.md');
    const example = section.examples[0];

    expect(example.query).toContain('$p isa person');
    expect(example.query).toContain('has name $n');
    expect(example.query.split('\n').length).toBeGreaterThan(1);
  });

  it('warns on examples without id', () => {
    const noId = `---
id: no-id-test
title: Test
---

\`\`\`typeql:example[expect=results]
match $x isa thing;
\`\`\`
`;
    const consoleSpy = vi.spyOn(console, 'warn');
    const section = parseSection(noId, 'test.md');

    expect(consoleSpy).toHaveBeenCalled();
    expect(section.examples).toHaveLength(0);
  });
});
```

### Acceptance Criteria
- [x] All tests in `parser.test.ts` pass (29 tests)
- [x] Parser correctly extracts frontmatter, headings, and examples
- [x] Example types (example, invalid, schema, readonly) are recognized
- [x] Expectation attributes (results, min, max, error) are parsed
- [x] Source file and line numbers are captured for error reporting

### Artifacts

#### Key files created:
- `src/curriculum/types.ts` - Type definitions for parsed content (ParsedSection, ParsedExample, ParsedHeading, ExampleType, etc.)
- `src/curriculum/parser.ts` - Node-based markdown parser using gray-matter for frontmatter extraction
- `src/curriculum/__tests__/parser.test.ts` - 29 comprehensive tests covering parsing, edge cases, and validation
- `src/curriculum/vite-plugin.ts` - Vite virtual module plugin that parses curriculum at build time
- `src/curriculum/content.ts` - Browser-safe module for accessing pre-parsed curriculum content
- `src/curriculum/virtual-curriculum.d.ts` - TypeScript declarations for the virtual:curriculum-content module
- `src/curriculum/index.ts` - Main module entry point with re-exports
- `vitest.workspace.ts` - Vitest workspace config to run parser tests in Node environment (gray-matter requires Buffer)

#### Sample curriculum content:
- `docs/curriculum/01-foundations/03-first-queries.md` - Sample lesson with 7 examples
- `docs/curriculum/_contexts/social-network/` - Context with schema.tql, seed.tql, context.yaml

#### Implementation notes:
- **Browser/Node split**: gray-matter requires Node.js Buffer, so parsing happens at build time via Vite plugin. Browser code imports pre-parsed JSON from the `virtual:curriculum-content` module.
- **Vitest workspace**: Added `vitest.workspace.ts` to run curriculum tests in Node environment while other tests run in browser mode for WASM support.
- **HMR support**: The Vite plugin watches curriculum files and triggers full reload on changes during development.
- **Validation**: `validateSection()` helper catches common issues (missing expectations, missing error patterns for invalid examples, no headings).

---

## Phase 3: Curriculum Example Testing [DONE]

### Goals
- Create test runner that validates all curriculum examples
- Run examples against TypeDB with appropriate contexts
- Verify expected results/errors match
- Integrate with CI

### Implementation

#### 3.1 Context Loader

Create `src/curriculum/context-loader.ts`:

```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';
import { TypeDBEmbeddedService } from '../services/typedb-embedded-service';

export interface LoadedContext {
  name: string;
  schema: string;
  seed: string;
}

export async function loadContext(
  contextName: string,
  contextsDir: string
): Promise<LoadedContext> {
  const contextDir = join(contextsDir, contextName);

  const [schema, seed] = await Promise.all([
    readFile(join(contextDir, 'schema.tql'), 'utf-8'),
    readFile(join(contextDir, 'seed.tql'), 'utf-8'),
  ]);

  return { name: contextName, schema, seed };
}

export async function applyContext(
  service: TypeDBEmbeddedService,
  database: string,
  context: LoadedContext
): Promise<void> {
  await service.executeQuery(database, context.schema, { transactionType: 'schema' });
  await service.executeQuery(database, context.seed, { transactionType: 'write' });
}
```

#### 3.2 Example Test Runner

Create `src/curriculum/test-runner.ts`:

```typescript
import type { ParsedExample } from './types';
import { TypeDBEmbeddedService } from '../services/typedb-embedded-service';

export interface ExampleTestResult {
  exampleId: string;
  passed: boolean;
  error?: string;
  actualResults?: number;
  expectedResults?: { min?: number; max?: number };
  executionTimeMs: number;
}

export async function testExample(
  service: TypeDBEmbeddedService,
  database: string,
  example: ParsedExample
): Promise<ExampleTestResult> {
  const start = Date.now();

  try {
    if (example.type === 'invalid') {
      try {
        await service.executeQuery(database, example.query, { transactionType: 'read' });
        return {
          exampleId: example.id,
          passed: false,
          error: 'Expected query to fail but it succeeded',
          executionTimeMs: Date.now() - start,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (example.expect?.error && !errorMessage.includes(example.expect.error)) {
          return {
            exampleId: example.id,
            passed: false,
            error: `Expected error containing "${example.expect.error}" but got "${errorMessage}"`,
            executionTimeMs: Date.now() - start,
          };
        }
        return {
          exampleId: example.id,
          passed: true,
          executionTimeMs: Date.now() - start,
        };
      }
    }

    if (example.type === 'schema') {
      await service.executeQuery(database, example.query, { transactionType: 'schema' });
      return {
        exampleId: example.id,
        passed: true,
        executionTimeMs: Date.now() - start,
      };
    }

    if (example.type === 'readonly') {
      return {
        exampleId: example.id,
        passed: true,
        executionTimeMs: Date.now() - start,
      };
    }

    const response = await service.executeQuery(database, example.query, { transactionType: 'read' });
    let resultCount = 0;
    if (response.data.type === 'match') {
      resultCount = response.data.answers.length;
    }

    if (example.expect?.results && resultCount === 0) {
      return {
        exampleId: example.id,
        passed: false,
        error: 'Expected results but got none',
        actualResults: resultCount,
        executionTimeMs: Date.now() - start,
      };
    }

    if (example.expect?.min !== undefined && resultCount < example.expect.min) {
      return {
        exampleId: example.id,
        passed: false,
        error: `Expected at least ${example.expect.min} results but got ${resultCount}`,
        actualResults: resultCount,
        expectedResults: { min: example.expect.min },
        executionTimeMs: Date.now() - start,
      };
    }

    if (example.expect?.max !== undefined && resultCount > example.expect.max) {
      return {
        exampleId: example.id,
        passed: false,
        error: `Expected at most ${example.expect.max} results but got ${resultCount}`,
        actualResults: resultCount,
        expectedResults: { max: example.expect.max },
        executionTimeMs: Date.now() - start,
      };
    }

    return {
      exampleId: example.id,
      passed: true,
      actualResults: resultCount,
      executionTimeMs: Date.now() - start,
    };
  } catch (err) {
    return {
      exampleId: example.id,
      passed: false,
      error: err instanceof Error ? err.message : String(err),
      executionTimeMs: Date.now() - start,
    };
  }
}
```

#### 3.3 Full Curriculum Test Suite

Create `src/curriculum/__tests__/all-examples.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { parseSection } from '../parser';
import { loadContext, applyContext } from '../context-loader';
import { testExample } from '../test-runner';
import { TypeDBEmbeddedService } from '../../services/typedb-embedded-service';

const CURRICULUM_DIR = './docs/curriculum';
const CONTEXTS_DIR = './docs/curriculum/_contexts';

describe('Curriculum Examples', async () => {
  const curriculumFiles = await glob(`${CURRICULUM_DIR}/**/*.md`, {
    ignore: ['**/README.md', '**/_*.md'],
  });

  const sectionsByContext = new Map<string, ParsedSection[]>();

  for (const file of curriculumFiles) {
    const content = await readFile(file, 'utf-8');
    const section = parseSection(content, file);

    const existing = sectionsByContext.get(section.context) ?? [];
    existing.push(section);
    sectionsByContext.set(section.context, existing);
  }

  for (const [contextName, sections] of sectionsByContext) {
    describe(`Context: ${contextName}`, () => {
      let service: TypeDBEmbeddedService;
      const database = `curriculum_${contextName}_${Date.now()}`;

      beforeAll(async () => {
        service = new TypeDBEmbeddedService();
        await service.connect({
          address: 'wasm://local',
          username: 'test',
          password: '',
          database,
        });

        const context = await loadContext(contextName, CONTEXTS_DIR);
        await applyContext(service, database, context);
      });

      afterAll(async () => {
        await service.deleteDatabase(database);
        await service.disconnect();
      });

      for (const section of sections) {
        describe(section.title, () => {
          for (const example of section.examples) {
            it(`[${example.id}] ${example.query.slice(0, 50).replace(/\n/g, ' ')}...`, async () => {
              const result = await testExample(service, database, example);

              if (!result.passed) {
                throw new Error(
                  `Example failed: ${result.error}\n` +
                  `Source: ${example.sourceFile}:${example.lineNumber}\n` +
                  `Query:\n${example.query}`
                );
              }

              expect(result.passed).toBe(true);
            });
          }
        });
      }
    });
  }
});
```

### Verification Tests

Run the suite in Node mode:

```bash
pnpm vitest run src/curriculum/__tests__/all-examples.test.ts --environment node
```

Should produce output like:
```
✓ Curriculum Examples > Context: social-network > Basic Pattern Matching > [first-match] match $p isa person; get $p;... (15ms)
✓ Curriculum Examples > Context: social-network > Basic Pattern Matching > [bad-syntax] match $p person;... (8ms)
✓ Curriculum Examples > Context: e-commerce > Products > [find-products] match $p isa product;... (12ms)
...

Test Files  1 passed (1)
Tests       47 passed (47)
```

### Acceptance Criteria
- [x] All curriculum examples pass automated testing (15 tests)
- [x] Invalid examples correctly fail with expected errors
- [x] Context loading works via `TypeDBEmbeddedService` (schema + seed data applied)
- [x] Tests run in parallel with isolated in-memory databases
- [x] CI integration (runs on every PR - example tests run in browser mode via Playwright)

### Artifacts

#### Key files created:
- `src/curriculum/context-loader.ts` - Context registration and loading, database setup with schema/seed
- `src/curriculum/test-runner.ts` - Example validation logic with typed results and error handling
- `src/curriculum/__tests__/all-examples.test.ts` - 15 tests validating curriculum examples against TypeDB WASM

#### Test output sample:
```
✓ |browser (chromium)| all-examples.test.ts > Curriculum Examples > Context: social-network > Section: Your First Queries > [find-all-people] match $p isa person;... 27ms
✓ |browser (chromium)| all-examples.test.ts > Curriculum Examples > Context: social-network > Section: Your First Queries > [find-all-companies] match $company isa company;... 1ms
✓ |browser (chromium)| all-examples.test.ts > Curriculum Examples > Context: social-network > Section: Your First Queries > [find-alice] match $p isa person, has name "Alice";... 4ms
...
Test Files  2 passed (2)
Tests  44 passed (44)
```

#### Implementation notes:
- **Browser-based WASM tests**: Example validation tests run in browser mode (not Node) because TypeDB WASM requires browser APIs
- **Vitest workspace update**: Updated `vitest.workspace.ts` to run parser tests in Node and example tests in browser
- **TypeQL3 syntax**: Curriculum examples use TypeQL3 syntax (e.g., `match $p isa person;` without separate `get` clause)
- **Context isolation**: Each test context gets a unique database name with timestamp suffix to prevent conflicts
- **Error message extraction**: Test runner handles various error object formats from TypeDB WASM

---

## Phase 4: Sidebar and Search [DONE]

### Goals
- Implement collapsible left sidebar with Learn/Reference sections
- Add progress tracking UI (checkmarks, percentages)
- Implement local search with Fuse.js
- Search replaces sidebar content when active

### Implementation

#### 4.1 Sidebar Component Structure

```
src/components/learn/
├── LearnSidebar.tsx          # Main sidebar container
├── SearchInput.tsx           # Search bar with clear button
├── SearchResults.tsx         # Grouped search results
├── LearnSection.tsx          # Curriculum tree with progress
├── ReferenceSection.tsx      # Reference documentation tree
├── ProgressIndicator.tsx     # ✓/◐/○ icons + percentage
└── SectionLink.tsx           # Individual nav item
```

#### 4.2 Search Index

Create `src/search/index.ts`:

```typescript
import Fuse from 'fuse.js';
import type { ParsedSection } from '../curriculum/types';

export interface SearchableItem {
  type: 'learn' | 'reference' | 'example';
  id: string;
  title: string;
  breadcrumb: string[];
  content: string;
  href: string;
}

export function buildSearchIndex(
  curriculum: ParsedSection[],
  reference: ParsedSection[]
): Fuse<SearchableItem> {
  const items: SearchableItem[] = [];

  // Index curriculum
  for (const section of curriculum) {
    items.push({
      type: 'learn',
      id: section.id,
      title: section.title,
      breadcrumb: [], // TODO: compute from path
      content: section.headings.map(h => h.text).join(' '),
      href: `/learn/${section.id}`,
    });

    // Index examples
    for (const example of section.examples) {
      items.push({
        type: 'example',
        id: example.id,
        title: `${section.title}: ${example.query.slice(0, 30)}...`,
        breadcrumb: [section.title],
        content: example.query,
        href: `/learn/${section.id}#${example.id}`,
      });
    }
  }

  // Index reference
  for (const entry of reference) {
    items.push({
      type: 'reference',
      id: entry.id,
      title: entry.title,
      breadcrumb: [],
      content: entry.headings.map(h => h.text).join(' '),
      href: `/reference/${entry.id}`,
    });
  }

  return new Fuse(items, {
    keys: [
      { name: 'title', weight: 3 },
      { name: 'content', weight: 1 },
      { name: 'breadcrumb', weight: 1 },
    ],
    threshold: 0.4,
    includeScore: true,
    includeMatches: true,
  });
}
```

#### 4.3 Sidebar Component

Create `src/components/learn/LearnSidebar.tsx`:

```typescript
import { useState, useMemo } from 'react';
import { useProfile } from '../../profile/ProfileContext';
import { useSearchIndex } from '../../search/hooks';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { LearnSection } from './LearnSection';
import { ReferenceSection } from './ReferenceSection';

export function LearnSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const searchIndex = useSearchIndex();
  const { getProgressStats } = useProfile();

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !searchIndex) return null;
    return searchIndex.search(searchQuery).slice(0, 20);
  }, [searchQuery, searchIndex]);

  const progress = getProgressStats();

  return (
    <aside className="learn-sidebar">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
      />

      {searchResults ? (
        <SearchResults results={searchResults} />
      ) : (
        <>
          <LearnSection progress={progress} />
          <ReferenceSection />
        </>
      )}
    </aside>
  );
}
```

### Verification Tests

All Learn UI behavior is validated at the View Model layer rather than through DOM snapshots. Create `src/vm/learn/__tests__/learn-sidebar.test.ts` that uses `createVMTestContext()` (from `src/test/vm-test-utils.ts`) to spin up a real LiveStore + VM tree. Example structure:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createVMTestContext, waitForEffects } from '@/test/vm-test-utils';

describe('LearnSidebar VM', () => {
  let ctx: VMTestContext;

  beforeEach(async () => {
    ctx = await createVMTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('exposes learn + reference sections by default', () => {
    const sidebar = ctx.vm.learn.sidebar;
    const state = ctx.store.query(sidebar.state$);
    expect(state.sections.learn).toHaveLengthGreaterThan(0);
    expect(state.sections.reference).toHaveLengthGreaterThan(0);
  });

  it('filters search results reactively', async () => {
    const sidebar = ctx.vm.learn.sidebar;
    sidebar.setSearchQuery('match');
    await waitForEffects();
    const results = ctx.store.query(sidebar.searchResults$);
    expect(results.items).not.toHaveLength(0);
  });

  it('reports progress stats from LiveStore tables', async () => {
    const sidebar = ctx.vm.learn.sidebar;
    await sidebar.markSectionRead('first-queries');
    await waitForEffects();
    const progress = ctx.store.query(sidebar.progress$);
    expect(progress.read).toBeGreaterThan(0);
  });
});
```

Fetch-index-specific tests can stay as pure unit tests (no VM) verifying `buildSearchIndex`.

### Acceptance Criteria
- [x] Sidebar VM shows Learn and Reference sections (VM interface + scope)
- [x] Progress percentage computes correctly from LiveStore
- [x] Search input triggers view state change
- [x] Search is instant (Fuse.js client-side, 21 tests)
- [x] Clear button returns to normal view
- [x] Results grouped by type (Learn/Reference/Example)
- [x] React components render sidebar

### Artifacts

#### Key files created:

**VM Layer:**
- `src/vm/learn/learn-sidebar.vm.ts` - VM interface definitions for LearnSidebarVM, LearnSearchVM, LearnSectionVM, LearnFolderVM, etc.
- `src/vm/learn/sidebar-scope.ts` - VM scope implementation that wires LiveStore state to VM interfaces
- `src/vm/learn/index.ts` - Module exports

**Search:**
- `src/learn/search.ts` - Fuse.js search index builder with grouped results
- `src/learn/index.ts` - Module exports

**React Components:**
- `src/components/learn/LearnSidebar.tsx` - Main sidebar container with resizable width
- `src/components/learn/SearchInput.tsx` - Search bar with clear button
- `src/components/learn/SearchResults.tsx` - Grouped search results display
- `src/components/learn/LearnSection.tsx` - Curriculum tree with progress
- `src/components/learn/ReferenceSection.tsx` - Reference documentation tree
- `src/components/learn/FolderItem.tsx` - Expandable folder with progress
- `src/components/learn/SectionItem.tsx` - Individual lesson link with progress indicator
- `src/components/learn/ProgressIndicator.tsx` - Progress icons (checkmark/circle/half-circle) and percentage badge
- `src/components/learn/index.ts` - Component exports

**Tests:**
- `src/vm/learn/__tests__/sidebar-scope.test.ts` - 28 VM-level tests
- `src/learn/__tests__/search.test.ts` - 21 unit tests for search functionality

#### Implementation notes:
- **VM pattern**: Following the codebase conventions, VMs are interfaces with `Queryable<T>` fields ($ suffix) for reactive state
- **Search index**: Uses Fuse.js with weighted keys (title: 3x, content: 1x, breadcrumb: 1x, preview: 0.5x)
- **Progress tracking**: Reads from LiveStore `readingProgress` table via `readingProgressForProfile$` query
- **Sidebar width**: Persisted to localStorage (`typedb_studio_learn_sidebar_width`) with min/max bounds (200-400px)
- **Active section tracking**: Uses getter function pattern instead of Queryable to avoid LiveStore type constraints
- **Dense-Core tokens**: Components use height tokens (`h-row`, `h-default`, `h-compact`), typography classes (`text-dense-sm`, `text-dense-xs`), and semantic colors (`beacon-ok`, `beacon-warn`)
- **Total tests**: 49 tests (21 search + 28 sidebar VM)

---

## Phase 5: Documentation Viewer [TODO]

### Goals
- Render curriculum markdown with styled components
- Interactive code blocks with "Copy to REPL" and "Run" buttons
- Section checkmarks for marking as read
- Collapsible pane (can hide to show only sidebar + REPL)

### Implementation

#### 5.1 Document Viewer Component

Create `src/components/learn/DocumentViewer.tsx`:

```typescript
import { useCallback } from 'react';
import { useProfile } from '../../profile/ProfileContext';
import { useCurrentSection } from '../../curriculum/hooks';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SectionCheckmark } from './SectionCheckmark';

interface DocumentViewerProps {
  sectionId: string;
  onClose: () => void;
}

export function DocumentViewer({ sectionId, onClose }: DocumentViewerProps) {
  const section = useCurrentSection(sectionId);
  const { isSectionRead, markSectionRead, recordExecution } = useProfile();

  const handleRunExample = useCallback(async (exampleId: string, query: string) => {
    // Execute via REPL
    const result = await executeInRepl(query);
    await recordExecution(exampleId, result.succeeded, 'docs-run');
    return result;
  }, [recordExecution]);

  const handleCopyToRepl = useCallback((query: string) => {
    // Copy to REPL without executing
    copyToRepl(query);
  }, []);

  if (!section) return null;

  return (
    <article className="document-viewer">
      <header>
        <h1>{section.title}</h1>
        <button onClick={onClose} aria-label="Close documentation">
          <XIcon />
        </button>
      </header>

      <MarkdownRenderer
        content={section.rawContent}
        examples={section.examples}
        headings={section.headings}
        onRunExample={handleRunExample}
        onCopyToRepl={handleCopyToRepl}
        renderHeading={(heading) => (
          <HeadingWithCheckmark
            heading={heading}
            isRead={isSectionRead(sectionId, heading.id)}
            onToggle={() => markSectionRead(sectionId, heading.id)}
          />
        )}
      />
    </article>
  );
}
```

#### 5.2 Example Block Component

Create `src/components/learn/ExampleBlock.tsx`:

```typescript
import { useState } from 'react';
import { useProfile } from '../../profile/ProfileContext';
import type { ParsedExample } from '../../curriculum/types';

interface ExampleBlockProps {
  example: ParsedExample;
  onRun: (query: string) => Promise<{ succeeded: boolean; results?: unknown[] }>;
  onCopyToRepl: (query: string) => void;
}

export function ExampleBlock({ example, onRun, onCopyToRepl }: ExampleBlockProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null);
  const { isExampleExecuted } = useProfile();

  const wasExecuted = isExampleExecuted(example.id);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const result = await onRun(example.query);
      setLastResult(result.succeeded ? 'success' : 'error');
    } catch {
      setLastResult('error');
    } finally {
      setIsRunning(false);
    }
  };

  const isInteractive = example.type === 'example' || example.type === 'invalid';

  return (
    <div className={`example-block example-${example.type}`} id={example.id}>
      <pre>
        <code className="language-typeql">{example.query}</code>
      </pre>

      {isInteractive && (
        <div className="example-actions">
          <button
            onClick={() => onCopyToRepl(example.query)}
            title="Copy to REPL"
          >
            <CopyIcon /> REPL
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className={wasExecuted ? 'was-executed' : ''}
            title={wasExecuted ? 'Run again' : 'Run'}
          >
            {isRunning ? <SpinnerIcon /> : <PlayIcon />}
            {wasExecuted && <span className="executed-indicator">✓</span>}
          </button>
        </div>
      )}

      {lastResult && (
        <div className={`example-result example-result-${lastResult}`}>
          {lastResult === 'success' ? '✓ Executed successfully' : '✗ Error'}
        </div>
      )}
    </div>
  );
}
```

### Verification Tests

Follow the same philosophy as Phase 4: test View Model behavior directly. Create `src/vm/learn/__tests__/document-viewer.test.ts` that:

- Instantiates a VM via `createVMTestContext`.
- Loads a curriculum section through the VM (using the build-time content feed).
- Calls VM actions such as `vm.learn.viewer.onRunExample`, `vm.learn.viewer.onCopyToRepl`, and `vm.learn.viewer.toggleHeadingRead`.
- Asserts LiveStore state (`exampleExecutions`, `readingProgress`) changes via `store.query(...)`.

Example snippet:

```typescript
it('records execution metadata when run from docs', async () => {
  const ctx = await createVMTestContext();
  const viewer = ctx.vm.learn.viewer;
  await viewer.openSection('first-queries');
  await viewer.runExample('find-all-people');
  await waitForEffects();
  const executions = ctx.store.query(ctx.vm.learn.executionsForCurrentProfile$);
  expect(executions.some(e => e.exampleId === 'find-all-people')).toBe(true);
});
```

Unit-test `ExampleBlock` helper functions (formatting, expectation messaging) in isolation if needed, but avoid DOM assertions.

### Acceptance Criteria
- [ ] Markdown renders with proper styling
- [ ] Code blocks have syntax highlighting
- [ ] "Copy to REPL" copies query text
- [ ] "Run" executes and shows result indicator
- [ ] Executed examples show ✓ indicator
- [ ] Section checkmarks toggle and persist
- [ ] Close button collapses documentation pane

### Artifacts
<!-- Update this section as you implement -->
- Markdown component library used:
- Syntax highlighting approach:
- Screenshots:

---

## Phase 6: REPL Integration [TODO]

### Goals
- Connect documentation to existing query REPL
- Support "Copy to REPL" and "Run from docs" flows
- Track execution source (docs-run vs repl-direct)
- Maintain query history with context awareness

### Implementation

This phase integrates with the existing `QueryPage` and `query-editor.vm.ts`. Key integration points:

1. **Copy to REPL**: Set editor content without executing
2. **Run from Docs**: Set editor content AND execute
3. **Execution Tracking**: Record source of execution

#### 6.1 REPL Bridge

Create `src/learn/repl-bridge.ts`:

```typescript
import type { QueryEditorVM } from '../vm/pages/query/editor/query-editor.vm';

export interface ReplBridge {
  copyToRepl: (query: string) => void;
  runInRepl: (query: string) => Promise<QueryResult>;
  getCurrentQuery: () => string;
  onQueryExecuted: (callback: (query: string, result: QueryResult) => void) => () => void;
}

export function createReplBridge(editorVM: QueryEditorVM): ReplBridge {
  return {
    copyToRepl(query: string) {
      editorVM.setQuery(query);
      // Focus the editor
      editorVM.focus();
    },

    async runInRepl(query: string) {
      editorVM.setQuery(query);
      return editorVM.execute();
    },

    getCurrentQuery() {
      return editorVM.query;
    },

    onQueryExecuted(callback) {
      return editorVM.onExecute(callback);
    },
  };
}
```

### Verification Tests

Create `src/learn/__tests__/repl-bridge.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReplBridge } from '../repl-bridge';
import { createMockEditorVM } from '../../test/mocks';

describe('REPL Bridge', () => {
  let editorVM: MockQueryEditorVM;
  let bridge: ReplBridge;

  beforeEach(() => {
    editorVM = createMockEditorVM();
    bridge = createReplBridge(editorVM);
  });

  it('copyToRepl sets editor content', () => {
    bridge.copyToRepl('match $x isa person;');

    expect(editorVM.setQuery).toHaveBeenCalledWith('match $x isa person;');
    expect(editorVM.focus).toHaveBeenCalled();
  });

  it('runInRepl sets content and executes', async () => {
    editorVM.execute.mockResolvedValue({ success: true, results: [] });

    const result = await bridge.runInRepl('match $x isa person;');

    expect(editorVM.setQuery).toHaveBeenCalledWith('match $x isa person;');
    expect(editorVM.execute).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('onQueryExecuted subscribes to execution events', () => {
    const callback = vi.fn();
    const unsubscribe = bridge.onQueryExecuted(callback);

    expect(editorVM.onExecute).toHaveBeenCalledWith(callback);
    expect(typeof unsubscribe).toBe('function');
  });
});
```

### Acceptance Criteria
- [ ] "Copy to REPL" populates editor without running
- [ ] "Run" from docs executes and shows results in REPL
- [ ] Query history tracks execution source
- [ ] REPL state preserved when switching documents

### Artifacts
<!-- Update this section as you implement -->
- Integration points with existing VM:
- State synchronization approach:

---

## Phase 7: Context Management [TODO]

### Goals
- Load lesson contexts (schema + seed data) into TypeDB
- Handle context switching between lessons
- Show context indicator and switch prompt
- Support future snapshotting (design now, implement later)

### Implementation

#### 7.1 Context Manager

Create `src/curriculum/context-manager.ts`:

```typescript
import type { LoadedContext } from './context-loader';

export interface ContextManager {
  currentContext: string | null;
  loadContext: (contextName: string) => Promise<void>;
  resetContext: () => Promise<void>;
  getContextStatus: () => ContextStatus;
}

export interface ContextStatus {
  name: string | null;
  schemaLoaded: boolean;
  dataLoaded: boolean;
  entityCounts: Record<string, number>;
}

export function createContextManager(db: TypeDBConnection): ContextManager {
  let currentContext: string | null = null;

  return {
    get currentContext() {
      return currentContext;
    },

    async loadContext(contextName: string) {
      if (contextName === currentContext) return;

      // Clear existing data
      await db.reset();

      // Load new context
      const context = await loadContextFiles(contextName);
      await applySchema(db, context.schema);
      await applySeed(db, context.seed);

      currentContext = contextName;
    },

    async resetContext() {
      if (!currentContext) return;
      await this.loadContext(currentContext);
    },

    getContextStatus() {
      // Query current state
      return {
        name: currentContext,
        schemaLoaded: true,  // TODO: verify
        dataLoaded: true,    // TODO: verify
        entityCounts: {},    // TODO: query
      };
    },
  };
}
```

#### 7.2 Context Switch UI

Create `src/components/learn/ContextSwitchPrompt.tsx`:

```typescript
interface ContextSwitchPromptProps {
  currentContext: string | null;
  requiredContext: string;
  onSwitch: () => void;
  onKeep: () => void;
}

export function ContextSwitchPrompt({
  currentContext,
  requiredContext,
  onSwitch,
  onKeep,
}: ContextSwitchPromptProps) {
  if (currentContext === requiredContext) return null;

  return (
    <div className="context-switch-prompt">
      <div className="prompt-icon">⚠️</div>
      <div className="prompt-content">
        <p>
          This lesson uses the <strong>{requiredContext}</strong> context.
        </p>
        {currentContext && (
          <p className="current-context">
            Current: {currentContext}
          </p>
        )}
      </div>
      <div className="prompt-actions">
        <button onClick={onSwitch} className="primary">
          Load Lesson Context
        </button>
        <button onClick={onKeep} className="secondary">
          Keep Current
        </button>
      </div>
    </div>
  );
}
```

### Verification Tests

Create `src/curriculum/__tests__/context-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createContextManager } from '../context-manager';
import { createTestProfile } from '../../profile/__tests__/profile-test-utils';

describe('Context Manager', () => {
  let profile: TestProfile;
  let manager: ContextManager;

  beforeEach(async () => {
    profile = await createTestProfile();
    manager = createContextManager(profile.db);
  });

  afterEach(async () => {
    await profile.cleanup();
  });

  it('loads context schema and seed data', async () => {
    await manager.loadContext('social-network');

    // Verify schema exists
    const types = await profile.db.query('match $t sub entity; get $t;');
    expect(types.some(t => t.label === 'person')).toBe(true);

    // Verify seed data exists
    const people = await profile.db.query('match $p isa person; get $p;');
    expect(people.length).toBeGreaterThan(0);
  });

  it('tracks current context', async () => {
    expect(manager.currentContext).toBeNull();

    await manager.loadContext('social-network');
    expect(manager.currentContext).toBe('social-network');
  });

  it('clears data when switching contexts', async () => {
    await manager.loadContext('social-network');
    const beforeSwitch = await profile.db.query('match $p isa person; get $p;');

    await manager.loadContext('e-commerce');

    // Social network data should be gone
    const afterSwitch = await profile.db.query('match $p isa person; get $p;');
    expect(afterSwitch.length).toBe(0);

    // E-commerce data should exist
    const products = await profile.db.query('match $p isa product; get $p;');
    expect(products.length).toBeGreaterThan(0);
  });

  it('no-ops when loading same context', async () => {
    await manager.loadContext('social-network');

    // Insert extra data
    await profile.db.query('insert $p isa person, has name "Extra";');
    const before = await profile.db.query('match $p isa person; get $p;');

    // Load same context - should NOT reset
    await manager.loadContext('social-network');
    const after = await profile.db.query('match $p isa person; get $p;');

    expect(after.length).toBe(before.length);
  });

  it('resetContext reloads current context', async () => {
    await manager.loadContext('social-network');

    // Insert extra data
    await profile.db.query('insert $p isa person, has name "Extra";');
    const before = await profile.db.query('match $p isa person; get $p;');

    // Reset
    await manager.resetContext();
    const after = await profile.db.query('match $p isa person; get $p;');

    expect(after.length).toBe(before.length - 1);  // Extra removed
  });
});
```

### Acceptance Criteria
- [ ] Contexts load schema and seed data correctly
- [ ] Context switch prompt appears when needed
- [ ] "Load Lesson Context" resets and loads new context
- [ ] "Keep Current" dismisses prompt
- [ ] Context indicator shows current context name
- [ ] Reset button reloads current context

### Artifacts
<!-- Update this section as you implement -->
- Context files created:
- Reset behavior notes:

---

## Phase 8: Cross-Linking and Navigation [TODO]

### Goals
- Learn sections link to Reference entries
- Reference entries link back to Learn sections that use them
- Clicking links navigates without full page reload
- Back/forward browser navigation works

### Implementation

TBD - Define cross-link syntax in markdown and implement navigation.

### Verification Tests

TBD

### Acceptance Criteria
- [ ] Links between Learn and Reference work
- [ ] Navigation preserves scroll position
- [ ] Browser back/forward works
- [ ] Links highlight target section briefly

### Artifacts
<!-- Update this section as you implement -->

---

## Appendix A: Sample Curriculum Content

### Social Network Context

`docs/curriculum/_contexts/social-network/schema.tql`:
```typeql
define

person sub entity,
  owns name,
  owns age,
  plays friendship:friend,
  plays employment:employee;

company sub entity,
  owns name,
  plays employment:employer;

name sub attribute, value string;
age sub attribute, value long;

friendship sub relation,
  relates friend;

employment sub relation,
  relates employee,
  relates employer;
```

`docs/curriculum/_contexts/social-network/seed.tql`:
```typeql
insert
  $alice isa person, has name "Alice", has age 30;
  $bob isa person, has name "Bob", has age 25;
  $carol isa person, has name "Carol", has age 35;
  $acme isa company, has name "Acme Corp";

  (friend: $alice, friend: $bob) isa friendship;
  (friend: $bob, friend: $carol) isa friendship;
  (employee: $alice, employer: $acme) isa employment;
  (employee: $bob, employer: $acme) isa employment;
```

### Sample Lesson

`docs/curriculum/01-foundations/03-first-queries.md`:
```markdown
---
id: first-queries
title: Your First Queries
context: social-network
requires: [types-intro, entities-intro]
---

# Your First Queries

Now that you understand types and entities, let's write some queries!

## Finding All Entities of a Type

The simplest query finds all entities of a specific type:

```typeql:example[id=find-all-people, expect=results, min=3]
match $p isa person;
get $p;
```

This returns Alice, Bob, and Carol from our social network.

## Adding Constraints

Narrow your search by adding constraints:

```typeql:example[id=find-alice, expect=results, min=1, max=1]
match
  $p isa person,
    has name "Alice";
get $p;
```

## Getting Attributes

Retrieve attributes along with entities:

```typeql:example[id=get-names-ages, expect=results]
match
  $p isa person,
    has name $n,
    has age $a;
get $p, $n, $a;
```

## Common Mistakes

Forgetting `isa` produces a syntax error:

```typeql:invalid[id=missing-isa, error="expecting"]
match $p person;
get $p;
```
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| Profile ID | Unique identifier isolating all user state (progress, executions, DB) |
| Context | A schema + seed data setup for lessons (e.g., "social-network") |
| Example | An interactive TypeQL code block in curriculum |
| Section | A curriculum markdown file with frontmatter |
| Heading | An H1-H6 within a section, trackable for read progress |

---

## Appendix C: Future Considerations

### Snapshotting (V2)
- Save/restore TypeDB state instantly
- Enable "checkpoint" lessons where user can experiment then reset
- Investigate WASM TypeDB snapshot capabilities

### Multi-User (V2)
- Profile sharing and viewing
- Team progress dashboards
- Shared annotations

### Offline Support (V2)
- Service worker for curriculum content
- IndexedDB for larger data
- Sync when online

### Analytics (V2)
- Which examples cause most errors
- Time spent per section
- Drop-off points in curriculum
