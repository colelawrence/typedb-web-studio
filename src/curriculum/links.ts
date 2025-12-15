/**
 * Cross-Link Parser and Index
 *
 * Parses cross-links from curriculum markdown and builds an index for navigation.
 *
 * Link syntax:
 * - `[[ref:match]]` → Reference entry for "match" keyword
 * - `[[learn:first-queries]]` → Learn section by ID
 * - `[[#heading-id]]` → Heading in current section
 * - `[[learn:first-queries#variables]]` → Heading in another learn section
 * - `[[ref:match#syntax]]` → Heading in reference entry
 *
 * @module curriculum/links
 */

import type { ParsedSection } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Type of cross-link target.
 */
export type LinkType = "learn" | "ref" | "heading";

/**
 * A parsed cross-link from markdown content.
 */
export interface ParsedLink {
  /** The type of link target */
  type: LinkType;
  /** Target ID (section ID for learn/ref, heading ID for heading) */
  targetId: string;
  /** Optional heading anchor within the target */
  headingId: string | null;
  /** Original link text from markdown */
  rawText: string;
  /** Source line number */
  lineNumber: number;
  /** Display text (if different from target) */
  displayText: string | null;
}

/**
 * Index of all links for a section.
 */
export interface SectionLinks {
  /** Section ID */
  sectionId: string;
  /** All outbound links from this section */
  outbound: ParsedLink[];
}

/**
 * Index entry for reverse lookups (what links to this target).
 */
export interface BacklinkEntry {
  /** Source section ID */
  sourceSectionId: string;
  /** Link that points to this target */
  link: ParsedLink;
}

/**
 * Complete link index for the curriculum.
 */
export interface LinkIndex {
  /** Links grouped by source section */
  bySectionId: Map<string, SectionLinks>;
  /** Reverse index: target ID → sections that link to it */
  backlinks: Map<string, BacklinkEntry[]>;
  /** All reference keywords that are linked to */
  referencedKeywords: Set<string>;
  /** All learn sections that are linked to */
  referencedSections: Set<string>;
}

// ============================================================================
// Parser
// ============================================================================

/**
 * Regular expression to match cross-links.
 *
 * Matches patterns like:
 * - [[ref:match]]
 * - [[learn:first-queries]]
 * - [[#heading-id]]
 * - [[learn:first-queries#variables]]
 * - [[ref:match|Match Clause]] (with display text)
 *
 * Groups:
 * 1. Type prefix (learn, ref, or empty for heading-only)
 * 2. Target ID (optional if heading-only)
 * 3. Heading ID (optional)
 * 4. Display text (optional)
 */
