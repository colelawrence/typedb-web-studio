/**
 * Connect page component for TypeDB Studio.
 *
 * Provides three connection options:
 * 1. Demos - Pre-loaded demo databases for exploration
 * 2. Local Servers - User-created in-memory WASM servers
 * 3. Remote Connection - Connect to TypeDB server via HTTP
 * Updated with Dense-Core tokens (Phase 6: Task 6.2)
 */

import type { ConnectPageVM, DemoItemVM, LocalServerItemVM } from "@/vm";
import { Queryable } from "@/vm/components";
import {
  AlertTriangle,
  Star,
  Trash2,
  Loader2,
  FileText,
  Plus,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  Server,
  Play,
  Users,
  ShoppingCart,
  Network,
  Pencil,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input, PasswordInput as PasswordInputPrimitive } from "../ui/input";
import { FormField } from "../ui/form-field";
import { SegmentedControl } from "../ui/tabs";

export function ConnectPage({ vm }: { vm: ConnectPageVM }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Header - Task 6.2: text-dense-3xl heading */}
        <div className="text-center space-y-2">
          <h1 className="text-dense-3xl font-semibold text-foreground">Welcome to TypeDB Studio</h1>
          <p className="text-dense-base text-muted-foreground">Choose how you'd like to get started</p>
        </div>

        {/* Demos Section */}
        <DemosSection vm={vm.demos} />

        {/* Local Servers Section */}
        <LocalServersSection vm={vm.localServers} />

        {/* Remote Connection Section */}
        <RemoteConnectionSection vm={vm.remoteConnection} />
      </div>
    </div>
  );
}

// =============================================================================
// Demos Section
// =============================================================================

function DemosSection({ vm }: { vm: ConnectPageVM["demos"] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-dense-lg font-semibold text-foreground">Explore Demos</h2>
      <p className="text-dense-sm text-muted-foreground">
        Try TypeDB with pre-loaded sample databases
      </p>

      <Queryable query={vm.isLoading$}>
        {(isLoading) =>
          isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Queryable query={vm.items$}>
              {(items) => (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <DemoCard key={item.key} vm={item} />
                  ))}
                </div>
              )}
            </Queryable>
          )
        }
      </Queryable>
    </section>
  );
}

function DemoCard({ vm }: { vm: DemoItemVM }) {
  const IconComponent = getDemoIcon(vm.icon);

  return (
    <Queryable query={vm.isLoading$}>
      {(isLoading) => (
        <button
          onClick={vm.load}
          disabled={isLoading}
          className="flex flex-col items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-accent/50 transition-colors text-left group"
        >
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
            {isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <IconComponent className="size-5" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-dense-base font-medium text-foreground group-hover:text-primary transition-colors">
              {vm.name}
            </h3>
            <p className="text-dense-sm text-muted-foreground line-clamp-2">
              {vm.description}
            </p>
          </div>
        </button>
      )}
    </Queryable>
  );
}

function getDemoIcon(iconName: string) {
  switch (iconName) {
    case "users":
      return Users;
    case "shopping-cart":
      return ShoppingCart;
    case "network":
      return Network;
    default:
      return Play;
  }
}

// =============================================================================
// Local Servers Section
// =============================================================================

function LocalServersSection({ vm }: { vm: ConnectPageVM["localServers"] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-dense-lg font-semibold text-foreground">Your Local Servers</h2>
          <p className="text-dense-sm text-muted-foreground">
            In-memory databases that run in your browser
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" density="compact" onClick={vm.importSnapshot}>
            <Upload className="size-4" />
            Import
          </Button>
          <Queryable query={vm.createDisabled$}>
            {(disabled) => (
              <Button
                onClick={vm.createNew}
                disabled={disabled !== null}
                density="compact"
                title={disabled?.displayReason}
              >
                <Plus className="size-4" />
                New Server
              </Button>
            )}
          </Queryable>
        </div>
      </div>

      <Queryable query={vm.isEmpty$}>
        {(isEmpty) =>
          isEmpty ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <Server className="size-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-dense-sm text-muted-foreground">No local servers yet</p>
              <p className="text-dense-xs text-muted-foreground mt-1">
                Create a new server or try a demo
              </p>
            </div>
          ) : (
            <Queryable query={vm.items$}>
              {(items) => (
                <div className="space-y-2">
                  {items.map((item) => (
                    <LocalServerItem key={item.key} vm={item} />
                  ))}
                </div>
              )}
            </Queryable>
          )
        }
      </Queryable>
    </section>
  );
}

