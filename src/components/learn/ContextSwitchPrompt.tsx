/**
 * Context Switch Prompt component.
 *
 * Shows a prompt when the current database context doesn't match
 * the section's required context, allowing users to load the correct context.
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │ ⚠ This lesson requires the "S1" context.                   │
 * │   Current: e-commerce                                       │
 * │                                                             │
 * │   [Load Context]  [Keep Current]                            │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 */

import { AlertTriangle, Database, Loader2 } from "lucide-react";
import { Queryable } from "@/vm/components";
import type { ContextSwitchPromptVM } from "@/vm/learn";
import { Button } from "../ui/button";

export interface ContextSwitchPromptProps {
  vm: ContextSwitchPromptVM;
}

export function ContextSwitchPrompt({ vm }: ContextSwitchPromptProps) {
  return (
    <Queryable query={vm.isVisible$}>
      {(isVisible) =>
        isVisible ? (
          <div className="bg-warning/10 border border-warning/30 rounded-md p-4 mb-4">
            <div className="flex gap-3">
              <div className="shrink-0 mt-0.5">
                <AlertTriangle className="size-5 text-warning" />
              </div>

              <div className="flex-1 min-w-0">
                <Queryable query={vm.requiredContext$}>
                  {(requiredContext) => (
                    <p className="text-dense-sm font-medium text-foreground">
                      This lesson requires the{" "}
                      <span className="font-semibold text-warning">
                        {requiredContext}
                      </span>{" "}
                      context.
                    </p>
                  )}
                </Queryable>

                <Queryable query={vm.currentContext$}>
                  {(currentContext) =>
                    currentContext ? (
                      <p className="text-dense-xs text-muted-foreground mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Database className="size-3" />
                          Current: {currentContext}
                        </span>
                      </p>
                    ) : (
                      <p className="text-dense-xs text-muted-foreground mt-1">
                        No context currently loaded.
                      </p>
                    )
                  }
                </Queryable>

                <Queryable query={vm.isLoading$}>
                  {(isLoading) =>
                    isLoading ? (
                      <p className="text-dense-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                        <Loader2 className="size-3 animate-spin" />
                        Loading context...
                      </p>
                    ) : null
                  }
                </Queryable>

                <Queryable query={vm.error$}>
                  {(error) =>
                    error ? (
                      <div className="bg-destructive/10 border border-destructive/30 rounded px-2 py-1.5 mt-2">
                        <p className="text-dense-xs text-destructive">{error}</p>
                      </div>
                    ) : null
                  }
                </Queryable>

                <div className="flex gap-2 mt-3">
                  <SwitchButton vm={vm} />
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
    </Queryable>
  );
}

/**
 * Button to switch contexts with loading state.
 */
function SwitchButton({ vm }: { vm: ContextSwitchPromptVM }) {
  // Track loading state locally
  const handleClick = async () => {
    await vm.switchContext();
  };

  return (
    <Queryable query={vm.isLoading$}>
      {(isLoading) => (
        <Button
          variant="primary"
          density="compact"
          onClick={handleClick}
          disabled={isLoading}
          className="text-dense-xs"
        >
          {isLoading ? (
            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <Database className="size-3.5 mr-1.5" />
          )}
          {isLoading ? "Loading..." : "Load Context"}
        </Button>
      )}
    </Queryable>
  );
}

/**
 * Compact inline context indicator.
 *
 * Shows the current context name in the document header.
 */
export interface ContextIndicatorProps {
  currentContext: string | null;
  requiredContext: string | null;
}

export function ContextIndicator({
  currentContext,
  requiredContext,
}: ContextIndicatorProps) {
  const isMatched = currentContext === requiredContext;

  if (!requiredContext) {
    return null;
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-dense-xs
        ${isMatched
          ? "bg-beacon-ok/10 text-beacon-ok"
          : "bg-warning/10 text-warning"
        }
      `}
      title={
        isMatched
          ? `Context "${requiredContext}" is loaded`
          : `Requires "${requiredContext}" context`
      }
    >
      <Database className="size-3" />
      {requiredContext}
      {!isMatched && <AlertTriangle className="size-3" />}
    </span>
  );
}
