import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [
      "**/dist/**",
      "**/test-results/**",
      "**/playwright-report/**",
      ".worktrees/**",
      "actions-runner/**",
      ".private/**",
      "docs/guild/**",
      ".claude/**",
    ] },
  ...tseslint.configs.recommended,
  {
    files: ["src/client/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)content(\\.[cm]?[jt]sx?)?$",
              message: "Client code must not import content (keeps the JS budget small).",
            },
          ],
        },
      ],
      "no-eval": "error",
      "no-restricted-properties": [
        "error",
        ...["innerHTML", "outerHTML", "insertAdjacentHTML", "createContextualFragment"].map((property) => ({
          property,
          message: "HTML sinks are banned in client code. Build DOM with createElement and textContent (F-01).",
        })),
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='document'][property.name='write']",
          message: "document.write is banned in client code (F-01).",
        },
        {
          selector: "NewExpression[callee.name='DOMParser']",
          message: "DOMParser is banned in client code (F-01).",
        },
        {
          selector: "NewExpression[callee.name='Function']",
          message: "new Function is banned in client code (S-01).",
        },
        {
          selector: "ImportExpression[source.value=/(^|\\/)content(\\.[cm]?[jt]sx?)?$/]",
          message: "Client code must not import content (keeps the JS budget small).",
        },
      ],
    },
  },
);
