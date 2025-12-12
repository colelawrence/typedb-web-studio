/**
 * Query editor view model.
 *
 * Contains the code editor, chat assistant, and action buttons.
 * Supports switching between code and chat modes.
 */

import type { Queryable } from "../../../types";
import type { FormInputVM, DisabledState } from "../../../types";

/**
 * Query editor VM.
 *
 * **Layout:**
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │ Query - My Query*     [code] [chat]  [⊕][💾][▶ Run] │
 * ├─────────────────────────────────────────────────────┤
 * │                                                     │
 * │  // TypeQL code editor                              │
 * │  match $p isa person;                               │
 * │  fetch $p: name;                                    │
 * │                                                     │
 * │  ┌─────────────────────────────────┐                │
 * │  │ Autocomplete suggestions        │                │
 * │  │ > person                        │                │
 * │  │   product                       │                │
 * │  └─────────────────────────────────┘                │
 * └─────────────────────────────────────────────────────┘
 * ```
 */
export interface QueryEditorVM {
  /**
   * Current editor mode.
   *
   * **Modes:**
   * - `"code"`: TypeQL code editor with syntax highlighting
   * - `"chat"`: AI chat assistant for query help
   *
   * **Behavior:**
   * - Switching modes preserves content in both
   * - Both maintain independent state
   * - Keyboard shortcuts (Cmd+Enter) work in both modes
   */
  mode$: Queryable<"code" | "chat">;

  /**
   * Switches between code and chat modes.
   */
  setMode(mode: "code" | "chat"): void;

  /**
   * Header information displaying current query context.
   */
  header: QueryEditorHeaderVM;

  /**
   * Code editor state (visible when mode is "code").
   */
  codeEditor: QueryCodeEditorVM;

  /**
   * Chat assistant state (visible when mode is "chat").
   */
  chatAssistant: QueryChatAssistantVM;

  /**
   * Action buttons in the header.
   */
  actions: QueryEditorActionsVM;
}

/**
 * Editor header showing current query context.
 */
export interface QueryEditorHeaderVM {
  /**
   * Title text for the editor header.
   *
   * **Format:**
   * - Scratch query: "Query"
   * - Saved query (clean): "Query - {queryName}"
   * - Saved query (dirty): "Query - {queryName}*"
   *
   * **Accessibility:** Asterisk should be announced as "unsaved changes".
   */
  titleDisplay$: Queryable<string>;

  /**
   * Whether there are unsaved changes to a saved query.
   * Used for visual styling of the dirty indicator.
   */
  isDirty$: Queryable<boolean>;

  /**
   * Whether currently editing a scratch (unsaved) query.
   * Affects which save actions are available.
   */
  isScratch$: Queryable<boolean>;

  /**
   * Name of the currently loaded saved query.
   * `null` if editing a scratch query.
   */
  savedQueryName$: Queryable<string | null>;
}

/**
 * Code editor state.
 *
 * **Note:** The actual editor implementation (Monaco, CodeMirror, etc.)
 * is not specified here. This VM defines the interface the editor must satisfy.
 */
export interface QueryCodeEditorVM {
  /**
   * Current editor content.
   *
   * **Sync:** Updates on every keystroke (no debounce for content).
   * **History:** Editor maintains its own undo/redo stack.
   */
  text$: Queryable<string>;

  /**
   * Updates editor content.
   * Called by the editor implementation on change.
   */
  updateText(text: string): void;

  /**
   * Current cursor position.
   * Used for autocomplete positioning.
   */
  cursorPosition$: Queryable<{ line: number; column: number }>;

  /**
   * Updates cursor position.
   * Called by the editor on cursor movement.
   */
  setCursorPosition(position: { line: number; column: number }): void;

  /**
   * Autocomplete state.
   */
  autocomplete: AutocompleteVM;

  /**
   * Handles keyboard events for shortcuts.
   *
   * **Shortcuts:**
   * - Cmd/Ctrl+Enter: Run query
   * - Alt+Space: Open autocomplete
   * - Tab: Insert indent (or accept autocomplete)
   * - Escape: Close autocomplete
   *
   * @returns true if the event was handled (prevent default)
   */
  onKeyDown(event: KeyboardEvent): boolean;
}

/**
 * Autocomplete popup state.
 */
export interface AutocompleteVM {
  /**
   * Whether autocomplete popup is visible.
   */
  isOpen$: Queryable<boolean>;

  /**
   * Filtered suggestions based on current input.
   *
   * **Sources:**
   * - TypeQL keywords (match, fetch, insert, define, etc.)
   * - Schema types (entities, relations, attributes)
   * - Schema roles
   * - Variables in scope
   *
   * **Ordering:** Relevance score, then alphabetically.
   * **Limit:** Max 10 visible suggestions.
   */
  suggestions$: Queryable<AutocompleteSuggestionVM[]>;

  /**
   * Currently highlighted suggestion index.
   * -1 if no suggestion is highlighted.
   */
  selectedIndex$: Queryable<number>;

  /**
   * Opens autocomplete at current cursor position.
   * Triggered by Alt+Space or typing trigger characters.
   */
  open(): void;

  /**
   * Closes autocomplete without accepting.
   * Triggered by Escape or clicking outside.
   */
  close(): void;

  /**
   * Moves selection to next suggestion.
   * Wraps to first if at end.
   */
  selectNext(): void;

  /**
   * Moves selection to previous suggestion.
   * Wraps to last if at start.
   */
  selectPrevious(): void;

  /**
   * Accepts currently selected suggestion.
   * Inserts text at cursor, closes popup.
   */
  confirmSelection(): void;
}

