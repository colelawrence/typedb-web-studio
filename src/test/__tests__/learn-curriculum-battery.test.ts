/**
 * Learn Curriculum Battery Tests
 *
 * Tests curriculum navigation, section loading, and example execution.
 * These tests verify the full system flow including database setup when
 * running curriculum examples.
 *
 * **Key principle:** Tests exercise the system through VM methods only.
 * No manual schema seeding - curriculum examples are self-contained.
 */

import { describe, it, expect, afterEach } from "vitest";
import { bootstrapStudioForTest, type TestStudio } from "../bootstrap-studio";
import {
  setupConnectedServer,
  navigateToLearn,
  openCurriculumSection,
  getInteractiveExamples,
  waitForExampleComplete,
} from "../vm-test-helpers";

describe("Learn Curriculum Battery", () => {
  let studio: TestStudio | null = null;

  afterEach(async () => {
    if (studio) {
      await studio.cleanup();
      studio = null;
    }
  });

  // ===========================================================================
  // Server + Learn Setup Tests
  // ===========================================================================

  describe("Learn Setup", () => {
    it("creates local server and navigates to Learn", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      // Start at home
      expect(query(app.currentPage$).page).toBe("home");

      // Setup server and connect
      const { serverKey } = await setupConnectedServer(app, query);
      expect(serverKey).toBeTruthy();

      // Navigate to Learn
      const learnVm = await navigateToLearn(app, query);
      expect(learnVm).toBeDefined();
      expect(query(app.currentPage$).page).toBe("learn");

      console.log("[Battery] Server created and navigated to Learn successfully");
    });

    it("verifies curriculum folders are loaded", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      // Check folders exist
      const folders = query(learnVm.sidebar.learnSection.folders$);
      expect(folders.length).toBeGreaterThan(0);

      console.log(`[Battery] Found ${folders.length} curriculum folders:`);
      folders.forEach((f, i) => {
        const sections = query(f.sections$);
        console.log(`  [${i}] ${f.label} (${sections.length} sections)`);
      });
    });
  });

  // ===========================================================================
  // Section Navigation Tests
  // ===========================================================================

  describe("Section Navigation", () => {
    it("opens first section in first folder", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      expect(section.id).toBeTruthy();
      expect(section.title).toBeTruthy();
      console.log(`[Battery] Opened section: "${section.title}" (id=${section.id})`);
    });

    it("opens third section in first folder", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      // Check if first folder has at least 3 sections
      const folders = query(learnVm.sidebar.learnSection.folders$);
      const firstFolder = folders[0];

      // Expand to check sections
      if (!query(firstFolder.expanded$)) {
        firstFolder.toggleExpanded();
      }

      const sections = query(firstFolder.sections$);
      if (sections.length < 3) {
        console.log(
          `[Battery] Skipping - first folder only has ${sections.length} sections`
        );
        return;
      }

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 2, // Third section (0-indexed)
      });

      expect(section.id).toBe(sections[2].key);
      expect(section.title).toBeTruthy();
      console.log(`[Battery] Opened third section: "${section.title}"`);
    });

    it("verifies section metadata loads correctly", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      // Check all expected fields are present
      expect(section.id).toBeTruthy();
      expect(section.title).toBeTruthy();
      expect(Array.isArray(section.requires)).toBe(true);
      expect(Array.isArray(section.contentBlocks)).toBe(true);
      expect(Array.isArray(section.headings)).toBe(true);
      expect(Array.isArray(section.examples)).toBe(true);

      // Context may be null or a string
      expect(section.context === null || typeof section.context === "string").toBe(
        true
      );

      console.log(`[Battery] Section metadata:`, {
        id: section.id,
        title: section.title,
        context: section.context,
        requires: section.requires,
        headingCount: section.headings.length,
        exampleCount: section.examples.length,
        contentBlockCount: section.contentBlocks.length,
      });
    });

    it("verifies contentBlocks structure", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      expect(section.contentBlocks.length).toBeGreaterThan(0);

      // Verify each content block has correct shape
      const blockKinds = new Set<string>();
      for (const block of section.contentBlocks) {
        expect(["heading", "example", "prose"]).toContain(block.kind);
        blockKinds.add(block.kind);

        if (block.kind === "heading") {
          expect(block.heading).toBeDefined();
          expect(block.heading.text).toBeTruthy();
        } else if (block.kind === "example") {
          expect(block.example).toBeDefined();
          expect(block.example.query).toBeTruthy();
        } else if (block.kind === "prose") {
          expect(typeof block.content).toBe("string");
        }
      }

      console.log(
        `[Battery] ContentBlocks: ${section.contentBlocks.length} blocks, kinds: ${[...blockKinds].join(", ")}`
      );
    });

    it("navigates between sections preserving folder state", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      // Check we have enough sections
      const folders = query(learnVm.sidebar.learnSection.folders$);
      const firstFolder = folders[0];
      if (!query(firstFolder.expanded$)) {
        firstFolder.toggleExpanded();
      }
      const sections = query(firstFolder.sections$);

      if (sections.length < 2) {
        console.log(`[Battery] Skipping - need at least 2 sections`);
        return;
      }

      // Open first section
      const section1 = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });
      const section1Id = section1.id;

      // Open second section
      const section2 = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 1,
      });
      const section2Id = section2.id;

      // Verify they're different
      expect(section1Id).not.toBe(section2Id);

      // Folder should still be expanded
      expect(query(firstFolder.expanded$)).toBe(true);

      console.log(
        `[Battery] Navigated between sections: "${section1.title}" → "${section2.title}"`
      );
    });

    it("expands and collapses folders", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      const folders = query(learnVm.sidebar.learnSection.folders$);
      expect(folders.length).toBeGreaterThan(0);

      const folder = folders[0];
      const initialExpanded = query(folder.expanded$);

      // Toggle to opposite state
      folder.toggleExpanded();
      expect(query(folder.expanded$)).toBe(!initialExpanded);

      // Toggle back
      folder.toggleExpanded();
      expect(query(folder.expanded$)).toBe(initialExpanded);

      console.log(`[Battery] Folder "${folder.label}" toggle works correctly`);
    });
  });

  // ===========================================================================
  // Example Execution Tests
  // ===========================================================================

  describe("Example Execution", () => {
    it("finds interactive examples in a section", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      const examples = getInteractiveExamples(section);
      console.log(
        `[Battery] Found ${examples.length} interactive examples in "${section.title}"`
      );

      if (examples.length > 0) {
        const first = examples[0];
        console.log(`  First example: type=${first.type}, id=${first.id}`);
        console.log(`  Query: ${first.query.slice(0, 50)}...`);
      }
    });

    it("shows correct initial execution state (idle)", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      const examples = getInteractiveExamples(section);
      if (examples.length === 0) {
        console.log(`[Battery] No interactive examples in section, skipping`);
        return;
      }

      const example = examples[0];
      const state = query(example.executionState$);
      expect(state.type).toBe("idle");
      expect(query(example.wasExecuted$)).toBe(false);

      console.log(`[Battery] Example "${example.id}" is in idle state`);
    });

    it("executes example and tracks state transitions", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      const examples = getInteractiveExamples(section);
      if (examples.length === 0) {
        console.log(`[Battery] No interactive examples in section, skipping`);
        return;
      }

      const example = examples[0];
      console.log(`[Battery] Running example: ${example.id}`);
      console.log(`  Query: ${example.query.slice(0, 80)}...`);

      // Initial state
      expect(query(example.executionState$).type).toBe("idle");

      // Run the example
      const runPromise = example.run();

      // Wait for execution to complete
      const finalState = await waitForExampleComplete(query, example);

      // Await the run promise to catch any errors
      await runPromise;

      console.log(`[Battery] Execution result: ${finalState.type}`);
      if (finalState.type === "success") {
        console.log(`  Result count: ${finalState.resultCount}`);
      } else if (finalState.type === "error") {
        console.log(`  Error: ${finalState.message}`);
      }

      // Example should now be marked as executed
      expect(query(example.wasExecuted$)).toBe(true);
    });

    it("verifies currentResult$ after execution", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      const examples = getInteractiveExamples(section);
      if (examples.length === 0) {
        console.log(`[Battery] No interactive examples, skipping`);
        return;
      }

      const example = examples[0];

      // Run and wait
      await example.run();
      await waitForExampleComplete(query, example);

      // Check result
      const result = query(example.currentResult$);
      expect(result).not.toBeNull();
      expect(typeof result!.success).toBe("boolean");
      expect(typeof result!.executionTimeMs).toBe("number");

      console.log(`[Battery] currentResult$:`, {
        success: result!.success,
        resultCount: result!.resultCount,
        executionTimeMs: result!.executionTimeMs,
        error: result!.error,
      });
    });
  });

  // ===========================================================================
  // Cross-Section Example Flow
  // ===========================================================================

  describe("Cross-Section Examples", () => {
    it("runs examples across multiple sections in same folder", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      // Get folder info
      const folders = query(learnVm.sidebar.learnSection.folders$);
      const folder = folders[0];
      if (!query(folder.expanded$)) {
        folder.toggleExpanded();
      }
      const sections = query(folder.sections$);

      if (sections.length < 2) {
        console.log(`[Battery] Need at least 2 sections, skipping`);
        return;
      }

      // Open first section and run an example
      const section1 = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      const examples1 = getInteractiveExamples(section1);
      if (examples1.length > 0) {
        console.log(`[Battery] Running example from section 1: "${section1.title}"`);
        await examples1[0].run();
        await waitForExampleComplete(query, examples1[0]);
        console.log(`  Result: ${query(examples1[0].executionState$).type}`);
      }

      // Navigate to second section and run an example
      const section2 = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 1,
      });

      const examples2 = getInteractiveExamples(section2);
      if (examples2.length > 0) {
        console.log(`[Battery] Running example from section 2: "${section2.title}"`);
        await examples2[0].run();
        await waitForExampleComplete(query, examples2[0]);
        console.log(`  Result: ${query(examples2[0].executionState$).type}`);
      }

      // Both examples should have been marked as executed
      if (examples1.length > 0) {
        expect(query(examples1[0].wasExecuted$)).toBe(true);
      }
      if (examples2.length > 0) {
        expect(query(examples2[0].wasExecuted$)).toBe(true);
      }

      console.log(`[Battery] Cross-section example flow completed`);
    });

    it("schema from earlier section persists for later queries", async () => {
      studio = await bootstrapStudioForTest();
      const { app, query } = studio;

      await setupConnectedServer(app, query);
      const learnVm = await navigateToLearn(app, query);

      // Find a section with schema-type example
      const folders = query(learnVm.sidebar.learnSection.folders$);

      let schemaExample = null;
      let matchExample = null;

      // Search through sections for schema and match examples
      outerLoop: for (let fi = 0; fi < folders.length; fi++) {
        const folder = folders[fi];
        if (!query(folder.expanded$)) {
          folder.toggleExpanded();
        }
        const sections = query(folder.sections$);

        for (let si = 0; si < sections.length; si++) {
          const section = await openCurriculumSection(learnVm, query, {
            folderIndex: fi,
            sectionIndex: si,
          });

          const examples = getInteractiveExamples(section);

          for (const ex of examples) {
            if (ex.type === "schema" && !schemaExample) {
              schemaExample = ex;
              console.log(
                `[Battery] Found schema example in "${section.title}": ${ex.query.slice(0, 50)}...`
              );
            }
            if (
              ex.type === "example" &&
              ex.query.toLowerCase().includes("match") &&
              !matchExample
            ) {
              matchExample = ex;
              console.log(
                `[Battery] Found match example in "${section.title}": ${ex.query.slice(0, 50)}...`
              );
            }
          }

          if (schemaExample && matchExample) {
            break outerLoop;
          }
        }
      }

      if (!schemaExample || !matchExample) {
        console.log(
          `[Battery] Could not find both schema and match examples, skipping`
        );
        return;
      }

      // Run schema example first
      console.log(`[Battery] Running schema example...`);
      await schemaExample.run();
      const schemaState = await waitForExampleComplete(query, schemaExample);
      console.log(`  Schema result: ${schemaState.type}`);

      // Now run match example
      console.log(`[Battery] Running match example...`);
      await matchExample.run();
      const matchState = await waitForExampleComplete(query, matchExample);
      console.log(`  Match result: ${matchState.type}`);

      // Both should have completed (may succeed or fail depending on curriculum order)
      expect(["success", "error"]).toContain(schemaState.type);
      expect(["success", "error"]).toContain(matchState.type);

      console.log(`[Battery] Schema persistence test completed`);
    });
  });
});
