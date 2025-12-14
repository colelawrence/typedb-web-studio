/**
 * Schema page component for TypeDB Studio.
 *
 * Displays the database schema as a tree view and graph visualization.
 */

import type { SchemaPageVM } from "@/vm";
import { Queryable } from "@/vm/components";
import { Database, ZoomIn, ZoomOut, RotateCcw, ChevronDown, ChevronRight, RefreshCw, Loader2 } from "lucide-react";

export function SchemaPage({ vm }: { vm: SchemaPageVM }) {
  return (
    <Queryable query={vm.placeholder$}>
      {(placeholder) =>
        placeholder ? (
          <PlaceholderView placeholder={placeholder} />
        ) : (
          <SchemaPageContent vm={vm} />
        )
      }
    </Queryable>
  );
}

function PlaceholderView({ placeholder }: { placeholder: NonNullable<SchemaPageVM extends { placeholder$: import("@/vm").Queryable<infer T> } ? T : never> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center space-y-4">
        <Database className="w-12 h-12 mx-auto text-muted-foreground" />
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

function SchemaPageContent({ vm }: { vm: SchemaPageVM }) {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <Queryable query={vm.sidebar.width$}>
        {(width) => (
          <aside
            style={{ width: `${width}px` }}
            className="border-r border-border bg-card flex flex-col"
          >
            <SchemaSidebar vm={vm.sidebar} />
          </aside>
        )}
      </Queryable>

      {/* Main Graph Area */}
      <div className="flex-1 flex flex-col">
        <SchemaGraph vm={vm.graph} />
      </div>
    </div>
  );
}

function SchemaSidebar({ vm }: { vm: SchemaPageVM["sidebar"] }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Controls Header */}
      <div className="p-4 border-b border-border space-y-4">
        {/* View Mode Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            View Mode
          </label>
          <Queryable query={vm.viewMode$}>
            {(mode) => (
              <div className="flex rounded-lg border border-input p-0.5">
                <button
                  onClick={() => vm.setViewMode("flat")}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                    mode === "flat"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Flat
                </button>
                <button
                  onClick={() => vm.setViewMode("hierarchical")}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                    mode === "hierarchical"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Hierarchical
                </button>
              </div>
            )}
          </Queryable>
        </div>

        {/* Link Visibility Toggles */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Show Links
          </label>
          <div className="grid grid-cols-2 gap-2">
            <LinkToggle label="Sub" query={vm.linksVisibility.sub$} toggle={vm.linksVisibility.toggleSub} />
            <LinkToggle label="Owns" query={vm.linksVisibility.owns$} toggle={vm.linksVisibility.toggleOwns} />
            <LinkToggle label="Plays" query={vm.linksVisibility.plays$} toggle={vm.linksVisibility.togglePlays} />
            <LinkToggle label="Relates" query={vm.linksVisibility.relates$} toggle={vm.linksVisibility.toggleRelates} />
          </div>
        </div>
      </div>

      {/* Schema Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        <SchemaTree vm={vm.tree} />
      </div>
    </div>
  );
}

function LinkToggle({ label, query, toggle }: { label: string; query: import("@/vm").Queryable<boolean>; toggle: () => void }) {
  return (
    <Queryable query={query}>
      {(isVisible) => (
        <button
          onClick={toggle}
          className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            isVisible
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className={`w-3 h-3 rounded-sm border ${isVisible ? "bg-primary border-primary" : "border-input"}`} />
          {label}
        </button>
      )}
    </Queryable>
  );
}

function SchemaTree({ vm }: { vm: import("@/vm").SchemaTreeVM }) {
  return (
    <Queryable query={vm.status$}>
      {(status) => {
        if (status === "loading") {
          return (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          );
        }

        if (status === "error") {
          return (
            <Queryable query={vm.statusMessage$}>
              {(message) => (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-destructive">{message}</p>
                  <button
                    onClick={vm.retry}
                    className="flex items-center gap-2 mx-auto px-3 py-1.5 text-sm rounded border border-input hover:bg-accent"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              )}
            </Queryable>
          );
        }

        if (status === "empty") {
          return (
            <Queryable query={vm.statusMessage$}>
              {(message) => (
                <p className="text-sm text-muted-foreground text-center py-8">{message}</p>
              )}
            </Queryable>
          );
        }

        return (
          <div className="space-y-3">
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
    <div className="space-y-1">
      <Queryable query={group.collapsed$}>
        {(collapsed) => (
          <>
            <button
              onClick={group.toggleCollapsed}
              className="flex items-center gap-2 w-full text-sm font-medium text-foreground hover:text-primary"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <span>{group.label}</span>
              <Queryable query={group.count$}>
                {(count) => (
                  <span className="text-xs text-muted-foreground">({count})</span>
                )}
              </Queryable>
            </button>
            {!collapsed && (
              <Queryable query={group.items$}>
                {(items) => (
                  <div className="pl-6 space-y-0.5">
                    {!items || items.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">None defined</p>
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
    <div
      className="flex items-center gap-2 w-full px-2 py-1 rounded text-sm text-foreground hover:bg-accent cursor-pointer"
      style={{ paddingLeft: `${(item.level + 1) * 8}px` }}
      onClick={item.generateFetchQuery}
      title="Click to generate query"
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className={item.isAbstract ? "italic text-muted-foreground" : ""}>
        {item.label}
      </span>
    </div>
  );
}

function SchemaGraph({ vm }: { vm: SchemaPageVM["graph"] }) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <button
            onClick={vm.zoom.zoomOut}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <Queryable query={vm.zoom.level$}>
            {(level) => (
              <span className="text-xs text-muted-foreground w-12 text-center">
                {Math.round(level * 100)}%
              </span>
            )}
          </Queryable>
          <button
            onClick={vm.zoom.zoomIn}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={vm.zoom.reset}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Reset view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Filter */}
        <Queryable query={vm.highlightFilter$}>
          {(filter) => (
            <input
              type="text"
              value={filter ?? ""}
              onChange={(e) => vm.setHighlightFilter(e.target.value || null)}
              placeholder="Filter types..."
              className="px-3 py-1.5 rounded border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-48"
            />
          )}
        </Queryable>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <Queryable query={vm.status$}>
          {(status) => (
            <>
              {status === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading schema...</p>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Queryable query={vm.statusMessage$}>
                      {(message) => (
                        <p className="text-sm text-destructive">{message}</p>
                      )}
                    </Queryable>
                    <button
                      onClick={vm.retry}
                      className="flex items-center gap-2 mx-auto px-3 py-1.5 text-sm rounded border border-input hover:bg-accent"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {status === "empty" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Queryable query={vm.statusMessage$}>
                    {(message) => (
                      <div className="text-center space-y-3">
                        <Database className="w-12 h-12 mx-auto text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">{message}</p>
                      </div>
                    )}
                  </Queryable>
                </div>
              )}

              {/* Canvas container for graph library */}
              <div
                ref={vm.setCanvasRef}
                className={`w-full h-full ${status !== "ready" ? "opacity-0" : ""}`}
              />
            </>
          )}
        </Queryable>

        {/* Selected Node Info Panel */}
        <Queryable query={vm.selectedNode$}>
          {(node) =>
            node && (
              <div className="absolute top-4 right-4 w-64 p-4 rounded-lg border border-border bg-card shadow-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{node.label}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      node.kind === "entity" ? "bg-blue-500/10 text-blue-500" :
                      node.kind === "relation" ? "bg-purple-500/10 text-purple-500" :
                      "bg-green-500/10 text-green-500"
                    }`}>
                      {node.kind}
                    </span>
                  </div>
                  {node.isAbstract && (
                    <p className="text-xs text-muted-foreground italic">Abstract type</p>
                  )}
                  {node.supertype && (
                    <p className="text-xs text-muted-foreground">
                      Extends: <span className="text-foreground">{node.supertype}</span>
                    </p>
                  )}
                  {Object.entries(node.details).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="text-muted-foreground">{key}:</span>{" "}
                      <span className="text-foreground">{value}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={node.generateFetchQuery}
                      className="flex-1 px-2 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Generate Query
                    </button>
                    <button
                      onClick={node.highlight}
                      className="flex-1 px-2 py-1.5 text-xs rounded border border-input hover:bg-accent"
                    >
                      Highlight
                    </button>
                  </div>
                </div>
              </div>
            )
          }
        </Queryable>

        {/* Hover Tooltip */}
        <Queryable query={vm.hoveredNode$}>
          {(node) =>
            node && (
              <div className="absolute bottom-4 left-4 px-3 py-2 rounded border border-border bg-card shadow-lg">
                <span className="text-sm font-medium text-foreground">{node.label}</span>
                <span className="text-xs text-muted-foreground ml-2">({node.kind})</span>
              </div>
            )
          }
        </Queryable>
      </div>
    </div>
  );
}
