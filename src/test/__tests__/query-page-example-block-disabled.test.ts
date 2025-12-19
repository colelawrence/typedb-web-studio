/**
 * Query Page Example Block State Test
 *
 * Tests that example blocks on the Query page correctly handle context requirements.
 *
 * Both Learn and Query pages share the same contextManager, so examples that
 * require context are NOT disabled - they show "needs-context" state (Load & Run).
 *
 * Scenario:
 * 1. User connects to a server (Query page is shown)
 * 2. Query page's docs viewer opens a section that requires "S1" context
 * 3. The context isn't loaded yet
 * 4. The example block shows "needs-context" state (can auto-load context)
 * 5. canRun$ = true (because contextManager can handle loading)
 * 6. runReadiness$ = "needs-context" (context not loaded but can be loaded)
 */

import { describe, it, expect, afterEach } from "vitest";
import { bootstrapStudioForTest, type TestStudio } from "../bootstrap-studio";
import { setupConnectedServer, waitForPage, waitFor } from "../vm-test-helpers";
import type { QueryPageVM } from "../../vm/pages/query/query-page.vm";

// Known section IDs from the curriculum
const SECTION_WITH_CONTEXT = "tour-entities"; // Requires S1 context
const SECTION_WITHOUT_CONTEXT = "tour-welcome"; // No context required

describe("Query page example block disabled state", () => {
  let studio: TestStudio | null = null;

  afterEach(async () => {
    if (studio) {
      await studio.cleanup();
      studio = null;
    }
  });

  it("example blocks requiring context are disabled on Query page", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query } = studio;

    // 1. Connect to server (this navigates to Query page)
    await setupConnectedServer(app, query);

    // 2. Verify we're on Query page
    const queryPageState = await waitForPage(app, query, "query");
    const queryVm: QueryPageVM = queryPageState.vm;

    // 3. Get the docs viewer (Query page's document viewer has NO contextManager)
    const docsViewer = queryVm.docsViewer;

    // 4. Open a section that requires context
    docsViewer.openSection(SECTION_WITH_CONTEXT);

    // Wait for section to load
    const currentSection = await waitFor(
      () => query(docsViewer.currentSection$),
      (section) => section?.id === SECTION_WITH_CONTEXT,
      { label: "section loaded", timeoutMs: 3000 }
    );

    expect(currentSection).not.toBeNull();
    expect(currentSection!.context).toBe("S1");
    console.log(`[Test] Section loaded: ${currentSection!.id}, context: ${currentSection!.context}`);

    // 5. Get the first example from the section
    const examples = currentSection!.examples;
    expect(examples.length).toBeGreaterThan(0);

    const exampleVM = examples[0];
    console.log(
      `[Test] Example: ${exampleVM.id}, query: ${exampleVM.query.slice(0, 50)}...`
    );

    // 6. THE KEY ASSERTIONS:
    // Query page shares contextManager with Learn page, so examples can auto-load context
    // When context is not loaded, runReadiness should be "needs-context" (not "blocked")

    const canRun = query(exampleVM.canRun$);
    const disabledReason = query(exampleVM.runDisabledReason$);

    console.log(`[Test] canRun$: ${canRun}`);
    console.log(`[Test] runDisabledReason$: ${disabledReason}`);

    // Test intermediate signals to isolate the issue
    console.log(`[Test] Testing intermediate signals...`);
    const isContextReady = query(exampleVM.isContextReady$);
    console.log(`[Test] isContextReady$: ${isContextReady}`);
    const isLessonReady = query(exampleVM.isLessonReady$);
    console.log(`[Test] isLessonReady$: ${isLessonReady}`);
    const canLoadContext = query(exampleVM.canLoadContext$);
    console.log(`[Test] canLoadContext$: ${canLoadContext}`);

    // Check runReadiness$ - this is what the UI uses to disable the button
    console.log(`[Test] About to query runReadiness$...`);
    const runReadiness = query(exampleVM.runReadiness$);
    console.log(`[Test] runReadiness$: ${runReadiness}`);

    // With contextManager available, examples CAN run (context will be auto-loaded)
    expect(canRun).toBe(true);

    // No disabled reason - contextManager handles context loading
    expect(disabledReason).toBeNull();

    // runReadiness should be "needs-context" since context isn't loaded yet
    // (UI shows "Load & Run" button instead of disabled button)
    expect(runReadiness).toBe("needs-context");

    // 7. Verify context is not loaded yet
    expect(isLessonReady).toBe(false);
    expect(canLoadContext).toBe(true);
  });

  it("example blocks without context requirement can run on Query page", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query } = studio;

    // 1. Connect to server
    await setupConnectedServer(app, query);

    // 2. Get Query page
    const queryPageState = await waitForPage(app, query, "query");
    const queryVm: QueryPageVM = queryPageState.vm;
    const docsViewer = queryVm.docsViewer;

    // 3. Open a section WITHOUT context requirement
    docsViewer.openSection(SECTION_WITHOUT_CONTEXT);

    const currentSection = await waitFor(
      () => query(docsViewer.currentSection$),
      (section) => section?.id === SECTION_WITHOUT_CONTEXT,
      { label: "section loaded", timeoutMs: 3000 }
    );

    expect(currentSection).not.toBeNull();
    expect(currentSection!.context).toBeNull();
    console.log(`[Test] Section loaded: ${currentSection!.id}, context: ${currentSection!.context}`);

    // 4. Get the first interactive example
    const examples = currentSection!.examples.filter((e) => e.isInteractive);
    if (examples.length === 0) {
      console.log("[Test] No interactive examples in this section, skipping");
      return;
    }

    const exampleVM = examples[0];
    console.log(`[Test] Example: ${exampleVM.id}`);

    // 5. This example should be runnable (no context required)
    const canRun = query(exampleVM.canRun$);
    const disabledReason = query(exampleVM.runDisabledReason$);

    console.log(`[Test] canRun$: ${canRun}`);
    console.log(`[Test] runDisabledReason$: ${disabledReason}`);

    // Should be able to run
    expect(canRun).toBe(true);
    expect(disabledReason).toBeNull();
  });
});

