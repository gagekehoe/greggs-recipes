#!/usr/bin/env node
/**
 * Prints Vitest coverage totals to stdout and (when present) $GITHUB_STEP_SUMMARY.
 * Expects coverage/coverage-summary.json from @vitest/coverage-v8 json-summary reporter.
 */
import fs from "node:fs";
import path from "node:path";

const summaryPath = path.resolve("coverage/coverage-summary.json");

if (!fs.existsSync(summaryPath)) {
  const msg = "No coverage/coverage-summary.json — run `npm run test:coverage` first.";
  console.error(msg);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Coverage\n\n${msg}\n`);
  }
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const total = data.total;

function pct(metric) {
  const value = total[metric]?.pct;
  return typeof value === "number" ? value.toFixed(2) : "n/a";
}

const rows = [
  ["Statements", pct("statements")],
  ["Branches", pct("branches")],
  ["Functions", pct("functions")],
  ["Lines", pct("lines")],
];

const thresholds = {
  statements: 75,
  branches: 65,
  functions: 75,
  lines: 75,
};

const table = [
  "| Metric | Coverage | Gate |",
  "| --- | ---: | ---: |",
  ...rows.map(([name, value]) => {
    const key = name.toLowerCase();
    const gate = thresholds[key] ?? "—";
    return `| ${name} | ${value}% | ≥ ${gate}% |`;
  }),
].join("\n");

const body = `### Unit test coverage\n\n${table}\n\nThresholds come from \`vitest.config.ts\`. Vitest fails the job if any gate is missed. Vercel preview deploys do **not** run this check — open the **Unit tests + coverage** job on the PR.\n`;

console.log(body);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, body);
}
