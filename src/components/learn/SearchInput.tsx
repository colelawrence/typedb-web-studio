/**
 * Search input for the Learn sidebar.
 *
 * Features:
 * - Search icon prefix
 * - Clear button when query is non-empty
 * - Placeholder text
 */

import { Search, X } from "lucide-react";
import { Queryable } from "@/vm/components";
import type { LearnSearchVM } from "@/vm/learn";

export interface SearchInputProps {
  vm: LearnSearchVM;
}

export function SearchInput({ vm }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Queryable query={vm.query$}>
        {(query) => (
          <input
            type="text"
            value={query}
            onChange={(e) => vm.setQuery(e.target.value)}
            placeholder={vm.placeholder}
            className="w-full h-default pl-9 pr-8 bg-background border border-input rounded-md
                       text-dense-sm placeholder:text-muted-foreground
                       focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        )}
      </Queryable>
      <Queryable query={vm.isActive$}>
        {(isActive) =>
          isActive ? (
            <button
              onClick={vm.clear}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center
                         rounded hover:bg-accent transition-colors"
              title="Clear search"
            >
              <X className="size-3.5 text-muted-foreground" />
            </button>
          ) : null
        }
      </Queryable>
    </div>
  );
}
