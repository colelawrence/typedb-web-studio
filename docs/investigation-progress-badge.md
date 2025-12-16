# Investigation: Progress Badge Not Updating

## Summary
The ProgressBadge in the sidebar was not updating when marking individual headings as read because the progress calculation was counting "sections with any progress" instead of "actual headings read".

## Symptoms
- User marks headings as read in DocumentViewer
- Events are correctly submitted to LiveStore
- ProgressBadge percentage in sidebar doesn't change
- Issue particularly noticeable after navigating between sections

## Investigation Log

### Phase 1 - Tracing Data Flow
**Hypothesis:** ProgressBadge receives stale data
**Findings:**
- `ProgressBadge` in `FolderItem.tsx` subscribes to `vm.progressPercent$`
- `progressPercent$` is defined in `sidebar-scope.ts`

**Evidence:** `src/components/learn/FolderItem.tsx:44`:
```tsx
<ProgressBadge percent={progressPercent} />
```

### Phase 2 - Progress Calculation Analysis
**Hypothesis:** Progress calculation logic is wrong
**Findings:** CONFIRMED - The calculation was fundamentally flawed

**Before Fix (sidebar-scope.ts:367-374):**
```typescript
progressPercent$: computed(
  (get) => {
    const currentReadIds = get(readSectionIds$);  // Set of sections with ANY entry
    const currentReadCount = lessonIds.filter((id) => currentReadIds.has(id)).length;
    return computeProgressPercent(currentReadCount, totalCount);  // Counting SECTIONS
  },
```

**Problem:**
- `readSectionIds$` creates a Set of section IDs that have ANY reading progress entry
- `progressPercent$` counts how many sections are in this set
- Once a section has ONE heading marked, it's "counted" and marking more headings has NO EFFECT

**Example:**
- Folder has 3 sections, each with 10 headings (30 total headings)
- User marks 1 heading in Section A → Section A added to `readSectionIds$` → 33% (1/3 sections)
- User marks 9 more headings in Section A → Still 33% (no change!)
- Expected: 10/30 = 33%, then should increase per heading

### Phase 3 - Fix Implementation
**Solution:** Change calculation to count actual headings, not sections

**After Fix (sidebar-scope.ts:367-386):**
```typescript
progressPercent$: computed(
  (get) => {
    const allProgress = get(readingProgress$);
    let totalHeadings = 0;
    let readHeadings = 0;

    for (const lessonId of lessonIds) {
      const parsedSection = sections[lessonId];
      if (parsedSection) {
        totalHeadings += parsedSection.headings.length;
        readHeadings += allProgress.filter(
          p => p.sectionId === lessonId && p.headingId !== null && p.markedRead
        ).length;
      }
    }

    return computeProgressPercent(readHeadings, totalHeadings);
  },
```

### Phase 4 - Verification
**Test Results:**
```
[Battery] Initial folder percent: 0%
[Battery] After marking 1 heading: 11%
[Battery] After marking 2 headings: 22%
[Battery] Folder percent correctly updates per heading
```

## Root Cause
The progress calculation in `sidebar-scope.ts` was using section-level granularity instead of heading-level granularity. The `readSectionIds$` computed created a binary "has any progress" check per section, which was then counted to produce the percentage. This meant:

1. Marking the first heading in a section: percentage increases (section now "has progress")
2. Marking additional headings in same section: NO CHANGE (section already counted)

## Files Changed
1. `src/vm/learn/sidebar-scope.ts`:
   - Fixed `progressPercent$` for folders (count headings, not sections)
   - Fixed `progressState$` for folders (use heading counts)
   - Fixed `progressPercent$` for overall LEARN section
   - Fixed `progressDisplay$` for overall LEARN section
   - Fixed `progressState$` for individual lessons

2. `src/vm/learn/document-viewer-scope.ts`:
   - Fixed `progress$` calculation to exclude root entry (headingId: null)

## Recommendations
1. Always test progress calculations with partial completion scenarios
2. Consider adding a computed that exposes `readHeadings/totalHeadings` for debugging
3. Add explicit tests that verify percentage changes after EACH heading is marked

## Preventive Measures
- Test added: "updates folder progressPercent$ when individual headings are marked"
- This test specifically verifies that marking individual headings increments the percentage
