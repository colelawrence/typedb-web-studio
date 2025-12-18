/**
 * Learn Page Lesson Selection Bug Test
 *
 * Reproduces the bug where lesson selection doesn't work on the Learn page
 * after navigating from the Query page.
 *
 * Bug symptoms:
 * - Sidebar `isActive$` updates when clicking lessons
 * - Document viewer content does NOT update (stays on original lesson)
 * - Only occurs when coming from Query page; fresh load works
 */

import { describe, it, expect, afterEach } from "vitest";
import { bootstrapStudioForTest, type TestStudio } from "../bootstrap-studio";
import {
  setupConnectedServer,
  navigateToLearn,
  openCurriculumSection,
  waitFor,
} from "../vm-test-helpers";
import { lessonContext$ } from "../../livestore/queries";

describe("Learn page lesson selection after Query page navigation", () => {
  let studio: TestStudio | null = null;

  afterEach(async () => {
    if (studio) {
      await studio.cleanup();
      studio = null;
    }
  });

  it("allows changing lessons after navigating from Query page", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query } = studio;

    // Setup: Connect to server (this navigates to Query page after connection)
    await setupConnectedServer(app, query);

    // Navigate to Learn page
    const learnVm = await navigateToLearn(app, query);

    // Open first lesson in Foundations folder
    const section1 = await openCurriculumSection(learnVm, query, {
      folderIndex: 0,
      sectionIndex: 0,
    });

    // Verify first lesson is shown in viewer
    const firstSection = query(learnVm.viewer.currentSection$);
    expect(firstSection).not.toBeNull();
    expect(firstSection?.id).toBe(section1.id);
    console.log(`[Test] First lesson opened: ${firstSection?.title} (${firstSection?.id})`);

    // Get the second folder (Tour) and expand it
    const folders = query(learnVm.sidebar.learnSection.folders$);
    expect(folders.length).toBeGreaterThan(1);

    const tourFolder = folders[1]; // Tour folder
    console.log(`[Test] Expanding folder: ${tourFolder.label}`);

    if (!query(tourFolder.expanded$)) {
      tourFolder.toggleExpanded();
    }

    // Get first lesson from Tour folder
    const tourSections = query(tourFolder.sections$);
    expect(tourSections.length).toBeGreaterThan(0);

    const section2 = tourSections[0];
    console.log(`[Test] Clicking lesson: ${section2.title} (${section2.key})`);

    // Record current viewer state before click
    const viewerBefore = query(learnVm.viewer.currentSection$);
    console.log(`[Test] Viewer before click: ${viewerBefore?.title} (${viewerBefore?.id})`);

    // Click the second lesson
    section2.select();

    // Wait for viewer to update to the new lesson
    const viewerAfter = await waitFor(
      () => query(learnVm.viewer.currentSection$),
      (section) => section?.id === section2.key,
      { label: "viewer updated to new lesson", timeoutMs: 3000 }
    );

    console.log(`[Test] Viewer after click: ${viewerAfter?.title} (${viewerAfter?.id})`);

    // Assert viewer shows the new lesson
    expect(viewerAfter?.id).toBe(section2.key);

    // Assert sidebar shows correct active state
    expect(query(section2.isActive$)).toBe(true);

    // Get the first section item to verify it's no longer active
    const foundationFolders = query(learnVm.sidebar.learnSection.folders$);
    const firstFolder = foundationFolders[0];
    if (!query(firstFolder.expanded$)) {
      firstFolder.toggleExpanded();
    }
    const firstSections = query(firstFolder.sections$);
    const section1Item = firstSections[0];
    expect(query(section1Item.isActive$)).toBe(false);
  });

  it("allows changing lessons within the same folder", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query } = studio;

    // Setup: Connect to server
    await setupConnectedServer(app, query);

    // Navigate to Learn page
    const learnVm = await navigateToLearn(app, query);

    // Find a folder with multiple sections (Tour folder has 5 sections)
    const folders = query(learnVm.sidebar.learnSection.folders$);
    let targetFolder = null;

    for (const folder of folders) {
      if (!query(folder.expanded$)) {
        folder.toggleExpanded();
      }
      const sections = query(folder.sections$);
      if (sections.length > 1) {
        targetFolder = folder;
        break;
      }
    }

    expect(targetFolder).not.toBeNull();

    const sections = query(targetFolder!.sections$);
    console.log(`[Test] Found folder "${targetFolder!.label}" with ${sections.length} sections`);

    // Click first lesson
    const lesson1 = sections[0];
    lesson1.select();

    // Wait for viewer
    await waitFor(
      () => query(learnVm.viewer.currentSection$),
      (section) => section?.id === lesson1.key,
      { label: "first lesson loaded", timeoutMs: 3000 }
    );

    expect(query(learnVm.viewer.currentSection$)?.id).toBe(lesson1.key);
    expect(query(lesson1.isActive$)).toBe(true);
    console.log(`[Test] First lesson loaded: ${lesson1.title}`);

    // Now click second lesson
    const lesson2 = sections[1];
    console.log(`[Test] Switching to lesson: ${lesson2.title}`);
    lesson2.select();

    // Wait for viewer to update
    await waitFor(
      () => query(learnVm.viewer.currentSection$),
      (section) => section?.id === lesson2.key,
      { label: "second lesson loaded", timeoutMs: 3000 }
    );

    expect(query(learnVm.viewer.currentSection$)?.id).toBe(lesson2.key);
    expect(query(lesson2.isActive$)).toBe(true);
    expect(query(lesson1.isActive$)).toBe(false);
    console.log(`[Test] Second lesson loaded: ${lesson2.title}`);
  });
});

/**
 * Tests for the stale lesson context bug.
 *
 * Bug: After loading a lesson context and then disconnecting, the
 * lessonContext in LiveStore was not being cleared. This caused the UI
 * to think a context was loaded when the underlying TypeDB WASM database
 * didn't exist (because WASM runs in-memory and loses data on disconnect).
 *
 * Fix: handleServiceDisconnected now clears lessonContext alongside
 * connectionSession and sessionDatabases.
 */
describe("Lesson context cleared on disconnect (stale context bug)", () => {
  let studio: TestStudio | null = null;

  afterEach(async () => {
    if (studio) {
      await studio.cleanup();
      studio = null;
    }
  });

  it("clears lessonContext when disconnecting from server", async () => {
    studio = await bootstrapStudioForTest();
    const { app, query, services } = studio;

    // Setup: Connect to server
    await setupConnectedServer(app, query);

    // Verify we're connected
    const connectionStatus = query(app.topBar.connectionStatus.state$);
    expect(connectionStatus).toBe("connected");

    // Check initial state - should be null since we haven't loaded a context
    type LessonContextState = {
      currentContext: string | null;
      isLoading: boolean;
      lastError: string | null;
      lastLoadedAt: number | null;
    };
    const initialContext = query(lessonContext$) as LessonContextState;
    expect(initialContext.currentContext).toBeNull();

    // Disconnect from server
    await services.connection.disconnect();

    // Wait for disconnected state
    await waitFor(
      () => query(app.topBar.connectionStatus.state$),
      (status) => status === "disconnected",
      { label: "disconnected", timeoutMs: 3000 }
    );

    // Verify lessonContext is cleared on disconnect
    // This is the key fix - without it, stale context could cause
    // "database not found" errors when running ExampleBlocks
    const afterDisconnect = query(lessonContext$) as LessonContextState;
    expect(afterDisconnect.currentContext).toBeNull();
    expect(afterDisconnect.isLoading).toBe(false);
    expect(afterDisconnect.lastError).toBeNull();
  });
});
