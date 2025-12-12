/**
 * Users page view model.
 *
 * User management interface for creating, editing, and deleting users.
 */

import type { Queryable } from "../../types";
import type { DisabledState } from "../../types";

/**
 * Users page VM.
 *
 * **Layout:**
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │  User Management                        [+ Create User] │
 * ├─────────────────────────────────────────────────────────┤
 * │  Username            Actions                            │
 * │  ────────────────────────────────────────────────────── │
 * │  admin               [Edit Password] [Delete]           │
 * │  analyst             [Edit Password] [Delete]           │
 * │  readonly            [Edit Password] [Delete]           │
 * └─────────────────────────────────────────────────────────┘
 * ```
 */
export interface UsersPageVM {
  /**
   * Current page status.
   *
   * **States:**
   * - `"loading"`: Fetching user list from server
   * - `"ready"`: User list loaded and displayed
   * - `"error"`: Failed to load user list
   */
  status$: Queryable<UsersPageStatus>;

  /**
   * Error message when status is "error".
   */
  errorMessage$: Queryable<string | null>;

  /**
   * Retries loading user list after error.
   */
  retry(): void;

  /**
   * List of users.
   * Empty array while loading or on error.
   */
  users$: Queryable<UserRowVM[]>;

  /**
   * Whether the user list is empty (no users exist).
   */
  isEmpty$: Queryable<boolean>;

  /**
   * Create user button.
   */
  createUser: {
    /**
     * Opens create user dialog.
     */
    click(): void;

    /**
     * Disabled state.
     *
     * **Disabled when:**
     * - Not connected (shouldn't happen - page inaccessible)
     * - Loading users list
     */
    disabled$: Queryable<DisabledState>;
  };

  /**
   * Placeholder when page cannot function.
   *
   * **Placeholder types:**
   * - `"noServer"`: Not connected to any server
   */
  placeholder$: Queryable<UsersPagePlaceholder | null>;
}

export type UsersPageStatus = "loading" | "ready" | "error";

export type UsersPagePlaceholder = {
  type: "noServer";
  message: string;
  actionLabel: string;
  action: () => void;
};

/**
 * Individual user row in the table.
 */
export interface UserRowVM {
  /** Unique key (username) */
  key: string;

  /**
   * Username display.
   * The actual username from the server.
   */
  usernameDisplay: string;

  /**
   * Opens edit password dialog for this user.
   *
   * **Dialog flow:**
   * 1. Enter new password
   * 2. Confirm new password
   * 3. Validate passwords match
   * 4. Submit to server
   * 5. Show toast "Password updated for {username}"
   */
  editPassword(): void;

  /**
   * Opens delete confirmation dialog for this user.
   *
   * **Confirmation:**
   * - Message: "Are you sure you want to delete user '{username}'?"
   * - Requires typing username to confirm (strong confirmation)
   *
   * **Post-delete:**
   * - User removed from list
   * - Toast shows "User '{username}' deleted"
   */
  delete(): void;

  /**
   * Whether this user can be deleted.
   * Some users (e.g., last admin) may not be deletable.
   *
   * **Disabled reasons:**
   * - "Cannot delete the last admin user"
   * - "Cannot delete yourself" (if logged in as this user)
   */
  deleteDisabled$: Queryable<DisabledState>;
}
