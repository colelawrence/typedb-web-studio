/**
 * Search results display for the Learn sidebar.
 *
 * Shows:
 * - Grouped results by type (Learn, Examples, Reference)
 * - Empty state when no results
 * - Clickable result items with breadcrumbs
 */

import { BookOpen, Code, FileText } from "lucide-react";
import { Queryable } from "@/vm/components";
import type { LearnSearchResultsVM, LearnSearchResultGroupVM, LearnSearchResultItemVM } from "@/vm/learn";

export interface SearchResultsProps {
  vm: LearnSearchResultsVM;
}

export function SearchResults({ vm }: SearchResultsProps) {
  return (
    <div className="space-y-4">
      <Queryable query={vm.isEmpty$}>
        {(isEmpty) =>
          isEmpty ? (
            <EmptyState />
          ) : (
            <Queryable query={vm.groups$}>
              {(groups) =>
                groups.map((group) => (
                  <ResultGroup key={group.key} vm={group} />
                ))
              }
            </Queryable>
          )
        }
      </Queryable>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <p className="text-dense-sm text-muted-foreground">No results found</p>
      <p className="text-dense-xs text-muted-foreground mt-1">
        Try a different search term
      </p>
    </div>
  );
}

function ResultGroup({ vm }: { vm: LearnSearchResultGroupVM }) {
  const Icon = getGroupIcon(vm.key);

  return (
    <div>
      <div className="flex items-center gap-2 h-row px-2 text-dense-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        <span>{vm.label}</span>
        <span className="text-muted-foreground/60">({vm.items.length})</span>
      </div>
      <div className="mt-0.5 space-y-0.5">
        {vm.items.map((item) => (
          <ResultItem key={item.key} vm={item} />
        ))}
      </div>
    </div>
  );
}

function ResultItem({ vm }: { vm: LearnSearchResultItemVM }) {
  return (
    <button
      onClick={vm.select}
      className="flex flex-col items-start w-full px-3 py-1.5 rounded-md text-left
                 hover:bg-accent/50 transition-colors"
    >
      <span className="text-dense-sm text-foreground truncate w-full">
        {vm.title}
      </span>
      {vm.breadcrumb && (
        <span className="text-dense-xs text-muted-foreground truncate w-full">
          {vm.breadcrumb}
        </span>
      )}
      {vm.preview && (
        <span className="text-dense-xs text-muted-foreground/80 font-mono truncate w-full mt-0.5">
          {vm.preview}
        </span>
      )}
    </button>
  );
}

function getGroupIcon(key: string) {
  switch (key) {
    case "learn":
      return BookOpen;
    case "examples":
      return Code;
    case "reference":
      return FileText;
    default:
      return FileText;
  }
}
