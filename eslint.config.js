import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [
      "**/dist/**",
      "**/test-results/**",
      "**/playwright-report/**",
      ".worktrees/**",
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
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression[source.value=/(^|\\/)content(\\.[cm]?[jt]sx?)?$/]",
          message: "Client code must not import content (keeps the JS budget small).",
        },
      ],
    },
  },
);
