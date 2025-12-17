/**
 * TypeQL Monaco Editor Theme
 *
 * Maps Monaco token types to CSS variable colors defined in styles.css.
 * Supports both light and dark mode by reading CSS custom properties at runtime.
 */

import type * as Monaco from "monaco-editor";

export const TYPEQL_THEME_LIGHT = "typeql-light";
export const TYPEQL_THEME_DARK = "typeql-dark";

/**
 * Get computed CSS variable value from the document
 */
function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Convert OKLCH color to hex for Monaco
 * Monaco requires hex colors, but our CSS uses OKLCH
 * This creates a temporary element to let the browser do the conversion
 */
function cssColorToHex(cssValue: string): string {
  const temp = document.createElement("div");
  temp.style.color = cssValue;
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  // Parse rgb(r, g, b) format
  const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    const r = parseInt(match[1], 10).toString(16).padStart(2, "0");
    const g = parseInt(match[2], 10).toString(16).padStart(2, "0");
    const b = parseInt(match[3], 10).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }

  // Fallback - return as-is (might already be hex)
  return cssValue;
}

/**
 * Get syntax colors from CSS variables
 */
function getSyntaxColors(): Record<string, string> {
  const variables = {
    keywordRead: "--syntax-keyword-read",
    keywordWrite: "--syntax-keyword-write",
    keywordSchema: "--syntax-keyword-schema",
    keywordStruct: "--syntax-keyword-struct",
    keywordModifier: "--syntax-keyword-modifier",
    type: "--syntax-type",
    variable: "--syntax-variable",
    string: "--syntax-string",
    number: "--syntax-number",
    comment: "--syntax-comment",
    punctuation: "--syntax-punctuation",
    foreground: "--foreground",
    background: "--background",
    muted: "--muted",
  };

  const colors: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(variables)) {
    const value = getCSSVariable(cssVar);
    colors[key] = cssColorToHex(value);
  }

  return colors;
}

/**
 * Create Monaco theme definition from CSS variables
 */
export function createTypeQLTheme(
  isDark: boolean
): Monaco.editor.IStandaloneThemeData {
  const colors = getSyntaxColors();

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
      "editor.background": colors.background,
      "editor.foreground": colors.foreground,
      "editor.lineHighlightBackground": colors.muted,
      "editorLineNumber.foreground": colors.comment,
      "editorLineNumber.activeForeground": colors.foreground,
      "editor.selectionBackground": colors.muted,
      "editorCursor.foreground": colors.foreground,
    },
  };
}

/**
 * Register TypeQL themes with Monaco
 */
export function registerTypeQLThemes(monaco: typeof Monaco): void {
  // We register both themes upfront
  // The actual colors will be updated when defineTheme is called
  monaco.editor.defineTheme(TYPEQL_THEME_LIGHT, createTypeQLTheme(false));
  monaco.editor.defineTheme(TYPEQL_THEME_DARK, createTypeQLTheme(true));
}

/**
 * Update themes with current CSS variable values
 * Call this when theme changes (light/dark mode switch)
 */
export function updateTypeQLThemes(monaco: typeof Monaco): void {
  monaco.editor.defineTheme(TYPEQL_THEME_LIGHT, createTypeQLTheme(false));
  monaco.editor.defineTheme(TYPEQL_THEME_DARK, createTypeQLTheme(true));
}
