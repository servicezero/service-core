
module.exports = {
  // Specifies the ESLint parser
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",  // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    "plugin:jest/recommended",
  ],
  globals: {
    console: "readonly",
    customElements: "readonly",
    describe: "readonly",
    document: "readonly",
    expect: "readonly",
    it: "readonly",
    window: "readonly",
  },
  "ignorePatterns": ["node_modules", "dist", "build", ".idea"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2019,  // Allows for the parsing of modern ECMAScript features
    sourceType: "module",  // Allows for the use of imports
  },
  plugins: [
    "filenames",
    "jest",
    "sort-keys-fix",
    "functional",
  ],
  rules: {
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/ban-ts-ignore": "off",
    "@typescript-eslint/ban-types": ["error", {
      types: {
        "{}": false,
        Boolean: {
          fixWith: "boolean",
          message: "Use boolean instead",
        },
        Number: {
          fixWith: "number",
          message: "Use number instead",
        },
        Object: {
          fixWith: "Record<string, any>",
          message: "Use Record<string, any> instead",
        },
        String: {
          fixWith: "string",
          message: "Use string instead",
        },
        Symbol: {
          fixWith: "symbol",
          message: "Use symbol instead",
        },
        null: {
          fixWith: "undefined",
          message: "Use 'undefined' instead of 'null'",
        },
        object: false,
      },
    }],
    "brace-style": "off",
    "@typescript-eslint/brace-style": ["error", "1tbs"],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-member-accessibility": ["error", {
      accessibility: "no-public",
      overrides: {
        parameterProperties: "off",
      },
    }],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/member-delimiter-style": ["error", {
      multiline: {
        delimiter: "none",
        requireLast: true,
      },
      singleline: {
        delimiter: "semi",
        requireLast: false,
      },
    }],
    "@typescript-eslint/member-ordering": [
      "error", {
        "default": {
          "memberTypes": [
            // Static
            "public-static-method",
            "protected-static-method",
            "private-static-method",

            "public-static-field",
            "protected-static-field",
            "private-static-field",
            "static-field",

            "public-field",
            "protected-field",
            "private-field",
            "field",

            // Index signature
            "signature",

            // Constructors
            "public-constructor",
            "protected-constructor",
            "private-constructor",
            "constructor",

            // Methods
            "private-method",
            "protected-method",
            "public-method",
            "method",
          ],
          "order": "alphabetically",
        },
      },
    ],
    "@typescript-eslint/naming-convention": ["error", {
      "custom": {
        "match": true,
        "regex": "^I[A-Z]",
      },
      "format": ["PascalCase"],
      "selector": "interface",
    }],
    "@typescript-eslint/no-empty-interface": "warn",
    "@typescript-eslint/no-explicit-any": "off",
    // "typescript-sort-keys/interface": [
    //   "error",
    //   "asc",
    //   { "caseSensitive": true, "natural": true, "requiredFirst": false }
    // ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-parameter-properties": "off",
    "@typescript-eslint/sort-type-union-intersection-members": "error",
    "@typescript-eslint/type-annotation-spacing": "error",
    "array-bracket-spacing": ["error", "always"],
    "arrow-parens": ["error", "as-needed"],
    "comma-dangle": "off",
    "@typescript-eslint/comma-dangle": ["error", "always-multiline"],
    "comma-spacing": "off",
    "@typescript-eslint/comma-spacing": ["error", { "before": false, "after": true }],
    "space-before-function-paren": "off",
    "@typescript-eslint/space-before-function-paren": ["error", "never"],
    "eol-last": ["error", "always"],
    eqeqeq: ["error", "always"],
    "filenames/match-exported": 0,
    "filenames/match-regex": [2, "^[a-z]+[a-z0-9-]+(\\.[a-zA-Z0-9]+)?(\\.(spec|int))?$", true],
    "filenames/no-index": "off",
    "indent": ["error", 2],
    "jest/expect-expect": "off",
    "key-spacing": ["error", { align: "value" }],
    "no-console": ["error"],
    "no-constant-condition": "off",
    "no-dupe-class-members": "off",
    "no-duplicate-imports": ["error"],
    "no-multiple-empty-lines": ["error"],
    "no-multi-spaces": "error",
    "no-prototype-builtins": "off",
    // "no-null/no-null": ["error", 2],
    "no-undef": "off",
    "no-useless-computed-key": "error",
    "no-useless-rename": "error",
    "object-curly-spacing": "off",
    "@typescript-eslint/object-curly-spacing": ["error", "always"],
    "object-curly-newline": ["error", {
      "ExportDeclaration": {"minProperties": 2, "multiline": true},
      "ImportDeclaration": {"minProperties": 2, "multiline": true},
      "ObjectExpression": {"consistent": true, "multiline": true},
      "ObjectPattern": {"consistent": true, "multiline": true},
    }],
    "object-property-newline": ["error", { "allowAllPropertiesOnSameLine": true }],
    "object-shorthand": "error",
    "prefer-const": ["error"],
    quotes: ["error", "double"],
    "require-atomic-updates": "off",
    semi: ["error", "never"],
    "sort-imports": ["error", {
      "ignoreCase": false,
      "ignoreDeclarationSort": true,
      "ignoreMemberSort": false,
      "memberSyntaxSortOrder": ["none", "all", "multiple", "single"],
    }],
    "sort-keys-fix/sort-keys-fix": ["error", "asc", {"caseSensitive": true, "natural": true}],
    "space-before-blocks": ["error", "never"],
    "template-curly-spacing": ["error", "always"],
    "functional/no-let": ["error", { "allowLocalMutation": true }],
    "functional/prefer-readonly-type": ["error", {"allowLocalMutation": true, "ignoreClass": true, "ignoreCollections": true}],
  },
  settings: {
    "import/resolver": {
      "node": {
        "extensions": [
          ".js",
          ".jsx",
          ".ts",
          ".tsx",
          ".json",
        ],
      },
    },
  },
}
