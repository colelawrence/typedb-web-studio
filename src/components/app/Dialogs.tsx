/**
 * Dialogs component for TypeDB Studio.
 *
 * Renders modal dialogs based on the DialogsVM state.
 * Uses Dense-Core tokens for consistent styling (Phase 3).
 */

import type { DialogsVM, ActiveDialogVM } from "@/vm";
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
        return <ActiveDialog dialog={active} onClose={vm.closeAll} />;
      }}
    </Queryable>
  );
}

function ActiveDialog({
  dialog,
  onClose,
}: {
  dialog: ActiveDialogVM;
  onClose: () => void;
}) {
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
  vm: ActiveDialogVM extends { type: "confirmation"; vm: infer V } ? V : never;
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
  vm: ActiveDialogVM extends { type: "strongConfirmation"; vm: infer V } ? V : never;
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
        <Queryable query={vm.confirmEnabled$}>
          {(enabled) => (
            <Queryable query={vm.isProcessing$}>
              {(isProcessing) => (
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
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

function CreateDatabaseDialog({
  vm,
}: {
  vm: ActiveDialogVM extends { type: "createDatabase"; vm: infer V } ? V : never;
}) {
  return (
    <Dialog open onClose={vm.cancel}>
      <DialogHeader>
        <DialogTitle>Create Database</DialogTitle>
        <DialogDescription>
          Create a new database on the connected server.
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        <FormFieldFromVM input={vm.nameInput} label="Database Name" autoFocus />
      </DialogContent>
      <DialogFooter>
        <Button variant="secondary" onClick={vm.cancel}>
          Cancel
        </Button>
        <Queryable query={vm.createDisabled$}>
          {(disabled) => (
            <Queryable query={vm.isCreating$}>
              {(isCreating) => (
                <Button
                  onClick={vm.create}
                  disabled={disabled !== null}
                  loading={isCreating}
                >
                  Create
                </Button>
              )}
            </Queryable>
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

function CreateUserDialog({
  vm,
}: {
  vm: ActiveDialogVM extends { type: "createUser"; vm: infer V } ? V : never;
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
        <Queryable query={vm.createDisabled$}>
          {(disabled) => (
            <Queryable query={vm.isCreating$}>
              {(isCreating) => (
                <Button
                  onClick={vm.create}
                  disabled={disabled !== null}
                  loading={isCreating}
                >
                  Create User
                </Button>
              )}
            </Queryable>
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

function EditPasswordDialog({
  vm,
}: {
  vm: ActiveDialogVM extends { type: "editPassword"; vm: infer V } ? V : never;
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
        <Queryable query={vm.saveDisabled$}>
          {(disabled) => (
            <Queryable query={vm.isSaving$}>
              {(isSaving) => (
                <Button
                  onClick={vm.save}
                  disabled={disabled !== null}
                  loading={isSaving}
                >
                  Save Password
                </Button>
              )}
            </Queryable>
          )}
        </Queryable>
      </DialogFooter>
    </Dialog>
  );
}

function SaveQueryDialog({
  vm,
}: {
  vm: ActiveDialogVM extends { type: "saveQuery"; vm: infer V } ? V : never;
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
  vm: ActiveDialogVM extends { type: "createFolder"; vm: infer V } ? V : never;
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
  vm: ActiveDialogVM extends { type: "moveQuery"; vm: infer V } ? V : never;
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
  vm: ActiveDialogVM extends { type: "importQueries"; vm: infer V } ? V : never;
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
        <Queryable query={vm.importDisabled$}>
          {(disabled) => (
            <Queryable query={vm.isImporting$}>
              {(isImporting) => (
                <Button
                  onClick={vm.import}
                  disabled={disabled !== null}
                  loading={isImporting}
                >
                  Import
                </Button>
              )}
            </Queryable>
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
    <Queryable query={input.value$}>
      {(value) => (
        <Queryable query={input.error$}>
          {(error) => (
            <FormField label={label} error={error ?? undefined} htmlFor={`input-${label}`}>
              <Input
                id={`input-${label}`}
                value={value}
                onChange={(e) => input.updateValue(e.target.value)}
                error={!!error}
                autoFocus={autoFocus}
              />
            </FormField>
          )}
        </Queryable>
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
    <Queryable query={input.value$}>
      {(value) => (
        <Queryable query={input.error$}>
          {(vmError) => (
            <FormField
              label={label}
              error={error ?? vmError ?? undefined}
              htmlFor={`input-${label}`}
            >
              <PasswordInput
                id={`input-${label}`}
                value={value}
                onChange={(e) => input.updateValue(e.target.value)}
                error={!!(error ?? vmError)}
                autoFocus={autoFocus}
              />
            </FormField>
          )}
        </Queryable>
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
      <Queryable query={folder.options$}>
        {(options) => (
          <Queryable query={folder.selectedId$}>
            {(selectedId) => (
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
        )}
      </Queryable>
    </FormField>
  );
}
