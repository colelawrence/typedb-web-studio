/**
 * Progress Calculation Bug Tests
 *
 * These tests expose bugs in the progress calculation where:
 * 1. markAllRead() creates a "root" entry (headingId: null) in addition to heading entries
 * 2. readCount counts ALL entries including root, but totalCount only counts headings
 * 3. This causes percent > 100% after markAllRead()
 *
 * Run with: pnpm test src/test/__tests__/learn-progress-bugs.test.ts
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

describe("Progress Calculation Bugs", () => {
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

  describe("BUG: Progress percent exceeds 100%", () => {
    it("should have readCount === totalCount after markAllRead()", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Bug Test] Section has no headings, skipping`);
        return;
      }

      // Reset to clean state
      section.markAllUnread();

      // Mark all read
      section.markAllRead();

      const progress = query(section.progress$);
      console.log(`[Bug Test] After markAllRead():`);
      console.log(`  readCount: ${progress.readCount}`);
      console.log(`  totalCount: ${progress.totalCount}`);
      console.log(`  percent: ${progress.percent}%`);
      console.log(`  headings.length: ${section.headings.length}`);

      // STRICT ASSERTION: readCount should equal totalCount
      expect(progress.readCount).toBe(progress.totalCount);
    });

    it("should have percent === 100 after markAllRead()", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Bug Test] Section has no headings, skipping`);
        return;
      }

      // Reset to clean state
      section.markAllUnread();

      // Mark all read
      section.markAllRead();

      const progress = query(section.progress$);

      // STRICT ASSERTION: percent should be exactly 100, not more
      expect(progress.percent).toBe(100);
    });

    it("should have totalCount === headings.length", async () => {
      studio = await bootstrapStudioForTest();
      const { learnVm, query } = await setupLearnPage(studio);

      const section = await openCurriculumSection(learnVm, query, {
        folderIndex: 0,
        sectionIndex: 0,
      });

      if (section.headings.length === 0) {
        console.log(`[Bug Test] Section has no headings, skipping`);
        return;
      }

      const progress = query(section.progress$);

      // STRICT ASSERTION: totalCount should match headings array length
      expect(progress.totalCount).toBe(section.headings.length);
    });
  });
});