/**
 * Individual autocomplete suggestion.
 */
export interface AutocompleteSuggestionVM {
  /** Unique key */
  key: string;

  /**
   * Display label (the text to insert).
   * May include match highlighting.
   */
  label: string;

  /**
   * Category label shown beside the suggestion.
   * @example "keyword", "entity", "relation", "attribute", "role", "variable"
   */
  kindDisplay: string;

  /**
   * Whether this suggestion is currently selected.
   */
  isSelected$: Queryable<boolean>;

  /**
   * Accepts this suggestion.
   * Alternative to keyboard selection.
   */
  accept(): void;
}

/**
 * AI chat assistant state.
 */
export interface QueryChatAssistantVM {
  /**
   * Chat message history.
   *
   * **Persistence:** Chat history is session-only (not persisted).
   * **Scroll:** Auto-scrolls to newest message.
   */
  messages$: Queryable<ChatMessageVM[]>;

  /**
   * Input field for user messages.
   */
  input: FormInputVM;

  /**
   * Disabled state for send button.
   *
   * **Disabled when:**
   * - Input is empty
   * - AI is currently generating a response
   */
  sendDisabled$: Queryable<DisabledState>;

  /**
   * Sends the current input as a user message.
   *
   * **Flow:**
   * 1. Add user message to history
   * 2. Clear input field
   * 3. Set isGenerating$ = true
   * 4. Stream AI response
   * 5. Set isGenerating$ = false
   */
  send(): void;

  /**
   * Clears all chat history.
   * Shows confirmation first.
   */
  clear(): void;

  /**
   * Whether AI is currently generating a response.
   *
   * **Visual:** Shows typing indicator in chat.
   */
  isGenerating$: Queryable<boolean>;
}

/**
 * Individual chat message.
 */
export interface ChatMessageVM {
  /** Unique key */
  key: string;

  /**
   * Message sender.
   * - `"user"`: User's input
   * - `"assistant"`: AI's response
   */
  role: "user" | "assistant";

  /**
   * Message content.
   * May contain markdown formatting.
   * For assistant messages, may update during streaming.
   */
  content$: Queryable<string>;

  /**
   * Copy to editor action (assistant messages only).
   * `null` for user messages or if no code block in response.
   *
   * **Behavior:**
   * - Extracts TypeQL code block from message
   * - Sets editor content
   * - Switches to code mode
   * - Shows toast "Query copied to editor"
   */
  copyToEditor$: Queryable<(() => void) | null>;
}

/**
 * Editor action buttons.
 */
export interface QueryEditorActionsVM {
  /**
   * New scratch query action.
   */
  newScratch: {
    /**
     * Creates a new scratch query, clearing the editor.
     *
     * **Confirmation:**
     * - If no unsaved changes: Clears immediately
     * - If unsaved changes: Opens confirmation dialog
     *   - "Discard changes?"
     *   - "You have unsaved changes. Creating a new scratch query will discard them."
     *   - [Cancel] [Discard]
     *
     * **Post-clear:** Editor is empty, cursor at start, mode is scratch.
     */
    click(): void;

    /**
     * Whether clicking will trigger confirmation.
     * Used for visual hint (e.g., warning color).
     */
    needsConfirmation$: Queryable<boolean>;
  };

  /**
   * Save changes to current saved query.
   */
  saveChanges: {
    /**
     * Whether this action is visible.
     * Only visible when editing a saved query with changes.
     */
    visible$: Queryable<boolean>;

    /**
     * Saves changes to the current saved query.
     *
     * **Behavior:**
     * - Updates query text in localStorage
     * - Clears dirty flag
     * - Shows toast "Query saved"
     * - Refreshes sidebar to show updated timestamp
     */
    click(): void;
  };

  /**
   * Save as new query action.
   */
  saveAsNew: {
    /**
     * Disabled state.
     *
     * **Disabled when:**
     * - Editor is empty ("Cannot save empty query")
     */
    disabled$: Queryable<DisabledState>;

    /**
     * Opens save query dialog.
     *
     * **Dialog pre-fill:**
     * - Name: Smart extraction from query (first 60 chars, skipping comments)
     * - Description: Empty
     * - Folder: Root level
     */
    click(): void;
  };

  /**
   * Run query action.
   */
  run: {
    /**
     * Disabled state.
     *
     * **Disabled conditions (in order):**
     * - "Connect to a server first" - Not connected
     * - "Select a database first" - No database selected
     * - "Query text is empty" - Editor is blank
     */
    disabled$: Queryable<DisabledState>;

    /**
     * Tooltip text.
     *
     * **When enabled:** "Run query (Cmd+Enter)" / "Run query (Ctrl+Enter)"
     * **When disabled:** Shows the disable reason
     */
    tooltip$: Queryable<string>;

    /**
     * Whether a query is currently running.
     * Visual: Spinner icon instead of play icon.
     */
    isRunning$: Queryable<boolean>;

    /**
     * Executes the query.
     *
     * **Flow:**
     * 1. Set isRunning$ = true, disable button
     * 2. Clear results pane, show "Running..." with timestamp
     * 3. Execute query against server
     * 4. On success:
     *    - Populate results (log, table, graph, raw)
     *    - Add to history with success status
     *    - Update saved query's lastRunResult if applicable
     * 5. On error:
     *    - Show error in results log
     *    - Add to history with error status
     *    - Show persistent error toast
     * 6. Set isRunning$ = false
     *
     * **Concurrent:** Starting a new query cancels any in-progress query.
     */
    click(): void;
  };
}
