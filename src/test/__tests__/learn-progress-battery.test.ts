/**
 * Learn Progress Battery Tests
 *
 * Tests reading progress tracking, section completion, and sidebar sync.
 * Verifies that marking headings as read/unread works correctly and
 * that progress is reflected in the sidebar.
 */

import { describe, it, expect, afterEach } from "vitest";
import { bootstrapStudioForTest, type TestStudio } from "../bootstrap-studio";
import {
  setupConnectedServer,
  navigateToLearn,
  openCurriculumSection,
  TestQueryFn,
} from "../vm-test-helpers";
import type { LearnPageVM } from "../../vm/pages/learn/learn-page.vm";

describe("Learn Progress Battery", () => {
  let studio: TestStudio | null = null;

  afterEach(async () => {
    if (studio) {
      await studio.cleanup();
      studio = null;
    }
  });

  /**
   * Helper to set up a connected server and navigate to Learn.
   */
  async function setupLearnPage(
    studioInstance: TestStudio
  ): Promise<{ learnVm: LearnPageVM; query: TestQueryFn }> {
    const { app, query } = studioInstance;
    await setupConnectedServer(app, query);
    const learnVm = await navigateToLearn(app, query);
    return { learnVm, query };
  }

  // ===========================================================================
  // Heading Progress Tests
  // ===========================================================================

  describe("Heading Progress", () => {
    it("marks heading as read", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Battery] Section has no headings, skipping`);
        return;
      }

      const heading = section.headings[0];
      console.log(`[Battery] Testing heading: "${heading.text}"`);

      // Initial state should be unread
      const initialRead = query(heading.isRead$);
      console.log(`  Initial isRead$: ${initialRead}`);

      // Mark as read
      heading.markRead();
      expect(query(heading.isRead$)).toBe(true);
      console.log(`  After markRead(): isRead$ = ${query(heading.isRead$)}`);
    });

    it("marks heading as unread", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Battery] Section has no headings, skipping`);
        return;
      }

      const heading = section.headings[0];

      // First mark as read
      heading.markRead();
      expect(query(heading.isRead$)).toBe(true);

      // Then mark as unread
      heading.markUnread();
      expect(query(heading.isRead$)).toBe(false);

      console.log(`[Battery] markRead/markUnread cycle works for "${heading.text}"`);
    });

    it("toggles heading read state", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Battery] Section has no headings, skipping`);
        return;
      }

      const heading = section.headings[0];
      const initialState = query(heading.isRead$);

      // Toggle once
      heading.toggleRead();
      expect(query(heading.isRead$)).toBe(!initialState);

      // Toggle again
      heading.toggleRead();
      expect(query(heading.isRead$)).toBe(initialState);

      console.log(`[Battery] toggleRead() works correctly for "${heading.text}"`);
    });

    it("updates section progress$ when heading marked", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Battery] Section has no headings, skipping`);
        return;
      }

      // Reset all headings to unread first
      section.markAllUnread();

      const initialProgress = query(section.progress$);
      console.log(`[Battery] Initial progress:`, initialProgress);

      // Mark first heading as read
      section.headings[0].markRead();

      const updatedProgress = query(section.progress$);
      console.log(`[Battery] After marking first heading:`, updatedProgress);

      // Progress should have increased
      expect(updatedProgress.readCount).toBeGreaterThan(initialProgress.readCount);
      expect(updatedProgress.percent).toBeGreaterThan(initialProgress.percent);
    });

    it("tracks multiple headings independently", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length < 2) {
        console.log(`[Battery] Section has fewer than 2 headings, skipping`);
        return;
      }

      // Reset all
      section.markAllUnread();

      const [heading1, heading2] = section.headings;

      // Mark first heading
      heading1.markRead();
      expect(query(heading1.isRead$)).toBe(true);
      expect(query(heading2.isRead$)).toBe(false);

      // Mark second heading
      heading2.markRead();
      expect(query(heading1.isRead$)).toBe(true);
      expect(query(heading2.isRead$)).toBe(true);

      // Unmark first heading
      heading1.markUnread();
      expect(query(heading1.isRead$)).toBe(false);
      expect(query(heading2.isRead$)).toBe(true);

      console.log(`[Battery] Headings tracked independently`);
    });
  });

  // ===========================================================================
  // Section Completion Tests
  // ===========================================================================

  describe("Section Completion", () => {
    it("marks all headings read via markAllRead()", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Battery] Section has no headings, skipping`);
        return;
      }

      // Start unread
      section.markAllUnread();
      expect(query(section.progress$).isComplete).toBe(false);

      // Mark all read
      section.markAllRead();

      // All headings should be read
      for (const heading of section.headings) {
        expect(query(heading.isRead$)).toBe(true);
      }

      const progress = query(section.progress$);
      expect(progress.isComplete).toBe(true);
      expect(progress.readCount).toBe(progress.totalCount);
      expect(progress.percent).toBe(100);

      console.log(`[Battery] markAllRead() marked all ${section.headings.length} headings`);
    });

    it("marks all headings unread via markAllUnread()", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Battery] Section has no headings, skipping`);
        return;
      }

      // Start read
      section.markAllRead();
      expect(query(section.progress$).isComplete).toBe(true);

      // Mark all unread
      section.markAllUnread();

      // All headings should be unread
      for (const heading of section.headings) {
        expect(query(heading.isRead$)).toBe(false);
      }

      const progress = query(section.progress$);
      expect(progress.readCount).toBe(0);
      expect(progress.percent).toBe(0);
      expect(progress.isComplete).toBe(false);

      console.log(`[Battery] markAllUnread() cleared all ${section.headings.length} headings`);
    });

    it("calculates correct progress percent", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length < 2) {
        console.log(`[Battery] Section has fewer than 2 headings, skipping`);
        return;
      }

      // Reset
      section.markAllUnread();
      expect(query(section.progress$).percent).toBe(0);

      // Mark one heading
      section.headings[0].markRead();
      const progress1 = query(section.progress$);
      const expectedPercent1 = (1 / section.headings.length) * 100;
      // Allow for rounding differences (progress uses Math.round)
      expect(Math.abs(progress1.percent - expectedPercent1)).toBeLessThan(2);

      console.log(
        `[Battery] Progress after 1/${section.headings.length} headings: ${progress1.percent.toFixed(1)}%`
      );

      // Mark all headings
      section.markAllRead();
      expect(query(section.progress$).percent).toBe(100);

      console.log(`[Battery] Progress calculation is correct`);
    });

    it("sets isComplete when all headings read", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Battery] Section has no headings, skipping`);
        return;
      }

      // Start incomplete
      section.markAllUnread();
      expect(query(section.progress$).isComplete).toBe(false);

      // Mark all but one
      for (let i = 0; i < section.headings.length - 1; i++) {
        section.headings[i].markRead();
      }
      expect(query(section.progress$).isComplete).toBe(false);

      // Mark the last one
      section.headings[section.headings.length - 1].markRead();
      expect(query(section.progress$).isComplete).toBe(true);

      console.log(`[Battery] isComplete triggers correctly at 100%`);
    });
  });

  // ===========================================================================
  // Sidebar Progress Sync Tests
  // ===========================================================================

  describe("Sidebar Progress Sync", () => {
    it("updates folder progressPercent$ when individual headings are marked", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const folders = query(learnVm.sidebar.learnSection.folders$);
      const folder = folders[0];

      if (!query(folder.expanded$)) {
        folder.toggleExpanded();
      }

      // Open first section
      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length < 2) {
        console.log(`[Battery] Section has fewer than 2 headings, skipping`);
        return;
      }

      // Reset all headings
      section.markAllUnread();

      const initialPercent = query(folder.progressPercent$);
      console.log(`[Battery] Initial folder percent: ${initialPercent}%`);
      expect(initialPercent).toBe(0);

      // Mark ONE heading - folder percent should increase
      section.headings[0].markRead();
      const afterOneHeading = query(folder.progressPercent$);
      console.log(`[Battery] After marking 1 heading: ${afterOneHeading}%`);
      expect(afterOneHeading).toBeGreaterThan(0);
      expect(afterOneHeading).toBeLessThan(100);

      // Mark ANOTHER heading - folder percent should increase again
      section.headings[1].markRead();
      const afterTwoHeadings = query(folder.progressPercent$);
      console.log(`[Battery] After marking 2 headings: ${afterTwoHeadings}%`);
      expect(afterTwoHeadings).toBeGreaterThan(afterOneHeading);

      console.log(`[Battery] Folder percent correctly updates per heading`);
    });


    it("updates section item progressState$ in sidebar", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      // Get folder and section item from sidebar
      const folders = query(learnVm.sidebar.learnSection.folders$);
      const folder = folders[0];
      if (!query(folder.expanded$)) {
        folder.toggleExpanded();
      }
      const sectionItems = query(folder.sections$);

      if (sectionItems.length === 0) {
        console.log(`[Battery] No sections in folder, skipping`);
        return;
      }

      const sectionItem = sectionItems[0];
      console.log(`[Battery] Testing sidebar progress for: "${sectionItem.title}"`);

      // Open the section
      sectionItem.select();
      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Battery] Section has no headings, skipping`);
        return;
      }

      // Mark all unread - should be "not-started"
      section.markAllUnread();
      const state1 = query(sectionItem.progressState$);
      console.log(`  After markAllUnread: progressState$ = "${state1}"`);
      expect(state1).toBe("not-started");

      // Mark some read - should be "in-progress" (or "completed" if only 1 heading)
      section.headings[0].markRead();
      const state2 = query(sectionItem.progressState$);
      console.log(`  After marking 1/${section.headings.length} headings: progressState$ = "${state2}"`);
      if (section.headings.length > 1) {
        expect(state2).toBe("in-progress");
      } else {
        // If only 1 heading, marking it completes the section
        expect(state2).toBe("completed");
      }

      // Mark all read - should be "completed"
      section.markAllRead();
      const state3 = query(sectionItem.progressState$);
      console.log(`  After markAllRead: progressState$ = "${state3}"`);
      expect(state3).toBe("completed");
    });

    it("updates folder progressState$ when section completed", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const folders = query(learnVm.sidebar.learnSection.folders$);
      const folder = folders[0];

      console.log(`[Battery] Testing folder progress for: "${folder.label}"`);

      if (!query(folder.expanded$)) {
        folder.toggleExpanded();
      }
      const sectionItems = query(folder.sections$);

      if (sectionItems.length === 0) {
        console.log(`[Battery] No sections in folder, skipping`);
        return;
      }

      // Mark all sections as unread
      for (let i = 0; i < sectionItems.length; i++) {
        sectionItems[i].select();
        const section = await openCurriculumSection(learnVm, query, {
          folderIndex: 0,
          sectionIndex: i,
        });
        section.markAllUnread();
      }

      // Initial state should be "not-started"
      const initialState = query(folder.progressState$);
      console.log(`  Initial folder progressState$: "${initialState}"`);
      expect(initialState).toBe("not-started");

      // Complete one section
      const section0 = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });
      section0.markAllRead();

      // If there are multiple sections, folder should be "in-progress"
      if (sectionItems.length > 1) {
        const middleState = query(folder.progressState$);
        console.log(`  After completing 1 section: "${middleState}"`);
        expect(middleState).toBe("in-progress");
      }

      // Complete all sections
      for (let i = 1; i < sectionItems.length; i++) {
        const section = await openCurriculumSection(learnVm, query, {
          folderIndex: 0,
          sectionIndex: i,
        });
        section.markAllRead();
      }

      // Folder should now be "completed"
      const finalState = query(folder.progressState$);
      console.log(`  After completing all sections: "${finalState}"`);
      expect(finalState).toBe("completed");
    });

    it("updates folder progressPercent$ calculation", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const folders = query(learnVm.sidebar.learnSection.folders$);
      const folder = folders[0];

      if (!query(folder.expanded$)) {
        folder.toggleExpanded();
      }
      const sectionItems = query(folder.sections$);

      if (sectionItems.length === 0) {
        console.log(`[Battery] No sections in folder, skipping`);
        return;
      }

      console.log(
        `[Battery] Folder "${folder.label}" has ${sectionItems.length} sections`
      );

      // Reset all sections to unread
      for (let i = 0; i < sectionItems.length; i++) {
        const section = await openCurriculumSection(learnVm, query, {
          folderIndex: 0,
          sectionIndex: i,
        });
        section.markAllUnread();
      }

      const initialPercent = query(folder.progressPercent$);
      console.log(`  Initial progressPercent$: ${initialPercent}%`);
      expect(initialPercent).toBe(0);

      // Complete one section
      const section0 = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });
      section0.markAllRead();

      const afterOnePercent = query(folder.progressPercent$);
      const expectedPercent = (1 / sectionItems.length) * 100;
      console.log(
        `  After 1/${sectionItems.length} sections: ${afterOnePercent}% (expected ~${expectedPercent.toFixed(1)}%)`
      );
      expect(Math.abs(afterOnePercent - expectedPercent)).toBeLessThan(1);

      // Complete all sections
      for (let i = 1; i < sectionItems.length; i++) {
        const section = await openCurriculumSection(learnVm, query, {
          folderIndex: 0,
          sectionIndex: i,
        });
        section.markAllRead();
      }

      const finalPercent = query(folder.progressPercent$);
      console.log(`  After all sections: ${finalPercent}%`);
      expect(finalPercent).toBe(100);
    });
  });
});
