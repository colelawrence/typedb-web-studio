/**
 * Learn (Curriculum) section in the sidebar.
 *
 * Shows:
 * - Collapsible "LEARN" header with overall progress
 * - Tree of curriculum folders and sections
 */

import { ChevronDown } from "lucide-react";
import { Queryable } from "@/vm/components";
import type { LearnSectionVM } from "@/vm/learn";
import { ProgressBadge } from "./ProgressIndicator";
import { FolderItem } from "./FolderItem";

export interface LearnSectionProps {
  vm: LearnSectionVM;
}

export function LearnSection({ vm }: LearnSectionProps) {
  return (
    <div>
      {/* Section header */}
      <Queryable query={vm.collapsed$}>
        {(collapsed) => (
          <Queryable query={vm.progressPercent$}>
            {(progressPercent) => (
              <button
                onClick={vm.toggleCollapsed}
                className="flex items-center gap-2 w-full h-row px-2
                           text-dense-xs font-semibold uppercase tracking-wider
                           text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  className={`size-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                />
                <span className="flex-1 text-left">{vm.label}</span>
                <ProgressBadge percent={progressPercent} />
              </button>
            )}
          </Queryable>
        )}
      </Queryable>

      {/* Folders tree */}
      <Queryable query={vm.collapsed$}>
        {(collapsed) =>
          !collapsed ? (
            <div className="mt-1 space-y-0.5">
              <Queryable query={vm.folders$}>
                {(folders) =>
                  folders.map((folder) => (
                    <FolderItem key={folder.key} vm={folder} />
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
