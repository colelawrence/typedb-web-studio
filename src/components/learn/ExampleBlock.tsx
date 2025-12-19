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
 * - Blocked: Muted Run button that reveals inline prompt on click
 */

import { useState } from "react";
import { Play, Copy, Loader2, Database } from "lucide-react";
import { Queryable } from "@/vm/components";
import type { DocumentExampleVM, ExampleExecutionState } from "@/vm/learn";
import { mapExampleResultToDisplayVM } from "@/vm/query-results.adapters";
import { QueryResultsDisplay } from "../query/QueryResultsDisplay";
import { Button } from "../ui/button";
import { TypeQLHighlighter } from "../editor";
import { ExampleBlockedPrompt } from "./ExampleBlockedPrompt";

export interface ExampleBlockProps {
  vm: DocumentExampleVM;
}

export function ExampleBlock({ vm }: ExampleBlockProps) {
  const isInteractive = vm.isInteractive;
  const [showBlockedPrompt, setShowBlockedPrompt] = useState(false);

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

          <Queryable query={[vm.runReadiness$, vm.executionState$]}>
            {([runReadiness, state]) => (
              <RunButton
                state={state}
                runReadiness={runReadiness}
                requiredContext={vm.requiredContext}
                onRun={() => vm.run()}
                onBlockedClick={() => setShowBlockedPrompt((v) => !v)}
              />
            )}
          </Queryable>
        </div>
      )}

      {/* Blocked state inline prompt - revealed when muted Run button is clicked */}
      {isInteractive && showBlockedPrompt && (
        <Queryable query={vm.blockedState$}>
          {(blockedState) =>
            blockedState?.action ? (
              <ExampleBlockedPrompt
                blockedState={blockedState}
                onConnect={() => vm.navigateToConnect()}
                onSelectDatabase={() => vm.openDatabaseSelector()}
                onLoadContext={() => vm.loadContext()}
                onDismiss={() => setShowBlockedPrompt(false)}
              />
            ) : null
          }
        </Queryable>
      )}

      {/* Execution result panel */}
      <Queryable query={[vm.executionState$, vm.currentResult$]}>
        {([state, result]) => (
          <QueryResultsDisplay
            mode="compact"
            result={mapExampleResultToDisplayVM(state, result)}
          />
        )}
      </Queryable>
    </div>
  );
}

/**
 * Run button with state-dependent appearance.
 *
 * Based on `runReadiness`:
 * - "ready": Enabled Run button (just Play icon)
 * - "needs-context": "Load & Run" button with Database + Play icons
 * - "blocked": Muted button that reveals inline prompt on click
 *
 * During execution (`state.type === "running"`), shows spinner and disables.
 */
function RunButton({
  state,
  runReadiness,
  requiredContext,
  onRun,
  onBlockedClick,
}: {
  state: ExampleExecutionState;
  runReadiness: "ready" | "needs-context" | "blocked";
  requiredContext: string | null;
  onRun: () => void;
  onBlockedClick: () => void;
}) {
  const isRunning = state.type === "running";

  // Blocked state: muted button that reveals prompt
  if (runReadiness === "blocked") {
    return (
      <Button
        variant="ghost"
        density="compact"
        onClick={onBlockedClick}
        title="Cannot run - click for details"
        className="h-6 px-2 text-dense-xs opacity-50"
      >
        <Play className="size-3.5" />
      </Button>
    );
  }

  // "needs-context": combined button that loads context then runs
  if (runReadiness === "needs-context" && requiredContext) {
    const title = isRunning
      ? "Running..."
      : `Load "${requiredContext}" database and run`;
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

  // Standard run button (ready state)
  const title = isRunning ? "Running..." : "Run query";
  return (
    <Button
      variant="ghost"
      density="compact"
      onClick={onRun}
      disabled={isRunning}
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
