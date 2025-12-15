/**
 * Learn Sidebar component.
 *
 * Main sidebar for the interactive learning feature showing:
 * - Search input at top
 * - Either search results OR navigation tree based on search state
 * - Resizable width with drag handle
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

import { useRef, useCallback } from "react";
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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      vm.setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [vm]);

  return (
    <Queryable query={vm.width$}>
      {(width) => (
        <aside
          ref={sidebarRef}
          className="relative flex flex-col h-full bg-card border-r border-border"
          style={{ width }}
        >
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

          {/* Resize handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize
                       hover:bg-primary/20 active:bg-primary/40 transition-colors"
            onMouseDown={handleMouseDown}
          />
        </aside>
      )}
    </Queryable>
  );
}
