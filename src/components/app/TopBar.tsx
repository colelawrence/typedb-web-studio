/**
 * TopBar component for TypeDB Studio.
 *
 * Contains logo, navigation, database selector, and connection status.
 */

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
    <header className="flex items-center h-14 px-4 bg-card border-b border-border">
      {/* Logo */}
      <button
        onClick={vm.logoClick}
        className="flex items-center gap-2 mr-6 hover:opacity-80 transition-opacity"
      >
        <Database className="w-6 h-6 text-primary" />
        <span className="font-semibold text-foreground">TypeDB Studio</span>
      </button>

      {/* Navigation */}
      <Navigation vm={vm.navigation} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Database Selector */}
      <DatabaseSelector vm={vm.databaseSelector} />

      {/* Connection Status */}
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
    <Queryable query={vm.disabled$}>
      {(disabled) => (
        <Queryable query={vm.isActive$}>
          {(isActive) => {
            const Icon = vm.icon;
            return (
              <button
                onClick={vm.click}
                disabled={disabled !== null}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }
                  ${disabled !== null ? "opacity-50 cursor-not-allowed" : ""}
                `}
                title={disabled?.displayReason}
              >
                <Icon className="w-4 h-4" />
                <span>{vm.label}</span>
              </button>
            );
          }}
        </Queryable>
      )}
    </Queryable>
  );
}

// Database Selector component
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
                          flex items-center gap-2 px-3 py-1.5 rounded-md border border-input
                          bg-background text-sm font-medium transition-colors
                          hover:bg-accent hover:text-accent-foreground
                          ${disabled !== null ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                        title={disabled?.displayReason}
                      >
                        <Database className="w-4 h-4" />
                        <Queryable query={vm.displayText$}>
                          {(text) => <span>{text}</span>}
                        </Queryable>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
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

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
        <div className="p-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-sm font-medium text-muted-foreground">Databases</span>
            <button
              onClick={vm.refresh}
              className="p-1 rounded hover:bg-accent"
              title="Refresh database list"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <Queryable query={vm.databases$}>
            {(databases) => (
              <div className="space-y-0.5">
                {databases.map((db) => (
                  <DatabaseOption key={db.key} vm={db} />
                ))}
              </div>
            )}
          </Queryable>

          <div className="border-t border-border mt-2 pt-2">
            <button
              onClick={vm.createNew}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent"
            >
              <Plus className="w-4 h-4" />
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
            flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-left
            ${isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}
          `}
        >
          <Database className="w-4 h-4" />
          <span className="flex-1 truncate">{vm.label}</span>
          {isSelected && <Circle className="w-2 h-2 fill-current" />}
        </button>
      )}
    </Queryable>
  );
}

// Connection Status component
function ConnectionStatus({ vm }: { vm: TopBarVM["connectionStatus"] }) {
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
                    flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
                    ${isClickable ? "hover:bg-accent cursor-pointer" : "cursor-default"}
                  `}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      variant === "ok"
                        ? "bg-green-500"
                        : variant === "warn"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    title={variant.charAt(0).toUpperCase() + variant.slice(1)}
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
