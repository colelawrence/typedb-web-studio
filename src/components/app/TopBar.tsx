/**
 * TopBar component for TypeDB Studio.
 *
 * Contains logo, navigation, database selector, and connection status.
 * Updated with Dense-Core tokens (Phase 2: Tasks 2.1-2.4)
 */

import { cn } from "@/lib/utils";
import type { TopBarVM } from "@/vm";
import { Queryable } from "@/vm/components";
import {
  Database,
  ChevronDown,
  Circle,
  Plus,
  RefreshCw,
} from "lucide-react";

export function TopBar({ vm }: { vm: TopBarVM }) {
  return (
    <header className="flex items-center h-header px-4 gap-2 bg-card border-b border-border">
      {/* Logo - Task 2.1: Touch-friendly clickable area */}
      <button
        onClick={vm.logoClick}
        className="flex items-center gap-2 mr-4 h-row px-2 -ml-2 rounded-md hover:bg-accent/50 transition-colors"
      >
        <Database className="size-5 text-primary" />
        <span className="text-dense-sm font-semibold text-foreground">TypeDB Studio</span>
      </button>

      {/* Navigation - Task 2.2 */}
      <Navigation vm={vm.navigation} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Database Selector - Task 2.3 */}
      <DatabaseSelector vm={vm.databaseSelector} />

      {/* Connection Status - Task 2.4 */}
      <ConnectionStatus vm={vm.connectionStatus} />
    </header>
  );
}

// Navigation component (inline for now)
function Navigation({ vm }: { vm: TopBarVM["navigation"] }) {
  return (
    <Queryable query={vm.items$}>
      {(items) => (
        <nav className="flex items-center gap-1">
          {items.map((item) => (
            <NavItem key={item.key} vm={item} />
          ))}
        </nav>
      )}
    </Queryable>
  );
}

function NavItem({ vm }: { vm: import("@/vm").NavigationItemVM }) {
  return (
    <Queryable query={vm.isActive$}>
      {(isActive) => {
        const Icon = vm.icon;
        return (
          <button
            onClick={vm.click}
            className={`
              flex items-center gap-1 h-compact px-3 rounded-md
              text-dense-sm font-medium transition-colors
              ${isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }
            `}
          >
            <Icon className="size-4" />
            <span>{vm.label}</span>
          </button>
        );
      }}
    </Queryable>
  );
}

// Database Selector component - Task 2.3
function DatabaseSelector({ vm }: { vm: TopBarVM["databaseSelector"] }) {
  return (
    <Queryable query={vm.visible$}>
      {(visible) => {
        if (!visible) return null;

        return (
          <div className="relative mr-4">
            <Queryable query={vm.disabled$}>
              {(disabled) => (
                <Queryable query={vm.isOpen$}>
                  {(isOpen) => (
                    <>
                      <button
                        onClick={vm.toggle}
                        disabled={disabled !== null}
                        className={`
                          flex items-center gap-2 h-default px-3 rounded-md border border-input
                          bg-background text-dense-sm font-medium transition-colors
                          hover:bg-accent hover:text-accent-foreground
                          ${disabled !== null ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                        title={disabled?.displayReason}
                      >
                        <Database className="size-4" />
                        <Queryable query={vm.displayText$}>
                          {(text) => (
                            <span className={cn(
                              "word-break truncate max-w-[150px]",
                              text === "Select database" ? "text-muted-foreground italic" : "",
                            )
                            }>
                              {text}
                            </span>
                          )}
                        </Queryable>
                        <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <DatabaseSelectorDropdown vm={vm} />
                      )}
                    </>
                  )}
                </Queryable>
              )}
            </Queryable>
          </div>
        );
      }}
    </Queryable>
  );
}

function DatabaseSelectorDropdown({ vm }: { vm: TopBarVM["databaseSelector"] }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={vm.close}
      />

      {/* Dropdown - Task 2.3: h-row items */}
      <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-50">
        <div className="py-1">
          <div className="flex items-center justify-between h-row px-3">
            <span className="text-dense-xs font-medium text-muted-foreground uppercase tracking-wider">Databases</span>
            <button
              onClick={vm.refresh}
              className="size-6 flex items-center justify-center rounded hover:bg-accent"
              title="Refresh database list"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>

          <Queryable query={vm.databases$}>
            {(databases) => (
              <div className="px-1">
                {databases.map((db) => (
                  <DatabaseOption key={db.key} vm={db} />
                ))}
              </div>
            )}
          </Queryable>

          <div className="border-t border-border mt-1 pt-1 px-1">
            <button
              onClick={vm.createNew}
              className="flex items-center gap-2 w-full h-row px-2 rounded text-dense-sm hover:bg-accent transition-colors"
            >
              <Plus className="size-4" />
              <span>Create Database</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DatabaseOption({ vm }: { vm: { key: string; label: string; isSelected$: import("@/vm").Queryable<boolean>; select: () => void } }) {
  return (
    <Queryable query={vm.isSelected$}>
      {(isSelected) => (
        <button
          onClick={vm.select}
          className={`
            flex items-center gap-2 w-full h-row px-2 rounded text-dense-sm text-left transition-colors
            ${isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}
          `}
        >
          <Database className="size-4" />
          <span className="flex-1 truncate">{vm.label}</span>
          {isSelected && <Circle className="size-2 fill-current" />}
        </button>
      )}
    </Queryable>
  );
}

// Connection Status component - Task 2.4: Semantic beacon colors
function ConnectionStatus({ vm }: { vm: TopBarVM["connectionStatus"] }) {
  // Map beacon variant to semantic color class
  const beaconClasses = {
    ok: "bg-beacon-ok",
    warn: "bg-beacon-warn animate-pulse",
    error: "bg-beacon-error",
  };

  return (
    <Queryable query={vm.isClickable$}>
      {(isClickable) => (
        <Queryable query={vm.beaconVariant$}>
          {(variant) => (
            <Queryable query={vm.displayText$}>
              {(displayText) => (
                <button
                  onClick={isClickable ? vm.click : undefined}
                  className={`
                    flex items-center gap-2 h-compact px-3 rounded-md text-dense-sm transition-colors
                    ${isClickable ? "hover:bg-accent cursor-pointer" : "cursor-default"}
                  `}
                  title={`Connection: ${variant}`}
                >
                  <span
                    className={`size-2 rounded-full ${beaconClasses[variant]}`}
                    aria-label={`Connection status: ${variant}`}
                  />
                  <span className="text-muted-foreground">{displayText}</span>
                </button>
              )}
            </Queryable>
          )}
        </Queryable>
      )}
    </Queryable>
  );
}
