/**
 * Document viewer component.
 *
 * Displays curriculum content with interactive code blocks and progress tracking.
 * The viewer renders markdown content with styled headings and code examples.
 *
 * **Layout:**
 * ```
 * ┌────────────────────────────────────────────────┐
 * │ Your First Queries                         [×] │ ← header with close
 * ├────────────────────────────────────────────────┤
 * │                                                │
 * │ # Your First Queries              [✓ Mark]    │
 * │                                                │
 * │ The `match` clause finds data...              │
 * │                                                │
 * │ ┌──────────────────────────────────────────┐  │
 * │ │ match $p isa person;        [→REPL] [▶]  │  │
 * │ └──────────────────────────────────────────┘  │
 * │                                                │
 * └────────────────────────────────────────────────┘
 * ```
 */

import { X, Check, Circle, BookOpen } from "lucide-react";
import { Queryable } from "@/vm/components";
import type {
  DocumentViewerVM,
  DocumentSectionVM,
  DocumentHeadingVM,
  DocumentSectionContentBlockVM,
} from "@/vm/learn";
import { Button } from "../ui/button";
import { ExampleBlock } from "./ExampleBlock";

export interface DocumentViewerProps {
  vm: DocumentViewerVM;
}

export function DocumentViewer({ vm }: DocumentViewerProps) {
  return (
    <Queryable query={vm.isVisible$}>
      {(isVisible) =>
        isVisible ? (
          <Queryable query={vm.currentSection$}>
            {(section) =>
              section ? (
                <DocumentContent section={section} onClose={vm.hide} />
              ) : (
                <EmptyState onClose={vm.hide} />
              )
            }
          </Queryable>
        ) : null
      }
    </Queryable>
  );
}

/**
 * Empty state when no section is selected.
 */
function EmptyState({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <DocumentHeader title="Documentation" onClose={onClose} />
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <BookOpen className="size-12 mx-auto mb-3 opacity-50" />
          <p className="text-dense-sm">Select a lesson from the sidebar</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Main document content view.
 */
function DocumentContent({
  section,
  onClose,
}: {
  section: DocumentSectionVM;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <DocumentHeader
        title={section.title}
        onClose={onClose}
        progress={section.progress$}
        onMarkAllRead={section.markAllRead}
      />

      <div className="flex-1 overflow-y-auto">
        <article className="max-w-3xl mx-auto px-6 py-6">
          <SectionContent section={section} />
        </article>
      </div>
    </div>
  );
}

/**
 * Document header with title, progress, and close button.
 */
function DocumentHeader({
  title,
  onClose,
  progress,
  onMarkAllRead,
}: {
  title: string;
  onClose?: () => void;
  progress?: DocumentSectionVM["progress$"];
  onMarkAllRead?: () => void;
}) {
  return (
    <header className="flex items-center justify-between h-header px-4 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <h1 className="text-dense-base font-semibold text-foreground truncate">
          {title}
        </h1>
        {progress && (
          <Queryable query={progress}>
            {(p) => (
              <span className="text-dense-xs text-muted-foreground">
                {p.percent}%
              </span>
            )}
          </Queryable>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onMarkAllRead && (
          <Button
            variant="ghost"
            density="compact"
            onClick={onMarkAllRead}
            className="text-dense-xs whitespace-nowrap"
          >
            <Check className="size-3.5 mr-1" />
            Mark all read
          </Button>
        )}
        {onClose && (
          <Button
            variant="ghost"
            density="compact"
            onClick={onClose}
            title="Close documentation"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </header>
  );
}

/**
 * Renders section content blocks from the VM.
 *
 * The VM provides pre-parsed content blocks in display order.
 * This component simply renders them - no parsing logic here.
 */
function SectionContent({ section }: { section: DocumentSectionVM }) {
  return (
    <div className="space-y-4">
      {section.contentBlocks.map((block, index) => (
        <ContentBlock key={getBlockKey(block, index)} block={block} />
      ))}
    </div>
  );
}

/**
 * Generate a stable key for a content block.
 */
function getBlockKey(block: DocumentSectionContentBlockVM, index: number): string {
  switch (block.kind) {
    case "heading":
      return `heading-${block.heading.id}`;
    case "example":
      return `example-${block.example.id}`;
    case "prose":
      return `prose-${index}`;
  }
}

/**
 * Renders a single content block.
 */
function ContentBlock({ block }: { block: DocumentSectionContentBlockVM }) {
  switch (block.kind) {
    case "heading":
      return <HeadingBlock vm={block.heading} />;
    case "example":
      return <ExampleBlock vm={block.example} />;
    case "prose":
      return <ProseBlock content={block.content} />;
  }
}

/**
 * Heading block with progress indicator.
 */
function HeadingBlock({ vm }: { vm: DocumentHeadingVM }) {
  const sizeClass = getHeadingSizeClass(vm.level);
  const HeadingTag = getHeadingTag(vm.level);

  return (
    <HeadingTag
      id={vm.id}
      className={`font-semibold text-foreground flex items-center gap-2 group ${sizeClass}`}
    >
      {vm.text}
      <Queryable query={vm.isRead$}>
        {(isRead) => (
          <button
            onClick={vm.toggleRead}
            className={`
              opacity-0 group-hover:opacity-100 transition-opacity
              p-1 rounded hover:bg-accent
              ${isRead ? "text-beacon-ok" : "text-muted-foreground"}
            `}
            title={isRead ? "Mark as unread" : "Mark as read"}
          >
            {isRead ? (
              <Check className="size-4" />
            ) : (
              <Circle className="size-4" />
            )}
          </button>
        )}
      </Queryable>
    </HeadingTag>
  );
}

/**
 * Get heading size class based on level.
 */
function getHeadingSizeClass(level: number): string {
  switch (level) {
    case 1:
      return "text-dense-2xl";
    case 2:
      return "text-dense-xl mt-6";
    case 3:
      return "text-dense-lg mt-4";
    case 4:
      return "text-dense-base mt-3";
    default:
      return "text-dense-sm mt-2";
  }
}

/**
 * Get heading tag component based on level.
 */
function getHeadingTag(level: number): "h1" | "h2" | "h3" | "h4" | "h5" | "h6" {
  switch (level) {
    case 1:
      return "h1";
    case 2:
      return "h2";
    case 3:
      return "h3";
    case 4:
      return "h4";
    case 5:
      return "h5";
    case 6:
      return "h6";
    default:
      return "h3";
  }
}

/**
 * Prose content block.
 *
 * For now, renders markdown-ish content with basic formatting.
 * TODO: Use a proper markdown renderer for full support.
 */
function ProseBlock({ content }: { content: string }) {
  // Simple inline formatting
  const formatted = content
    .split("\n\n")
    .filter((p) => p.trim())
    .map((paragraph, i) => (
      <p key={i} className="text-dense-sm text-foreground leading-relaxed">
        {formatInlineMarkdown(paragraph)}
      </p>
    ));

  return <div className="space-y-3">{formatted}</div>;
}

/**
 * Format inline markdown (bold, italic, code).
 */
function formatInlineMarkdown(text: string): React.ReactNode {
  // This is a simplified formatter - for production, use a proper markdown library
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Match inline code
  const codeRegex = /`([^`]+)`/g;
  let match;
  let lastIndex = 0;

  while ((match = codeRegex.exec(remaining)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, match.index));
    }
    // Add the code
    parts.push(
      <code
        key={key++}
        className="px-1 py-0.5 rounded bg-muted text-dense-xs font-mono"
      >
        {match[1]}
      </code>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
