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
 * 1. Load examples from the virtual:curriculum-content module (parsed from markdown)
 * 2. Group examples by context (e.g., 'S1')
 * 3. For each context, create a fresh database with schema + seed data
 * 4. Run all examples from sections using that context
 * 5. Verify results match expectations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TypeDBEmbeddedService, createEmbeddedService } from '../../services/typedb-embedded-service';
import { testExample, formatTestResult } from '../test-runner';
import { clearContexts } from '../context-loader';
import type { ParsedExample, ParsedSection } from '../types';

// Import curriculum content from the virtual module (built by vite-plugin)
// This contains the ACTUAL parsed content from the markdown files
import {
  curriculumSections,
  curriculumMetadata,
} from 'virtual:curriculum-content';

// Context database setup - schema and seed data for each context
// This must include ALL types used by ANY curriculum example
const CONTEXT_SETUP: Record<string, { schema: string; seed: string[] }> = {
  'S1': {
    schema: `define
attribute name value string;
attribute age value integer;
attribute founded-year value integer;
attribute start-date value datetime;
entity person owns name, owns age,
  plays friendship:friend,
  plays employment:employee;
entity company owns name, owns founded-year,
  plays employment:employer;
relation friendship relates friend;
relation employment relates employee, relates employer, owns start-date;`,
    seed: [
      // People - insert all in one statement to get stable references
      `insert 
        $alice isa person, has name "Alice", has age 30;
        $bob isa person, has name "Bob", has age 25;
        $carol isa person, has name "Carol", has age 35;
        $dan isa person, has name "Dan", has age 28;
        $acme isa company, has name "Acme Corp", has founded-year 2010;
        $globex isa company, has name "Globex Inc", has founded-year 2015;
        (friend: $alice, friend: $bob) isa friendship;
        (friend: $bob, friend: $carol) isa friendship;
        (friend: $carol, friend: $dan) isa friendship;
        (friend: $alice, friend: $carol) isa friendship;
        (employee: $alice, employer: $acme) isa employment, has start-date 2020-01-15;
        (employee: $bob, employer: $acme) isa employment, has start-date 2021-06-01;
        (employee: $carol, employer: $globex) isa employment, has start-date 2019-03-20;
        (employee: $dan, employer: $globex) isa employment, has start-date 2022-09-01;`,
    ],
  },
};

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

    console.log(
      `[Curriculum Tests] Loaded ${curriculumMetadata.totalSections} sections with ${curriculumMetadata.totalExamples} examples`
    );
  });

  afterAll(async () => {
    await service.disconnect();
    clearContexts();
  });

  // Group sections by context, only including sections that have examples
  const sectionsByContext = new Map<string, ParsedSection[]>();
  for (const section of curriculumSections as ParsedSection[]) {
    // Skip sections with no examples
    if (section.examples.length === 0) continue;
    
    const context = section.context ?? 'default';
    const sections = sectionsByContext.get(context) ?? [];
    sections.push(section);
    sectionsByContext.set(context, sections);
  }

  // Create a describe block for each context that has examples
  for (const [contextName, sections] of sectionsByContext) {
    describe(`Context: ${contextName}`, () => {
      const database = `curriculum_${contextName.replace(/-/g, '_')}${uniqueDbSuffix}`;

      beforeAll(async () => {
        // Create database with schema and seed data
        await service.createDatabase(database);

        const setup = CONTEXT_SETUP[contextName];
        if (setup) {
          // Apply schema
          await service.executeQuery(database, setup.schema, { transactionType: 'schema' });

          // Apply seed data
          for (const seedQuery of setup.seed) {
            await service.executeQuery(database, seedQuery, { transactionType: 'write' });
          }
        } else {
          console.warn(`[Curriculum Tests] No setup defined for context '${contextName}'`);
        }
      });

      afterAll(async () => {
        try {
          await service.deleteDatabase(database);
        } catch {
          // Ignore cleanup errors
        }
      });

      // Create a describe block for each section in this context
      for (const section of sections) {
        if (section.examples.length === 0) {
          continue;
        }

        describe(`Section: ${section.title}`, () => {
          for (const example of section.examples) {
            const queryPreview = example.query.slice(0, 50).replace(/\n/g, ' ');
            const testName = `[${example.id}] ${queryPreview}${example.query.length > 50 ? '...' : ''}`;

            it(testName, async () => {
              const result = await testExample(service, database, example);

              if (!result.passed) {
                console.error(formatTestResult(result));
              }

              expect(result.passed, result.error).toBe(true);
            });
          }
        });
      }
    });
  }
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
