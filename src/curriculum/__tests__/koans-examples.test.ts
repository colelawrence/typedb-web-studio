/**
 * Koans Example Validation Tests
 *
 * This test suite validates all TypeQL examples in the koans curriculum.
 * It filters to only sections with id starting with 'koans-'.
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

// Context database setup for koans (uses social-network context)
const CONTEXT_SETUP: Record<string, { schema: string; seed: string[] }> = {
  'social-network': {
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
relation employment relates employee, relates employer,
  owns start-date;`,
    seed: [
      'insert $alice isa person, has name "Alice", has age 30;',
      'insert $bob isa person, has name "Bob", has age 25;',
      'insert $carol isa person, has name "Carol", has age 35;',
      'insert $dan isa person, has name "Dan", has age 28;',
      'insert $acme isa company, has name "Acme Corp", has founded-year 2010;',
      'insert $globex isa company, has name "Globex Inc", has founded-year 2015;',
      // Friendships
      `insert
        $alice isa person, has name "Alice";
        $bob isa person, has name "Bob";
        (friend: $alice, friend: $bob) isa friendship;`,
      `insert
        $bob isa person, has name "Bob";
        $carol isa person, has name "Carol";
        (friend: $bob, friend: $carol) isa friendship;`,
      `insert
        $carol isa person, has name "Carol";
        $dan isa person, has name "Dan";
        (friend: $carol, friend: $dan) isa friendship;`,
      `insert
        $alice isa person, has name "Alice";
        $carol isa person, has name "Carol";
        (friend: $alice, friend: $carol) isa friendship;`,
      // Employment
      `insert
        $alice isa person, has name "Alice";
        $acme isa company, has name "Acme Corp";
        (employee: $alice, employer: $acme) isa employment, has start-date 2020-01-15;`,
      `insert
        $bob isa person, has name "Bob";
        $acme isa company, has name "Acme Corp";
        (employee: $bob, employer: $acme) isa employment, has start-date 2021-06-01;`,
      `insert
        $carol isa person, has name "Carol";
        $globex isa company, has name "Globex Inc";
        (employee: $carol, employer: $globex) isa employment, has start-date 2019-03-20;`,
      `insert
        $dan isa person, has name "Dan";
        $globex isa company, has name "Globex Inc";
        (employee: $dan, employer: $globex) isa employment, has start-date 2022-09-01;`,
    ],
  },
};

describe('Koans Examples', () => {
  let service: TypeDBEmbeddedService;
  const uniqueDbSuffix = `_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  beforeAll(async () => {
    service = createEmbeddedService();
    await service.connect({
      address: 'embedded://local',
      username: 'test',
      password: '',
    });

    // Filter to only koans sections
    const koansSections = (curriculumSections as ParsedSection[]).filter(
      (s) => s.id.startsWith('koans-')
    );

    console.log(
      `[Koans Tests] Found ${koansSections.length} koans sections with ${koansSections.reduce((sum, s) => sum + s.examples.length, 0)} examples`
    );
  });

  afterAll(async () => {
    await service.disconnect();
    clearContexts();
  });

  // Filter to only koans sections
  const koansSections = (curriculumSections as ParsedSection[]).filter(
    (s) => s.id.startsWith('koans-')
  );

  // Group sections by context
  const sectionsByContext = new Map<string, ParsedSection[]>();
  for (const section of koansSections) {
    const context = section.context ?? 'default';
    const sections = sectionsByContext.get(context) ?? [];
    sections.push(section);
    sectionsByContext.set(context, sections);
  }

  // Create a describe block for each context
  for (const [contextName, sections] of sectionsByContext) {
    describe(`Context: ${contextName}`, () => {
      const database = `koans_${contextName.replace(/-/g, '_')}${uniqueDbSuffix}`;

      beforeAll(async () => {
        await service.createDatabase(database);

        const setup = CONTEXT_SETUP[contextName];
        if (setup) {
          await service.executeQuery(database, setup.schema, { transactionType: 'schema' });

          for (const seedQuery of setup.seed) {
            await service.executeQuery(database, seedQuery, { transactionType: 'write' });
          }
        } else {
          console.warn(`[Koans Tests] No setup defined for context '${contextName}'`);
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
