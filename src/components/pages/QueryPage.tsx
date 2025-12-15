/**
 * Query page component for TypeDB Studio.
 *
 * Main query editor with sidebar, editor, results, and history.
 * Updated with Dense-Core tokens (Phase 4: Sidebar, Phase 5: Workspace)
 */

import type { QueryPageVM } from "@/vm";
import { Queryable } from "@/vm/components";
import { Database, Play, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";

export function QueryPage({ vm }: { vm: QueryPageVM }) {
  return (
    <Queryable query={vm.placeholder$}>
      {(placeholder) =>
        placeholder ? (
          <PlaceholderView placeholder={placeholder} />
        ) : (
          <QueryPageContent vm={vm} />
        )
      }
    </Queryable>
  );
}

function PlaceholderView({ placeholder }: { placeholder: NonNullable<QueryPageVM extends { placeholder$: import("@/vm").Queryable<infer T> } ? T : never> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center space-y-4">
        <Database className="size-12 mx-auto text-muted-foreground" />
        <p className="text-dense-lg text-muted-foreground">{placeholder.message}</p>
        <Button onClick={placeholder.action}>
          {placeholder.actionLabel}
        </Button>
      </div>
    </div>
  );
}

function QueryPageContent({ vm }: { vm: QueryPageVM }) {
  return (
    <div className="flex h-full">
      {/* Sidebar - Task 4.1: 280px default width */}
      <aside className="w-[280px] min-w-[200px] max-w-[50%] border-r border-border bg-card flex flex-col">
        <QuerySidebar vm={vm.sidebar} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Editor - Task 5.1 */}
        <div className="flex-1 flex flex-col border-b border-border">
          <QueryEditor vm={vm.editor} />
        </div>

        {/* Results - Task 5.4, 5.5 */}
        <div className="h-64 flex flex-col">
          <QueryResults vm={vm.results} />
        </div>

        {/* History Bar - Task 5.6 */}
        <QueryHistoryBar vm={vm.historyBar} />
      </div>
    </div>
  );
}

function QuerySidebar({ vm }: { vm: QueryPageVM["sidebar"] }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Schema Section - Task 4.2: h-header section headers */}
      <SidebarSection
        label={vm.schemaSection.label}
        collapsed$={vm.schemaSection.collapsed$}
        onToggle={vm.schemaSection.toggleCollapsed}
      >
        <div className="px-3 py-2">
          <p className="text-dense-sm text-muted-foreground">Schema tree placeholder</p>
        </div>
      </SidebarSection>

      {/* Saved Queries Section - Task 4.2 */}
      <SidebarSection
        label={vm.savedQueriesSection.label}
        collapsed$={vm.savedQueriesSection.collapsed$}
        onToggle={vm.savedQueriesSection.toggleCollapsed}
      >
        <div className="px-3 py-2">
          <p className="text-dense-sm text-muted-foreground">Saved queries tree placeholder</p>
        </div>
      </SidebarSection>
    </div>
  );
}

// Task 4.2: Collapsible section header with Dense-Core styling
function SidebarSection({
  label,
  collapsed$,
  onToggle,
  children,
}: {
  label: string;
  collapsed$: import("@/vm").Queryable<boolean>;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <Queryable query={collapsed$}>
        {(collapsed) => (
          <>
            <button
              onClick={onToggle}
              className="
                flex items-center justify-between w-full h-header px-3
                text-dense-xs font-semibold uppercase tracking-wider
                text-muted-foreground hover:text-foreground
                transition-colors duration-150
              "
            >
              <span>{label}</span>
              <ChevronRight
                className={`size-4 transition-transform duration-150 ${collapsed ? "" : "rotate-90"}`}
              />
            </button>
            {!collapsed && (
              <div className="animate-in slide-in-from-top-1 duration-150">
                {children}
              </div>
            )}
          </>
        )}
      </Queryable>
    </div>
  );
}

