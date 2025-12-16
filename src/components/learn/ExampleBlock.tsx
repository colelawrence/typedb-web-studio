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

import { Play, Copy, Loader2, Check, AlertCircle, Clock } from "lucide-react";
import { Queryable } from "@/vm/components";
import type { DocumentExampleVM, ExampleExecutionState, ExampleRunResultVM } from "@/vm/learn";
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
            {(result) => <ExecutionResultPanel state={state} result={result} />}
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
 * Execution result panel showing full details.
 */
function ExecutionResultPanel({
  state,
  result,
}: {
  state: ExampleExecutionState;
  result: ExampleRunResultVM | null;
}) {
  if (state.type === "idle") {
    return null;
  }

  if (state.type === "running") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-t text-dense-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        <span>Running query...</span>
      </div>
    );
  }

  if (state.type === "success" && result) {
    return (
      <div className="border-t border-beacon-ok/20 bg-beacon-ok/5">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1.5 text-dense-xs text-beacon-ok">
            <Check className="size-3.5" />
            <span className="font-medium">
              {result.resultCount === 0 || result.resultCount === undefined
                ? "Query executed successfully"
                : `${result.resultCount} result${result.resultCount === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="flex items-center gap-1 text-dense-xs text-muted-foreground">
            <Clock className="size-3" />
            <span>{formatExecutionTime(result.executionTimeMs)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (state.type === "error" && result) {
    return (
      <div className="border-t border-beacon-error/20 bg-beacon-error/5">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1.5 text-dense-xs text-beacon-error">
            <AlertCircle className="size-3.5 shrink-0" />
            <span className="font-medium">Query failed</span>
          </div>
          {result.executionTimeMs > 0 && (
            <div className="flex items-center gap-1 text-dense-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>{formatExecutionTime(result.executionTimeMs)}</span>
            </div>
          )}
        </div>
        <div className="px-3 pb-2">
          <pre className="text-dense-xs text-beacon-error/90 whitespace-pre-wrap break-words font-mono bg-beacon-error/10 rounded px-2 py-1.5">
            {result.error}
          </pre>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Format execution time for display.
 */
function formatExecutionTime(ms: number): string {
  if (ms < 1) {
    return "<1ms";
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
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
