import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "test-results/", "playwright-report/"] },
  ...tseslint.configs.recommended,
  {
    files: ["src/client/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "content$",
              message: "Client code must not import content (keeps the JS budget small).",
            },
          ],
        },
      ],
    },
  },
);
