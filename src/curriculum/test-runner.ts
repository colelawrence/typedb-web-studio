/**
 * Curriculum Example Test Runner
 *
 * Validates curriculum examples against TypeDB to ensure all code examples
 * in the documentation are correct and produce expected results.
 *
 * @module curriculum/test-runner
 */

import type { TypeDBEmbeddedService } from '../services/typedb-embedded-service';
import type { ParsedExample, ExampleExpectation } from './types';
import type { MatchQueryResult } from '../services/typedb-service';

/**
 * Result of testing a single example.
 */
export interface ExampleTestResult {
  /** Example ID from the code fence */
  exampleId: string;
  /** Whether the test passed */
  passed: boolean;
  /** Error message if the test failed */
  error?: string;
  /** Actual number of results returned (for match queries) */
  actualResults?: number;
  /** Expected result constraints from the example */
  expectedResults?: { min?: number; max?: number };
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** The query that was executed */
  query: string;
  /** Source file and line for error reporting */
  source: string;
}

/**
 * Result of testing all examples in a section.
 */
export interface SectionTestResult {
  /** Section ID */
  sectionId: string;
  /** Section title */
  sectionTitle: string;
  /** Context used for the section */
  context: string | null;
  /** Results for each example */
  examples: ExampleTestResult[];
  /** Whether all examples passed */
  allPassed: boolean;
  /** Total execution time for the section */
  totalTimeMs: number;
}

/**
 * Test a single example against TypeDB.
 *
 * @param service - TypeDB embedded service
 * @param database - Database to run the query against
 * @param example - The example to test
 * @returns Test result
 */
export async function testExample(
  service: TypeDBEmbeddedService,
  database: string,
  example: ParsedExample
): Promise<ExampleTestResult> {
  const start = Date.now();
  const source = `${example.sourceFile}:${example.lineNumber}`;

  const baseResult = {
    exampleId: example.id,
    query: example.query,
    source,
  };

  try {
    // Handle different example types
    switch (example.type) {
      case 'invalid':
        return testInvalidExample(service, database, example, start);

      case 'schema':
        return testSchemaExample(service, database, example, start);

      case 'readonly':
        // Readonly examples are display-only, always pass
        return {
          ...baseResult,
          passed: true,
          executionTimeMs: Date.now() - start,
        };

      case 'example':
      default:
        return testMatchExample(service, database, example, start);
    }
  } catch (err) {
    return {
      ...baseResult,
      passed: false,
      error: err instanceof Error ? err.message : String(err),
      executionTimeMs: Date.now() - start,
    };
  }
}

/**
 * Test an 'invalid' type example - should fail with expected error.
 */
async function testInvalidExample(
  service: TypeDBEmbeddedService,
  database: string,
  example: ParsedExample,
  start: number
): Promise<ExampleTestResult> {
  const source = `${example.sourceFile}:${example.lineNumber}`;

  try {
    // Try to execute the query - it should fail
    await service.executeQuery(database, example.query, { transactionType: 'read' });

    // If we get here, the query succeeded when it should have failed
    return {
      exampleId: example.id,
      passed: false,
      error: 'Expected query to fail but it succeeded',
      query: example.query,
      source,
      executionTimeMs: Date.now() - start,
    };
  } catch (err) {
    // Extract error message from various error types
    let errorMessage: string;
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'object' && err !== null && 'message' in err) {
      errorMessage = String((err as { message: unknown }).message);
    } else {
      errorMessage = JSON.stringify(err);
    }

    // Check if the error matches the expected pattern
    if (example.expect?.error) {
      if (!errorMessage.toLowerCase().includes(example.expect.error.toLowerCase())) {
        return {
          exampleId: example.id,
          passed: false,
          error: `Expected error containing "${example.expect.error}" but got "${errorMessage}"`,
          query: example.query,
          source,
          executionTimeMs: Date.now() - start,
        };
      }
    }

    // Error as expected
    return {
      exampleId: example.id,
      passed: true,
      query: example.query,
      source,
      executionTimeMs: Date.now() - start,
    };
  }
}

/**
 * Test a 'schema' type example - defines schema elements.
 */
async function testSchemaExample(
  service: TypeDBEmbeddedService,
  database: string,
  example: ParsedExample,
  start: number
): Promise<ExampleTestResult> {
  const source = `${example.sourceFile}:${example.lineNumber}`;

  await service.executeQuery(database, example.query, { transactionType: 'schema' });

  return {
    exampleId: example.id,
    passed: true,
    query: example.query,
    source,
    executionTimeMs: Date.now() - start,
  };
}

/**
 * Test an 'example' type - a match query that should return results.
 */
async function testMatchExample(
  service: TypeDBEmbeddedService,
  database: string,
  example: ParsedExample,
  start: number
): Promise<ExampleTestResult> {
  const source = `${example.sourceFile}:${example.lineNumber}`;

  const response = await service.executeQuery(database, example.query, {
    transactionType: 'read',
  });

  // Count results
  let resultCount = 0;
  if (response.data.type === 'match') {
    resultCount = (response.data as MatchQueryResult).answers.length;
  }

  // Validate against expectations
  const validationResult = validateResults(resultCount, example.expect);
  if (validationResult.error) {
    return {
      exampleId: example.id,
      passed: false,
      error: validationResult.error,
      actualResults: resultCount,
      expectedResults: validationResult.expected,
      query: example.query,
      source,
      executionTimeMs: Date.now() - start,
    };
  }

  return {
    exampleId: example.id,
    passed: true,
    actualResults: resultCount,
    expectedResults: validationResult.expected,
    query: example.query,
    source,
    executionTimeMs: Date.now() - start,
  };
}

/**
 * Validate result count against expectations.
 */
function validateResults(
  actualCount: number,
  expect?: ExampleExpectation
): { error?: string; expected?: { min?: number; max?: number } } {
  if (!expect) {
    // No expectations - anything is valid
    return {};
  }

  const expected: { min?: number; max?: number } = {};

  // Check if results are expected
  if (expect.results && actualCount === 0) {
    return {
      error: 'Expected results but got none',
      expected: { min: 1 },
    };
  }

  // Check minimum
  if (expect.min !== undefined) {
    expected.min = expect.min;
    if (actualCount < expect.min) {
      return {
        error: `Expected at least ${expect.min} results but got ${actualCount}`,
        expected,
      };
    }
  }

  // Check maximum
  if (expect.max !== undefined) {
    expected.max = expect.max;
    if (actualCount > expect.max) {
      return {
        error: `Expected at most ${expect.max} results but got ${actualCount}`,
        expected,
      };
    }
  }

  return { expected: Object.keys(expected).length > 0 ? expected : undefined };
}

/**
 * Format a test result as a human-readable string.
 */
export function formatTestResult(result: ExampleTestResult): string {
  if (result.passed) {
    const info = result.actualResults !== undefined ? ` (${result.actualResults} results)` : '';
    return `✓ [${result.exampleId}]${info} (${result.executionTimeMs}ms)`;
  }

  return (
    `✗ [${result.exampleId}] ${result.error}\n` +
    `  Source: ${result.source}\n` +
    `  Query: ${result.query.slice(0, 60).replace(/\n/g, ' ')}...`
  );
}

/**
 * Format a section test result summary.
 */
export function formatSectionResult(result: SectionTestResult): string {
  const passedCount = result.examples.filter((e) => e.passed).length;
  const totalCount = result.examples.length;
  const status = result.allPassed ? '✓' : '✗';

  return (
    `${status} ${result.sectionTitle} [${result.sectionId}] ` +
    `(${passedCount}/${totalCount} examples, ${result.totalTimeMs}ms)`
  );
}
