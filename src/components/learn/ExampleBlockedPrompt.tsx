/**
 * Inline prompt shown below code block when example is blocked.
 * Revealed by clicking the muted Run button.
 */

import {
  AlertCircle,
  Database,
  Unplug,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ExampleBlockedState, ExampleBlockedAction } from "@/vm/learn";
import { Button } from "../ui/button";

const actionConfig: Record<
  ExampleBlockedAction["type"],
  { icon: LucideIcon; label: string }
> = {
  connect: { icon: Unplug, label: "Connect" },
  selectDatabase: { icon: Database, label: "Select Database" },
  loadContext: { icon: Database, label: "Load Context" },
};

export interface ExampleBlockedPromptProps {
  blockedState: ExampleBlockedState;
  onConnect: () => void;
  onSelectDatabase: () => void;
  onLoadContext: () => void;
  onDismiss?: () => void;
}

export function ExampleBlockedPrompt({
  blockedState,
  onConnect,
  onSelectDatabase,
  onLoadContext,
  onDismiss,
}: ExampleBlockedPromptProps) {
  const { action } = blockedState;
  if (!action) return null;

  const config = actionConfig[action.type];
  const Icon = config.icon;
  const handlers: Record<ExampleBlockedAction["type"], () => void> = {
    connect: onConnect,
    selectDatabase: onSelectDatabase,
    loadContext: onLoadContext,
  };

  return (
    <div className="border-t border-border bg-muted/50 px-3 py-2 flex items-center gap-3">
      <AlertCircle className="size-4 text-muted-foreground shrink-0" />
      <span className="text-dense-xs text-muted-foreground flex-1">
        {action.message}
      </span>
      <Button
        variant="ghost"
        density="compact"
        onClick={handlers[action.type]}
        className="text-dense-xs shrink-0"
      >
        <Icon className="size-3.5 mr-1" />
        {config.label}
      </Button>
      {onDismiss && (
        <Button
          variant="ghost"
          density="compact"
          onClick={onDismiss}
          title="Dismiss"
          className="h-6 w-6 p-0 shrink-0 text-muted-foreground"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
