/**
 * TypeQL Language Definition for Monaco Editor
 *
 * This defines syntax highlighting rules for TypeQL (TypeDB Query Language).
 * Based on the TextMate grammar at:
 * phosphor-copy/developer-tools/vscode-typedb/syntaxes/typeql.tmLanguage.json
 *
 * Token types map to our CSS variables:
 * - keyword.read → --syntax-keyword-read (match, fetch, with)
 * - keyword.write → --syntax-keyword-write (insert, delete, update, put)
 * - keyword.schema → --syntax-keyword-schema (define, undefine, redefine)
 * - keyword.struct → --syntax-keyword-struct (sub, owns, plays, relates, isa, has)
 * - keyword.modifier → --syntax-keyword-modifier (@abstract, @key, etc.)
 * - type → --syntax-type (entity, relation, attribute, type names)
 * - variable → --syntax-variable ($x, $person, $_)
 * - string → --syntax-string ("...", '...')
 * - number → --syntax-number (123, 45.67, dates, durations)
 * - comment → --syntax-comment (# ...)
 * - punctuation → --syntax-punctuation (;, :, {, })
 */

import type * as Monaco from "monaco-editor";

export const TYPEQL_LANGUAGE_ID = "typeql";

/**
 * Language configuration (brackets, comments, etc.)
 * Based on: phosphor-copy/developer-tools/vscode-typedb/language-configuration.json
 */
export const typeqlLanguageConfiguration: Monaco.languages.LanguageConfiguration =
  {
    comments: {
      lineComment: "#",
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    wordPattern: /\$?[a-zA-Z_][a-zA-Z0-9_-]*/,
    indentationRules: {
      increaseIndentPattern:
        /^\s*(match|insert|put|update|delete|define|undefine|redefine|fetch|fun)\b.*$|.*\{\s*$/,
      decreaseIndentPattern: /^\s*[}\]];?\s*$/,
    },
  };

/**
 * Monarch tokenizer definition
 * Maps TypeQL syntax to token types that will be styled by our theme
 */
