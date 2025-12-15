/**
 * Individual section/lesson item in the Learn sidebar.
 *
 * Shows:
 * - Progress indicator (checkmark/circle)
 * - Section title
 * - Active state highlighting
 * - Context badge (if section requires specific context)
 */

import { Queryable } from "@/vm/components";
import type { LearnSectionItemVM } from "@/vm/learn";
import { ProgressIndicator } from "./ProgressIndicator";

export interface SectionItemProps {
  vm: LearnSectionItemVM;
}

export function SectionItem({ vm }: SectionItemProps) {
  return (
    <Queryable query={vm.isActive$}>
      {(isActive) => (
        <Queryable query={vm.progressState$}>
          {(progressState) => (
            <button
              onClick={vm.select}
              className={`
                flex items-center gap-2 w-full h-row px-2 rounded-md text-left
                text-dense-sm transition-colors
                ${isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
                }
              `}
            >
              <ProgressIndicator state={progressState} />
              <span className="flex-1 truncate">{vm.title}</span>
              {vm.context && (
                <span className="text-dense-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {vm.context}
                </span>
              )}
            </button>
          )}
        </Queryable>
      )}
    </Queryable>
  );
}
