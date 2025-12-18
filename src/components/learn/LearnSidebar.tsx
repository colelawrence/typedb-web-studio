/**
 * Learn Sidebar component.
 *
 * Main sidebar for the interactive learning feature showing:
 * - Search input at top
 * - Either search results OR navigation tree based on search state
 *
 * Layout:
 * ```
 * ┌──────────────────────┐
 * │ [🔍 Search...]       │ ← search input
 * ├──────────────────────┤
 * │                      │
 * │ ▼ LEARN           75%│ ← curriculum section
 * │   ▶ Foundations   100%│
 * │     ✓ First Queries  │
 * │     ○ Variables      │
 * │                      │
 * │ ▼ REFERENCE          │ ← reference section
 * │   ▶ Keywords         │
 * │                      │
 * └──────────────────────┘
 * ```
 */

import { Queryable } from "@/vm/components";
import type { LearnSidebarVM } from "@/vm/learn";
import { SearchInput } from "./SearchInput";
import { SearchResults } from "./SearchResults";
import { LearnSection } from "./LearnSection";
import { ReferenceSection } from "./ReferenceSection";

export interface LearnSidebarProps {
  vm: LearnSidebarVM;
}

export function LearnSidebar({ vm }: LearnSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="p-3 border-b border-border">
        <SearchInput vm={vm.search} />
      </div>

      {/* Content area - scrollable */}
      <div className="flex-1 overflow-y-auto py-2 px-1">
        <Queryable query={vm.view$}>
          {(view) =>
            view.type === "search" ? (
              <SearchResults vm={view.results} />
            ) : (
              <div className="space-y-4">
                <LearnSection vm={vm.learnSection} />
                <ReferenceSection vm={vm.referenceSection} />
              </div>
            )
          }
        </Queryable>
      </div>
    </div>
  );
}
