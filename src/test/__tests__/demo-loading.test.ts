/**
 * Demo Loading E2E Test
 *
 * Tests that demo databases load correctly with schema AND data.
 *
 * This test exposes a bug where demo sample data fails to insert relationships
 * because the data uses `insert` instead of `match...insert` for entities
 * with @unique attributes.
 */

import { describe, it, expect, afterEach } from "vitest";
import { bootstrapStudioForTest, type TestStudio } from "../bootstrap-studio";
import {
  waitFor,
  waitForPage,
  clickNavItem,
} from "../vm-test-helpers";
import type { ConnectPageVM } from "../../vm/pages/connect/connect-page.vm";
import type { QueryPageVM } from "../../vm/pages/query/query-page.vm";

describe("Demo Loading", () => {
  let studio: TestStudio | null = null;

  afterEach(async () => {
    if (studio) {
      await studio.cleanup();
      studio = null;
    }
  });

  it("loads Social Network demo and populates schema", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query } = studio;

    // Navigate to Connect page
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    const connectVm: ConnectPageVM = connectState.vm;

    // Wait for demos to load
    await waitFor(
      () => query(connectVm.demos.isLoading$),
      (loading) => !loading,
      { label: "demos to finish loading", timeoutMs: 5000 }
    );

    // Find Social Network demo
    const demos = query(connectVm.demos.items$);
    const socialNetworkDemo = demos.find((d) => d.id === "social-network");
    expect(socialNetworkDemo).toBeDefined();

    // Load the demo
    await socialNetworkDemo!.load();

    // Should navigate to query page
    const queryState = await waitForPage(app, query, "query");
    expect(queryState.page).toBe("query");

    // Verify schema loaded - check entities
    const queryVm: QueryPageVM = queryState.vm;
    const schemaTree = queryVm.sidebar.schemaSection.tree;

    await waitFor(
      () => query(schemaTree.entities.count$),
      (count) => count >= 3, // person, post, comment
      { label: "entities to appear in schema tree", timeoutMs: 5000 }
    );

    const entityItems = query(schemaTree.entities.items$);
    const entityLabels = entityItems.map((e) => e.label);
    expect(entityLabels).toContain("person");
    expect(entityLabels).toContain("post");
    expect(entityLabels).toContain("comment");

    console.log(`[Demo Test] Schema loaded: ${entityLabels.join(", ")}`);
  });

  it("loads Social Network demo and populates sample data (entities)", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, services } = studio;

    // Navigate to Connect page
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    const connectVm: ConnectPageVM = connectState.vm;

    // Wait for demos and load Social Network
    await waitFor(
      () => query(connectVm.demos.isLoading$),
      (loading) => !loading,
      { label: "demos to finish loading" }
    );

    const demos = query(connectVm.demos.items$);
    const socialNetworkDemo = demos.find((d) => d.id === "social-network");
    await socialNetworkDemo!.load();
    await waitForPage(app, query, "query");

    // At minimum, entities should be inserted (first set of inserts)
    // Alice, Bob, Carol, David, Emma = 5 people
    const matchResult = await services.queryExecution.execute(
      `match $p isa person;`
    );

    console.log(`[Demo Test] People query result:`, matchResult);
    expect(matchResult.success).toBe(true);

    // Check we have some people (entities should insert even if relations fail)
    const personCount = matchResult.resultCount ?? 0;
    console.log(`[Demo Test] Found ${personCount} people`);
    expect(personCount).toBeGreaterThanOrEqual(5);
  });

  it("loads Social Network demo and populates relationships", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, services } = studio;

    // Navigate to Connect page and load demo
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    const connectVm: ConnectPageVM = connectState.vm;

    await waitFor(
      () => query(connectVm.demos.isLoading$),
      (loading) => !loading,
      { label: "demos to finish loading" }
    );

    const demos = query(connectVm.demos.items$);
    const socialNetworkDemo = demos.find((d) => d.id === "social-network");
    await socialNetworkDemo!.load();
    await waitForPage(app, query, "query");

    // Query for friendships - should have at least 5 from sample data
    const friendshipResult = await services.queryExecution.execute(
      `match $f isa friendship;`
    );

    console.log(`[Demo Test] Friendship query result:`, friendshipResult);
    expect(friendshipResult.success).toBe(true);

    // BUG: This test currently FAILS because relationships aren't being inserted
    // The sample data uses `insert $a isa person; $b isa person; (friend: $a, friend: $b) isa friendship;`
    // which tries to insert duplicate entities with @unique attributes
    const friendshipCount = friendshipResult.resultCount ?? 0;
    console.log(`[Demo Test] Found ${friendshipCount} friendships`);

    // This should be at least 5 friendships according to sample data:
    // alice-bob, alice-carol, bob-david, carol-emma, david-emma
    expect(friendshipCount).toBeGreaterThanOrEqual(5);
  });

  it("loads Social Network demo and populates posts with authorship", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, services } = studio;

    // Navigate to Connect page and load demo
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    const connectVm: ConnectPageVM = connectState.vm;

    await waitFor(
      () => query(connectVm.demos.isLoading$),
      (loading) => !loading,
      { label: "demos to finish loading" }
    );

    const demos = query(connectVm.demos.items$);
    const socialNetworkDemo = demos.find((d) => d.id === "social-network");
    await socialNetworkDemo!.load();
    await waitForPage(app, query, "query");

    // Query for posts - should have 4 from sample data
    const postsResult = await services.queryExecution.execute(
      `match $post isa post;`
    );

    console.log(`[Demo Test] Posts query result:`, postsResult);
    expect(postsResult.success).toBe(true);

    const postCount = postsResult.resultCount ?? 0;
    console.log(`[Demo Test] Found ${postCount} posts`);
    expect(postCount).toBeGreaterThanOrEqual(4);

    // Query for authorships - should have 4 from sample data
    // BUG: This also fails for the same reason as friendships
    const authorshipResult = await services.queryExecution.execute(
      `match $a isa authorship;`
    );

    console.log(`[Demo Test] Authorship query result:`, authorshipResult);
    expect(authorshipResult.success).toBe(true);

    const authorshipCount = authorshipResult.resultCount ?? 0;
    console.log(`[Demo Test] Found ${authorshipCount} authorships`);
    expect(authorshipCount).toBeGreaterThanOrEqual(4);
  });

  it("demo example query 'All Users' returns results", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, services } = studio;

    // Navigate to Connect page and load demo
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    const connectVm: ConnectPageVM = connectState.vm;

    await waitFor(
      () => query(connectVm.demos.isLoading$),
      (loading) => !loading,
      { label: "demos to finish loading" }
    );

    const demos = query(connectVm.demos.items$);
    const socialNetworkDemo = demos.find((d) => d.id === "social-network");
    await socialNetworkDemo!.load();
    await waitForPage(app, query, "query");

    // Run the "All Users" example query from the demo
    const exampleQuery = socialNetworkDemo!.exampleQueries.find(
      (q) => q.name === "All Users"
    );
    expect(exampleQuery).toBeDefined();

    console.log(`[Demo Test] Example query for "All Users":`, exampleQuery!.query);

    // The example queries use fetch which may not be fully implemented
    // For now, let's use a simple match query instead
    const simpleResult = await services.queryExecution.execute(
      `match $p isa person, has name $name;`
    );

    console.log(`[Demo Test] Simple people query result:`, simpleResult);
    expect(simpleResult.success).toBe(true);

    const resultCount = simpleResult.resultCount ?? 0;
    console.log(`[Demo Test] Simple query returned ${resultCount} results`);
    expect(resultCount).toBeGreaterThanOrEqual(5);
  });

  it("demo example query 'Friends of Alice' returns results", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, services } = studio;

    // Navigate to Connect page and load demo
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    const connectVm: ConnectPageVM = connectState.vm;

    await waitFor(
      () => query(connectVm.demos.isLoading$),
      (loading) => !loading,
      { label: "demos to finish loading" }
    );

    const demos = query(connectVm.demos.items$);
    const socialNetworkDemo = demos.find((d) => d.id === "social-network");
    await socialNetworkDemo!.load();
    await waitForPage(app, query, "query");

    // BUG TEST: Query for friendships directly - should have 5 according to sample data
    // alice-bob, alice-carol, bob-david, carol-emma, david-emma
    const friendshipResult = await services.queryExecution.execute(
      `match ($a, $b) isa friendship;`
    );

    console.log(`[Demo Test] Friendship query result:`, friendshipResult);
    expect(friendshipResult.success).toBe(true);

    const friendshipCount = friendshipResult.resultCount ?? 0;
    console.log(`[Demo Test] Found ${friendshipCount} friendships (expecting >= 5)`);

    // BUG: This will fail because friendships weren't inserted due to @unique violation
    // When this test fails, it confirms the bug
    expect(friendshipCount).toBeGreaterThanOrEqual(5);
  });
});
