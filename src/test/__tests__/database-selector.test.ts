/**
 * Database Selector Tests
 *
 * Tests for the database selector dropdown in the top bar.
 * Verifies:
 * - Database list populates after connecting to WASM
 * - Create database dialog opens when clicking "Create New"
 * - New databases appear in the list after creation
 */

import { describe, it, expect, afterEach } from "vitest";
import { bootstrapStudioForTest, type TestStudio } from "../bootstrap-studio";
import { setupConnectedServer, waitFor } from "../vm-test-helpers";

describe("Database Selector", () => {
  let studio: TestStudio | null = null;

  afterEach(async () => {
    if (studio) {
      await studio.cleanup();
      studio = null;
    }
  });

  describe("database list", () => {
    it("shows 'playground' database after connecting to local server", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      // Connect to a local server (creates "playground" database)
      await setupConnectedServer(app, query);

      // Get the database selector VM
      const databaseSelector = app.topBar.databaseSelector;

      // Verify selector is visible after connection
      const visible = query(databaseSelector.visible$);
      expect(visible).toBe(true);

      // Open the dropdown to trigger refresh
      databaseSelector.toggle();

      // Wait for databases to load
      await waitFor(
        () => query(databaseSelector.databases$),
        (databases) => databases.length > 0,
        { label: "databases loaded", timeoutMs: 5000 }
      );

      // Verify "playground" is in the list
      const databases = query(databaseSelector.databases$);
      expect(databases.map((db) => db.key)).toContain("playground");
    });

    it("shows active database in display text", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      // Connect to local server
      await setupConnectedServer(app, query);

      const databaseSelector = app.topBar.databaseSelector;

      // Display text should show "playground" (the default database)
      const displayText = query(databaseSelector.displayText$);
      expect(displayText).toBe("playground");

      // hasSelection should be true
      const hasSelection = query(databaseSelector.hasSelection$);
      expect(hasSelection).toBe(true);
    });
  });

  describe("create database dialog", () => {
    it("opens create database dialog when createNew() is called", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      // Connect to local server first
      await setupConnectedServer(app, query);

      const databaseSelector = app.topBar.databaseSelector;

      // Verify dialog is not open initially
      const initialDialog = query(app.dialogs.active$);
      expect(initialDialog).toBeNull();

      // Call createNew to open the dialog
      databaseSelector.createNew();

      // Dialog should now be active with type "createDatabase"
      const activeDialog = query(app.dialogs.active$);
      expect(activeDialog).not.toBeNull();
      expect(activeDialog?.type).toBe("createDatabase");
    });

    it("creates a new database and adds it to the list", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      // Connect to local server
      await setupConnectedServer(app, query);

      const databaseSelector = app.topBar.databaseSelector;

      // Open dropdown to load initial list
      databaseSelector.toggle();
      await waitFor(
        () => query(databaseSelector.databases$),
        (databases) => databases.length > 0,
        { label: "initial databases loaded", timeoutMs: 5000 }
      );

      // Close dropdown
      databaseSelector.close();

      // Open create dialog
      databaseSelector.createNew();

      // Get the dialog VM
      const dialog = query(app.dialogs.active$);
      expect(dialog?.type).toBe("createDatabase");

      if (dialog?.type !== "createDatabase") {
        throw new Error("Expected createDatabase dialog");
      }

      const createDialogVM = dialog.vm;

      // Enter a database name
      createDialogVM.nameInput.update("test_database");

      // Verify create button is enabled
      const createDisabled = query(createDialogVM.createDisabled$);
      expect(createDisabled).toBeNull();

      // Create the database
      createDialogVM.create();

      // Wait for dialog to close
      await waitFor(
        () => query(app.dialogs.active$),
        (active) => active === null,
        { label: "dialog closed", timeoutMs: 5000 }
      );

      // Open dropdown again
      databaseSelector.toggle();

      // Wait for the new database to appear in list
      await waitFor(
        () => query(databaseSelector.databases$),
        (databases) => databases.some((db) => db.key === "test_database"),
        { label: "new database in list", timeoutMs: 5000 }
      );

      // Verify both databases are present
      const databases = query(databaseSelector.databases$);
      expect(databases.map((db) => db.key)).toContain("playground");
      expect(databases.map((db) => db.key)).toContain("test_database");
    });
  });

  describe("database selection", () => {
    it("switches active database when selecting from list", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query, services } = studio;

      // Connect to local server
      await setupConnectedServer(app, query);

      // Create a second database directly via service
      const service = services.connection.getStatus() === "connected"
        ? (await import("../../services")).getService()
        : null;

      if (service) {
        await service.createDatabase("second_db");
      }

      const databaseSelector = app.topBar.databaseSelector;

      // Open dropdown
      databaseSelector.toggle();

      // Wait for databases
      await waitFor(
        () => query(databaseSelector.databases$),
        (databases) => databases.length >= 2,
        { label: "both databases loaded", timeoutMs: 5000 }
      );

      // Find and select second_db
      const databases = query(databaseSelector.databases$);
      const secondDb = databases.find((db) => db.key === "second_db");
      expect(secondDb).toBeDefined();

      // Select it
      secondDb!.select();

      // Verify display text updated
      const displayText = query(databaseSelector.displayText$);
      expect(displayText).toBe("second_db");

      // Verify dropdown closed
      const isOpen = query(databaseSelector.isOpen$);
      expect(isOpen).toBe(false);
    });
  });
});
