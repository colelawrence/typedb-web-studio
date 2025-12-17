/**
 * TypeQL Monaco Editor Component
 *
 * A syntax-highlighted code editor for TypeQL queries using Monaco Editor.
 * Integrates with the VM pattern - receives value and onChange props.
 */

import Editor, { loader, type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState, memo } from "react";
import type * as Monaco from "monaco-editor";

import {
  registerTypeQLLanguage,
  TYPEQL_LANGUAGE_ID,
} from "./typeql-language";
import {
  registerTypeQLThemes,
  updateTypeQLThemes,
  TYPEQL_THEME_LIGHT,
  TYPEQL_THEME_DARK,
} from "./typeql-theme";

export interface TypeQLEditorProps {
  /** Current editor content */
  value: string;
  /** Called when content changes */
  onChange: (value: string) => void;
  /** Optional class name for the container */
  className?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Optional callback for keyboard events (return true to prevent default) */
  onKeyDown?: (event: KeyboardEvent) => boolean;
}

// Track if Monaco has been configured
let monacoConfigured = false;

/**
 * Configure Monaco with TypeQL language and themes
 */
async function configureMonaco(): Promise<typeof Monaco> {
  const monaco = await loader.init();

  if (!monacoConfigured) {
    registerTypeQLLanguage(monaco);
    registerTypeQLThemes(monaco);
    monacoConfigured = true;
  }

  return monaco;
}

/**
 * Detect if dark mode is active
 */
function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Watch for class changes on html element
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

/**
 * TypeQL Editor component.
 *
 * IMPORTANT: This component uses memo and refs to avoid re-mounting Monaco
 * when the parent re-renders. External value changes (from props) are synced
 * imperatively only when they differ from the editor's current content.
 */
export const TypeQLEditor = memo(function TypeQLEditor({
  value,
  onChange,
  className = "",
  readOnly = false,
  onKeyDown,
}: TypeQLEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const isDark = useIsDarkMode();

  // Track if we're currently updating from external value to avoid loops
  const isExternalUpdate = useRef(false);
  // Store the onChange callback in a ref to avoid recreating handlers
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Store onKeyDown in a ref
  const onKeyDownRef = useRef(onKeyDown);
  onKeyDownRef.current = onKeyDown;

  // Sync external value changes to editor (only if different)
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && !isExternalUpdate.current) {
      const currentValue = editor.getValue();
      if (value !== currentValue) {
        isExternalUpdate.current = true;
        // Preserve cursor position when updating externally
        const position = editor.getPosition();
        editor.setValue(value);
        if (position) {
          editor.setPosition(position);
        }
        isExternalUpdate.current = false;
      }
    }
  }, [value]);

  // Update theme when dark mode changes
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      updateTypeQLThemes(monacoRef.current);
      monacoRef.current.editor.setTheme(
        isDark ? TYPEQL_THEME_DARK : TYPEQL_THEME_LIGHT
      );
    }
  }, [isDark]);

  // Handle editor mount - stable callback, no deps that change
  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Update themes with current CSS values (now that DOM is ready)
      updateTypeQLThemes(monaco);
      monaco.editor.setTheme(isDark ? TYPEQL_THEME_DARK : TYPEQL_THEME_LIGHT);

      // Set up keyboard handler using ref to get latest callback
      editor.onKeyDown((e) => {
        const handler = onKeyDownRef.current;
        if (handler) {
          // Create a native-like KeyboardEvent for the callback
          const nativeEvent = new KeyboardEvent("keydown", {
            key: e.browserEvent.key,
            code: e.browserEvent.code,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
          });

          if (handler(nativeEvent)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      });

      // Focus the editor
      editor.focus();
    },
    // isDark is needed for initial theme, but won't cause remount
    [isDark]
  );

  // Handle value changes from editor - use ref to avoid dependency on onChange
  const handleChange = useCallback(
    (newValue: string | undefined) => {
      if (!isExternalUpdate.current) {
        onChangeRef.current(newValue ?? "");
      }
    },
    []
  );

  return (
    <div className={className}>
      <Editor
        width="100%"
        height="100%"
        defaultLanguage={TYPEQL_LANGUAGE_ID}
        defaultValue={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        beforeMount={configureMonaco}
        theme={isDark ? TYPEQL_THEME_DARK : TYPEQL_THEME_LIGHT}
        options={{
          // Typography
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 13, // matches text-dense-sm
          lineHeight: 1.5,

          // UI
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: true,
          foldingHighlight: false,

          // Behavior
          readOnly,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: "on",

          // Scrollbar
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },

          // Appearance
          renderLineHighlight: "line",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,

          // Disable features we don't need
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          parameterHints: { enabled: false },
          hover: { enabled: false },
          contextmenu: true,

          // Padding
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
});
