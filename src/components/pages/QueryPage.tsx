/**
 * Query page component for TypeDB Studio.
 *
 * Main query editor with sidebar, editor, results, and history.
 * Updated with Dense-Core tokens (Phase 4: Sidebar, Phase 5: Workspace)
 */

import { useEffect, useRef } from "react";
import type { QueryPageVM } from "@/vm";
import { Queryable } from "@/vm/components";
import { useQuery } from "@livestore/react";
import {
  Database,
  Play,
  ChevronRight,
  ChevronDown,
  BookOpen,
  ExternalLink,
  Loader2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Network,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { LearnSection, ReferenceSection, DocumentViewer } from "../learn";
import type { SchemaGraphPanelVM } from "@/vm/shared/schema-graph-panel.vm";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { TypeQLEditor } from "../editor";

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
  const isSchemaVisible = useQuery(vm.schemaViewer.isVisible$);
  const isDocsVisible = useQuery(vm.docsViewer.isVisible$);
  const showReferencePanel = isSchemaVisible || isDocsVisible;

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
          <QuerySidebar vm={vm.sidebar} schemaViewer={vm.schemaViewer} />
        </aside>
      </Panel>

      <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors cursor-col-resize" />

      {/* Main Content Panel */}
      <Panel defaultSize={80} minSize={40} order={2} id="main-content-panel">
        <PanelGroup
          direction="horizontal"
          autoSaveId="query-editor-reference-split"
          className="h-full"
        >
          {/* Query Editor Panel with Results and History */}
          <Panel
            defaultSize={showReferencePanel ? 60 : 100}
            minSize={30}
            order={1}
            id="editor-panel"
          >
            <PanelGroup
              direction="vertical"
              autoSaveId="query-editor-results"
              className="h-full"
            >
              {/* Editor */}
              <Panel defaultSize={65} minSize={20} order={1} id="editor-area-panel" className="flex flex-col justify-stretch">
                <QueryEditor vm={vm.editor} schemaViewer={vm.schemaViewer} />
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

          {/* Reference Panel (Schema + Docs) - right side */}
          {showReferencePanel && (
            <>
              <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors cursor-col-resize" />
              <Panel
                defaultSize={40}
                minSize={20}
                maxSize={70}
                order={2}
                id="reference-panel"
              >
                <ReferencePanel
                  schemaViewer={vm.schemaViewer}
                  docsViewer={vm.docsViewer}
                  isSchemaVisible={isSchemaVisible}
                  isDocsVisible={isDocsVisible}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}

function ReferencePanel({
  schemaViewer,
  docsViewer,
  isSchemaVisible,
  isDocsVisible,
}: {
  schemaViewer: SchemaGraphPanelVM;
  docsViewer: QueryPageVM["docsViewer"];
  isSchemaVisible: boolean;
  isDocsVisible: boolean;
}) {
  // Both visible: vertical split
  if (isSchemaVisible && isDocsVisible) {
    return (
      <PanelGroup
        direction="vertical"
        autoSaveId="reference-schema-docs-split"
        className="h-full"
      >
        <Panel defaultSize={50} minSize={20} order={1} id="schema-graph-panel">
          <SchemaGraphPane vm={schemaViewer} />
        </Panel>
        <PanelResizeHandle className="h-1 bg-border hover:bg-accent transition-colors cursor-row-resize" />
        <Panel defaultSize={50} minSize={20} order={2} id="docs-panel">
          <DocsPane vm={docsViewer} />
        </Panel>
      </PanelGroup>
    );
  }

  // Only schema visible
  if (isSchemaVisible) {
    return <SchemaGraphPane vm={schemaViewer} />;
  }

  // Only docs visible
  return <DocsPane vm={docsViewer} />;
}

function SchemaGraphPane({ vm }: { vm: SchemaGraphPanelVM }) {
  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header with close button */}
      <div className="flex items-center justify-between h-row px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Network className="size-4 text-muted-foreground" />
          <span className="text-dense-sm font-medium">Schema Graph</span>
        </div>
        <button
          onClick={vm.hide}
          className="p-1 rounded hover:bg-accent transition-colors"
          title="Close schema panel"
        >
          <X className="size-4 text-muted-foreground" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between h-default px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <button
            onClick={vm.graph.zoom.zoomOut}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="size-4" />
          </button>
          <Queryable query={vm.graph.zoom.level$}>
            {(level) => (
              <span className="text-dense-xs text-muted-foreground w-12 text-center">
                {Math.round(level * 100)}%
              </span>
            )}
          </Queryable>
          <button
            onClick={vm.graph.zoom.zoomIn}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            onClick={vm.graph.zoom.reset}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Reset view"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        {/* Filter */}
        <Queryable query={vm.graph.highlightFilter$}>
          {(filter) => (
            <Input
              type="text"
              value={filter ?? ""}
              onChange={(e) => vm.graph.setHighlightFilter(e.target.value || null)}
              placeholder="Filter types..."
              className="w-40"
              density="compact"
            />
          )}
        </Queryable>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <Queryable query={vm.graph.status$}>
          {(status) => (
            <>
              {status === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-dense-sm text-muted-foreground">Loading schema...</p>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Queryable query={vm.graph.statusMessage$}>
                      {(message) => (
                        <p className="text-dense-sm text-destructive">{message}</p>
                      )}
                    </Queryable>
                    <Button variant="outline" density="compact" onClick={vm.graph.retry}>
                      <RefreshCw className="size-4" />
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {status === "empty" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Queryable query={vm.graph.statusMessage$}>
                    {(message) => (
                      <div className="text-center space-y-3">
                        <Database className="size-12 mx-auto text-muted-foreground/50" />
                        <p className="text-dense-sm text-muted-foreground">{message}</p>
                      </div>
                    )}
                  </Queryable>
                </div>
              )}

              {/* Canvas container for graph library */}
              <div
                ref={vm.graph.setCanvasRef}
                className={`w-full h-full ${status !== "ready" ? "opacity-0" : ""}`}
              />
            </>
          )}
        </Queryable>

        {/* Selected Node Info Panel */}
        <Queryable query={vm.graph.selectedNode$}>
          {(node) =>
            node && (
              <div className="absolute top-4 right-4 w-56 p-3 rounded-lg border border-border bg-card shadow-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-dense-sm font-semibold text-foreground">{node.label}</h3>
                    <span className={`px-2 py-0.5 rounded text-dense-xs font-medium ${
                      node.kind === "entity" ? "bg-graph-entity/10 text-graph-entity" :
                      node.kind === "relation" ? "bg-graph-relation/10 text-graph-relation" :
                      "bg-graph-attribute/10 text-graph-attribute"
                    }`}>
                      {node.kind}
                    </span>
                  </div>
                  {node.isAbstract && (
                    <p className="text-dense-xs text-muted-foreground italic">Abstract type</p>
                  )}
                  {node.supertype && (
                    <p className="text-dense-xs text-muted-foreground">
                      Extends: <span className="text-foreground">{node.supertype}</span>
                    </p>
                  )}
                  {Object.entries(node.details).map(([key, value]) => (
                    <div key={key} className="text-dense-xs">
                      <span className="text-muted-foreground">{key}:</span>{" "}
                      <span className="text-foreground">{value}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Button density="compact" onClick={node.generateFetchQuery} className="flex-1 text-dense-xs">
                      Query
                    </Button>
                    <Button variant="outline" density="compact" onClick={node.highlight} className="flex-1 text-dense-xs">
                      Highlight
                    </Button>
                  </div>
                </div>
              </div>
            )
          }
        </Queryable>

        {/* Hover Tooltip */}
        <Queryable query={vm.graph.hoveredNode$}>
          {(node) =>
            node && (
              <div className="absolute bottom-4 left-4 px-3 py-2 rounded border border-border bg-card shadow-lg">
                <span className="text-dense-sm font-medium text-foreground">{node.label}</span>
                <span className="text-dense-xs text-muted-foreground ml-2">({node.kind})</span>
              </div>
            )
          }
        </Queryable>
      </div>
    </div>
  );
}

function DocsPane({ vm }: { vm: QueryPageVM["docsViewer"] }) {
  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header with close button */}
      <div className="flex items-center justify-between h-row px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-muted-foreground" />
          <span className="text-dense-sm font-medium">Documentation</span>
        </div>
        <button
          onClick={vm.hide}
          className="p-1 rounded hover:bg-accent transition-colors"
          title="Close docs panel"
        >
          <X className="size-4 text-muted-foreground" />
        </button>
      </div>
      {/* Document content */}
      <div className="flex-1 overflow-auto">
        <DocumentViewer vm={vm} />
      </div>
    </div>
  );
}

function QuerySidebar({ vm, schemaViewer }: { vm: QueryPageVM["sidebar"]; schemaViewer: SchemaGraphPanelVM }) {
  return (
    <PanelGroup direction="vertical" autoSaveId="query-sidebar-sections" className="h-full">
      {/* Top sections: Schema + Saved Queries - resizable */}
      <Panel defaultSize={70} minSize={10} order={1} id="sidebar-top-sections">
        <div className="h-full overflow-y-auto">
          {/* Schema Section */}
          <SidebarSectionWithAction
            label={vm.schemaSection.label}
            collapsed$={vm.schemaSection.collapsed$}
            onToggle={vm.schemaSection.toggleCollapsed}
            actionIcon={<Network className="size-3.5" />}
            actionTitle="Toggle schema graph panel"
            onAction={schemaViewer.toggle}
            actionActive$={schemaViewer.isVisible$}
          >
            <div className="px-2 py-2">
              <SchemaTree vm={vm.schemaSection.tree} />
            </div>
          </SidebarSectionWithAction>

          {/* Saved Queries Section */}
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
      </Panel>

      {/* Learn Section - pinned at bottom, resizable */}
      {vm.learnSection && <LearnSectionPanel vm={vm.learnSection} />}
    </PanelGroup>
  );
}

function LearnSectionPanel({
  vm,
}: {
  vm: NonNullable<QueryPageVM["sidebar"]["learnSection"]>;
}) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const isCollapsed = useQuery(vm.collapsed$);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (isCollapsed && !panel.isCollapsed()) {
      panel.collapse();
    } else if (!isCollapsed && panel.isCollapsed()) {
      panel.expand();
    }
  }, [isCollapsed]);

  return (
    <>
      <PanelResizeHandle className="h-1 bg-border hover:bg-accent transition-colors cursor-row-resize" />
      <Panel
        ref={panelRef}
        defaultSize={30}
        minSize={10}
        maxSize={90}
        collapsible
        collapsedSize={6}
        order={2}
        id="sidebar-learn-section"
        onCollapse={() => {
          if (!isCollapsed) vm.toggleCollapsed();
        }}
        onExpand={() => {
          if (isCollapsed) vm.toggleCollapsed();
        }}
      >
        <div className="h-full flex flex-col border-t border-border">
          <SidebarSection
            label={vm.label}
            collapsed$={vm.collapsed$}
            onToggle={vm.toggleCollapsed}
            headerIcon={<BookOpen className="size-4" />}
          >
            <div className="px-2 py-2 space-y-1 overflow-y-auto">
              <LearnSection vm={vm.curriculum} />
              <ReferenceSection vm={vm.reference} />
              <button
                onClick={vm.openFullLearnPage}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 mt-2
                           text-dense-xs text-muted-foreground hover:text-foreground
                           transition-colors"
              >
                <ExternalLink className="size-3" />
                <span>Open full Learn page</span>
              </button>
            </div>
          </SidebarSection>
        </div>
      </Panel>
    </>
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

// Sidebar section with an action button in the header
function SidebarSectionWithAction({
  label,
  collapsed$,
  onToggle,
  children,
  actionIcon,
  actionTitle,
  onAction,
  actionActive$,
}: {
  label: string;
  collapsed$: import("@/vm").Queryable<boolean>;
  onToggle: () => void;
  children: React.ReactNode;
  actionIcon: React.ReactNode;
  actionTitle: string;
  onAction: () => void;
  actionActive$: import("@/vm").Queryable<boolean>;
}) {
  const isActive = useQuery(actionActive$);

  return (
    <div className="border-b border-border last:border-b-0">
      <Queryable query={collapsed$}>
        {(collapsed) => (
          <>
            <div className="flex items-center justify-between w-full h-header px-3">
              <button
                onClick={onToggle}
                className="
                  flex items-center gap-2 flex-1
                  text-dense-xs font-semibold uppercase tracking-wider
                  text-muted-foreground hover:text-foreground
                  transition-colors duration-150
                "
              >
                <span>{label}</span>
                <ChevronRight
                  className={`size-4 transition-transform duration-150 ${
                    collapsed ? "" : "rotate-90"
                  }`}
                />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction();
                }}
                className={`p-1.5 rounded transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                title={actionTitle}
              >
                {actionIcon}
              </button>
            </div>
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

function QueryEditor({ vm, schemaViewer }: { vm: QueryPageVM["editor"]; schemaViewer: SchemaGraphPanelVM }) {
  const isSchemaVisible = useQuery(schemaViewer.isVisible$);

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
          {/* Schema toggle button */}
          <Button
            variant={isSchemaVisible ? "secondary" : "ghost"}
            density="compact"
            onClick={schemaViewer.toggle}
            title="Toggle schema graph panel"
          >
            <Network className="size-4" />
          </Button>

          <Queryable query={[vm.actions.run.disabled$, vm.actions.run.isRunning$]}>
            {([disabled, isRunning]) => (
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
        </div>
      </div>

      {/* Editor Area */}
      <div className="bg-muted/30 relative grow">
        <Queryable query={vm.codeEditor.text$}>
          {(text) => (
            <TypeQLEditor
              value={text}
              onChange={(value) => vm.codeEditor.updateText(value)}
              className="absolute inset-0"
              onKeyDown={(e) => vm.codeEditor.onKeyDown(e)}
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

// =============================================================================
// Schema Tree Components
// =============================================================================

function SchemaTree({ vm }: { vm: import("@/vm").SchemaTreeVM }) {
  return (
    <Queryable query={vm.status$}>
      {(status) => {
        if (status === "loading") {
          return (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          );
        }

        if (status === "error") {
          return (
            <Queryable query={vm.statusMessage$}>
              {(message) => (
                <div className="text-center py-4 space-y-2">
                  <p className="text-dense-xs text-destructive">{message}</p>
                  <Button variant="outline" density="compact" onClick={vm.retry}>
                    <RefreshCw className="size-3" />
                    Retry
                  </Button>
                </div>
              )}
            </Queryable>
          );
        }

        if (status === "empty") {
          return (
            <Queryable query={vm.statusMessage$}>
              {(message) => (
                <p className="text-dense-xs text-muted-foreground text-center py-4">
                  {message}
                </p>
              )}
            </Queryable>
          );
        }

        return (
          <div className="space-y-2">
            <SchemaTreeGroup group={vm.entities} />
            <SchemaTreeGroup group={vm.relations} />
            <SchemaTreeGroup group={vm.attributes} />
          </div>
        );
      }}
    </Queryable>
  );
}

function SchemaTreeGroup({ group }: { group: import("@/vm").SchemaTreeGroupVM }) {
  return (
    <div className="space-y-0.5">
      <Queryable query={group.collapsed$}>
        {(collapsed) => (
          <>
            <button
              onClick={group.toggleCollapsed}
              className="flex items-center gap-1.5 w-full text-dense-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
              <span>{group.label}</span>
              <Queryable query={group.count$}>
                {(count) => (
                  <span className="text-dense-xs text-muted-foreground/70">
                    ({count})
                  </span>
                )}
              </Queryable>
            </button>
            {!collapsed && (
              <Queryable query={group.items$}>
                {(items) => (
                  <div className="pl-4 space-y-px">
                    {!items || items.length === 0 ? (
                      <p className="text-dense-xs text-muted-foreground/60 italic pl-1">
                        None
                      </p>
                    ) : (
                      items.map((item) => (
                        <SchemaTreeItem key={item.key} item={item} />
                      ))
                    )}
                  </div>
                )}
              </Queryable>
            )}
          </>
        )}
      </Queryable>
    </div>
  );
}

function SchemaTreeItem({ item }: { item: import("@/vm").SchemaTreeItemVM }) {
  const Icon = item.icon;
  return (
    <button
      className="flex items-center gap-1.5 w-full px-1.5 py-0.5 rounded text-dense-xs text-foreground hover:bg-accent transition-colors text-left"
      onClick={item.runFetchQuery}
      title="Run fetch query"
    >
      <Icon className="size-3 flex-shrink-0 text-muted-foreground" />
      <span className={item.isAbstract ? "italic text-muted-foreground" : ""}>
        {item.label}
      </span>
    </button>
  );
}
