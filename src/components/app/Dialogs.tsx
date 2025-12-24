/**
 * Dialogs component for TypeDB Studio.
 *
 * Renders modal dialogs based on the DialogsVM state.
 * Uses Dense-Core tokens for consistent styling (Phase 3).
 */

import type {
  DialogsVM,
  ActiveDialogVM,
  ConfirmationDialogVM,
  StrongConfirmationDialogVM,
  CreateDatabaseDialogVM,
  CreateUserDialogVM,
  EditPasswordDialogVM,
  SaveQueryDialogVM,
  CreateFolderDialogVM,
  MoveQueryDialogVM,
  ImportQueriesDialogVM,
} from "@/vm";
import { Queryable } from "@/vm/components";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input, PasswordInput } from "../ui/input";
import { FormField } from "../ui/form-field";

export function Dialogs({ vm }: { vm: DialogsVM }) {
  return (
    <Queryable query={vm.active$}>
      {(active) => {
        if (!active) return null;
        return <ActiveDialog dialog={active} />;
      }}
    </Queryable>
  );
}

function ActiveDialog({ dialog }: { dialog: ActiveDialogVM }) {
  switch (dialog.type) {
    case "confirmation":
      return <ConfirmationDialog vm={dialog.vm} />;
    case "strongConfirmation":
      return <StrongConfirmationDialog vm={dialog.vm} />;
    case "createDatabase":
      return <CreateDatabaseDialog vm={dialog.vm} />;
    case "createUser":
      return <CreateUserDialog vm={dialog.vm} />;
    case "editPassword":
      return <EditPasswordDialog vm={dialog.vm} />;
    case "saveQuery":
      return <SaveQueryDialog vm={dialog.vm} />;
    case "createFolder":
      return <CreateFolderDialog vm={dialog.vm} />;
    case "moveQuery":
      return <MoveQueryDialog vm={dialog.vm} />;
    case "importQueries":
      return <ImportQueriesDialog vm={dialog.vm} />;
  }
}

// ============================================================================
// Individual Dialog Components
// ============================================================================

