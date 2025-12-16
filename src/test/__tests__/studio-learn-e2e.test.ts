/**
 * TypeDB Studio Learn Flow E2E Test
 *
 * Tests the full application flow from app root through VM methods only:
 * 1. Bootstrap the complete TypeDB Studio app
 * 2. Navigate to Connect page via top bar
 * 3. Create a local WASM server via VM
 * 4. Connect to it via VM
 * 5. Navigate to Learn page
 * 6. Open a curriculum section
 * 7. Run an example through the REPL/TypeDB stack
 *
 * This test validates that:
 * - The full VM hierarchy works end-to-end
 * - Navigation works through VM methods only
 * - Local server creation and connection work
 * - The contentBlocks refactor correctly wires examples to TypeDB execution
 *
 * **Important:** This test uses NO direct store.commit() calls.
 * All interaction is through VM methods, as a real user would experience.
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
import type { LearnPageVM } from "../../vm/pages/learn/learn-page.vm";
import type { DocumentSectionContentBlockVM } from "../../vm/learn/document-viewer.vm";

describe("TypeDB Studio Learn Flow (VM-level E2E)", () => {
  let studio: TestStudio | null = null;

  afterEach(async () => {
    if (studio) {
      await studio.cleanup();
      studio = null;
    }
  });

  it("creates a local server, connects, opens learn, and runs an example", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, navigate } = studio;

    // -------------------------------------------------------------------------
    // 1. Initial state: home page
    // -------------------------------------------------------------------------
    const initialPage = query(app.currentPage$);
    expect(initialPage.page).toBe("home");

    // -------------------------------------------------------------------------
    // 2. Navigate to Connect page via top bar navigation
    // -------------------------------------------------------------------------
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    expect(connectState.page).toBe("connect");

    const connectVm: ConnectPageVM = connectState.vm;

    // -------------------------------------------------------------------------
    // 3. Create a new local WASM server via VM
    // -------------------------------------------------------------------------
    const initialServerCount = query(connectVm.localServers.items$).length;

    // createNew() returns { key } so we can find the new server
    const { key: serverKey } = await connectVm.localServers.createNew();
    expect(serverKey).toBeTruthy();

    // Wait for the server to appear in the list
    const newServer = await waitForItem(
      query,
      connectVm.localServers.items$,
      serverKey
    );
    expect(newServer.name).toContain("Local Server");

    // Verify server count increased
    const newServerCount = query(connectVm.localServers.items$).length;
    expect(newServerCount).toBe(initialServerCount + 1);

    console.log(`[E2E] Created local server: ${newServer.name} (key=${serverKey})`);

    // -------------------------------------------------------------------------
    // 4. Connect to the server via VM
    // -------------------------------------------------------------------------
    await newServer.connect();

    // Verify we're now on the query page (connect navigates there)
    const queryState = await waitForPage(app, query, "query");
    expect(queryState.page).toBe("query");

    // Verify the server is now active
    const isActive = query(newServer.isActive$);
    expect(isActive).toBe(true);

    console.log(`[E2E] Connected to server, now on query page`);

    // -------------------------------------------------------------------------
    // 5. Navigate to Learn page via top bar
    // -------------------------------------------------------------------------
    // First, let's check if Learn is available in navigation
    const navItems = query(app.topBar.navigation.items$);
    const learnNavItem = navItems.find((item) => item.label === "Learn");

    if (!learnNavItem) {
      console.log(`[E2E] Learn page not in navigation, available items: ${navItems.map(i => i.label).join(", ")}`);
      // Skip learn-specific tests if Learn isn't available in this build
      return;
    }

    learnNavItem.click();
    const learnState = await waitForPage(app, query, "learn");
    expect(learnState.page).toBe("learn");

    const learnVm: LearnPageVM = learnState.vm;

    console.log(`[E2E] Navigated to Learn page`);

    // -------------------------------------------------------------------------
    // 6. Open a curriculum section via the document viewer
    // -------------------------------------------------------------------------
    // The viewer should initially have no section (or a default one)
    const viewer = learnVm.viewer;

    // Try to open a known section - we'll use a simple approach:
    // Look for any section in the sidebar and click it
    const sidebarFolders = query(learnVm.sidebar.learnSection.folders$);

    if (sidebarFolders.length === 0) {
      console.log(`[E2E] No curriculum folders found, skipping section test`);
      return;
    }

    // Get the first folder and expand it if needed
    const firstFolder = sidebarFolders[0];
    if (!query(firstFolder.expanded$)) {
      firstFolder.toggleExpanded();
    }

    // Get sections from the folder
    const folderSections = query(firstFolder.sections$);

    if (folderSections.length === 0) {
      console.log(`[E2E] No sections in first folder, skipping`);
      return;
    }

    // Select the first section to open it
    const firstSection = folderSections[0];
    console.log(`[E2E] Selecting section: ${firstSection.title} (key=${firstSection.key})`);
    firstSection.select();

    // Wait for the section to load in the viewer
    await waitFor(
      () => query(viewer.currentSection$),
      (section) => section !== null,
      { label: "section loaded in viewer", timeoutMs: 5000 }
    );

    const section = query(viewer.currentSection$)!;
    console.log(`[E2E] Opened section: ${section.title} (id=${section.id})`);

    // -------------------------------------------------------------------------
    // 7. Verify contentBlocks are present (the refactored pattern)
    // -------------------------------------------------------------------------
    expect(section.contentBlocks.length).toBeGreaterThan(0);

    const exampleBlocks = section.contentBlocks.filter(
      (b): b is Extract<DocumentSectionContentBlockVM, { kind: "example" }> =>
        b.kind === "example" && b.example.isInteractive
    );

    if (exampleBlocks.length === 0) {
      console.log(`[E2E] No interactive examples in this section, skipping execution test`);
      console.log(`[E2E] contentBlocks: ${section.contentBlocks.map(b => b.kind).join(", ")}`);
      return;
    }

    const exampleVM = exampleBlocks[0].example;
    console.log(`[E2E] Found example: ${exampleVM.id}`);
    console.log(`[E2E] Query: ${exampleVM.query.slice(0, 60)}...`);

    // -------------------------------------------------------------------------
    // 8. Verify initial execution state
    // -------------------------------------------------------------------------
    const initialState = query(exampleVM.executionState$);
    expect(initialState.type).toBe("idle");
    expect(query(exampleVM.wasExecuted$)).toBe(false);

    // -------------------------------------------------------------------------
    // 9. Run the example via VM (goes through REPL bridge → TypeDB WASM)
    // -------------------------------------------------------------------------
    console.log(`[E2E] Running example...`);
    await exampleVM.run();

    // -------------------------------------------------------------------------
    // 10. Verify execution results
    // -------------------------------------------------------------------------
    const result = query(exampleVM.currentResult$);
    console.log(`[E2E] Result: success=${result?.success}, resultCount=${result?.resultCount}`);

    // The example may succeed or fail depending on whether schema exists
    // For now, we just verify the execution completed
    expect(result).not.toBeNull();

    const finalState = query(exampleVM.executionState$);
    expect(["success", "error"]).toContain(finalState.type);

    // Example should now be marked as executed
    expect(query(exampleVM.wasExecuted$)).toBe(true);

    // -------------------------------------------------------------------------
    // 11. Verify REPL bridge side effects
    // -------------------------------------------------------------------------
    // Navigation should have been called to go to query page
    expect(navigate).toHaveBeenCalledWith("/query");

    // Query text should be set in the editor
    // (We can't easily check uiState$ without store access, but navigate proves the flow works)

    console.log(`[E2E] Full flow completed successfully!`);
  });

  it("navigates between pages using only VM methods", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, navigate } = studio;

    // Start at home
    expect(query(app.currentPage$).page).toBe("home");

    // Navigate to Connect
    clickNavItem(app, query, "Connect");
    await waitForPage(app, query, "connect");
    expect(query(app.currentPage$).page).toBe("connect");

    // Navigate back to Home
    clickNavItem(app, query, "Home");
    await waitForPage(app, query, "home");
    expect(query(app.currentPage$).page).toBe("home");

    // Verify navigate was called for each navigation
    expect(navigate).toHaveBeenCalled();
  });

  it("creates multiple local servers and verifies list updates", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query } = studio;

    // Navigate to Connect
    clickNavItem(app, query, "Connect");
    const connectState = await waitForPage(app, query, "connect");
    const connectVm: ConnectPageVM = connectState.vm;

    // Create first server
    const { key: key1 } = await connectVm.localServers.createNew();
    await waitForItem(query, connectVm.localServers.items$, key1);

    // Create second server
    const { key: key2 } = await connectVm.localServers.createNew();
    await waitForItem(query, connectVm.localServers.items$, key2);

    // Verify both exist
    const servers = query(connectVm.localServers.items$);
    expect(servers.some((s) => s.key === key1)).toBe(true);
    expect(servers.some((s) => s.key === key2)).toBe(true);

    // Keys should be different
    expect(key1).not.toBe(key2);
  });
});
