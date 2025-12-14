/**
 * Connect page component for TypeDB Studio.
 *
 * Connection form and saved connections list.
 */

import type { ConnectPageVM } from "@/vm";
import { Queryable } from "@/vm/components";
import { AlertTriangle, Eye, EyeOff, Star, Trash2, Loader2, FileText } from "lucide-react";

export function ConnectPage({ vm }: { vm: ConnectPageVM }) {
  return (
    <div className="flex h-full">
      {/* Left: Connection Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <ConnectionForm vm={vm.form} />
      </div>

      {/* Right: Saved Connections */}
      <div className="w-80 border-l border-border bg-card p-6">
        <SavedConnectionsList vm={vm.savedConnections} />
      </div>
    </div>
  );
}

function ConnectionForm({ vm }: { vm: ConnectPageVM["form"] }) {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Connect to TypeDB</h1>
        <p className="text-muted-foreground">Enter your server credentials</p>
      </div>

      {/* Mode Toggle */}
      <Queryable query={vm.mode$}>
        {(mode) => (
          <div className="flex rounded-lg border border-input p-1">
            <button
              onClick={() => vm.setMode("url")}
              className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                mode === "url"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              URL
            </button>
            <button
              onClick={() => vm.setMode("credentials")}
              className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
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

function SavedConnectionsList({ vm }: { vm: ConnectPageVM["savedConnections"] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Saved Connections</h2>

      <Queryable query={vm.isEmpty$}>
        {(isEmpty) =>
          isEmpty ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No saved connections</p>
              <p className="text-xs text-muted-foreground mt-1">
                Connections are saved automatically
              </p>
            </div>
          ) : (
            <Queryable query={vm.items$}>
              {(items) => (
                <div className="space-y-2">
                  {items?.map((item) => (
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
    <div className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/50 group">
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
            className={`p-1.5 rounded transition-colors ${
              isStartup
                ? "text-yellow-500"
                : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
            }`}
            title={isStartup ? "Default connection" : "Set as default"}
          >
            <Star className={`w-4 h-4 ${isStartup ? "fill-current" : ""}`} />
          </button>
        )}
      </Queryable>

      <button
        onClick={vm.remove}
        className="p-1.5 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-colors"
        title="Remove"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
