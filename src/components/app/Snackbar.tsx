/**
 * Snackbar component for TypeDB Studio.
 *
 * Displays notification messages at the bottom of the screen.
 */

import type { SnackbarVM } from "@/vm";
import { Queryable } from "@/vm/components";
import { CheckCircle, AlertTriangle, XCircle, X } from "lucide-react";

export function Snackbar({ vm }: { vm: SnackbarVM }) {
  return (
    <Queryable query={vm.current$}>
      {(notification) => {
        if (!notification) return null;

        const Icon = notification.variant === "success"
          ? CheckCircle
          : notification.variant === "warning"
          ? AlertTriangle
          : XCircle;

        const variantClasses = notification.variant === "success"
          ? "bg-green-900/90 border-green-700 text-green-100"
          : notification.variant === "warning"
          ? "bg-yellow-900/90 border-yellow-700 text-yellow-100"
          : "bg-red-900/90 border-red-700 text-red-100";

        return (
          <div
            key={notification.key}
            className={`
              fixed bottom-4 left-1/2 -translate-x-1/2 z-50
              flex items-center gap-3 px-4 py-3
              border rounded-lg shadow-lg
              animate-in slide-in-from-bottom-4 fade-in duration-200
              ${variantClasses}
            `}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{notification.message}</span>
            {notification.persistent && (
              <button
                onClick={notification.dismiss}
                className="ml-2 p-1 rounded hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      }}
    </Queryable>
  );
}
