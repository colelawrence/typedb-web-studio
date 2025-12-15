/**
 * Curriculum Example Validation Tests
 *
 * This test suite validates all TypeQL examples in the curriculum documentation.
 * It runs against TypeDB WASM to ensure examples work correctly with real data.
 *
 * These tests run in browser mode via Vitest + Playwright because TypeDB WASM
 * requires browser APIs.
 *
 * Test Strategy:
 * 1. Group examples by context (e.g., 'social-network')
 * 2. For each context, create a fresh database with schema + seed data
 * 3. Run all examples from sections using that context
 * 4. Verify results match expectations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { TypeDBEmbeddedService, createEmbeddedService } from '../../services/typedb-embedded-service';
import { testExample, formatTestResult } from '../test-runner';
import { registerContext, clearContexts, loadContext } from '../context-loader';
import type { ParsedExample } from '../types';

// Import curriculum content - in browser tests we inline it rather than using fs
// This data matches the working TypeQL3 format from existing fixtures
const SOCIAL_NETWORK_SCHEMA = `define
attribute name value string;
attribute age value integer;
entity person owns name, owns age;
entity company owns name;
relation employment relates employee, relates employer;`

// Seed data as individual insert statements (TypeQL3 format)
const SOCIAL_NETWORK_SEED_QUERIES = [
  'insert $p isa person, has name "Alice", has age 30;',
  'insert $p isa person, has name "Bob", has age 25;',
  'insert $p isa person, has name "Carol", has age 35;',
  'insert $p isa person, has name "Dan", has age 28;',
  'insert $c isa company, has name "Acme Corp";',
  'insert $c isa company, has name "Globex Inc";',
];

// Examples from the first-queries.md curriculum file
// These match the actual examples in docs/curriculum/01-foundations/03-first-queries.md
// Note: TypeQL3 uses implicit fetch - just 'match' clause returns results
const FIRST_QUERIES_EXAMPLES: ParsedExample[] = [
  {
    id: 'find-all-people',
    type: 'example',
    query: 'match $p isa person;',
    expect: { results: true, min: 3 },
    sourceFile: '01-foundations/03-first-queries.md',
    lineNumber: 16,
  },
  {
    id: 'find-all-companies',
    type: 'example',
    query: 'match $company isa company;',
    expect: { results: true, min: 2 },
    sourceFile: '01-foundations/03-first-queries.md',
    lineNumber: 27,
  },
  {
    id: 'find-alice',
    type: 'example',
    query: 'match $p isa person, has name "Alice";',
    expect: { results: true, min: 1, max: 1 },
    sourceFile: '01-foundations/03-first-queries.md',
    lineNumber: 38,
  },
  {
    id: 'get-names-ages',
    type: 'example',
    query: 'match $p isa person, has name $n, has age $a;',
    expect: { results: true, min: 4 },
    sourceFile: '01-foundations/03-first-queries.md',
    lineNumber: 51,
  },
  {
    id: 'find-over-30',
    type: 'example',
    query: 'match $p isa person, has name $n, has age $a; $a > 28;',
    expect: { results: true, min: 1 },
    sourceFile: '01-foundations/03-first-queries.md',
    lineNumber: 65,
  },
  {
    id: 'missing-isa',
    type: 'invalid',
    query: 'match $p person;',
    expect: { error: 'parse' },
    sourceFile: '01-foundations/03-first-queries.md',
    lineNumber: 82,
  },
  {
    id: 'unclosed-string',
    type: 'invalid',
    query: 'match $p isa person, has name "Alice;',
    expect: { error: 'parse' },
    sourceFile: '01-foundations/03-first-queries.md',
    lineNumber: 89,
  },
];

// Note: FIRST_QUERIES_EXAMPLES is used directly in tests
// The following section definition shows how examples would be organized:
// {
//   id: 'first-queries',
//   title: 'Your First Queries',
//   context: 'social-network',
//   requires: ['types-intro'],
//   headings: [],
//   examples: FIRST_QUERIES_EXAMPLES,
//   rawContent: '',
//   sourceFile: '01-foundations/03-first-queries.md',
// }

describe('Curriculum Examples', () => {
  let service: TypeDBEmbeddedService;
  const uniqueDbSuffix = `_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  beforeAll(async () => {
    // Create embedded service
    service = createEmbeddedService();
    await service.connect({
      address: 'embedded://local',
      username: 'test',
      password: '',
    });
  });

  afterAll(async () => {
    await service.disconnect();
    clearContexts();
  });

  describe('Context: social-network', () => {
    const database = `curriculum_social${uniqueDbSuffix}`;

    beforeAll(async () => {
      // Create database with schema and seed data
      await service.createDatabase(database);

      // Apply schema
      await service.executeQuery(database, SOCIAL_NETWORK_SCHEMA, { transactionType: 'schema' });

      // Apply seed data (multiple inserts)
      for (const seedQuery of SOCIAL_NETWORK_SEED_QUERIES) {
        await service.executeQuery(database, seedQuery, { transactionType: 'write' });
      }
    });

    afterAll(async () => {
      try {
        await service.deleteDatabase(database);
      } catch {
        // Ignore cleanup errors
      }
    });

    describe('Section: Your First Queries', () => {
      for (const example of FIRST_QUERIES_EXAMPLES) {
        it(`[${example.id}] ${example.query.slice(0, 40).replace(/\n/g, ' ')}...`, async () => {
          const result = await testExample(service, database, example);

          if (!result.passed) {
            console.error(formatTestResult(result));
          }

          expect(result.passed, result.error).toBe(true);
        });
      }
    });
  });
});

describe('Test Runner Utilities', () => {
  let service: TypeDBEmbeddedService;
  const uniqueDbSuffix = `_util_${Date.now()}`;

  beforeAll(async () => {
    service = createEmbeddedService();
    await service.connect({
      address: 'embedded://local',
      username: 'test',
      password: '',
    });
  });

  afterAll(async () => {
    await service.disconnect();
  });

  describe('testExample', () => {
    const database = `test_runner${uniqueDbSuffix}`;

    beforeAll(async () => {
      await service.createDatabase(database);
      // Set up minimal schema
      await service.executeQuery(
        database,
        'define\nattribute name value string;\nentity person owns name;'
      );
      // Insert test data
      await service.executeQuery(database, 'insert $p isa person, has name "Test";');
    });

    afterAll(async () => {
      try {
        await service.deleteDatabase(database);
      } catch {
        // Ignore
      }
    });

    it('passes valid example with results', async () => {
      const example: ParsedExample = {
        id: 'test-valid',
        type: 'example',
        query: 'match $p isa person;',
        expect: { results: true },
        sourceFile: 'test.md',
        lineNumber: 1,
      };

      const result = await testExample(service, database, example);
      expect(result.passed).toBe(true);
      expect(result.actualResults).toBeGreaterThan(0);
    });

    it('passes example with min constraint met', async () => {
      const example: ParsedExample = {
        id: 'test-min',
        type: 'example',
        query: 'match $p isa person;',
        expect: { min: 1 },
        sourceFile: 'test.md',
        lineNumber: 1,
      };

      const result = await testExample(service, database, example);
      expect(result.passed).toBe(true);
    });

    it('fails example when min constraint not met', async () => {
      const example: ParsedExample = {
        id: 'test-min-fail',
        type: 'example',
        query: 'match $p isa person;',
        expect: { min: 100 },
        sourceFile: 'test.md',
        lineNumber: 1,
      };

      const result = await testExample(service, database, example);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('at least 100');
    });

    it('passes invalid example when query fails as expected', async () => {
      const example: ParsedExample = {
        id: 'test-invalid',
        type: 'invalid',
        query: 'this is not valid typeql',
        expect: { error: 'parse' },
        sourceFile: 'test.md',
        lineNumber: 1,
      };

      const result = await testExample(service, database, example);
      expect(result.passed).toBe(true);
    });

    it('fails invalid example when query succeeds unexpectedly', async () => {
      const example: ParsedExample = {
        id: 'test-should-fail',
        type: 'invalid',
        query: 'match $p isa person;',
        expect: { error: 'syntax error' },
        sourceFile: 'test.md',
        lineNumber: 1,
      };

      const result = await testExample(service, database, example);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('Expected query to fail');
    });

    it('passes readonly example without executing', async () => {
      const example: ParsedExample = {
        id: 'test-readonly',
        type: 'readonly',
        query: 'match $anything isa anything;',
        sourceFile: 'test.md',
        lineNumber: 1,
      };

      const result = await testExample(service, database, example);
      expect(result.passed).toBe(true);
    });
  });
});

describe('Context Loader', () => {
  beforeEach(() => {
    clearContexts();
  });

  afterEach(() => {
    clearContexts();
  });

  it('registers and loads context', () => {
    registerContext('test-context', {
      schema: 'define entity test;',
      seed: 'insert $t isa test;',
    });

    const context = loadContext('test-context');
    expect(context.name).toBe('test-context');
    expect(context.schema).toBe('define entity test;');
    expect(context.seed).toBe('insert $t isa test;');
  });

  it('throws when loading unregistered context', () => {
    expect(() => loadContext('nonexistent')).toThrow(/not found/);
  });
});