function LocalServerItem({ vm }: { vm: LocalServerItemVM }) {
  return (
    <div className="flex items-center gap-4 h-row px-4 rounded-lg border border-border bg-card hover:border-primary/50 group">
      <div className="flex items-center justify-center size-8 rounded-lg bg-accent text-foreground">
        <Server className="size-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-dense-sm font-medium text-foreground truncate">{vm.name}</div>
        <div className="flex items-center gap-3 text-dense-xs text-muted-foreground">
          <Queryable query={vm.databaseCount$}>
            {(count) => (
              <span>{count} database{count !== 1 ? "s" : ""}</span>
            )}
          </Queryable>
          <span>{vm.lastUsedDisplay}</span>
        </div>
      </div>

      <Queryable query={vm.isActive$}>
        {(isActive) =>
          isActive ? (
            <span className="px-2 py-0.5 rounded text-dense-xs font-medium bg-beacon-ok/10 text-beacon-ok">
              Active
            </span>
          ) : null
        }
      </Queryable>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={vm.connect}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
          title="Connect"
        >
          <Play className="size-4" />
        </button>
        <button
          onClick={vm.rename}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Rename"
        >
          <Pencil className="size-4" />
        </button>
        <button
          onClick={vm.exportSnapshot}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Export snapshot"
        >
          <Download className="size-4" />
        </button>
        <button
          onClick={vm.delete}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Remote Connection Section
// =============================================================================

function RemoteConnectionSection({ vm }: { vm: ConnectPageVM["remoteConnection"] }) {
  return (
    <section className="border-t border-border pt-8">
      <Queryable query={vm.isExpanded$}>
        {(isExpanded) => (
          <>
            <button
              onClick={vm.toggleExpanded}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <span className="text-dense-sm font-medium">Connect to Remote Server</span>
            </button>

            {isExpanded && (
              <div className="mt-6 flex gap-8">
                <div className="flex-1">
                  <ConnectionForm vm={vm.form} />
                </div>
                <div className="w-72">
                  <SavedConnectionsList vm={vm.savedConnections} />
                </div>
              </div>
            )}
          </>
        )}
      </Queryable>
    </section>
  );
}

// =============================================================================
// Connection Form
// =============================================================================

function ConnectionForm({ vm }: { vm: ConnectPageVM["remoteConnection"]["form"] }) {
  return (
    <div className="space-y-6">
      {/* Mode Toggle - Task 6.2: SegmentedControl */}
      <Queryable query={vm.mode$}>
        {(mode) => (
          <SegmentedControl
            value={mode}
            onValueChange={(value) => vm.setMode(value as "url" | "credentials")}
            segments={[
              { value: "url", label: "URL" },
              { value: "credentials", label: "Credentials" },
            ]}
          />
        )}
      </Queryable>

      {/* Form Fields */}
      <Queryable query={vm.mode$}>
        {(mode) => (
          <div className="space-y-4">
            {mode === "url" ? (
              <FormInputField vm={vm.urlInput} />
            ) : (
              <>
                <FormInputField vm={vm.addressInput} />
                <FormInputField vm={vm.usernameInput} />
                <PasswordInputField vm={vm.passwordInput} />
              </>
            )}

            {/* Safari HTTP Warning */}
            <Queryable query={vm.safariHttpWarning$}>
              {(warning) =>
                warning.visible && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-beacon-warn/10 border border-beacon-warn/30 text-beacon-warn">
                    <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
                    <p className="text-dense-sm">{warning.message}</p>
                  </div>
                )
              }
            </Queryable>
          </div>
        )}
      </Queryable>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" density="compact" onClick={vm.fillExample}>
          Fill example
        </Button>
        <div className="flex-1" />
        <Queryable query={vm.connectDisabled$}>
          {(disabled) => (
            <Queryable query={vm.isConnecting$}>
              {(isConnecting) => (
                <Button
                  onClick={vm.connect}
                  disabled={disabled !== null || isConnecting}
                  loading={isConnecting}
                  title={disabled?.displayReason}
                >
                  {isConnecting ? "Connecting..." : "Connect"}
                </Button>
              )}
            </Queryable>
          )}
        </Queryable>
      </div>
    </div>
  );
}

// =============================================================================
// Reusable Form Components - Task 6.2: Using FormField and Input primitives
// =============================================================================

function FormInputField({ vm }: { vm: import("@/vm").FormInputVM }) {
  return (
    <Queryable query={vm.error$}>
      {(error) => (
        <FormField label={vm.label} error={error ?? undefined}>
          <Queryable query={vm.value$}>
            {(value) => (
              <Input
                type="text"
                value={value}
                onChange={(e) => vm.update(e.target.value)}
                placeholder={vm.placeholder}
              />
            )}
          </Queryable>
        </FormField>
      )}
    </Queryable>
  );
}

function PasswordInputField({ vm }: { vm: import("@/vm").PasswordInputVM }) {
  return (
    <Queryable query={vm.error$}>
      {(error) => (
        <FormField label={vm.label} error={error ?? undefined}>
          <Queryable query={vm.value$}>
            {(value) => (
              <Queryable query={vm.showPassword$}>
                {(showPassword) => (
                  <PasswordInputPrimitive
                    value={value}
                    onChange={(e) => vm.update(e.target.value)}
                    placeholder={vm.placeholder}
                    showPassword={showPassword}
                    onToggleVisibility={vm.toggleVisibility}
                  />
                )}
              </Queryable>
            )}
          </Queryable>
        </FormField>
      )}
    </Queryable>
  );
}

// =============================================================================
// Saved Connections
// =============================================================================

function SavedConnectionsList({ vm }: { vm: ConnectPageVM["remoteConnection"]["savedConnections"] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-dense-sm font-semibold text-foreground">Saved Connections</h3>

      <Queryable query={vm.isEmpty$}>
        {(isEmpty) =>
          isEmpty ? (
            <div className="text-center py-6">
              <FileText className="size-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-dense-xs text-muted-foreground">No saved connections</p>
            </div>
          ) : (
            <Queryable query={vm.items$}>
              {(items) => (
                <div className="space-y-2">
                  {items.map((item) => (
                    <SavedConnectionItem key={item.key} vm={item} />
                  ))}
                </div>
              )}
            </Queryable>
          )
        }
      </Queryable>
    </div>
  );
}

function SavedConnectionItem({ vm }: { vm: import("@/vm").SavedConnectionItemVM }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/50 group">
      <button
        onClick={vm.select}
        className="flex-1 text-left min-w-0"
      >
        <div className="text-dense-sm font-medium text-foreground truncate">
          {vm.nameDisplay}
        </div>
        <div className="text-dense-xs text-muted-foreground truncate">
          {vm.addressDisplay}
        </div>
      </button>

      <Queryable query={vm.isStartupConnection$}>
        {(isStartup) => (
          <button
            onClick={vm.toggleStartup}
            className={`p-1 rounded transition-colors ${
              isStartup
                ? "text-beacon-warn"
                : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
            }`}
            title={isStartup ? "Default connection" : "Set as default"}
          >
            <Star className={`size-3 ${isStartup ? "fill-current" : ""}`} />
          </button>
        )}
      </Queryable>

      <button
        onClick={vm.remove}
        className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-colors"
        title="Remove"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}
