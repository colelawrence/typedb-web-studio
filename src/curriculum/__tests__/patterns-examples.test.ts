/**
 * Patterns Curriculum Example Validation Tests
 *
 * This test suite validates TypeQL examples from the patterns curriculum module.
 * It runs against TypeDB WASM to ensure examples work correctly with real data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TypeDBEmbeddedService, createEmbeddedService } from '../../services/typedb-embedded-service';
import { testExample, formatTestResult } from '../test-runner';
import type { ParsedSection } from '../types';

// Import curriculum content from the virtual module
import { curriculumSections } from 'virtual:curriculum-content';

describe('Patterns Curriculum Examples', () => {
  let service: TypeDBEmbeddedService;
  const uniqueDbSuffix = `_patterns_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const database = `patterns_test${uniqueDbSuffix}`;

  // Filter to only patterns sections
  const patternsSections = (curriculumSections as ParsedSection[]).filter(
    (section) => section.id.startsWith('patterns-')
  );

  beforeAll(async () => {
    service = createEmbeddedService();
    await service.connect({
      address: 'embedded://local',
      username: 'test',
      password: '',
    });

    // Create database with social-network schema
    await service.createDatabase(database);

    // Apply schema
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

    // Seed data - people
    await service.executeQuery(database, 'insert $p isa person, has name "Alice", has age 30;', {
      transactionType: 'write',
    });
    await service.executeQuery(database, 'insert $p isa person, has name "Bob", has age 25;', {
      transactionType: 'write',
    });
    await service.executeQuery(database, 'insert $p isa person, has name "Carol", has age 35;', {
      transactionType: 'write',
    });
    await service.executeQuery(database, 'insert $p isa person, has name "Dan", has age 28;', {
      transactionType: 'write',
    });

    // Companies
    await service.executeQuery(
      database,
      'insert $c isa company, has name "Acme Corp", has founded-year 2010;',
      { transactionType: 'write' }
    );
    await service.executeQuery(
      database,
      'insert $c isa company, has name "Globex Inc", has founded-year 2015;',
      { transactionType: 'write' }
    );

    // Friendships - match existing people, then insert relation
    await service.executeQuery(
      database,
      `match
        $alice isa person, has name "Alice";
        $bob isa person, has name "Bob";
      insert
        (friend: $alice, friend: $bob) isa friendship;`,
      { transactionType: 'write' }
    );
    await service.executeQuery(
      database,
      `match
        $bob isa person, has name "Bob";
        $carol isa person, has name "Carol";
      insert
        (friend: $bob, friend: $carol) isa friendship;`,
      { transactionType: 'write' }
    );
    await service.executeQuery(
      database,
      `match
        $carol isa person, has name "Carol";
        $dan isa person, has name "Dan";
      insert
        (friend: $carol, friend: $dan) isa friendship;`,
      { transactionType: 'write' }
    );
    await service.executeQuery(
      database,
      `match
        $alice isa person, has name "Alice";
        $carol isa person, has name "Carol";
      insert
        (friend: $alice, friend: $carol) isa friendship;`,
      { transactionType: 'write' }
    );

    // Employment - match existing entities, then insert relation
    await service.executeQuery(
      database,
      `match
        $alice isa person, has name "Alice";
        $acme isa company, has name "Acme Corp";
      insert
        (employee: $alice, employer: $acme) isa employment, has start-date 2020-01-15;`,
      { transactionType: 'write' }
    );
    await service.executeQuery(
      database,
      `match
        $bob isa person, has name "Bob";
        $acme isa company, has name "Acme Corp";
      insert
        (employee: $bob, employer: $acme) isa employment, has start-date 2021-06-01;`,
      { transactionType: 'write' }
    );
    await service.executeQuery(
      database,
      `match
        $carol isa person, has name "Carol";
        $globex isa company, has name "Globex Inc";
      insert
        (employee: $carol, employer: $globex) isa employment, has start-date 2019-03-20;`,
      { transactionType: 'write' }
    );
    await service.executeQuery(
      database,
      `match
        $dan isa person, has name "Dan";
        $globex isa company, has name "Globex Inc";
      insert
        (employee: $dan, employer: $globex) isa employment, has start-date 2022-09-01;`,
      { transactionType: 'write' }
    );

    console.log(`[Patterns Tests] Loaded ${patternsSections.length} patterns sections`);
  });

  afterAll(async () => {
    try {
      await service.deleteDatabase(database);
    } catch {
      // Ignore cleanup errors
    }
    await service.disconnect();
  });

  // Create tests for each patterns section
  for (const section of patternsSections) {
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
