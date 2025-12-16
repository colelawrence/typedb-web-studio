/**
 * Tour Curriculum Example Tests
 *
 * Tests TypeQL examples from the tour curriculum (01-tour/*.md).
 * Filters sections by id prefix 'tour-' and runs against TypeDB WASM.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TypeDBEmbeddedService, createEmbeddedService } from '../../services/typedb-embedded-service';
import { testExample, formatTestResult } from '../test-runner';
import { clearContexts } from '../context-loader';
import type { ParsedExample, ParsedSection } from '../types';

import {
  curriculumSections,
  curriculumMetadata,
} from 'virtual:curriculum-content';

// Same context setup as all-examples.test.ts
const CONTEXT_SETUP: Record<string, { schema: string; seed: string[] }> = {
  'social-network': {
    schema: `define
attribute name value string;
attribute age value integer;
entity person owns name, owns age;
entity company owns name;
relation employment relates employee, relates employer;
person plays employment:employee;
company plays employment:employer;`,
    seed: [
      'insert $p isa person, has name "Alice", has age 30;',
      'insert $p isa person, has name "Bob", has age 25;',
      'insert $p isa person, has name "Carol", has age 35;',
      'insert $p isa person, has name "Dan", has age 28;',
      'insert $c isa company, has name "Acme Corp";',
      'insert $c isa company, has name "Globex Inc";',
      `insert
        $p isa person, has name "Alice";
        $c isa company, has name "Acme Corp";
        (employee: $p, employer: $c) isa employment;`,
    ],
  },
};

describe('Tour Curriculum Examples', () => {
  let service: TypeDBEmbeddedService;
  const uniqueDbSuffix = `_tour_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  beforeAll(async () => {
    service = createEmbeddedService();
    await service.connect({
      address: 'embedded://local',
      username: 'test',
      password: '',
    });

    // Filter to only tour sections
    const tourSections = (curriculumSections as ParsedSection[]).filter(
      (s) => s.id.startsWith('tour-')
    );
    const tourExamples = tourSections.reduce((acc, s) => acc + s.examples.length, 0);
    console.log(
      `[Tour Tests] Loaded ${tourSections.length} tour sections with ${tourExamples} examples`
    );
  });

  afterAll(async () => {
    await service.disconnect();
    clearContexts();
  });

  // Filter to only tour sections
  const tourSections = (curriculumSections as ParsedSection[]).filter(
    (s) => s.id.startsWith('tour-')
  );

  // Group by context
  const sectionsByContext = new Map<string, ParsedSection[]>();
  for (const section of tourSections) {
    const context = section.context ?? 'default';
    const sections = sectionsByContext.get(context) ?? [];
    sections.push(section);
    sectionsByContext.set(context, sections);
  }

  for (const [contextName, sections] of sectionsByContext) {
    // Skip null/default context (no examples to run)
    if (contextName === 'default') {
      continue;
    }

    describe(`Context: ${contextName}`, () => {
      const database = `tour_${contextName.replace(/-/g, '_')}${uniqueDbSuffix}`;

      beforeAll(async () => {
        await service.createDatabase(database);

        const setup = CONTEXT_SETUP[contextName];
        if (setup) {
          await service.executeQuery(database, setup.schema, { transactionType: 'schema' });

          for (const seedQuery of setup.seed) {
            await service.executeQuery(database, seedQuery, { transactionType: 'write' });
          }
        } else {
          console.warn(`[Tour Tests] No setup defined for context '${contextName}'`);
        }
      });

      afterAll(async () => {
        try {
          await service.deleteDatabase(database);
        } catch {
          // Ignore cleanup errors
        }
      });

      for (const section of sections) {
        if (section.examples.length === 0) {
          continue;
        }

        describe(`${section.title}`, () => {
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