function QueryEditor({ vm }: { vm: QueryPageVM["editor"] }) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header - Task 5.1: h-row header */}
      <div className="flex items-center justify-between h-row px-3 gap-2 border-b border-border bg-card">
        <Queryable query={vm.header.titleDisplay$}>
          {(title) => (
            <span className="text-dense-sm font-medium text-foreground truncate">{title}</span>
          )}
        </Queryable>

        {/* Actions - Task 5.2 */}
        <div className="flex items-center gap-2">
          <Queryable query={vm.actions.run.disabled$}>
            {(disabled) => (
              <Queryable query={vm.actions.run.isRunning$}>
                {(isRunning) => (
                  <Button
                    density="compact"
                    onClick={vm.actions.run.click}
                    disabled={disabled !== null}
                    loading={isRunning}
                  >
                    <Play className="size-4" />
                    Run
                  </Button>
                )}
              </Queryable>
            )}
          </Queryable>
        </div>
      </div>

      {/* Editor Area - Placeholder */}
      <div className="flex-1 p-4">
        <Queryable query={vm.codeEditor.text$}>
          {(text) => (
            <textarea
              value={text}
              onChange={(e) => vm.codeEditor.updateText(e.target.value)}
              placeholder="// Enter your TypeQL query here..."
              className="
                w-full h-full p-4
                bg-background border border-border rounded-md
                font-mono text-dense-sm
                resize-none
                focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                placeholder:text-muted-foreground
              "
            />
          )}
        </Queryable>
      </div>
    </div>
  );
}

function QueryResults({ vm }: { vm: QueryPageVM["results"] }) {
  return (
    <Queryable query={vm.selectedTab$}>
      {(selectedTab) => (
        <Tabs
          value={selectedTab}
          onValueChange={(tab) => vm.setTab(tab as typeof selectedTab)}
          className="flex-1 flex flex-col"
        >
          {/* Tab bar - Task 5.4: h-default bar with h-compact tabs */}
          <TabsList variant="underline" className="h-default px-2 border-b border-border">
            <TabsTrigger value="log">Log</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>

          {/* Content */}
          <div className="flex-1 p-4 overflow-auto">
            <TabsContent value="log" className="m-0">
              <Queryable query={vm.log.content$}>
                {(content) => (
                  <pre className="text-dense-sm text-muted-foreground font-mono whitespace-pre-wrap">
                    {content || "// Query results will appear here"}
                  </pre>
                )}
              </Queryable>
            </TabsContent>

            <TabsContent value="table" className="m-0">
              <Queryable query={vm.table.statusMessage$}>
                {(message) => (
                  <p className="text-dense-sm text-muted-foreground">{message}</p>
                )}
              </Queryable>
            </TabsContent>

            <TabsContent value="graph" className="m-0">
              <Queryable query={vm.graph.statusMessage$}>
                {(message) => (
                  <p className="text-dense-sm text-muted-foreground">{message}</p>
                )}
              </Queryable>
            </TabsContent>

            <TabsContent value="raw" className="m-0">
              <Queryable query={vm.raw.content$}>
                {(content) => (
                  <pre className="text-dense-sm text-muted-foreground font-mono whitespace-pre-wrap">
                    {content || "// Raw JSON output will appear here"}
                  </pre>
                )}
              </Queryable>
            </TabsContent>
          </div>
        </Tabs>
      )}
    </Queryable>
  );
}

function QueryHistoryBar({ vm }: { vm: QueryPageVM["historyBar"] }) {
  return (
    <Queryable query={vm.isExpanded$}>
      {(isExpanded) => (
        <div
          className={`
            border-t border-border bg-card transition-all duration-150
            ${isExpanded ? "h-32" : "h-default"}
          `}
        >
          {/* Collapsed bar - Task 5.6: h-default */}
          <button
            onClick={vm.toggle}
            className="
              flex items-center justify-between w-full h-default px-3
              text-dense-sm text-muted-foreground hover:text-foreground
              transition-colors
            "
          >
            <span className="font-medium">History</span>
            <ChevronRight
              className={`size-4 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            />
          </button>

          {/* Expanded entries - Task 5.6: h-row each */}
          {isExpanded && (
            <div className="px-3 pb-2 overflow-y-auto" style={{ maxHeight: "calc(100% - 36px)" }}>
              <Queryable query={vm.isEmpty$}>
                {(isEmpty) =>
                  isEmpty ? (
                    <p className="text-dense-xs text-muted-foreground py-2">No recent queries</p>
                  ) : (
                    <p className="text-dense-xs text-muted-foreground py-2">Query history entries will appear here</p>
                  )
                }
              </Queryable>
            </div>
          )}
        </div>
      )}
    </Queryable>
  );
}
