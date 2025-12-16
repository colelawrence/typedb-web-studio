/**
 * Heading Toggle Bug Tests
 *
 * Tests for a bug where toggling heading.isRead$ on a third section
 * doesn't update the computed value even though the event is submitted.
 *
 * Run with: pnpm test src/test/__tests__/learn-heading-toggle-bug.test.ts
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
import type { DocumentSectionVM } from "../../vm/learn/document-viewer.vm";

describe("Heading Toggle Bug", () => {
  let studio: TestStudio | null = null;

  afterEach(async () => {
    if (studio) {
      await studio.cleanup();
      studio = null;
    }
  });

  async function setupLearnPage(
    studioInstance: TestStudio
  ): Promise<{ learnVm: LearnPageVM; query: TestQueryFn }> {
    const { app, query } = studioInstance;
    await setupConnectedServer(app, query);
    const learnVm = await navigateToLearn(app, query);
    return { learnVm, query };
  }

  /**
   * Helper to get section info for debugging
   */
  function logSectionInfo(section: DocumentSectionVM, query: TestQueryFn) {
    console.log(`[Bug Test] Section: "${section.title}" (${section.id})`);
    console.log(`  Headings: ${section.headings.length}`);
    for (const heading of section.headings) {
      const isRead = query(heading.isRead$);
      console.log(`    - [${isRead ? "✓" : " "}] "${heading.text}" (${heading.id})`);
    }
  }

  describe("Toggle isRead$ on third section", () => {
    it("should update isRead$ after markRead() on first section", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      // Open FIRST section
      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Bug Test] Section has no headings, skipping`);
        return;
      }

      logSectionInfo(section, query);

      const heading = section.headings[0];
      const initialState = query(heading.isRead$);
      console.log(`\n[Bug Test] Initial isRead$: ${initialState}`);

      // Mark as read
      heading.markRead();

      const afterMarkRead = query(heading.isRead$);
      console.log(`[Bug Test] After markRead(): isRead$ = ${afterMarkRead}`);

      expect(afterMarkRead).toBe(true);
    });

    it("should update isRead$ after markRead() on SECOND section", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      // First open section 0 (to warm up caches)
      await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      // Now open SECOND section (index 1) - need to check if it exists
      const folders = query(learnVm.sidebar.learnSection.folders$);
      const folder = folders[0];
      if (!query(folder.expanded$)) {
        folder.toggleExpanded();
      }
      const sections = query(folder.sections$);

      if (sections.length < 2) {
        console.log(`[Bug Test] Only ${sections.length} section(s) in folder, need at least 2, skipping`);
        return;
      }

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 1,
      });

      if (section.headings.length === 0) {
        console.log(`[Bug Test] Section has no headings, skipping`);
        return;
      }

      logSectionInfo(section, query);

      const heading = section.headings[0];
      const initialState = query(heading.isRead$);
      console.log(`\n[Bug Test] Initial isRead$: ${initialState}`);

      // Mark as read
      heading.markRead();

      const afterMarkRead = query(heading.isRead$);
      console.log(`[Bug Test] After markRead(): isRead$ = ${afterMarkRead}`);

      expect(afterMarkRead).toBe(true);
    });

    it("should update isRead$ after markRead() on THIRD section", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      // First open sections 0 and 1 (to warm up caches)
      await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      // Check how many sections exist across all folders
      const folders = query(learnVm.sidebar.learnSection.folders$);
      let totalSections = 0;
      for (const folder of folders) {
        if (!query(folder.expanded$)) {
          folder.toggleExpanded();
        }
        const sections = query(folder.sections$);
        totalSections += sections.length;
      }

      if (totalSections < 3) {
        console.log(`[Bug Test] Only ${totalSections} total section(s), need at least 3, skipping`);
        return;
      }

      // Try to find a third section (might be in folder 0 or folder 1)
      let section: DocumentSectionVM;
      const folder0Sections = query(folders[0].sections$);

      if (folder0Sections.length >= 3) {
        // Third section in first folder
        section = await openCurriculumSection(learnVm, query, {
          folderIndex: 0,
          sectionIndex: 2,
        });
      } else if (folders.length >= 2) {
        // First section in second folder
        section = await openCurriculumSection(learnVm, query, {
          folderIndex: 1,
          sectionIndex: 0,
        });
      } else {
        console.log(`[Bug Test] Cannot find a third section, skipping`);
        return;
      }

      if (section.headings.length === 0) {
        console.log(`[Bug Test] Section has no headings, skipping`);
        return;
      }

      logSectionInfo(section, query);

      const heading = section.headings[0];
      const initialState = query(heading.isRead$);
      console.log(`\n[Bug Test] Initial isRead$: ${initialState}`);

      // Mark as read
      heading.markRead();

      const afterMarkRead = query(heading.isRead$);
      console.log(`[Bug Test] After markRead(): isRead$ = ${afterMarkRead}`);

      expect(afterMarkRead).toBe(true);
    });

    it("should update isRead$ when navigating BACK to first section after visiting third", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      // Check how many sections exist
      const folders = query(learnVm.sidebar.learnSection.folders$);
      let totalSections = 0;
      for (const folder of folders) {
        if (!query(folder.expanded$)) {
          folder.toggleExpanded();
        }
        totalSections += query(folder.sections$).length;
      }

      if (totalSections < 3) {
        console.log(`[Bug Test] Only ${totalSections} sections, need 3, skipping`);
        return;
      }

      // 1. Open first section and mark a heading
      console.log(`\n[Bug Test] === Opening first section ===`);
      const section1 = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });
      logSectionInfo(section1, query);

      if (section1.headings.length > 0) {
        section1.headings[0].markRead();
        console.log(`  Marked first heading as read`);
      }

      // 2. Navigate to third section
      console.log(`\n[Bug Test] === Opening third section ===`);
      const folder0Sections = query(folders[0].sections$);
      let section3: DocumentSectionVM;
      if (folder0Sections.length >= 3) {
        section3 = await openCurriculumSection(learnVm, query, {
          folderIndex: 0,
          sectionIndex: 2,
        });
      } else {
        section3 = await openCurriculumSection(learnVm, query, {
          folderIndex: 1,
          sectionIndex: 0,
        });
      }
      logSectionInfo(section3, query);

      // 3. Navigate BACK to first section
      console.log(`\n[Bug Test] === Navigating BACK to first section ===`);
      const section1Again = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });
      logSectionInfo(section1Again, query);

      // The first heading should still show as read
      if (section1Again.headings.length > 0) {
        const isStillRead = query(section1Again.headings[0].isRead$);
        console.log(`\n[Bug Test] First heading isRead$ after returning: ${isStillRead}`);
        expect(isStillRead).toBe(true);
      }
    });

    it("should toggle isRead$ correctly on third section heading", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      // Check sections
      const folders = query(learnVm.sidebar.learnSection.folders$);
      for (const folder of folders) {
        if (!query(folder.expanded$)) {
          folder.toggleExpanded();
        }
      }

      const folder0Sections = query(folders[0].sections$);
      let section: DocumentSectionVM;
      let sectionLabel: string;

      if (folder0Sections.length >= 3) {
        section = await openCurriculumSection(learnVm, query, {
          folderIndex: 0,
          sectionIndex: 2,
        });
        sectionLabel = "folder 0, section 2";
      } else if (folders.length >= 2) {
        section = await openCurriculumSection(learnVm, query, {
          folderIndex: 1,
          sectionIndex: 0,
        });
        sectionLabel = "folder 1, section 0";
      } else {
        console.log(`[Bug Test] Not enough sections, skipping`);
        return;
      }

      if (section.headings.length === 0) {
        console.log(`[Bug Test] Section has no headings, skipping`);
        return;
      }

      console.log(`\n[Bug Test] Testing toggle on ${sectionLabel}: "${section.title}"`);
      logSectionInfo(section, query);

      const heading = section.headings[0];

      // Ensure we start unread
      section.markAllUnread();
      const startState = query(heading.isRead$);
      console.log(`\n[Bug Test] After markAllUnread: isRead$ = ${startState}`);
      expect(startState).toBe(false);

      // Toggle to read
      console.log(`[Bug Test] Calling toggleRead()...`);
      heading.toggleRead();
      const afterToggle1 = query(heading.isRead$);
      console.log(`[Bug Test] After first toggleRead(): isRead$ = ${afterToggle1}`);
      expect(afterToggle1).toBe(true);

      // Toggle back to unread
      console.log(`[Bug Test] Calling toggleRead() again...`);
      heading.toggleRead();
      const afterToggle2 = query(heading.isRead$);
      console.log(`[Bug Test] After second toggleRead(): isRead$ = ${afterToggle2}`);
      expect(afterToggle2).toBe(false);
    });

    it("should update isRead$ immediately after markRead on any heading in third section", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      // Navigate through sections to get to third
      const folders = query(learnVm.sidebar.learnSection.folders$);
      for (const folder of folders) {
        if (!query(folder.expanded$)) {
          folder.toggleExpanded();
        }
      }

      const folder0Sections = query(folders[0].sections$);
      let section: DocumentSectionVM;

      if (folder0Sections.length >= 3) {
        section = await openCurriculumSection(learnVm, query, {
          folderIndex: 0,
          sectionIndex: 2,
        });
      } else if (folders.length >= 2) {
        section = await openCurriculumSection(learnVm, query, {
          folderIndex: 1,
          sectionIndex: 0,
        });
      } else {
        console.log(`[Bug Test] Not enough sections, skipping`);
        return;
      }

      console.log(`\n[Bug Test] Section: "${section.title}"`);
      console.log(`[Bug Test] Testing ALL headings (${section.headings.length} total):\n`);

      // Reset all
      section.markAllUnread();

      // Test EACH heading individually
      for (let i = 0; i < section.headings.length; i++) {
        const heading = section.headings[i];
        const beforeMark = query(heading.isRead$);

        heading.markRead();

        const afterMark = query(heading.isRead$);
        const status = afterMark === true ? "✓ PASS" : "✗ FAIL";

        console.log(`  [${i}] "${heading.text}"`);
        console.log(`      before: ${beforeMark}, after: ${afterMark} - ${status}`);

        expect(afterMark).toBe(true);
      }
    });
  });

  describe("Navigation stress test", () => {
    it("should correctly update isRead$ after rapid section switching", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      // Get all available sections
      const folders = query(learnVm.sidebar.learnSection.folders$);
      const allSections: { folderIndex: number; sectionIndex: number; title: string }[] = [];

      for (let fi = 0; fi < folders.length; fi++) {
        const folder = folders[fi];
        if (!query(folder.expanded$)) {
          folder.toggleExpanded();
        }
        const sections = query(folder.sections$);
        for (let si = 0; si < sections.length; si++) {
          allSections.push({ folderIndex: fi, sectionIndex: si, title: sections[si].title });
        }
      }

      console.log(`\n[Bug Test] Found ${allSections.length} total sections`);

      if (allSections.length < 3) {
        console.log(`[Bug Test] Need at least 3 sections, skipping`);
        return;
      }

      // Navigate through sections: 0 -> 1 -> 2 -> 0 -> 2 -> 1 -> 2
      const navSequence = [0, 1, 2, 0, 2, 1, 2];
      const sectionsToTest = navSequence.filter(i => i < allSections.length);

      console.log(`[Bug Test] Navigation sequence: ${sectionsToTest.join(" -> ")}`);

      for (const sectionIdx of sectionsToTest) {
        const { folderIndex, sectionIndex, title } = allSections[sectionIdx];
        console.log(`\n[Bug Test] Opening section ${sectionIdx}: "${title}"`);

        const section = await openCurriculumSection(learnVm, query, {
          folderIndex,
          sectionIndex,
        });

        if (section.headings.length === 0) {
          console.log(`  No headings, skipping toggle test`);
          continue;
        }

        const heading = section.headings[0];

        // Reset to known state
        section.markAllUnread();
        const before = query(heading.isRead$);

        // Mark read
        heading.markRead();
        const after = query(heading.isRead$);

        console.log(`  "${heading.text}": before=${before}, after=${after}`);

        expect(after).toBe(true);
      }
    });

    it("should work on sections from different folders", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const folders = query(learnVm.sidebar.learnSection.folders$);

      if (folders.length < 2) {
        console.log(`[Bug Test] Only ${folders.length} folder(s), need at least 2 for cross-folder test`);
        return;
      }

      // Expand all folders
      for (const folder of folders) {
        if (!query(folder.expanded$)) {
          folder.toggleExpanded();
        }
      }

      // Test first section from each folder
      for (let fi = 0; fi < Math.min(folders.length, 3); fi++) {
        const folder = folders[fi];
        const sections = query(folder.sections$);

        if (sections.length === 0) {
          console.log(`[Bug Test] Folder ${fi} "${folder.label}" has no sections, skipping`);
          continue;
        }

        console.log(`\n[Bug Test] Testing folder ${fi}: "${folder.label}"`);

        const section = await openCurriculumSection(learnVm, query, {
          folderIndex: fi,
          sectionIndex: 0,
        });

        if (section.headings.length === 0) {
          console.log(`  Section has no headings, skipping`);
          continue;
        }

        // Reset
        section.markAllUnread();

        const heading = section.headings[0];
        const before = query(heading.isRead$);

        heading.markRead();
        const after = query(heading.isRead$);

        console.log(`  "${heading.text}": before=${before}, after=${after}`);

        expect(after).toBe(true);
      }
    });
  });
});
