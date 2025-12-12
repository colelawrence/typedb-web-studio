/**
 * Snackbar/toast notification view model.
 *
 * Displays transient notifications at the bottom of the screen.
 * Follows Material Design snackbar patterns.
 */

import type { Queryable } from "./types";

/**
 * Snackbar notification system VM.
 *
 * **Display rules:**
 * - Only one notification visible at a time
 * - Success/warning notifications auto-dismiss after 4 seconds
 * - Error notifications are persistent until manually dismissed
 * - New notifications queue behind current notification
 */
export interface SnackbarVM {
  /**
   * Current notification to display, or null if none.
   *
   * **Positioning:** Fixed to bottom-center of viewport, above any floating UI.
   * **Animation:** Slide up on enter, slide down on exit (200ms duration).
   */
  current$: Queryable<SnackbarNotificationVM | null>;
}

/**
 * Individual snackbar notification.
 */
export interface SnackbarNotificationVM {
  /** Unique key for React rendering and animation tracking */
  key: string;

  /**
   * Notification message text.
   * Should be concise (max ~80 characters).
   * Can include simple formatting like quotes around names.
   *
   * @example "Query saved"
   * @example "Connected to localhost:8729"
   * @example "Failed to connect: Connection refused"
   */
  message: string;

  /**
   * Visual variant determining color and icon.
   *
   * **Variants:**
   * - `"success"`: Green background, checkmark icon. Auto-dismisses after 4s.
   * - `"warning"`: Yellow/amber background, warning icon. Auto-dismisses after 4s.
   * - `"error"`: Red background, error icon. Persistent until dismissed.
   */
  variant: "success" | "warning" | "error";

  /**
   * Whether this notification requires manual dismissal.
   * - `true`: Shows dismiss button, stays until clicked
   * - `false`: Auto-dismisses after 4 seconds, no dismiss button
   *
   * **Note:** Error variants are always persistent regardless of this flag.
   */
  persistent: boolean;

  /**
   * Dismisses this notification immediately.
   * Triggers exit animation, then removes from display.
   *
   * **Keyboard:** Escape key dismisses if notification is focused.
   * **Accessibility:** Announce "Notification dismissed" to screen readers.
   */
  dismiss(): void;
}
