/**
 * TypeQL Monaco Editor Component
 *
 * A syntax-highlighted code editor for TypeQL queries using Monaco Editor.
 * Integrates with the VM pattern - receives value and onChange props.
 */

import Editor, { loader, type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Placeholder text shown when editor is empty */
  placeholder?: string;
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

export function TypeQLEditor({
  value,
  onChange,
  placeholder = "// Enter your TypeQL query here...",
  className = "",
  readOnly = false,
  onKeyDown,
}: TypeQLEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const isDark = useIsDarkMode();

  // Update theme when dark mode changes
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      updateTypeQLThemes(monacoRef.current);
      monacoRef.current.editor.setTheme(
        isDark ? TYPEQL_THEME_DARK : TYPEQL_THEME_LIGHT
      );
    }
  }, [isDark]);

  // Handle editor mount
  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Update themes with current CSS values (now that DOM is ready)
      updateTypeQLThemes(monaco);
      monaco.editor.setTheme(isDark ? TYPEQL_THEME_DARK : TYPEQL_THEME_LIGHT);

      // Set up keyboard handler
      if (onKeyDown) {
        editor.onKeyDown((e) => {
          // Create a native-like KeyboardEvent for the callback
          const nativeEvent = new KeyboardEvent("keydown", {
            key: e.browserEvent.key,
            code: e.browserEvent.code,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
          });

          if (onKeyDown(nativeEvent)) {
            e.preventDefault();
            e.stopPropagation();
          }
        });
      }

      // Focus the editor
      editor.focus();
    },
    [isDark, onKeyDown]
  );

  // Handle value changes
  const handleChange = useCallback(
    (newValue: string | undefined) => {
      onChange(newValue ?? "");
    },
    [onChange]
  );

  return (
    <div className={`relative ${className}`}>
      <Editor
        defaultLanguage={TYPEQL_LANGUAGE_ID}
        value={value}
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

      {/* Placeholder overlay when empty */}
      {value === "" && (
        <div
          className="absolute top-4 left-14 pointer-events-none text-muted-foreground font-mono text-dense-sm"
          style={{ opacity: 0.6 }}
        >
          {placeholder}
        </div>
      )}
    </div>
  );
}
