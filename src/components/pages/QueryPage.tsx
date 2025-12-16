/**
 * Query page component for TypeDB Studio.
 *
 * Main query editor with sidebar, editor, results, and history.
 * Updated with Dense-Core tokens (Phase 4: Sidebar, Phase 5: Workspace)
 */

import type { QueryPageVM } from "@/vm";
import { Queryable } from "@/vm/components";
import {
  Database,
  Play,
  ChevronRight,
  BookOpen,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { LearnSection, ReferenceSection, DocumentViewer } from "../learn";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

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

function PlaceholderView({
  placeholder,
}: {
  placeholder: NonNullable<
    QueryPageVM extends { placeholder$: import("@/vm").Queryable<infer T> }
      ? T
      : never
  >;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center space-y-4">
        <Database className="size-12 mx-auto text-muted-foreground" />
        <p className="text-dense-lg text-muted-foreground">
          {placeholder.message}
        </p>
        <Button onClick={placeholder.action}>{placeholder.actionLabel}</Button>
      </div>
    </div>
  );
}

function QueryPageContent({ vm }: { vm: QueryPageVM }) {
  return (
    <PanelGroup
      direction="horizontal"
      autoSaveId="query-page-main"
      className="h-full"
    >
      {/* Sidebar Panel - resizable width */}
      <Panel
        defaultSize={20}
        minSize={15}
        maxSize={40}
        order={1}
        id="sidebar-panel"
      >
        <aside className="h-full border-r border-border bg-card flex flex-col">
          <QuerySidebar vm={vm.sidebar} />
        </aside>
      </Panel>

      <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors cursor-col-resize" />

      {/* Main Content Panel */}
      <Panel defaultSize={80} minSize={40} order={2} id="main-content-panel">
        <PanelGroup
          direction="horizontal"
          autoSaveId="query-editor-docs-split"
          className="h-full"
        >
          {/* Docs Panel (optional, left side) */}
          <Queryable query={vm.docsViewer.isVisible$}>
            {(isDocsVisible) =>
              isDocsVisible ? (
                <>
                  <Panel
                    defaultSize={40}
                    minSize={20}
                    maxSize={70}
                    order={1}
                    id="docs-panel"
                  >
                    <DocsPane vm={vm.docsViewer} />
                  </Panel>
                  <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors cursor-col-resize" />
                </>
              ) : null
            }
          </Queryable>

          {/* Query Editor Panel with Results and History */}
          <Panel
            defaultSize={60}
            minSize={30}
            order={2}
            id="editor-panel"
          >
            <PanelGroup
              direction="vertical"
              autoSaveId="query-editor-results"
              className="h-full"
            >
              {/* Editor */}
              <Panel defaultSize={65} minSize={20} order={1} id="editor-area-panel" className="flex flex-col justify-stretch">
                <QueryEditor vm={vm.editor} />
              </Panel>

              <PanelResizeHandle className="h-1 bg-border hover:bg-accent transition-colors cursor-row-resize" />

              {/* Results Panel */}
              <Panel defaultSize={25} minSize={10} order={2} id="results-panel">
                <QueryResults vm={vm.results} />
              </Panel>

              <PanelResizeHandle className="h-1 bg-border hover:bg-accent transition-colors cursor-row-resize" />

              {/* History Bar Panel - collapsible */}
              <Panel
                defaultSize={10}
                minSize={3}
                maxSize={30}
                collapsible
                collapsedSize={3}
                order={3}
                id="history-panel"
              >
                <QueryHistoryBar vm={vm.historyBar} />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}

function DocsPane({ vm }: { vm: QueryPageVM["docsViewer"] }) {
  return (
    <div className="flex flex-col h-full bg-card">
      {/* Document content */}
      <div className="flex-1 overflow-auto">
        <DocumentViewer vm={vm} />
      </div>
    </div>
  );
}

function QuerySidebar({ vm }: { vm: QueryPageVM["sidebar"] }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Learn Section - First in sidebar */}
      {vm.learnSection && (
        <SidebarSection
          label={vm.learnSection.label}
          collapsed$={vm.learnSection.collapsed$}
          onToggle={vm.learnSection.toggleCollapsed}
          headerIcon={<BookOpen className="size-4" />}
        >
          <div className="px-2 py-2 space-y-1">
            {/* Curriculum tree */}
            <LearnSection vm={vm.learnSection.curriculum} />

            {/* Reference tree */}
            <ReferenceSection vm={vm.learnSection.reference} />

            {/* Open full Learn page link */}
            <button
              onClick={vm.learnSection.openFullLearnPage}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 mt-2
                         text-dense-xs text-muted-foreground hover:text-foreground
                         transition-colors"
            >
              <ExternalLink className="size-3" />
              <span>Open full Learn page</span>
            </button>
          </div>
        </SidebarSection>
      )}

      {/* Schema Section - Task 4.2: h-header section headers */}
      <SidebarSection
        label={vm.schemaSection.label}
        collapsed$={vm.schemaSection.collapsed$}
        onToggle={vm.schemaSection.toggleCollapsed}
      >
        <div className="px-3 py-2">
          <p className="text-dense-sm text-muted-foreground">
            Schema tree placeholder
          </p>
        </div>
      </SidebarSection>

      {/* Saved Queries Section - Task 4.2 */}
      <SidebarSection
        label={vm.savedQueriesSection.label}
        collapsed$={vm.savedQueriesSection.collapsed$}
        onToggle={vm.savedQueriesSection.toggleCollapsed}
      >
        <div className="px-3 py-2">
          <p className="text-dense-sm text-muted-foreground">
            Saved queries tree placeholder
          </p>
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
  headerIcon,
}: {
  label: string;
  collapsed$: import("@/vm").Queryable<boolean>;
  onToggle: () => void;
  children: React.ReactNode;
  headerIcon?: React.ReactNode;
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
              <span className="flex items-center gap-2">
                {headerIcon}
                {label}
              </span>
              <ChevronRight
                className={`size-4 transition-transform duration-150 ${
                  collapsed ? "" : "rotate-90"
                }`}
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
            <span className="text-dense-sm font-medium text-foreground truncate">
              {title}
            </span>
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

      {/* Editor Area */}
      <div className="overflow-y-auto bg-muted/30 relative grow">
        <Queryable query={vm.codeEditor.text$}>
          {(text) => (
            <textarea
              value={text}
              onChange={(e) => vm.codeEditor.updateText(e.target.value)}
              placeholder="// Enter your TypeQL query here..."
              className="
                w-full p-4 absolute inset-0 min-h-40
                font-mono text-dense-sm
                resize-none
                focus:outline-none
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
          <TabsList
            variant="underline"
            className="h-default px-2 border-b border-border"
          >
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
                  <p className="text-dense-sm text-muted-foreground">
                    {message}
                  </p>
                )}
              </Queryable>
            </TabsContent>

            <TabsContent value="graph" className="m-0">
              <Queryable query={vm.graph.statusMessage$}>
                {(message) => (
                  <p className="text-dense-sm text-muted-foreground">
                    {message}
                  </p>
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
    <div className="h-full flex flex-col border-t border-border bg-card">
      {/* Header - always visible */}
      <button
        onClick={vm.toggle}
        className="
          flex items-center justify-between w-full h-default px-3 shrink-0
          text-dense-sm text-muted-foreground hover:text-foreground
          transition-colors
        "
      >
        <span className="font-medium">History</span>
        <Queryable query={vm.isExpanded$}>
          {(isExpanded) => (
            <ChevronRight
              className={`size-4 transition-transform duration-150 ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          )}
        </Queryable>
      </button>

      {/* Scrollable content area - fills remaining space */}
      <div className="flex-1 px-3 pb-2 overflow-y-auto min-h-0">
        <Queryable query={vm.isEmpty$}>
          {(isEmpty) =>
            isEmpty ? (
              <p className="text-dense-xs text-muted-foreground py-2">
                No recent queries
              </p>
            ) : (
              <p className="text-dense-xs text-muted-foreground py-2">
                Query history entries will appear here
              </p>
            )
          }
        </Queryable>
      </div>
    </div>
  );
}
