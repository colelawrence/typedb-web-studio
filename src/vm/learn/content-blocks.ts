/**
 * Content Block Parsing
 *
 * Parses raw markdown content into structured content blocks for the document viewer.
 * This logic lives in the VM layer (not React) to keep components dumb and enable testing.
 *
 * @module vm/learn/content-blocks
 */

import type {
  DocumentHeadingVM,
  DocumentExampleVM,
  DocumentSectionContentBlockVM,
} from "./document-viewer.vm";

/**
 * Slugify text for heading IDs.
 * Must match the slugify used in curriculum parsing.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Parse raw markdown content into renderable content blocks.
 *
 * Takes the raw markdown and maps headings/examples to their VMs,
 * producing an ordered list of blocks ready for rendering.
 *
 * @param rawContent - The raw markdown content from the curriculum section
 * @param headings - Heading VMs created by the scope
 * @param examples - Example VMs created by the scope
 * @returns Ordered content blocks for rendering
 */
export function parseContentBlocks(
  rawContent: string,
  headings: DocumentHeadingVM[],
  examples: DocumentExampleVM[]
): DocumentSectionContentBlockVM[] {
  const headingMap = new Map(headings.map((h) => [h.id, h]));
  const exampleMap = new Map(examples.map((e) => [e.id, e]));

  const blocks: DocumentSectionContentBlockVM[] = [];
  const lines = rawContent.split("\n");

  let currentProse: string[] = [];
  let inCodeBlock = false;
  let codeBlockId: string | null = null;

  const flushProse = () => {
    if (currentProse.length > 0) {
      const content = currentProse.join("\n").trim();
      if (content) {
        blocks.push({ kind: "prose", content });
      }
      currentProse = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for code fence start
    const codeStart = line.match(/^```typeql:(\w+)\[([^\]]*)\]/);
    if (codeStart) {
      flushProse();
      inCodeBlock = true;
      // Extract id from attributes
      const attrs = codeStart[2];
      const idMatch = attrs.match(/id=(\S+)/);
      codeBlockId = idMatch ? idMatch[1].replace(/[,\]].*$/, "") : null;
      continue;
    }

    // Check for code fence end
    if (inCodeBlock && line.startsWith("```")) {
      inCodeBlock = false;
      if (codeBlockId && exampleMap.has(codeBlockId)) {
        blocks.push({ kind: "example", example: exampleMap.get(codeBlockId)! });
      }
      codeBlockId = null;
      continue;
    }

    // Skip lines inside code blocks (they're rendered by ExampleBlock)
    if (inCodeBlock) {
      continue;
    }

    // Check for headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushProse();
      const text = headingMatch[2].trim();
      const id = slugify(text);
      if (headingMap.has(id)) {
        blocks.push({ kind: "heading", heading: headingMap.get(id)! });
      } else {
        // Heading without a VM - render as prose
        currentProse.push(line);
      }
      continue;
    }

    // Regular prose line
    currentProse.push(line);
  }

  flushProse();

  return blocks;
}
