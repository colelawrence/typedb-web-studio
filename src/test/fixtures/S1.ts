/**
 * Social Network Test Fixture
 *
 * A pre-defined schema and data set for testing social network scenarios.
 * Includes people, companies, and employment relationships.
 */

import { Database } from '@typedb/embedded'

/**
 * Social network schema with person, company, and employment relation.
 */
export const socialNetworkSchema = `define
attribute name value string;
attribute email value string;
attribute age value integer;
attribute founded_year value integer;
entity person owns name, owns email, owns age, plays employment:employee;
entity company owns name, owns founded_year, plays employment:employer;
relation employment relates employee, relates employer;`

/**
 * Sample data for the social network schema.
 */
export const socialNetworkData = [
  'insert $p isa person, has name "Alice", has email "alice@example.com", has age 30;',
  'insert $p isa person, has name "Bob", has email "bob@example.com", has age 25;',
  'insert $p isa person, has name "Charlie", has email "charlie@example.com", has age 35;',
  'insert $c isa company, has name "Acme Corp", has founded_year 2010;',
  'insert $c isa company, has name "TechStart", has founded_year 2020;',
]

/**
 * Employment relationships.
 */
export const socialNetworkRelations = [
  `
    match
      $alice isa person, has email "alice@example.com";
      $acme isa company, has name "Acme Corp";
    insert
      (employee: $alice, employer: $acme) isa employment;
  `,
  `
    match
      $bob isa person, has email "bob@example.com";
      $acme isa company, has name "Acme Corp";
    insert
      (employee: $bob, employer: $acme) isa employment;
  `,
  `
    match
      $charlie isa person, has email "charlie@example.com";
      $techstart isa company, has name "TechStart";
    insert
      (employee: $charlie, employer: $techstart) isa employment;
  `,
]

/**
 * Creates a social network database with schema and sample data.
 */
export async function createSocialNetworkDb(name = 'social_network_test'): Promise<Database> {
  const db = await Database.open(name)

  // Define schema
  await db.define(socialNetworkSchema)

  // Insert data
  for (const query of socialNetworkData) {
    await db.execute(query)
  }

  // Insert relations
  for (const query of socialNetworkRelations) {
    await db.execute(query)
  }

  return db
}

/**
 * Expected counts for validation.
 */
export const socialNetworkExpected = {
  personCount: 3,
  companyCount: 2,
  employmentCount: 3,
}
