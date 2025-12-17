/**
 * Lightweight TypeQL Syntax Highlighter
 *
 * A fast, static syntax highlighter for displaying TypeQL code.
 * Unlike the full Monaco editor, this renders simple HTML spans
 * and is suitable for read-only code display (e.g., example blocks).
 *
 * Uses the same token categories as the Monaco editor for consistency.
 */

import { useMemo } from "react";

// Token types that map to CSS classes
type TokenType =
  | "keyword-read"
  | "keyword-write"
  | "keyword-schema"
  | "keyword-struct"
  | "keyword-modifier"
  | "type"
  | "variable"
  | "string"
  | "number"
  | "comment"
  | "punctuation"
  | "text";

interface Token {
  type: TokenType;
  value: string;
}

// Keyword sets for classification
const KEYWORDS_READ = new Set(["with", "match", "fetch", "end"]);
const KEYWORDS_WRITE = new Set(["insert", "put", "update", "delete"]);
const KEYWORDS_SCHEMA = new Set(["define", "undefine", "redefine", "fun", "return", "struct", "let"]);
const KEYWORDS_TYPE_CONSTRAINTS = new Set([
  "sub!", "sub", "alias", "owns", "plays", "relates", "as", "value", "label", "from", "of"
]);
const KEYWORDS_THING_CONSTRAINTS = new Set(["isa!", "isa", "iid", "has", "links", "is"]);
const KEYWORDS_PATTERN = new Set(["or", "not", "try", "in"]);
const KEYWORDS_STREAM_OPS = new Set([
  "select", "sort", "limit", "offset", "require", "distinct", "reduce", "groupby", "asc", "desc"
]);
const TYPE_KINDS = new Set(["entity", "attribute", "relation", "role"]);
const VALUE_TYPES = new Set([
  "boolean", "integer", "double", "decimal", "datetime-tz", "datetime", "date", "duration", "string"
]);
const REDUCERS = new Set([
  "count", "max", "min", "mean", "median", "std", "sum", "list", "check", "first", "last"
]);
const BUILTIN_FUNCTIONS = new Set(["abs", "ceil", "floor", "round", "length"]);
const BOOLEANS = new Set(["true", "false"]);

/**
 * Classify a word token
 */
function classifyWord(word: string): TokenType {
  if (KEYWORDS_READ.has(word) || KEYWORDS_PATTERN.has(word) || KEYWORDS_STREAM_OPS.has(word)) {
    return "keyword-read";
  }
  if (KEYWORDS_WRITE.has(word)) {
    return "keyword-write";
  }
  if (KEYWORDS_SCHEMA.has(word)) {
    return "keyword-schema";
  }
  if (KEYWORDS_TYPE_CONSTRAINTS.has(word) || KEYWORDS_THING_CONSTRAINTS.has(word)) {
    return "keyword-struct";
  }
  if (TYPE_KINDS.has(word) || VALUE_TYPES.has(word) || REDUCERS.has(word) || BUILTIN_FUNCTIONS.has(word)) {
    return "type";
  }
  if (BOOLEANS.has(word)) {
    return "number";
  }
  return "text";
}

/**
 * Tokenize TypeQL code into highlighted spans
 */
