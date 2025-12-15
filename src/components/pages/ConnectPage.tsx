/**
 * Connect page component for TypeDB Studio.
 *
 * Provides three connection options:
 * 1. Demos - Pre-loaded demo databases for exploration
 * 2. Local Servers - User-created in-memory WASM servers
 * 3. Remote Connection - Connect to TypeDB server via HTTP
 */

import type { ConnectPageVM, DemoItemVM, LocalServerItemVM } from "@/vm";
import { Queryable } from "@/vm/components";
import {
  AlertTriangle,
  Eye,
  EyeOff,
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

export function ConnectPage({ vm }: { vm: ConnectPageVM }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome to TypeDB Studio</h1>
          <p className="text-muted-foreground">Choose how you'd like to get started</p>
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
      <h2 className="text-lg font-semibold text-foreground">Explore Demos</h2>
      <p className="text-sm text-muted-foreground">
        Try TypeDB with pre-loaded sample databases
      </p>

      <Queryable query={vm.isLoading$}>
        {(isLoading) =>
          isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
          className="flex flex-col items-start gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/50 transition-colors text-left group"
        >
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <IconComponent className="w-5 h-5" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
              {vm.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
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
          <h2 className="text-lg font-semibold text-foreground">Your Local Servers</h2>
          <p className="text-sm text-muted-foreground">
            In-memory databases that run in your browser
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={vm.importSnapshot}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <Queryable query={vm.createDisabled$}>
            {(disabled) => (
              <button
                onClick={vm.createNew}
                disabled={disabled !== null}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                  bg-primary text-primary-foreground
                  ${disabled !== null ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/90"}
                  transition-colors
                `}
                title={disabled?.displayReason}
              >
                <Plus className="w-4 h-4" />
                New Server
              </button>
            )}
          </Queryable>
        </div>
      </div>

      <Queryable query={vm.isEmpty$}>
        {(isEmpty) =>
          isEmpty ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <Server className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No local servers yet</p>
              <p className="text-xs text-muted-foreground mt-1">
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
    <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/50 group">
      <div className="p-2 rounded-lg bg-accent text-foreground">
        <Server className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground truncate">{vm.name}</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
            <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-600">
              Active
            </span>
          ) : null
        }
      </Queryable>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={vm.connect}
          className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
          title="Connect"
        >
          <Play className="w-4 h-4" />
        </button>
        <button
          onClick={vm.rename}
          className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Rename"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={vm.exportSnapshot}
          className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Export snapshot"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={vm.delete}
          className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
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
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Connect to Remote Server</span>
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
      {/* Mode Toggle */}
      <Queryable query={vm.mode$}>
        {(mode) => (
          <div className="flex rounded-lg border border-input p-1 w-fit">
            <button
              onClick={() => vm.setMode("url")}
              className={`py-2 px-4 rounded text-sm font-medium transition-colors ${
                mode === "url"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              URL
            </button>
            <button
              onClick={() => vm.setMode("credentials")}
              className={`py-2 px-4 rounded text-sm font-medium transition-colors ${
                mode === "credentials"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Credentials
            </button>
          </div>
        )}
      </Queryable>

      {/* Form Fields */}
      <Queryable query={vm.mode$}>
        {(mode) => (
          <div className="space-y-4">
            {mode === "url" ? (
              <FormInput vm={vm.urlInput} />
            ) : (
              <>
                <FormInput vm={vm.addressInput} />
                <FormInput vm={vm.usernameInput} />
                <PasswordInput vm={vm.passwordInput} />
              </>
            )}

            {/* Safari HTTP Warning */}
            <Queryable query={vm.safariHttpWarning$}>
              {(warning) =>
                warning.visible && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{warning.message}</p>
                  </div>
                )
              }
            </Queryable>
          </div>
        )}
      </Queryable>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={vm.fillExample}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Fill example
        </button>
        <div className="flex-1" />
        <Queryable query={vm.connectDisabled$}>
          {(disabled) => (
            <Queryable query={vm.isConnecting$}>
              {(isConnecting) => (
                <button
                  onClick={vm.connect}
                  disabled={disabled !== null || isConnecting}
                  className={`
                    flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-sm
                    bg-primary text-primary-foreground
                    transition-colors
                    ${disabled !== null || isConnecting
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-primary/90"
                    }
                  `}
                  title={disabled?.displayReason}
                >
                  {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isConnecting ? "Connecting..." : "Connect"}
                </button>
              )}
            </Queryable>
          )}
        </Queryable>
      </div>
    </div>
  );
}

// =============================================================================
// Reusable Form Components
// =============================================================================

function FormInput({ vm }: { vm: import("@/vm").FormInputVM }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {vm.label}
      </label>
      <Queryable query={vm.value$}>
        {(value) => (
          <input
            type="text"
            value={value}
            onChange={(e) => vm.update(e.target.value)}
            placeholder={vm.placeholder}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </Queryable>
      <Queryable query={vm.error$}>
        {(error) =>
          error && (
            <p className="text-sm text-destructive">{error}</p>
          )
        }
      </Queryable>
    </div>
  );
}

function PasswordInput({ vm }: { vm: import("@/vm").PasswordInputVM }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {vm.label}
      </label>
      <div className="relative">
        <Queryable query={vm.value$}>
          {(value) => (
            <Queryable query={vm.showPassword$}>
              {(showPassword) => (
                <>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={value}
                    onChange={(e) => vm.update(e.target.value)}
                    placeholder={vm.placeholder}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={vm.toggleVisibility}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </>
              )}
            </Queryable>
          )}
        </Queryable>
      </div>
      <Queryable query={vm.error$}>
        {(error) =>
          error && (
            <p className="text-sm text-destructive">{error}</p>
          )
        }
      </Queryable>
    </div>
  );
}

// =============================================================================
// Saved Connections
// =============================================================================

function SavedConnectionsList({ vm }: { vm: ConnectPageVM["remoteConnection"]["savedConnections"] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Saved Connections</h3>

      <Queryable query={vm.isEmpty$}>
        {(isEmpty) =>
          isEmpty ? (
            <div className="text-center py-6">
              <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No saved connections</p>
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
        <div className="font-medium text-sm text-foreground truncate">
          {vm.nameDisplay}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {vm.addressDisplay}
        </div>
      </button>

      <Queryable query={vm.isStartupConnection$}>
        {(isStartup) => (
          <button
            onClick={vm.toggleStartup}
            className={`p-1 rounded transition-colors ${
              isStartup
                ? "text-yellow-500"
                : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
            }`}
            title={isStartup ? "Default connection" : "Set as default"}
          >
            <Star className={`w-3 h-3 ${isStartup ? "fill-current" : ""}`} />
          </button>
        )}
      </Queryable>

      <button
        onClick={vm.remove}
        className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-colors"
        title="Remove"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
