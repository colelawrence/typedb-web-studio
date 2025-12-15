/**
 * Snackbar component for TypeDB Studio.
 *
 * Displays notification messages at the bottom of the screen.
 * Updated with Dense-Core tokens (Phase 2: Task 2.5)
 */

import type { SnackbarVM } from "@/vm";
import { Queryable } from "@/vm/components";
import { CheckCircle, AlertTriangle, XCircle, X } from "lucide-react";

// Semantic variant styles using Dense-Core color tokens
const variantStyles = {
  success: "bg-chart-2/10 border-chart-2/30 text-chart-2",
  warning: "bg-chart-4/10 border-chart-4/30 text-chart-4",
  error: "bg-destructive/10 border-destructive/30 text-destructive",
};

const variantIcons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

export function Snackbar({ vm }: { vm: SnackbarVM }) {
  return (
    <Queryable query={vm.current$}>
      {(notification) => {
        if (!notification) return null;

        const Icon = variantIcons[notification.variant];
        const variantClasses = variantStyles[notification.variant];

        return (
          <div
            key={notification.key}
            className={`
              fixed bottom-4 left-1/2 -translate-x-1/2 z-50
              flex items-center gap-3 px-4 py-3
              border rounded-lg shadow-lg backdrop-blur-sm
              max-w-[80ch]
              animate-in slide-in-from-bottom-4 fade-in duration-200
              ${variantClasses}
            `}
            role="alert"
          >
            <Icon className="size-5 flex-shrink-0" />
            <span className="text-dense-sm font-medium">{notification.message}</span>
            {notification.persistent && (
              <button
                onClick={notification.dismiss}
                className="ml-2 p-1 rounded hover:bg-foreground/10 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        );
      }}
    </Queryable>
  );
}