function ConfirmationDialog({
  vm,
}: {
  vm: ConfirmationDialogVM;
}) {
  return (
    <Dialog open onClose={vm.cancel}>
      <DialogHeader>
        <DialogTitle>{vm.title}</DialogTitle>
        <DialogDescription>{vm.body}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="secondary" onClick={vm.cancel}>
          Cancel
        </Button>
        <Button
          variant={vm.confirmVariant === "destructive" ? "destructive" : "primary"}
          onClick={vm.confirm}
        >
          {vm.confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function StrongConfirmationDialog({
  vm,
}: {
  vm: StrongConfirmationDialogVM;
}) {
  return (
    <Dialog open onClose={vm.cancel}>
      <DialogHeader>
        <DialogTitle>{vm.title}</DialogTitle>
        <DialogDescription>{vm.body}</DialogDescription>
      </DialogHeader>
      <DialogContent>
        <FormField
          label={`Type "${vm.confirmationText}" to confirm`}
          htmlFor="confirmation-input"
        >
          <Queryable query={vm.inputText$}>
            {(inputText) => (
              <Input
                id="confirmation-input"
                value={inputText}
                onChange={(e) => vm.updateInput(e.target.value)}
                placeholder={vm.confirmationText}
                autoFocus
              />
            )}
          </Queryable>
        </FormField>
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={vm.cancel}>
          Cancel
        </Button>
        <Queryable query={[vm.confirmEnabled$, vm.isProcessing$]}>
          {([enabled, isProcessing]) => (
            <Button
              variant="destructive"
              onClick={vm.confirm}
              disabled={!enabled}
              loading={isProcessing}
            >
              Delete
            </Button>
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

function CreateDatabaseDialog({
  vm,
}: {
  vm: CreateDatabaseDialogVM;
}) {
  return (
    <Dialog open onClose={vm.cancel} maxWidth="md">
      <DialogHeader>
        <DialogTitle>Create Database</DialogTitle>
        <DialogDescription>
          Create a new database or load a demo with sample data.
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        {/* Mode tabs */}
        <Queryable query={vm.mode$}>
          {(mode) => (
            <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
              <button
                type="button"
                onClick={() => vm.demos.clearSelection()}
                className={`
                  flex-1 h-compact px-3 rounded-md text-dense-sm font-medium transition-colors
                  ${mode === "empty"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                Empty Database
              </button>
              <Queryable query={vm.demos.items$}>
                {(items) => (
                  <button
                    type="button"
                    onClick={() => {
                      // Switch to demo mode by selecting the first demo if none selected
                      if (items.length > 0) {
                        vm.demos.select(items[0].id);
                      }
                    }}
                    className={`
                      flex-1 h-compact px-3 rounded-md text-dense-sm font-medium transition-colors
                      ${mode === "demo"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    Demo Database
                  </button>
                )}
              </Queryable>
            </div>
          )}
        </Queryable>

        {/* Content based on mode */}
        <Queryable query={vm.mode$}>
          {(mode) =>
            mode === "empty" ? (
              <FormFieldFromVM input={vm.nameInput} label="Database Name" autoFocus />
            ) : (
              <DemoSelector demos={vm.demos} />
            )
          }
        </Queryable>
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={vm.cancel}>
          Cancel
        </Button>
        <Queryable query={[vm.mode$, vm.createDisabled$, vm.isCreating$]}>
          {([mode, disabled, isCreating]) => (
            <Button
              onClick={vm.create}
              disabled={disabled !== null}
              loading={isCreating}
            >
              {mode === "demo" ? "Load Demo" : "Create"}
            </Button>
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

function DemoSelector({ demos }: { demos: CreateDatabaseDialogVM["demos"] }) {
  return (
    <Queryable query={demos.items$}>
      {(items) => (
        <div className="space-y-2">
          <p className="text-dense-sm text-muted-foreground mb-3">
            Select a demo to load with pre-built schema and sample data:
          </p>
          <div className="grid gap-2">
            {items.map((demo) => (
              <Queryable key={demo.id} query={demo.isSelected$}>
                {(isSelected) => (
                  <button
                    type="button"
                    onClick={demo.select}
                    className={`
                      w-full p-3 rounded-lg border text-left transition-colors
                      ${isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-dense-sm">{demo.name}</span>
                      {isSelected && (
                        <span className="text-dense-xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-dense-xs text-muted-foreground">
                      {demo.description}
                    </p>
                  </button>
                )}
              </Queryable>
            ))}
          </div>
        </div>
      )}
    </Queryable>
  );
}

function CreateUserDialog({
  vm,
}: {
  vm: CreateUserDialogVM;
}) {
  return (
    <Dialog open onClose={vm.cancel}>
      <DialogHeader>
        <DialogTitle>Create User</DialogTitle>
        <DialogDescription>Create a new user account.</DialogDescription>
      </DialogHeader>
      <DialogContent>
        <FormFieldFromVM input={vm.usernameInput} label="Username" autoFocus />
        <PasswordFieldFromVM input={vm.passwordInput} label="Password" />
        <Queryable query={vm.passwordsMatch$}>
          {(matches) => (
            <PasswordFieldFromVM
              input={vm.confirmPasswordInput}
              label="Confirm Password"
              error={
                !matches
                  ? "Passwords do not match"
                  : undefined
              }
            />
          )}
        </Queryable>
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={vm.cancel}>
          Cancel
        </Button>
        <Queryable query={[vm.createDisabled$, vm.isCreating$]}>
          {([disabled, isCreating]) => (
            <Button
              onClick={vm.create}
              disabled={disabled !== null}
              loading={isCreating}
            >
              Create User
            </Button>
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

function EditPasswordDialog({
  vm,
}: {
  vm: EditPasswordDialogVM;
}) {
  return (
    <Dialog open onClose={vm.cancel}>
      <DialogHeader>
        <DialogTitle>Edit Password</DialogTitle>
        <DialogDescription>
          Change password for user <strong>{vm.usernameDisplay}</strong>
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        <PasswordFieldFromVM input={vm.newPasswordInput} label="New Password" autoFocus />
        <Queryable query={vm.passwordsMatch$}>
          {(matches) => (
            <PasswordFieldFromVM
              input={vm.confirmPasswordInput}
              label="Confirm New Password"
              error={!matches ? "Passwords do not match" : undefined}
            />
          )}
        </Queryable>
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={vm.cancel}>
          Cancel
        </Button>
        <Queryable query={[vm.saveDisabled$, vm.isSaving$]}>
          {([disabled, isSaving]) => (
            <Button
              onClick={vm.save}
              disabled={disabled !== null}
              loading={isSaving}
            >
              Save Password
            </Button>
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

function SaveQueryDialog({
  vm,
}: {
  vm: SaveQueryDialogVM;
}) {
  const title = vm.mode === "create" ? "Save Query" : "Rename Query";

  return (
    <Dialog open onClose={vm.cancel} maxWidth="md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <FormFieldFromVM input={vm.nameInput} label="Query Name" autoFocus />
        <FormFieldFromVM input={vm.descriptionInput} label="Description (optional)" />
        {vm.mode === "create" && (
          <FolderSelector
            label="Folder"
            folder={vm.folder}
          />
        )}
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={vm.cancel}>
          Cancel
        </Button>
        <Queryable query={vm.saveDisabled$}>
          {(disabled) => (
            <Button onClick={vm.save} disabled={disabled !== null}>
              Save
            </Button>
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

function CreateFolderDialog({
  vm,
}: {
  vm: CreateFolderDialogVM;
}) {
  return (
    <Dialog open onClose={vm.cancel}>
      <DialogHeader>
        <DialogTitle>Create Folder</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <FormFieldFromVM input={vm.nameInput} label="Folder Name" autoFocus />
        <FolderSelector
          label="Parent Folder"
          folder={vm.parentFolder}
        />
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={vm.cancel}>
          Cancel
        </Button>
        <Queryable query={vm.createDisabled$}>
          {(disabled) => (
            <Button onClick={vm.create} disabled={disabled !== null}>
              Create
            </Button>
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

function MoveQueryDialog({
  vm,
}: {
  vm: MoveQueryDialogVM;
}) {
  return (
    <Dialog open onClose={vm.cancel}>
      <DialogHeader>
        <DialogTitle>Move {vm.itemType === "query" ? "Query" : "Folder"}</DialogTitle>
        <DialogDescription>
          Move <strong>{vm.itemName}</strong> to a different location.
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        <FolderSelector
          label="Destination"
          folder={vm.destinationFolder}
        />
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={vm.cancel}>
          Cancel
        </Button>
        <Queryable query={vm.moveDisabled$}>
          {(disabled) => (
            <Button onClick={vm.move} disabled={disabled !== null}>
              Move
            </Button>
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

function ImportQueriesDialog({
  vm,
}: {
  vm: ImportQueriesDialogVM;
}) {
  return (
    <Dialog open onClose={vm.cancel} maxWidth="md">
      <DialogHeader>
        <DialogTitle>Import Queries</DialogTitle>
        <DialogDescription>
          Import queries and folders from a JSON file.
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        {/* Strategy selection */}
        <FormField label="Import Strategy">
          <Queryable query={vm.strategy$}>
            {(strategy) => (
              <div className="flex gap-2">
                {(["merge", "replace", "skip"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => vm.setStrategy(s)}
                    className={`
                      h-compact px-3 rounded-md text-dense-xs font-medium transition-colors
                      ${strategy === s
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </Queryable>
        </FormField>

        {/* File selection */}
        <FormField label="File">
          <Queryable query={vm.selectedFile$}>
            {(file) => (
              <div className="flex items-center gap-2">
                {file ? (
                  <>
                    <span className="text-dense-sm truncate flex-1">
                      {file.name} ({file.sizeDisplay})
                    </span>
                    <Button
                      variant="ghost"
                      density="compact"
                      onClick={vm.clearFile}
                    >
                      Clear
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={vm.selectFile}>
                    Choose File
                  </Button>
                )}
              </div>
            )}
          </Queryable>
        </FormField>

        {/* File error */}
        <Queryable query={vm.fileError$}>
          {(error) =>
            error ? (
              <p className="text-dense-xs text-destructive mb-4">{error}</p>
            ) : null
          }
        </Queryable>

        {/* Preview */}
        <Queryable query={vm.preview$}>
          {(preview) =>
            preview ? (
              <div className="bg-muted/50 rounded-md p-3 text-dense-sm">
                <p className="font-medium mb-1">Preview:</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>{preview.folderCount} folders</li>
                  <li>{preview.queryCount} queries</li>
                  {preview.updateCount > 0 && (
                    <li>{preview.updateCount} to update</li>
                  )}
                  {preview.skipCount > 0 && (
                    <li>{preview.skipCount} to skip</li>
                  )}
                </ul>
              </div>
            ) : null
          }
        </Queryable>
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={vm.cancel}>
          Cancel
        </Button>
        <Queryable query={[vm.importDisabled$, vm.isImporting$]}>
          {([disabled, isImporting]) => (
            <Button
              onClick={vm.import}
              disabled={disabled !== null}
              loading={isImporting}
            >
              Import
            </Button>
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface FormFieldFromVMProps {
  input: import("@/vm").FormInputVM;
  label: string;
  autoFocus?: boolean;
}

function FormFieldFromVM({ input, label, autoFocus }: FormFieldFromVMProps) {
  return (
    <Queryable query={[input.value$, input.error$]}>
      {([value, error]) => (
        <FormField label={label} error={error ?? undefined} htmlFor={`input-${label}`}>
          <Input
            id={`input-${label}`}
            value={value}
            onChange={(e) => input.update(e.target.value)}
            error={!!error}
            autoFocus={autoFocus}
          />
        </FormField>
      )}
    </Queryable>
  );
}

interface PasswordFieldFromVMProps {
  input: import("@/vm").PasswordInputVM;
  label: string;
  error?: string;
  autoFocus?: boolean;
}

function PasswordFieldFromVM({ input, label, error, autoFocus }: PasswordFieldFromVMProps) {
  return (
    <Queryable query={[input.value$, input.error$]}>
      {([value, vmError]) => (
        <FormField
          label={label}
          error={error ?? vmError ?? undefined}
          htmlFor={`input-${label}`}
        >
          <PasswordInput
            id={`input-${label}`}
            value={value}
            onChange={(e) => input.update(e.target.value)}
            error={!!(error ?? vmError)}
            autoFocus={autoFocus}
          />
        </FormField>
      )}
    </Queryable>
  );
}

interface FolderSelectorProps {
  label: string;
  folder: {
    selectedId$: import("@/vm").Queryable<string | null>;
    options$: import("@/vm").Queryable<Array<{ key: string | null; label: string; depth: number }>>;
    select(folderId: string | null): void;
  };
}

function FolderSelector({ label, folder }: FolderSelectorProps) {
  return (
    <FormField label={label}>
      <Queryable query={[folder.options$, folder.selectedId$]}>
        {([options, selectedId]) => (
          <div className="border border-input rounded-md max-h-[200px] overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.key ?? "root"}
                type="button"
                onClick={() => folder.select(opt.key)}
                className={`
                  w-full h-row px-3 text-left text-dense-sm transition-colors
                  ${selectedId === opt.key
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                  }
                `}
                style={{ paddingLeft: `${12 + opt.depth * 16}px` }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </Queryable>
    </FormField>
  );
}
