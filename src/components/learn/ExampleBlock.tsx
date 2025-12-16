/**
 * Example code block component.
 *
 * Displays TypeQL code with interactive buttons for copying to REPL
 * and running queries directly from the documentation.
 *
 * ```
 * ┌─────────────────────────────────────────────────┐
 * │ match $p isa person;              [→REPL] [▶]   │
 * │   has name $n;                                   │
 * └─────────────────────────────────────────────────┘
 * ```
 *
 * States:
 * - Idle: Default state with Run/Copy buttons
 * - Running: Shows spinner, buttons disabled
 * - Success: Shows checkmark with result count
 * - Error: Shows error message
 */

import { Play, Copy, Loader2 } from "lucide-react";
import { Queryable } from "@/vm/components";
import type { DocumentExampleVM, ExampleExecutionState } from "@/vm/learn";
import { mapExampleResultToDisplayVM } from "@/vm/query-results.adapters";
import { QueryResultsDisplay } from "../query/QueryResultsDisplay";
import { Button } from "../ui/button";

export interface ExampleBlockProps {
  vm: DocumentExampleVM;
}

export function ExampleBlock({ vm }: ExampleBlockProps) {
  const isInteractive = vm.isInteractive;

  return (
    <div
      id={vm.id}
      className={`
        relative rounded-md border overflow-hidden
        ${getBlockStyle(vm.type)}
      `}
    >
      {/* Code display */}
      <pre className="p-3 pr-24 overflow-x-auto text-dense-sm font-mono bg-muted/30">
        <code className="text-foreground">{vm.query}</code>
      </pre>

      {/* Action buttons */}
      {isInteractive && (
        <div className="absolute top-2 right-2 flex gap-1">
          <Queryable query={vm.wasExecuted$}>
            {(wasExecuted) => (
              <Button
                variant="ghost"
                density="compact"
                onClick={vm.copyToRepl}
                title="Copy to REPL"
                className="h-6 px-2 text-dense-xs"
              >
                <Copy className="size-3.5 mr-1" />
                REPL
                {wasExecuted && (
                  <span className="ml-1 text-beacon-ok">✓</span>
                )}
              </Button>
            )}
          </Queryable>

          <Queryable query={vm.executionState$}>
            {(state) => (
              <RunButton
                state={state}
                onClick={() => vm.run()}
              />
            )}
          </Queryable>
        </div>
      )}

      {/* Execution result panel */}
      <Queryable query={vm.executionState$}>
        {(state) => (
          <Queryable query={vm.currentResult$}>
            {(result) => (
              <QueryResultsDisplay
                mode="compact"
                result={mapExampleResultToDisplayVM(state, result)}
              />
            )}
          </Queryable>
        )}
      </Queryable>
    </div>
  );
}

/**
 * Run button with state-dependent appearance.
 */
function RunButton({
  state,
  onClick,
}: {
  state: ExampleExecutionState;
  onClick: () => void;
}) {
  const isRunning = state.type === "running";

  return (
    <Button
      variant="ghost"
      density="compact"
      onClick={onClick}
      disabled={isRunning}
      title={isRunning ? "Running..." : "Run query"}
      className="h-6 px-2 text-dense-xs"
    >
      {isRunning ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Play className="size-3.5" />
      )}
    </Button>
  );
}

/**
 * Get styling classes based on example type.
 */
function getBlockStyle(type: DocumentExampleVM["type"]): string {
  switch (type) {
    case "example":
      return "border-border";
    case "invalid":
      return "border-beacon-error/30 bg-beacon-error/5";
    case "schema":
      return "border-primary/30 bg-primary/5";
    case "readonly":
      return "border-muted bg-muted/20";
    default:
      return "border-border";
  }
}
