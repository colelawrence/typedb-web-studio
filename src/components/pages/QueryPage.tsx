/**
 * Query page component for TypeDB Studio.
 *
 * Main query editor with sidebar, editor, results, and history.
 */

import type { QueryPageVM } from "@/vm";
import { Queryable } from "@/vm/components";
import { Code, Database, Play, Loader2 } from "lucide-react";

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
        {placeholder.type === "noServer" ? (
          <Database className="w-12 h-12 mx-auto text-muted-foreground" />
        ) : (
          <Database className="w-12 h-12 mx-auto text-muted-foreground" />
        )}
        <p className="text-lg text-muted-foreground">{placeholder.message}</p>
        <button
          onClick={placeholder.action}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
        >
          {placeholder.actionLabel}
        </button>
      </div>
    </div>
  );
}

function QueryPageContent({ vm }: { vm: QueryPageVM }) {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <QuerySidebar vm={vm.sidebar} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Editor */}
        <div className="flex-1 flex flex-col border-b border-border">
          <QueryEditor vm={vm.editor} />
        </div>

        {/* Results */}
        <div className="h-64 flex flex-col">
          <QueryResults vm={vm.results} />
        </div>

        {/* History Bar */}
        <QueryHistoryBar vm={vm.historyBar} />
      </div>
    </div>
  );
}

function QuerySidebar({ vm }: { vm: QueryPageVM["sidebar"] }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {/* Schema Section */}
        <div className="space-y-2">
          <button
            onClick={vm.schemaSection.toggleCollapsed}
            className="flex items-center justify-between w-full text-sm font-medium text-foreground"
          >
            <span>{vm.schemaSection.label}</span>
          </button>
          <Queryable query={vm.schemaSection.collapsed$}>
            {(collapsed) =>
              !collapsed && (
                <div className="pl-2 text-sm text-muted-foreground">
                  <p>Schema tree placeholder</p>
                </div>
              )
            }
          </Queryable>
        </div>

        {/* Saved Queries Section */}
        <div className="space-y-2">
          <button
            onClick={vm.savedQueriesSection.toggleCollapsed}
            className="flex items-center justify-between w-full text-sm font-medium text-foreground"
          >
            <span>{vm.savedQueriesSection.label}</span>
          </button>
          <Queryable query={vm.savedQueriesSection.collapsed$}>
            {(collapsed) =>
              !collapsed && (
                <div className="pl-2 text-sm text-muted-foreground">
                  <p>Saved queries tree placeholder</p>
                </div>
              )
            }
          </Queryable>
        </div>
      </div>
    </div>
  );
}

function QueryEditor({ vm }: { vm: QueryPageVM["editor"] }) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <Queryable query={vm.header.titleDisplay$}>
          {(title) => (
            <span className="text-sm font-medium text-foreground">{title}</span>
          )}
        </Queryable>

        <div className="flex items-center gap-2">
          <Queryable query={vm.actions.run.disabled$}>
            {(disabled) => (
              <Queryable query={vm.actions.run.isRunning$}>
                {(isRunning) => (
                  <button
                    onClick={vm.actions.run.click}
                    disabled={disabled !== null || isRunning}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium
                      bg-primary text-primary-foreground
                      ${disabled !== null || isRunning
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-primary/90"
                      }
                    `}
                    title={disabled?.displayReason}
                  >
                    {isRunning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Run
                  </button>
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
              className="w-full h-full p-4 bg-background border border-border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </Queryable>
      </div>
    </div>
  );
}

function QueryResults({ vm }: { vm: QueryPageVM["results"] }) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Tabs */}
      <div className="flex items-center border-b border-border px-4">
        {(["log", "table", "graph", "raw"] as const).map((tab) => (
          <Queryable key={tab} query={vm.selectedTab$}>
            {(selectedTab) => (
              <button
                onClick={() => vm.setTab(tab)}
                className={`
                  px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
                  ${selectedTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )}
          </Queryable>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        <Queryable query={vm.selectedTab$}>
          {(selectedTab) => {
            switch (selectedTab) {
              case "log":
                return (
                  <Queryable query={vm.log.content$}>
                    {(content) => (
                      <pre className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                        {content || "// Query results will appear here"}
                      </pre>
                    )}
                  </Queryable>
                );
              case "table":
                return (
                  <Queryable query={vm.table.statusMessage$}>
                    {(message) => (
                      <p className="text-sm text-muted-foreground">{message}</p>
                    )}
                  </Queryable>
                );
              case "graph":
                return (
                  <Queryable query={vm.graph.statusMessage$}>
                    {(message) => (
                      <p className="text-sm text-muted-foreground">{message}</p>
                    )}
                  </Queryable>
                );
              case "raw":
                return (
                  <Queryable query={vm.raw.content$}>
                    {(content) => (
                      <pre className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">
                        {content || "// Raw JSON output will appear here"}
                      </pre>
                    )}
                  </Queryable>
                );
            }
          }}
        </Queryable>
      </div>
    </div>
  );
}

function QueryHistoryBar({ vm }: { vm: QueryPageVM["historyBar"] }) {
  return (
    <Queryable query={vm.isExpanded$}>
      {(isExpanded) => (
        <div className={`border-t border-border bg-card ${isExpanded ? "h-32" : "h-10"}`}>
          <button
            onClick={vm.toggle}
            className="flex items-center justify-between w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <span>History</span>
            <Code className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
          {isExpanded && (
            <div className="px-4 pb-2">
              <Queryable query={vm.isEmpty$}>
                {(isEmpty) =>
                  isEmpty ? (
                    <p className="text-sm text-muted-foreground">No recent queries</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Query history entries</p>
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
