/**
 * Reference documentation section in the sidebar.
 *
 * Shows:
 * - Collapsible "REFERENCE" header
 * - Tree of reference documentation folders and items
 */

import { ChevronDown, ChevronRight } from "lucide-react";
import { Queryable } from "@/vm/components";
import type { ReferenceSectionVM, ReferenceFolderVM, ReferenceItemVM } from "@/vm/learn";

export interface ReferenceSectionProps {
  vm: ReferenceSectionVM;
}

export function ReferenceSection({ vm }: ReferenceSectionProps) {
  return (
    <div>
      {/* Section header */}
      <Queryable query={vm.collapsed$}>
        {(collapsed) => (
          <button
            type="button"
            onClick={vm.toggleCollapsed}
            className="flex items-center gap-2 w-full h-row px-2
                       text-dense-xs font-semibold uppercase tracking-wider
                       text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={`size-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            />
            <span className="flex-1 text-left">{vm.label}</span>
          </button>
        )}
      </Queryable>

      {/* Folders tree */}
      <Queryable query={vm.collapsed$}>
        {(collapsed) =>
          !collapsed ? (
            <Queryable query={vm.folders$}>
              {(folders) =>
                folders.length > 0 ? (
                  <div className="mt-1 space-y-0.5">
                    {folders.map((folder) => (
                      <ReferenceFolderItem key={folder.key} vm={folder} />
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-2 text-dense-xs text-muted-foreground italic">
                    No reference documentation available
                  </div>
                )
              }
            </Queryable>
          ) : null
        }
      </Queryable>
    </div>
  );
}

function ReferenceFolderItem({ vm }: { vm: ReferenceFolderVM }) {
  return (
    <div>
      {/* Folder header */}
      <Queryable query={vm.expanded$}>
        {(expanded) => (
          <button
            type="button"
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
            <span className="flex-1 text-left truncate">{vm.label}</span>
          </button>
        )}
      </Queryable>

      {/* Child items */}
      <Queryable query={vm.expanded$}>
        {(expanded) =>
          expanded ? (
            <div className="ml-4 mt-0.5 space-y-0.5">
              <Queryable query={vm.items$}>
                {(items) =>
                  items.map((item) => (
                    <ReferenceItemLink key={item.key} vm={item} />
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

function ReferenceItemLink({ vm }: { vm: ReferenceItemVM }) {
  return (
    <Queryable query={vm.isActive$}>
      {(isActive) => (
        <button
          type="button"
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
          <span className="truncate">{vm.title}</span>
        </button>
      )}
    </Queryable>
  );
}
