/**
 * Cross-Link Components
 *
 * Renders cross-links within curriculum content with:
 * - Proper navigation handling
 * - Visual styling by link type
 * - Hover previews (optional)
 * - Backlink indicators
 *
 * @module components/learn/CrossLink
 */

import { ExternalLink, BookOpen, Hash, FileText } from "lucide-react";
import type { ParsedLink } from "@/curriculum/links";
import { getLinkPath } from "@/curriculum/links";
import { cn } from "@/lib/utils";

// ============================================================================
// Link Component
// ============================================================================

export interface CrossLinkProps {
  /** The parsed link data */
  link: ParsedLink;
  /** Display text (defaults to link's displayText or targetId) */
  children?: React.ReactNode;
  /** Click handler for navigation */
  onClick?: (link: ParsedLink) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the link type icon */
  showIcon?: boolean;
}

/**
 * Renders a cross-link with appropriate styling and navigation.
 */
export function CrossLink({
  link,
  children,
  onClick,
  className,
  showIcon = true,
}: CrossLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.(link);
  };

  const href = getLinkPath(link);
  const displayText = children ?? link.displayText ?? link.targetId;

  return (
    <a
      href={href}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 text-accent-foreground hover:underline",
        "transition-colors duration-150",
        link.type === "ref" && "text-primary",
        link.type === "learn" && "text-accent-foreground",
        link.type === "heading" && "text-muted-foreground",
        className
      )}
    >
      {showIcon && <LinkIcon type={link.type} />}
      <span>{displayText}</span>
    </a>
  );
}

// ============================================================================
// Link Icon
// ============================================================================

interface LinkIconProps {
  type: ParsedLink["type"];
  className?: string;
}

function LinkIcon({ type, className }: LinkIconProps) {
  const iconClass = cn("size-3.5 shrink-0", className);

  switch (type) {
    case "ref":
      return <BookOpen className={iconClass} />;
    case "learn":
      return <FileText className={iconClass} />;
    case "heading":
      return <Hash className={iconClass} />;
    default:
      return <ExternalLink className={iconClass} />;
  }
}

// ============================================================================
// Backlink Component
// ============================================================================

export interface BacklinkProps {
  /** Source section ID that links to this target */
  sourceSectionId: string;
  /** Source section title */
  sourceTitle: string;
  /** Click handler */
  onClick?: (sectionId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Renders a backlink indicator showing where a section is referenced from.
 */
export function Backlink({
  sourceSectionId,
  sourceTitle,
  onClick,
  className,
}: BacklinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.(sourceSectionId);
  };

  return (
    <a
      href={`/learn/${sourceSectionId}`}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded",
        "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
        "text-dense-xs transition-colors duration-150",
        className
      )}
    >
      <FileText className="size-3" />
      <span>{sourceTitle}</span>
    </a>
  );
}

// ============================================================================
// Backlinks Section
// ============================================================================

export interface BacklinksSectionProps {
  /** List of backlinks */
  backlinks: Array<{
    sectionId: string;
    title: string;
  }>;
  /** Click handler */
  onBacklinkClick?: (sectionId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Renders a section showing all backlinks to a target.
 */
export function BacklinksSection({
  backlinks,
  onBacklinkClick,
  className,
}: BacklinksSectionProps) {
  if (backlinks.length === 0) {
    return null;
  }

  return (
    <div className={cn("mt-6 pt-4 border-t border-border", className)}>
      <h4 className="text-dense-xs font-medium text-muted-foreground mb-2">
        Referenced in
      </h4>
      <div className="flex flex-wrap gap-2">
        {backlinks.map((backlink) => (
          <Backlink
            key={backlink.sectionId}
            sourceSectionId={backlink.sectionId}
            sourceTitle={backlink.title}
            onClick={onBacklinkClick}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Highlighted Target
// ============================================================================

export interface HighlightedTargetProps {
  /** Whether this element is highlighted */
  isHighlighted: boolean;
  /** Content to wrap */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Wraps content with a highlight animation when navigated to.
 */
export function HighlightedTarget({
  isHighlighted,
  children,
  className,
}: HighlightedTargetProps) {
  return (
    <div
      className={cn(
        "transition-all duration-500",
        isHighlighted && "bg-accent/20 -mx-2 px-2 rounded",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Link Renderer Helper
// ============================================================================

/**
 * Pattern to match cross-links in markdown content.
 */
const LINK_PATTERN = /\[\[(?:(learn|ref):)?([a-z0-9-]+)?(?:#([a-z0-9-]+))?(?:\|([^\]]+))?\]\]/gi;

/**
 * Renders markdown content with cross-links converted to React components.
 */
export function renderContentWithLinks(
  content: string,
  onLinkClick: (link: ParsedLink) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  LINK_PATTERN.lastIndex = 0;

  while ((match = LINK_PATTERN.exec(content)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // Parse the link
    const typePrefix = match[1]?.toLowerCase() as "learn" | "ref" | undefined;
    const targetId = match[2] ?? "";
    const headingId = match[3] ?? null;
    const displayText = match[4] ?? null;

    let type: ParsedLink["type"];
    let finalTargetId: string;

    if (typePrefix) {
      type = typePrefix;
      finalTargetId = targetId;
    } else if (targetId) {
      type = "learn";
      finalTargetId = targetId;
    } else if (headingId) {
      type = "heading";
      finalTargetId = headingId;
    } else {
      // Invalid link, keep as text
      parts.push(match[0]);
      lastIndex = match.index + match[0].length;
      continue;
    }

    const link: ParsedLink = {
      type,
      targetId: finalTargetId,
      headingId: type === "heading" ? null : headingId,
      rawText: match[0],
      lineNumber: 0,
      displayText,
    };

    parts.push(
      <CrossLink
        key={`${match.index}-${link.targetId}`}
        link={link}
        onClick={onLinkClick}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}
