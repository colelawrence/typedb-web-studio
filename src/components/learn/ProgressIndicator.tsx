/**
 * Progress indicator icons for the Learn sidebar.
 *
 * Shows visual progress state for folders and sections:
 * - not-started: Empty circle
 * - in-progress: Half-filled circle
 * - completed: Checkmark
 */

import { Check, Circle } from "lucide-react";
import type { ProgressState } from "@/vm/learn";

export interface ProgressIndicatorProps {
  state: ProgressState;
  className?: string;
}

export function ProgressIndicator({ state, className = "" }: ProgressIndicatorProps) {
  switch (state) {
    case "completed":
      return (
        <Check
          className={`size-4 text-beacon-ok ${className}`}
          aria-label="Completed"
        />
      );
    case "in-progress":
      return (
        <svg
          className={`size-4 text-beacon-warn ${className}`}
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-label="In progress"
        >
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z" />
          <path d="M8 1a7 7 0 0 1 0 14V1z" />
        </svg>
      );
    case "not-started":
    default:
      return (
        <Circle
          className={`size-4 text-muted-foreground/50 ${className}`}
          aria-label="Not started"
        />
      );
  }
}

export interface ProgressBadgeProps {
  percent: number;
  className?: string;
}

export function ProgressBadge({ percent, className = "" }: ProgressBadgeProps) {
  return (
    <span
      className={`text-dense-xs text-muted-foreground tabular-nums ${className}`}
      title={`${percent}% complete`}
    >
      {percent}%
    </span>
  );
}