export const typeqlMonarchLanguage: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".typeql",

  // Keywords categorized by semantic meaning
  keywordsRead: ["with", "match", "fetch", "end"],
  keywordsWrite: ["insert", "put", "update", "delete"],
  keywordsSchema: ["define", "undefine", "redefine"],

  // Structure/constraint keywords
  keywordsTypeConstraints: [
    "sub!",
    "sub",
    "alias",
    "owns",
    "plays",
    "relates",
    "as",
    "value",
    "label",
    "from",
    "of",
  ],
  keywordsThingConstraints: ["isa!", "isa", "iid", "has", "links", "is"],
  keywordsPattern: ["or", "not", "try", "in"],
  keywordsFunction: ["fun", "return", "struct", "let"],
  keywordsStreamOps: [
    "select",
    "sort",
    "limit",
    "offset",
    "require",
    "distinct",
    "reduce",
    "groupby",
    "asc",
    "desc",
  ],

  // Types and functions
  typeKinds: ["entity", "attribute", "relation", "role"],
  valueTypes: [
    "boolean",
    "integer",
    "double",
    "decimal",
    "datetime-tz",
    "datetime",
    "date",
    "duration",
    "string",
  ],
  reducers: [
    "count",
    "max",
    "min",
    "mean",
    "median",
    "std",
    "sum",
    "list",
    "check",
    "first",
    "last",
  ],
  builtinFunctions: ["abs", "ceil", "floor", "round", "length"],

  // Operators
  operators: ["==", "!=", ">=", "<=", ">", "<", "->", "..", "="],
  operatorsWord: ["like", "contains"],

  // Annotations
  annotations: [
    "@abstract",
    "@cascade",
    "@distinct",
    "@key",
    "@independent",
    "@unique",
  ],
  annotationsParametrized: ["@card", "@range", "@regex", "@subkey", "@values"],

  // The tokenizer
  tokenizer: {
    root: [
      // Comments
      [/#.*$/, "comment"],

      // Strings (double-quoted)
      [/"([^"\\]|\\.)*$/, "string.invalid"], // Non-terminated
      [/"/, "string", "@string_double"],

      // Strings (single-quoted)
      [/'([^'\\]|\\.)*$/, "string.invalid"], // Non-terminated
      [/'/, "string", "@string_single"],

      // Annotations
      [
        /@(abstract|cascade|distinct|key|independent|unique)\b/,
        "keyword.modifier",
      ],
      [/@(card|range|regex|subkey|values)\b/, "keyword.modifier"],

      // Variables
      [/\$_\b/, "variable"], // Anonymous variable
      [/\$[a-zA-Z0-9][a-zA-Z0-9_-]*\??/, "variable"], // Named variable

      // Numbers - order matters (more specific patterns first)
      // Hex IID
      [/0x[0-9a-fA-F]+\b/, "number"],
      // DateTime with timezone
      [
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?\s*([A-Z][a-zA-Z0-9_+-]+(\/[A-Z][a-zA-Z0-9_+-]+)*|Z|[+-]\d{2}(:?\d{2})?)/,
        "number",
      ],
      // DateTime without timezone
      [/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?/, "number"],
      // Date
      [/[+-]?\d{4,}-\d{2}-\d{2}\b/, "number"],
      // Duration (ISO 8601)
      [
        /P(\d+W|\d+Y(\d+M)?(\d+D)?(T\d+H(\d+M)?(\d+(\.\d+)?S)?)?|\d+M(\d+D)?(T\d+H(\d+M)?(\d+(\.\d+)?S)?)?|\d+D(T\d+H(\d+M)?(\d+(\.\d+)?S)?)?|T\d+H(\d+M)?(\d+(\.\d+)?S)?|T\d+M(\d+(\.\d+)?S)?|T\d+(\.\d+)?S)\b/,
        "number",
      ],
      // Decimal (with dec suffix)
      [/[+-]?\d+\.\d+dec\b/, "number"],
      // Float/Double
      [/[+-]?\d+\.\d+([eE][+-]?\d+)?(?!dec)\b/, "number"],
      // Integer
      [/[+-]?\d+\b/, "number"],

      // Booleans
      [/\b(true|false)\b/, "number"],

      // Keywords and identifiers
      [
        /[a-zA-Z][a-zA-Z0-9_-]*/,
        {
          cases: {
            "@keywordsRead": "keyword.read",
            "@keywordsWrite": "keyword.write",
            "@keywordsSchema": "keyword.schema",
            "@keywordsTypeConstraints": "keyword.struct",
            "@keywordsThingConstraints": "keyword.struct",
            "@keywordsPattern": "keyword.read",
            "@keywordsFunction": "keyword.schema",
            "@keywordsStreamOps": "keyword.read",
            "@typeKinds": "type",
            "@valueTypes": "type",
            "@reducers": "type",
            "@builtinFunctions": "type",
            "@operatorsWord": "operator",
            "@default": "identifier",
          },
        },
      ],

      // Operators
      [/==|!=|>=|<=|->|\.\./, "operator"],
      [/[><=]/, "operator"],
      [/[+\-*/%^]/, "operator"],

      // Punctuation
      [/[;:.,?*]/, "punctuation"],
      [/[{}()\[\]]/, "punctuation.bracket"],

      // Whitespace
      [/\s+/, "white"],
    ],

    string_double: [
      [/[^\\"]+/, "string"],
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
    ],

    string_single: [
      [/[^\\']+/, "string"],
      [/\\./, "string.escape"],
      [/'/, "string", "@pop"],
    ],
  },
};

/**
 * Register TypeQL language with Monaco
 */
export function registerTypeQLLanguage(monaco: typeof Monaco): void {
  // Register language ID
  monaco.languages.register({ id: TYPEQL_LANGUAGE_ID });

  // Set language configuration
  monaco.languages.setLanguageConfiguration(
    TYPEQL_LANGUAGE_ID,
    typeqlLanguageConfiguration
  );

  // Set tokenizer
  monaco.languages.setMonarchTokensProvider(
    TYPEQL_LANGUAGE_ID,
    typeqlMonarchLanguage
  );
}
