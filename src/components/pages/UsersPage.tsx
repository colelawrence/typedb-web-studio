/**
 * Users page component for TypeDB Studio.
 *
 * User management interface for creating, editing, and deleting users.
 * Updated with Dense-Core tokens (Phase 6: Task 6.4)
 */

import type { UsersPageVM, UserRowVM } from "@/vm";
import { Queryable } from "@/vm/components";
import { Users, Plus, Key, Trash2, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import {
  DenseTable,
  DenseTableHeader,
  DenseTableBody,
  DenseTableRow,
  DenseTableHead,
  DenseTableCell,
} from "../ui/table";

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
        <Users className="size-12 mx-auto text-muted-foreground" />
        <p className="text-dense-lg text-muted-foreground">{placeholder.message}</p>
        <Button onClick={placeholder.action}>
          {placeholder.actionLabel}
        </Button>
      </div>
    </div>
  );
}

function UsersPageContent({ vm }: { vm: UsersPageVM }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header - Task 6.4: py-4 px-6 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-dense-xl font-semibold text-foreground">User Management</h1>
        <Queryable query={vm.createUser.disabled$}>
          {(disabled) => (
            <Button
              onClick={vm.createUser.click}
              disabled={disabled !== null}
            >
              <Plus className="size-4" />
              Create User
            </Button>
          )}
        </Queryable>
      </div>

      {/* Content - Task 6.4: mx-6 for table */}
      <div className="flex-1 overflow-auto p-6">
        <Queryable query={vm.status$}>
          {(status) => {
            if (status === "loading") {
              return (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="mt-4 text-dense-sm text-muted-foreground">Loading users...</p>
                </div>
              );
            }

            if (status === "error") {
              return (
                <div className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="size-12 text-destructive" />
                  <Queryable query={vm.errorMessage$}>
                    {(message) => (
                      <p className="mt-4 text-dense-sm text-destructive">{message}</p>
                    )}
                  </Queryable>
                  <Button variant="outline" className="mt-4" onClick={vm.retry}>
                    <RefreshCw className="size-4" />
                    Retry
                  </Button>
                </div>
              );
            }

            return (
              <Queryable query={vm.isEmpty$}>
                {(isEmpty) =>
                  isEmpty ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Users className="size-12 text-muted-foreground/50" />
                      <p className="mt-4 text-dense-sm text-muted-foreground">No users found</p>
                      <p className="text-dense-xs text-muted-foreground mt-1">
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
    <DenseTable>
      <DenseTableHeader>
        <DenseTableRow>
          <DenseTableHead>Username</DenseTableHead>
          <DenseTableHead className="w-48 text-right">Actions</DenseTableHead>
        </DenseTableRow>
      </DenseTableHeader>
      <DenseTableBody>
        <Queryable query={vm.users$}>
          {(users) => (
            <>
              {users.map((user) => (
                <UserRow key={user.key} vm={user} />
              ))}
            </>
          )}
        </Queryable>
      </DenseTableBody>
    </DenseTable>
  );
}

function UserRow({ vm }: { vm: UserRowVM }) {
  return (
    <DenseTableRow>
      {/* Username */}
      <DenseTableCell>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-full bg-accent">
            <Users className="size-4 text-accent-foreground" />
          </div>
          <span className="text-dense-sm font-medium text-foreground">{vm.usernameDisplay}</span>
        </div>
      </DenseTableCell>

      {/* Actions */}
      <DenseTableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            density="compact"
            onClick={vm.editPassword}
          >
            <Key className="size-3.5" />
            Edit Password
          </Button>
          <Queryable query={vm.deleteDisabled$}>
            {(disabled) => (
              <Button
                variant="destructive"
                density="compact"
                onClick={disabled === null ? vm.delete : undefined}
                disabled={disabled !== null}
                title={disabled?.displayReason}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            )}
          </Queryable>
        </div>
      </DenseTableCell>
    </DenseTableRow>
  );
}