describe("Learn page example blocks with context manager", () => {
  let studio: TestStudio | null = null;

  afterEach(async () => {
    if (studio) {
      await studio.cleanup();
      studio = null;
    }
  });

  it("example blocks on Learn page CAN run (contextManager will auto-load)", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query } = studio;

    // 1. Connect to server
    await setupConnectedServer(app, query);

    // 2. Navigate to Learn page
    const navItems = query(app.topBar.navigation.items$);
    const learnNavItem = navItems.find((item) => item.label === "Learn");
    expect(learnNavItem).toBeDefined();

    learnNavItem!.click();
    const learnPageState = await waitForPage(app, query, "learn");
    const learnVm = learnPageState.vm;

    // 3. Open a section that requires context using the viewer directly
    learnVm.viewer.openSection(SECTION_WITH_CONTEXT);

    const currentSection = await waitFor(
      () => query(learnVm.viewer.currentSection$),
      (section) => section?.id === SECTION_WITH_CONTEXT,
      { label: "section loaded", timeoutMs: 3000 }
    );

    expect(currentSection).not.toBeNull();
    expect(currentSection!.context).toBe("S1");
    console.log(`[Test] Section loaded: ${currentSection!.id}, context: ${currentSection!.context}`);

    // 4. Get the first interactive example
    const examples = currentSection!.examples.filter((e) => e.isInteractive);
    expect(examples.length).toBeGreaterThan(0);

    const exampleVM = examples[0];
    console.log(`[Test] Example: ${exampleVM.id}`);

    // 5. On Learn page WITH contextManager, the example should have canRun$ = true
    // because the contextManager can auto-load the context when run() is called
    const canRun = query(exampleVM.canRun$);
    const disabledReason = query(exampleVM.runDisabledReason$);

    console.log(`[Test] canRun$: ${canRun}`);
    console.log(`[Test] runDisabledReason$: ${disabledReason}`);

    // Learn page has contextManager, so it CAN auto-load context
    // Therefore canRun should be true (context will be loaded on run)
    expect(canRun).toBe(true);
    expect(disabledReason).toBeNull();
  });
});
