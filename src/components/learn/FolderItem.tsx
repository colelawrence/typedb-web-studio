/**
 * Expandable folder item in the Learn sidebar.
 *
 * Shows:
 * - Expand/collapse chevron
 * - Folder label
 * - Progress percentage badge
 * - Child sections when expanded
 */

import { ChevronRight } from "lucide-react";
import { Queryable } from "@/vm/components";
import type { LearnFolderVM } from "@/vm/learn";
import { ProgressIndicator, ProgressBadge } from "./ProgressIndicator";
import { SectionItem } from "./SectionItem";

export interface FolderItemProps {
  vm: LearnFolderVM;
}

export function FolderItem({ vm }: FolderItemProps) {
  return (
    <div>
      {/* Folder header */}
      <Queryable query={vm.expanded$}>
        {(expanded) => (
          <Queryable query={vm.progressState$}>
            {(progressState) => (
              <Queryable query={vm.progressPercent$}>
                {(progressPercent) => (
                  <button
                    onClick={vm.toggleExpanded}
                    className="flex items-center gap-1 w-full h-row px-1 rounded-md
                               text-dense-sm font-medium text-foreground
                               hover:bg-accent/50 transition-colors"
                  >
                    <ChevronRight
                      className={`size-4 text-muted-foreground transition-transform ${
                        expanded ? "rotate-90" : ""
                      }`}
                    />
                    <ProgressIndicator state={progressState} className="mr-1" />
                    <span className="flex-1 text-left truncate">{vm.label}</span>
                    <ProgressBadge percent={progressPercent} />
                  </button>
                )}
              </Queryable>
            )}
          </Queryable>
        )}
      </Queryable>

      {/* Child sections */}
      <Queryable query={vm.expanded$}>
        {(expanded) =>
          expanded ? (
            <div className="ml-4 mt-0.5 space-y-0.5">
              <Queryable query={vm.sections$}>
                {(sections) =>
                  sections.map((section) => (
                    <SectionItem key={section.key} vm={section} />
                  ))
                }
              </Queryable>
            </div>
          ) : null
        }
      </Queryable>
    </div>
  );
}
