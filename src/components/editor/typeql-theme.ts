/**
 * TypeQL Monaco Editor Theme
 *
 * Defines syntax highlighting colors for Monaco editor.
 * Colors are hardcoded hex values that match the OKLCH values in styles.css.
 *
 * Monaco requires hex colors - it cannot use CSS variables or OKLCH directly.
 */

import type * as Monaco from "monaco-editor";

export const TYPEQL_THEME_LIGHT = "typeql-light";
export const TYPEQL_THEME_DARK = "typeql-dark";

/**
 * Light mode syntax colors
 * Converted from OKLCH values in styles.css (lines 56-67)
 */
const LIGHT_COLORS = {
  // Syntax tokens
  keywordRead: "0077aa",    // oklch(0.50 0.18 220) - cyan
  keywordWrite: "b45309",   // oklch(0.55 0.18 60) - amber
  keywordSchema: "7c3aed",  // oklch(0.50 0.18 290) - violet
  keywordStruct: "6d28d9",  // oklch(0.45 0.15 280) - purple
  keywordModifier: "475569", // oklch(0.40 0.10 250) - blue-gray
  type: "0d9488",           // oklch(0.55 0.15 180) - teal
  variable: "c2410c",       // oklch(0.60 0.12 60) - orange
  string: "16a34a",         // oklch(0.50 0.15 140) - green
  number: "ea580c",         // oklch(0.55 0.18 40) - orange-red
  comment: "64748b",        // oklch(0.55 0.03 250) - gray
  punctuation: "64748b",    // muted foreground

  // Editor colors
  foreground: "0f172a",     // near black
  background: "ffffff",     // white
  muted: "f1f5f9",          // light gray
  lineHighlight: "f8fafc",  // very light gray
};

/**
 * Dark mode syntax colors
 * Converted from OKLCH values in styles.css (lines 104-115)
 */
const DARK_COLORS = {
  // Syntax tokens (lighter versions for dark bg)
  keywordRead: "38bdf8",    // oklch(0.75 0.18 220) - light cyan
  keywordWrite: "fbbf24",   // oklch(0.80 0.18 60) - light amber
  keywordSchema: "a78bfa",  // oklch(0.75 0.18 290) - light violet
  keywordStruct: "8b5cf6",  // oklch(0.70 0.15 280) - light purple
  keywordModifier: "94a3b8", // oklch(0.65 0.10 250) - light blue-gray
  type: "2dd4bf",           // oklch(0.80 0.15 180) - light teal
  variable: "fb923c",       // oklch(0.85 0.12 60) - light orange
  string: "4ade80",         // oklch(0.75 0.15 140) - light green
  number: "fb923c",         // oklch(0.80 0.18 40) - light orange-red
  comment: "64748b",        // oklch(0.50 0.03 250) - gray
  punctuation: "94a3b8",    // muted foreground

  // Editor colors
  foreground: "f8fafc",     // near white
  background: "1e1e2e",     // dark bg
  muted: "334155",          // dark gray
  lineHighlight: "2d3748",  // slightly lighter dark
};

/**
 * Create Monaco theme definition
 */
export function createTypeQLTheme(
  isDark: boolean
): Monaco.editor.IStandaloneThemeData {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return {
    base: isDark ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      // Keywords
      { token: "keyword.read.typeql", foreground: colors.keywordRead },
      { token: "keyword.write.typeql", foreground: colors.keywordWrite },
      { token: "keyword.schema.typeql", foreground: colors.keywordSchema },
      { token: "keyword.struct.typeql", foreground: colors.keywordStruct },
      { token: "keyword.modifier.typeql", foreground: colors.keywordModifier },

      // Types
      { token: "type.typeql", foreground: colors.type },
      { token: "identifier.typeql", foreground: colors.foreground },

      // Variables
      { token: "variable.typeql", foreground: colors.variable },

      // Strings
      { token: "string.typeql", foreground: colors.string },
      { token: "string.escape.typeql", foreground: colors.string },
      { token: "string.invalid.typeql", foreground: colors.string },

      // Numbers
      { token: "number.typeql", foreground: colors.number },

      // Comments
      { token: "comment.typeql", foreground: colors.comment, fontStyle: "italic" },

      // Operators
      { token: "operator.typeql", foreground: colors.keywordStruct },

      // Punctuation
      { token: "punctuation.typeql", foreground: colors.punctuation },
      { token: "punctuation.bracket.typeql", foreground: colors.punctuation },

      // Whitespace
      { token: "white.typeql", foreground: colors.foreground },
    ],
    colors: {
      "editor.background": `#${colors.background}`,
      "editor.foreground": `#${colors.foreground}`,
      "editor.lineHighlightBackground": `#${colors.lineHighlight}`,
      "editorLineNumber.foreground": `#${colors.comment}`,
      "editorLineNumber.activeForeground": `#${colors.foreground}`,
      "editor.selectionBackground": `#${colors.muted}`,
      "editorCursor.foreground": `#${colors.foreground}`,
    },
  };
}

/**
 * Register TypeQL themes with Monaco
 */
export function registerTypeQLThemes(monaco: typeof Monaco): void {
  monaco.editor.defineTheme(TYPEQL_THEME_LIGHT, createTypeQLTheme(false));
  monaco.editor.defineTheme(TYPEQL_THEME_DARK, createTypeQLTheme(true));
}

/**
 * Update themes - now a no-op since colors are hardcoded
 * Kept for API compatibility
 */
export function updateTypeQLThemes(monaco: typeof Monaco): void {
  monaco.editor.defineTheme(TYPEQL_THEME_LIGHT, createTypeQLTheme(false));
  monaco.editor.defineTheme(TYPEQL_THEME_DARK, createTypeQLTheme(true));
}
