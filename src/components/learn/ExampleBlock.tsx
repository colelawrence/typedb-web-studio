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

import { Play, Copy, Loader2, Database } from "lucide-react";
import { Queryable } from "@/vm/components";
import type { DocumentExampleVM, ExampleExecutionState, ExampleRunReadiness } from "@/vm/learn";
import { mapExampleResultToDisplayVM } from "@/vm/query-results.adapters";
import { QueryResultsDisplay } from "../query/QueryResultsDisplay";
import { Button } from "../ui/button";
import { TypeQLHighlighter } from "../editor";

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
        <TypeQLHighlighter code={vm.query} className="text-foreground" />
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

          <Queryable query={vm.runReadiness$}>
            {(runReadiness) => (
              <Queryable query={vm.executionState$}>
                {(state) => (
                  <Queryable query={vm.runDisabledReason$}>
                    {(runDisabledReason) => (
                      <RunButton
                        state={state}
                        runReadiness={runReadiness}
                        requiredContext={vm.requiredContext}
                        runDisabledReason={runDisabledReason}
                        onRun={() => vm.run()}
                      />
                    )}
                  </Queryable>
                )}
              </Queryable>
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
 *
 * Shows different UI based on runReadiness:
 * - "ready": Simple "Run" button
 * - "needs-context": "Load & Run" button with database icon
 * - "blocked": Disabled "Run" button with tooltip
 */
function RunButton({
  state,
  runReadiness,
  requiredContext,
  runDisabledReason,
  onRun,
}: {
  state: ExampleExecutionState;
  runReadiness: ExampleRunReadiness;
  requiredContext: string | null;
  runDisabledReason: string | null;
  onRun: () => void;
}) {
  const isRunning = state.type === "running";
  const isBlocked = runReadiness === "blocked";
  const needsContext = runReadiness === "needs-context";

  // Build title based on state
  let title = "Run query";
  if (runDisabledReason && isBlocked) {
    title = runDisabledReason;
  } else if (isRunning) {
    title = "Running...";
  } else if (needsContext && requiredContext) {
    title = `Load "${requiredContext}" database and run`;
  }

  // For "needs-context", show a combined button that loads context then runs
  if (needsContext && requiredContext) {
    return (
      <Button
        variant="ghost"
        density="compact"
        onClick={onRun}
        disabled={isRunning}
        title={title}
        className="h-6 px-2 text-dense-xs gap-1"
      >
        {isRunning ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <>
            <Database className="size-3" />
            <Play className="size-3" />
          </>
        )}
        <span className="text-[10px]">Load & Run</span>
      </Button>
    );
  }

  // Standard run button (ready or blocked)
  return (
    <Button
      variant="ghost"
      density="compact"
      onClick={onRun}
      disabled={isBlocked || isRunning}
      title={title}
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
