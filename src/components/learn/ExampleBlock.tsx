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
import { Play, Copy, Loader2, Database, Check } from "lucide-react";
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

  const handleBlockedClick = () => {
    setShowBlockedPrompt((v) => !v);
  };

  return (
    <div
      id={vm.id}
      className={`
        rounded-md border
        ${getBlockStyle(vm.type)}
      `}
      data-interactive={isInteractive ? "true" : "false"}
    >
      <div className="group relative">
        {/* Code display */}
        <pre className="p-2 overflow-x-auto text-dense-sm font-mono bg-muted/30">
          <TypeQLHighlighter code={vm.query} className="text-foreground" />
        </pre>

        {/* Executed indicator - overlaid on block (always visible when executed) */}
        {isInteractive && (
          <Queryable query={vm.wasExecuted$}>
            {(wasExecuted) =>
              wasExecuted ? (
                <div
                  className="absolute top-1 right-1 size-4 flex items-center justify-center rounded-full bg-beacon-ok/20 text-beacon-ok"
                  title="Executed"
                >
                  <Check className="size-2.5" strokeWidth={3} />
                </div>
              ) : null
            }
          </Queryable>
        )}

        {/* Hover-reveal chin - floats over content below */}
        {isInteractive && (
          <div className="relative">
            <div
              className={`
              absolute -top-3 right-0 z-10
              flex justify-end gap-0.5 px-1.5 py-px
              bg-muted/90 backdrop-blur-sm rounded-md border border-border/30
              opacity-0 group-hover:opacity-100
              transition-opacity duration-150
              pointer-events-none group-hover:pointer-events-auto
            `}
            >
              <Button
                variant="ghost"
                density="compact"
                onClick={vm.copyToRepl}
                title="Copy to REPL"
                className="h-5 px-1.5 text-[10px] gap-0.5"
              >
                <Copy className="size-3" />
                REPL
              </Button>

              <Queryable query={[vm.runReadiness$, vm.executionState$]}>
                {([runReadiness, state]) => (
                  <RunButton
                    state={state}
                    runReadiness={runReadiness}
                    requiredContext={vm.requiredContext}
                    onRun={() => vm.run()}
                    onBlockedClick={handleBlockedClick}
                  />
                )}
              </Queryable>
            </div>
          </div>
        )}
      </div>

      {/* Blocked state inline prompt - revealed when muted Run button is clicked */}
      {isInteractive && showBlockedPrompt && (
        <Queryable query={vm.blockedState$}>
          {(blockedState) => {
            if (!blockedState?.action) {
              console.warn(
                `[ExampleBlock] Blocked prompt requested but no action available for ${vm.id}`,
                { blockedState, requiredContext: vm.requiredContext }
              );
              return null;
            }
            return (
              <ExampleBlockedPrompt
                blockedState={blockedState}
                onDismiss={() => setShowBlockedPrompt(false)}
              />
            );
          }}
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
        className="h-5 px-1.5 text-[10px] opacity-50"
      >
        <Play className="size-3" />
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
        className="h-5 px-1.5 text-[10px] gap-0.5"
      >
        {isRunning ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <>
            <Database className="size-2.5" />
            <Play className="size-2.5" />
          </>
        )}
        <span>Load & Run</span>
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
      className="h-5 px-1.5 text-[10px]"
    >
      {isRunning ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Play className="size-3" />
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
