import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/**/*.{ts,tsx}",
        "src/app/api/**/*.{ts,tsx}",
        "src/components/auth/profile-form.tsx",
        "src/components/auth/sign-in-form.tsx",
        "src/components/recipes/recipe-reviews.tsx",
        "src/components/recipes/recipe-comments.tsx",
      ],
      exclude: [
        "src/components/ui/**",
        // Auth.js catch-all only — custom register/forgot/reset routes are covered.
        "src/app/api/auth/[...nextauth]/**",
        "src/lib/db/index.ts",
        "src/lib/recipes/types.ts",
        "**/*.d.ts",
      ],

      thresholds: {
        lines: 75,
        functions: 75,
        branches: 65,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
