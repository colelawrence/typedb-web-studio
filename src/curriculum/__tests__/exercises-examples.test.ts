/**
 * Exercise Examples Validation Tests
 *
 * This test suite validates all TypeQL examples in the exercises curriculum.
 * It filters to only sections with id starting with "exercises-" and runs
 * each example against TypeDB WASM.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TypeDBEmbeddedService, createEmbeddedService } from '../../services/typedb-embedded-service';
import { testExample, formatTestResult } from '../test-runner';
import { clearContexts } from '../context-loader';
import type { ParsedSection } from '../types';

import {
  curriculumSections,
} from 'virtual:curriculum-content';

describe('Exercise Examples', () => {
  let service: TypeDBEmbeddedService;
  const uniqueDbSuffix = `_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const database = `exercises_social_network${uniqueDbSuffix}`;

  // Filter to only exercise sections
  const exerciseSections = (curriculumSections as ParsedSection[]).filter(
    (section) => section.id?.startsWith('exercises-')
  );

  beforeAll(async () => {
    service = createEmbeddedService();
    await service.connect({
      address: 'embedded://local',
      username: 'test',
      password: '',
    });

    // Create database with schema
    await service.createDatabase(database);
    await service.executeQuery(
      database,
      `define
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
      { transactionType: 'schema' }
    );

    // Seed data - use match-insert to link to existing entities
    const seedQueries = [
      // First create the 4 people and 2 companies
      'insert $alice isa person, has name "Alice", has age 30;',
      'insert $bob isa person, has name "Bob", has age 25;',
      'insert $carol isa person, has name "Carol", has age 35;',
      'insert $dan isa person, has name "Dan", has age 28;',
      'insert $acme isa company, has name "Acme Corp", has founded-year 2010;',
      'insert $globex isa company, has name "Globex Inc", has founded-year 2015;',
      // Friendships - match existing people then insert relation
      `match $alice isa person, has name "Alice"; $bob isa person, has name "Bob"; insert (friend: $alice, friend: $bob) isa friendship;`,
      `match $bob isa person, has name "Bob"; $carol isa person, has name "Carol"; insert (friend: $bob, friend: $carol) isa friendship;`,
      `match $carol isa person, has name "Carol"; $dan isa person, has name "Dan"; insert (friend: $carol, friend: $dan) isa friendship;`,
      `match $alice isa person, has name "Alice"; $carol isa person, has name "Carol"; insert (friend: $alice, friend: $carol) isa friendship;`,
      // Employment - match existing entities then insert relation
      `match $alice isa person, has name "Alice"; $acme isa company, has name "Acme Corp"; insert (employee: $alice, employer: $acme) isa employment, has start-date 2020-01-15;`,
      `match $bob isa person, has name "Bob"; $acme isa company, has name "Acme Corp"; insert (employee: $bob, employer: $acme) isa employment, has start-date 2021-06-01;`,
      `match $carol isa person, has name "Carol"; $globex isa company, has name "Globex Inc"; insert (employee: $carol, employer: $globex) isa employment, has start-date 2019-03-20;`,
      `match $dan isa person, has name "Dan"; $globex isa company, has name "Globex Inc"; insert (employee: $dan, employer: $globex) isa employment, has start-date 2022-09-01;`,
    ];

    for (const query of seedQueries) {
      await service.executeQuery(database, query, { transactionType: 'write' });
    }

    console.log(`[Exercise Tests] Found ${exerciseSections.length} exercise sections`);
  });

  afterAll(async () => {
    try {
      await service.deleteDatabase(database);
    } catch {
      // Ignore cleanup errors
    }
    await service.disconnect();
    clearContexts();
  });

  for (const section of exerciseSections) {
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
