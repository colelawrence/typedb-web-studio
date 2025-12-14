/**
 * Users page component for TypeDB Studio.
 *
 * User management interface for creating, editing, and deleting users.
 */

import type { UsersPageVM, UserRowVM } from "@/vm";
import { Queryable } from "@/vm/components";
import { Users, Plus, Key, Trash2, Loader2, RefreshCw, AlertCircle } from "lucide-react";

export function UsersPage({ vm }: { vm: UsersPageVM }) {
  return (
    <Queryable query={vm.placeholder$}>
      {(placeholder) =>
        placeholder ? (
          <PlaceholderView placeholder={placeholder} />
        ) : (
          <UsersPageContent vm={vm} />
        )
      }
    </Queryable>
  );
}

function PlaceholderView({ placeholder }: { placeholder: NonNullable<UsersPageVM extends { placeholder$: import("@/vm").Queryable<infer T> } ? T : never> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center space-y-4">
        <Users className="w-12 h-12 mx-auto text-muted-foreground" />
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

function UsersPageContent({ vm }: { vm: UsersPageVM }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">User Management</h1>
        <Queryable query={vm.createUser.disabled$}>
          {(disabled) => (
            <button
              onClick={disabled === null ? vm.createUser.click : undefined}
              disabled={disabled !== null}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                bg-primary text-primary-foreground
                ${disabled !== null
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-primary/90"
                }
              `}
              title={disabled?.displayReason}
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
          )}
        </Queryable>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Queryable query={vm.status$}>
          {(status) => {
            if (status === "loading") {
              return (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="mt-4 text-sm text-muted-foreground">Loading users...</p>
                </div>
              );
            }

            if (status === "error") {
              return (
                <div className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="w-12 h-12 text-destructive" />
                  <Queryable query={vm.errorMessage$}>
                    {(message) => (
                      <p className="mt-4 text-sm text-destructive">{message}</p>
                    )}
                  </Queryable>
                  <button
                    onClick={vm.retry}
                    className="mt-4 flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-input hover:bg-accent"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              );
            }

            return (
              <Queryable query={vm.isEmpty$}>
                {(isEmpty) =>
                  isEmpty ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Users className="w-12 h-12 text-muted-foreground/50" />
                      <p className="mt-4 text-sm text-muted-foreground">No users found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click "Create User" to add the first user
                      </p>
                    </div>
                  ) : (
                    <UsersTable vm={vm} />
                  )
                }
              </Queryable>
            );
          }}
        </Queryable>
      </div>
    </div>
  );
}

function UsersTable({ vm }: { vm: UsersPageVM }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 bg-muted/50 border-b border-border">
        <div className="text-sm font-medium text-muted-foreground">Username</div>
        <div className="text-sm font-medium text-muted-foreground w-48 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <Queryable query={vm.users$}>
        {(users) => (
          <div className="divide-y divide-border">
            {users.map((user) => (
              <UserRow key={user.key} vm={user} />
            ))}
          </div>
        )}
      </Queryable>
    </div>
  );
}

function UserRow({ vm }: { vm: UserRowVM }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 items-center group hover:bg-muted/30 transition-colors">
      {/* Username */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent">
          <Users className="w-4 h-4 text-accent-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground">{vm.usernameDisplay}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={vm.editPassword}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-input text-foreground hover:bg-accent transition-colors"
        >
          <Key className="w-3.5 h-3.5" />
          Edit Password
        </button>
        <Queryable query={vm.deleteDisabled$}>
          {(disabled) => (
            <button
              onClick={disabled === null ? vm.delete : undefined}
              disabled={disabled !== null}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border
                ${disabled !== null
                  ? "border-input text-muted-foreground cursor-not-allowed"
                  : "border-destructive/50 text-destructive hover:bg-destructive/10"
                }
                transition-colors
              `}
              title={disabled?.displayReason}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </Queryable>
      </div>
    </div>
  );
}
