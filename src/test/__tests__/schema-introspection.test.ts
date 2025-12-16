/**
 * Schema Introspection E2E Test
 *
 * Tests that schema introspection data appears in the QuerySidebarSchemaSectionVM
 * after connecting to a database and defining a schema.
 *
 * Flow:
 * 1. Bootstrap the complete TypeDB Studio app
 * 2. Navigate to Connect page
 * 3. Create a local WASM server and connect
 * 4. Define a schema in the database via queryExecution service
 * 5. Navigate to Query page
 * 6. Verify schema tree shows entities, relations, and attributes
 *
 * **Note:** Uses queryExecution.execute for schema definition since
 * it handles query type detection and routing internally.
 */

import { describe, it, expect, afterEach } from "vitest";
import { bootstrapStudioForTest, type TestStudio } from "../bootstrap-studio";
import {
  waitFor,
  waitForPage,
  waitForItem,
  clickNavItem,
} from "../vm-test-helpers";
import type { ConnectPageVM } from "../../vm/pages/connect/connect-page.vm";
import type { QueryPageVM } from "../../vm/pages/query/query-page.vm";

describe("Schema Introspection in Query Sidebar", () => {
  let studio: TestStudio | null = null;

  afterEach(async () => {
    if (studio) {
      await studio.cleanup();
      studio = null;
    }
  });

  it("shows entity types in schema tree after defining schema", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, services } = studio;

    // -------------------------------------------------------------------------
    // 1. Navigate to Connect page and create a local server
    // -------------------------------------------------------------------------
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    const connectVm: ConnectPageVM = connectState.vm;

    // Create and connect to a local server
    const { key: serverKey } = await connectVm.localServers.createNew();
    const server = await waitForItem(query, connectVm.localServers.items$, serverKey);
    await server.connect();

    // Wait for query page
    const queryState = await waitForPage(app, query, "query");
    expect(queryState.page).toBe("query");

    // -------------------------------------------------------------------------
    // 2. Define a schema via queryExecution service
    // -------------------------------------------------------------------------
    const defineResult = await services.queryExecution.execute(
      `define
        attribute name value string;
        attribute email value string;
        attribute age value integer;
        attribute founded_year value integer;
        entity person owns name, owns email, owns age, plays employment:employee;
        entity company owns name, owns founded_year, plays employment:employer;
        relation employment relates employee, relates employer;`
    );
    expect(defineResult.success).toBe(true);

    // -------------------------------------------------------------------------
    // 3. Verify schema tree shows the entities
    // -------------------------------------------------------------------------
    const queryVm: QueryPageVM = queryState.vm;
    const schemaSection = queryVm.sidebar.schemaSection;
    const schemaTree = schemaSection.tree;

    // Wait for schema to load - the queryExecution should trigger a refresh
    await waitFor(
      () => query(schemaTree.entities.count$),
      (count) => count >= 2, // person, company
      { label: "entities to appear in schema tree", timeoutMs: 5000 }
    );

    const status = query(schemaTree.status$);
    expect(status).toBe("ready");

    // Check entity count
    const entityCount = query(schemaTree.entities.count$);
    expect(entityCount).toBeGreaterThanOrEqual(2);

    // Check entity items
    const entityItems = query(schemaTree.entities.items$);
    const entityLabels = entityItems.map((e) => e.label);
    expect(entityLabels).toContain("person");
    expect(entityLabels).toContain("company");

    console.log(`[Schema Test] Found ${entityCount} entities: ${entityLabels.join(", ")}`);
  });

  it("shows relation types in schema tree", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, services } = studio;

    // Connect to a server
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    const { key: serverKey } = await connectState.vm.localServers.createNew();
    const server = await waitForItem(query, connectState.vm.localServers.items$, serverKey);
    await server.connect();

    await waitForPage(app, query, "query");

    // Define schema with relations
    const defineResult = await services.queryExecution.execute(
      `define
        entity person plays friendship:friend;
        entity organization plays membership:group;
        relation friendship relates friend;
        relation membership relates member, relates group;
        person plays membership:member;`
    );
    expect(defineResult.success).toBe(true);

    const queryState = query(app.currentPage$);
    expect(queryState.page).toBe("query");
    const queryVm = queryState.vm as QueryPageVM;
    const schemaTree = queryVm.sidebar.schemaSection.tree;

    // Wait for relations to appear
    await waitFor(
      () => query(schemaTree.relations.count$),
      (count) => count >= 2, // friendship, membership
      { label: "relations to appear in schema tree", timeoutMs: 5000 }
    );

    // Check relation count
    const relationCount = query(schemaTree.relations.count$);
    expect(relationCount).toBeGreaterThanOrEqual(2);

    // Check relation items
    const relationItems = query(schemaTree.relations.items$);
    const relationLabels = relationItems.map((r) => r.label);
    expect(relationLabels).toContain("friendship");
    expect(relationLabels).toContain("membership");

    console.log(`[Schema Test] Found ${relationCount} relations: ${relationLabels.join(", ")}`);

    // Check that relations have roles
    const membershipItem = relationItems.find((r) => r.label === "membership");
    if (membershipItem) {
      const hasChildren = query(membershipItem.hasChildren$);
      expect(hasChildren).toBe(true);
    }
  });

  it("shows attribute types in schema tree", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, services } = studio;

    // Connect to a server
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    const { key: serverKey } = await connectState.vm.localServers.createNew();
    const server = await waitForItem(query, connectState.vm.localServers.items$, serverKey);
    await server.connect();

    await waitForPage(app, query, "query");

    // Define schema with various attribute types
    const defineResult = await services.queryExecution.execute(
      `define
        attribute name value string;
        attribute count value integer;
        attribute score value double;
        attribute active value boolean;
        entity test_entity owns name, owns count, owns score, owns active;`
    );
    expect(defineResult.success).toBe(true);

    // Insert some data so value types can be inferred
    const insertResult = await services.queryExecution.execute(
      `insert $e isa test_entity, has name "test", has count 42, has score 3.14, has active true;`
    );
    expect(insertResult.success).toBe(true);

    const queryState = query(app.currentPage$);
    const queryVm = queryState.vm as QueryPageVM;
    const schemaTree = queryVm.sidebar.schemaSection.tree;

    // Wait for attributes to appear
    await waitFor(
      () => query(schemaTree.attributes.count$),
      (count) => count >= 4, // name, count, score, active
      { label: "attributes to appear in schema tree", timeoutMs: 5000 }
    );

    // Check attribute count
    const attributeCount = query(schemaTree.attributes.count$);
    expect(attributeCount).toBeGreaterThanOrEqual(4);

    // Check attribute items
    const attributeItems = query(schemaTree.attributes.items$);
    const attributeLabels = attributeItems.map((a) => a.label);
    expect(attributeLabels).toContain("name");
    expect(attributeLabels).toContain("count");
    expect(attributeLabels).toContain("score");
    expect(attributeLabels).toContain("active");

    console.log(`[Schema Test] Found ${attributeCount} attributes: ${attributeLabels.join(", ")}`);
  });

  it("updates schema tree when schema changes", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, services } = studio;

    // Connect to a server
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    const { key: serverKey } = await connectState.vm.localServers.createNew();
    const server = await waitForItem(query, connectState.vm.localServers.items$, serverKey);
    await server.connect();

    await waitForPage(app, query, "query");

    // Define initial schema with a unique entity name for this test
    let result = await services.queryExecution.execute(
      `define
        attribute title value string;
        entity book owns title;`
    );
    expect(result.success).toBe(true);

    const queryState = query(app.currentPage$);
    const queryVm = queryState.vm as QueryPageVM;
    const schemaTree = queryVm.sidebar.schemaSection.tree;

    // Wait for initial schema
    await waitFor(
      () => query(schemaTree.entities.items$).map((e) => e.label),
      (labels) => labels.includes("book"),
      { label: "book entity to appear", timeoutMs: 5000 }
    );

    // Verify initial state - book exists, author doesn't yet
    let entityItems = query(schemaTree.entities.items$);
    expect(entityItems.map((e) => e.label)).toContain("book");
    expect(entityItems.map((e) => e.label)).not.toContain("author");

    // Add more schema
    result = await services.queryExecution.execute(
      `define
        entity author owns title;`
    );
    expect(result.success).toBe(true);

    // Wait for update
    await waitFor(
      () => query(schemaTree.entities.items$).map((e) => e.label),
      (labels) => labels.includes("author"),
      { label: "author to appear in schema", timeoutMs: 5000 }
    );

    // Verify updated state
    entityItems = query(schemaTree.entities.items$);
    expect(entityItems.map((e) => e.label)).toContain("book");
    expect(entityItems.map((e) => e.label)).toContain("author");

    console.log(`[Schema Test] Schema updated successfully`);
  });
});
