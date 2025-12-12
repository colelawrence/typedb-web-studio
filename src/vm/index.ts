/**
 * TypeDB Studio View Model Interfaces
 *
 * This module exports all view-model interfaces for the TypeDB Studio application.
 * These interfaces define the contract between business logic and UI components.
 *
 * ## Architecture
 *
 * The VM layer follows these principles from `docs/view-model-interface-guidelines.md`:
 * 1. Structure mirrors the UI hierarchy
 * 2. Fine-grained reactivity with Queryable<T> fields ($ suffix)
 * 3. UI-ready outputs (pre-formatted strings, no raw IDs exposed)
 * 4. Opaque side-effectful handlers (return void, not Promise)
 *
 * ## Usage
 *
 * ```tsx
 * import type { TypeDBStudioAppVM, QueryPageVM } from "@/vm";
 * import { Queryable } from "@/vm/components/Queryable";
 *
 * function QueryPage({ vm }: { vm: QueryPageVM }) {
 *   return (
 *     <div>
 *       <Queryable query={vm.editor.header.titleDisplay$}>
 *         {(title) => <h1>{title}</h1>}
 *       </Queryable>
 *     </div>
 *   );
 * }
 * ```
 *
 * ## File Structure
 *
 * ```
 * vm/
 * ├── index.ts              # This file (barrel exports)
 * ├── types.ts              # Core types (Queryable, FormInputVM, etc.)
 * ├── app.vm.ts             # Root TypeDBStudioAppVM
 * ├── snackbar.vm.ts        # Notification system
 * ├── top-bar/              # Header navigation & status
 * ├── pages/                # Per-page VMs
 * │   ├── home/
 * │   ├── connect/
 * │   ├── query/
 * │   │   ├── sidebar/
 * │   │   ├── editor/
 * │   │   ├── results/
 * │   │   └── history/
 * │   ├── schema/
 * │   └── users/
 * ├── dialogs/              # Modal dialog VMs
 * └── shared/               # Reusable VM components
 * ```
 */

// Core types
export type {
  Queryable,
  IconComponent,
  FormInputVM,
  PasswordInputVM,
  DisabledState,
  ContextMenuActionVM,
} from "./types";

// Root application VM
export type {
  TypeDBStudioAppVM,
  CurrentPageState,
} from "./app.vm";

// Snackbar/notifications
export type {
  SnackbarVM,
  SnackbarNotificationVM,
} from "./snackbar.vm";

// Top bar
export * from "./top-bar";

// Pages
export * from "./pages";

// Dialogs
export * from "./dialogs";

// Shared components
export * from "./shared";

// React components for consuming VMs
export { Queryable as QueryableComponent } from "./components";

// React context and scope
export { StudioVMContext, useStudioVM } from "./StudioVMContext";
export { createStudioScope } from "./scope";