function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    const char = code[i];
    const remaining = code.slice(i);

    // Comments
    if (char === "#") {
      const end = code.indexOf("\n", i);
      const commentEnd = end === -1 ? code.length : end;
      tokens.push({ type: "comment", value: code.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    // Strings (double-quoted)
    if (char === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== '"') {
        if (code[j] === "\\") j++; // Skip escaped char
        j++;
      }
      tokens.push({ type: "string", value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Strings (single-quoted)
    if (char === "'") {
      let j = i + 1;
      while (j < code.length && code[j] !== "'") {
        if (code[j] === "\\") j++; // Skip escaped char
        j++;
      }
      tokens.push({ type: "string", value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Annotations (@word)
    if (char === "@") {
      const match = remaining.match(/^@[a-zA-Z][a-zA-Z0-9_-]*/);
      if (match) {
        tokens.push({ type: "keyword-modifier", value: match[0] });
        i += match[0].length;
        continue;
      }
    }

    // Variables ($word)
    if (char === "$") {
      const match = remaining.match(/^\$[a-zA-Z0-9_][a-zA-Z0-9_-]*\??|\$_/);
      if (match) {
        tokens.push({ type: "variable", value: match[0] });
        i += match[0].length;
        continue;
      }
    }

    // Numbers (including dates, durations, hex)
    if (/[0-9+-]/.test(char)) {
      // Try various number patterns
      const patterns = [
        /^0x[0-9a-fA-F]+/, // Hex
        /^[+-]?\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([A-Z][a-zA-Z0-9_+-]*(\/[A-Z][a-zA-Z0-9_+-]+)*|Z|[+-]\d{2}:?\d{2})?/, // DateTime
        /^[+-]?\d{4,}-\d{2}-\d{2}/, // Date
        /^P[0-9WYMDTHS.]+/, // Duration
        /^[+-]?\d+\.\d+dec/, // Decimal
        /^[+-]?\d+\.\d+([eE][+-]?\d+)?/, // Float
        /^[+-]?\d+/, // Integer
      ];

      for (const pattern of patterns) {
        const match = remaining.match(pattern);
        if (match) {
          tokens.push({ type: "number", value: match[0] });
          i += match[0].length;
          break;
        }
      }
      if (i > 0 && tokens.length > 0 && tokens[tokens.length - 1].type === "number") {
        continue;
      }
    }

    // Words/identifiers
    if (/[a-zA-Z]/.test(char)) {
      const match = remaining.match(/^[a-zA-Z][a-zA-Z0-9_-]*!?/);
      if (match) {
        const word = match[0];
        tokens.push({ type: classifyWord(word), value: word });
        i += word.length;
        continue;
      }
    }

    // Punctuation and operators
    if (/[;:.,?*{}()\[\]<>=!+\-/%^]/.test(char)) {
      // Multi-char operators
      const twoChar = code.slice(i, i + 2);
      if (["==", "!=", ">=", "<=", "->", ".."].includes(twoChar)) {
        tokens.push({ type: "punctuation", value: twoChar });
        i += 2;
        continue;
      }
      tokens.push({ type: "punctuation", value: char });
      i++;
      continue;
    }

    // Whitespace and other characters
    tokens.push({ type: "text", value: char });
    i++;
  }

  return tokens;
}

/**
 * Get CSS class for a token type
 */
function getTokenClass(type: TokenType): string {
  switch (type) {
    case "keyword-read":
      return "text-syntax-keyword-read";
    case "keyword-write":
      return "text-syntax-keyword-write";
    case "keyword-schema":
      return "text-syntax-keyword-schema";
    case "keyword-struct":
      return "text-syntax-keyword-struct";
    case "keyword-modifier":
      return "text-syntax-keyword-modifier";
    case "type":
      return "text-syntax-type";
    case "variable":
      return "text-syntax-variable";
    case "string":
      return "text-syntax-string";
    case "number":
      return "text-syntax-number";
    case "comment":
      return "text-syntax-comment italic";
    case "punctuation":
      return "text-syntax-punctuation";
    default:
      return "";
  }
}

export interface TypeQLHighlighterProps {
  /** The TypeQL code to highlight */
  code: string;
  /** Additional class name for the container */
  className?: string;
}

/**
 * Render TypeQL code with syntax highlighting.
 * This is a lightweight alternative to Monaco for read-only display.
 */
export function TypeQLHighlighter({ code, className = "" }: TypeQLHighlighterProps) {
  const tokens = useMemo(() => tokenize(code), [code]);

  return (
    <code className={className}>
      {tokens.map((token, i) => {
        const tokenClass = getTokenClass(token.type);
        if (tokenClass) {
          return (
            <span key={i} className={tokenClass}>
              {token.value}
            </span>
          );
        }
        return token.value;
      })}
    </code>
  );
}
