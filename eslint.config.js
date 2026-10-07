import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["latest/", "node_modules/"] },
    js.configs.recommended,
    {
        rules: {
            "no-var": "error",
            "prefer-const": "error",
            "no-shadow": "error",
            // Leading underscores mark parameters in much of this code, and unused ones document what a
            // caller passes; only unused variables are errors.
            "no-unused-vars": ["error", { args: "none" }]
        }
    },
    { files: ["src/**/*.js"], languageOptions: { globals: { ...globals.browser, ...globals.worker } } },
    { files: ["dev/perfHud.js"], languageOptions: { sourceType: "script", globals: globals.browser } },
    { files: ["dev/**/*.js", "build/**/*.js", "eslint.config.js"], ignores: ["dev/perfHud.js"], languageOptions: { globals: globals.node } },
    { files: ["test/**/*.js"], languageOptions: { globals: { ...globals.jasmine, ...globals.node } } }
];