const LINK_REGEX = /\[\[(?:(learn|ref):)?([a-z0-9-]+)?(?:#([a-z0-9-]+))?(?:\|([^\]]+))?\]\]/gi;

/**
 * Parse all cross-links from markdown content.
 */
export function parseLinks(content: string, sourceFile: string): ParsedLink[] {
  const links: ParsedLink[] = [];

  // Reset regex state
  LINK_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = LINK_REGEX.exec(content)) !== null) {
    const typePrefix = match[1]?.toLowerCase() as "learn" | "ref" | undefined;
    const targetId = match[2] ?? null;
    const headingId = match[3] ?? null;
    const displayText = match[4] ?? null;
    const lineNumber = content.slice(0, match.index).split("\n").length;

    // Determine link type
    let type: LinkType;
    let finalTargetId: string;

    if (typePrefix) {
      // Explicit type prefix: [[learn:...]] or [[ref:...]]
      type = typePrefix;
      finalTargetId = targetId ?? "";
    } else if (targetId) {
      // Target without prefix - treat as learn section
      type = "learn";
      finalTargetId = targetId;
    } else if (headingId) {
      // Only heading - internal link
      type = "heading";
      finalTargetId = headingId;
    } else {
      // Invalid link, skip
      console.warn(`[Links] Invalid link '${match[0]}' at ${sourceFile}:${lineNumber}`);
      continue;
    }

    // Validate we have a target
    if (!finalTargetId && type !== "heading") {
      console.warn(`[Links] Link missing target at ${sourceFile}:${lineNumber}: ${match[0]}`);
      continue;
    }

    links.push({
      type,
      targetId: finalTargetId,
      headingId: type === "heading" ? null : headingId,
      rawText: match[0],
      lineNumber,
      displayText,
    });
  }

  return links;
}

/**
 * Parse links from a section and return a SectionLinks object.
 */
export function parseSectionLinks(section: ParsedSection): SectionLinks {
  return {
    sectionId: section.id,
    outbound: parseLinks(section.rawContent, section.sourceFile),
  };
}

// ============================================================================
// Index Builder
// ============================================================================

/**
 * Build a complete link index from parsed sections.
 */
export function buildLinkIndex(sections: ParsedSection[]): LinkIndex {
  const bySectionId = new Map<string, SectionLinks>();
  const backlinks = new Map<string, BacklinkEntry[]>();
  const referencedKeywords = new Set<string>();
  const referencedSections = new Set<string>();

  for (const section of sections) {
    const sectionLinks = parseSectionLinks(section);
    bySectionId.set(section.id, sectionLinks);

    // Build reverse index
    for (const link of sectionLinks.outbound) {
      // Determine the backlink key
      let backlinkKey: string;
      if (link.type === "ref") {
        backlinkKey = `ref:${link.targetId}`;
        referencedKeywords.add(link.targetId);
      } else if (link.type === "learn") {
        backlinkKey = `learn:${link.targetId}`;
        referencedSections.add(link.targetId);
      } else {
        // Internal heading links don't need backlinks
        continue;
      }

      // Add to backlinks
      const entries = backlinks.get(backlinkKey) ?? [];
      entries.push({
        sourceSectionId: section.id,
        link,
      });
      backlinks.set(backlinkKey, entries);
    }
  }

  return {
    bySectionId,
    backlinks,
    referencedKeywords,
    referencedSections,
  };
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get all outbound links from a section.
 */
export function getOutboundLinks(
  index: LinkIndex,
  sectionId: string
): ParsedLink[] {
  return index.bySectionId.get(sectionId)?.outbound ?? [];
}

/**
 * Get all sections that link to a given target.
 */
export function getBacklinks(
  index: LinkIndex,
  type: "learn" | "ref",
  targetId: string
): BacklinkEntry[] {
  const key = `${type}:${targetId}`;
  return index.backlinks.get(key) ?? [];
}

/**
 * Get all learn sections that reference a keyword.
 */
export function getSectionsReferencingKeyword(
  index: LinkIndex,
  keyword: string
): string[] {
  const entries = index.backlinks.get(`ref:${keyword}`) ?? [];
  return [...new Set(entries.map((e) => e.sourceSectionId))];
}

/**
 * Check if a link target exists.
 */
export function linkTargetExists(
  index: LinkIndex,
  link: ParsedLink,
  sections: Map<string, ParsedSection>
): boolean {
  if (link.type === "learn") {
    return sections.has(link.targetId);
  }
  // For ref links, we'd need reference content - return true for now
  if (link.type === "ref") {
    return true; // TODO: validate against reference content
  }
  // For heading links, check the current section
  return true; // Validated separately
}

/**
 * Find broken links in the index.
 */
export function findBrokenLinks(
  index: LinkIndex,
  sections: Map<string, ParsedSection>
): Array<{ sectionId: string; link: ParsedLink; reason: string }> {
  const broken: Array<{ sectionId: string; link: ParsedLink; reason: string }> = [];

  for (const [sectionId, sectionLinks] of index.bySectionId) {
    const section = sections.get(sectionId);
    if (!section) continue;

    for (const link of sectionLinks.outbound) {
      if (link.type === "learn" && !sections.has(link.targetId)) {
        broken.push({
          sectionId,
          link,
          reason: `Learn section '${link.targetId}' not found`,
        });
      }

      if (link.type === "heading") {
        const headingExists = section.headings.some(
          (h) => h.id === link.targetId
        );
        if (!headingExists) {
          broken.push({
            sectionId,
            link,
            reason: `Heading '${link.targetId}' not found in section`,
          });
        }
      }

      // Check heading anchor for cross-section links
      if (link.headingId && link.type === "learn") {
        const targetSection = sections.get(link.targetId);
        if (targetSection) {
          const headingExists = targetSection.headings.some(
            (h) => h.id === link.headingId
          );
          if (!headingExists) {
            broken.push({
              sectionId,
              link,
              reason: `Heading '${link.headingId}' not found in target section '${link.targetId}'`,
            });
          }
        }
      }
    }
  }

  return broken;
}

// ============================================================================
// Link Rendering Helpers
// ============================================================================

/**
 * Generate a URL path for a link.
 */
export function getLinkPath(link: ParsedLink): string {
  let path: string;

  switch (link.type) {
    case "learn":
      path = `/learn/${link.targetId}`;
      break;
    case "ref":
      path = `/reference/${link.targetId}`;
      break;
    case "heading":
      return `#${link.targetId}`;
  }

  if (link.headingId) {
    path += `#${link.headingId}`;
  }

  return path;
}

/**
 * Get display text for a link.
 */
export function getLinkDisplayText(
  link: ParsedLink,
  sections: Map<string, ParsedSection>
): string {
  // Use explicit display text if provided
  if (link.displayText) {
    return link.displayText;
  }

  // For learn links, use section title
  if (link.type === "learn") {
    const section = sections.get(link.targetId);
    if (section) {
      if (link.headingId) {
        const heading = section.headings.find((h) => h.id === link.headingId);
        if (heading) {
          return `${section.title} - ${heading.text}`;
        }
      }
      return section.title;
    }
  }

  // For ref links, capitalize the keyword
  if (link.type === "ref") {
    const keyword = link.targetId;
    return keyword.charAt(0).toUpperCase() + keyword.slice(1);
  }

  // For heading links, return the target ID formatted
  return link.targetId.replace(/-/g, " ");
}
