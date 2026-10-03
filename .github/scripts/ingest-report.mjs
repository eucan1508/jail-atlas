// Summarizes one live-ingest run and records failed counties in the "Ingest health log" issue.
//
// Usage: node .github/scripts/ingest-report.mjs <worker-log-file>
// Env: INGEST_STATE, RUN_URL, RECORD_FAILURES ("true" to write to the issue),
//      GITHUB_STEP_SUMMARY (optional), GH_TOKEN (for the gh CLI).
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const ISSUE_TITLE = "Ingest health log";
const ISSUE_LABEL = "ingest-log";

const logFile = process.argv[2];
const state = process.env.INGEST_STATE ?? "unknown";
const runUrl = process.env.RUN_URL ?? "";
const recordFailures = process.env.RECORD_FAILURES === "true";

function readCompletedEvents(path) {
  if (!path || !existsSync(path)) return [];
  const events = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const start = line.indexOf("{");
    if (start < 0) continue;
    try {
      const event = JSON.parse(line.slice(start));
      if (event?.event === "ingest.live.completed") events.push(event);
    } catch {
      // Not a worker JSON line.
    }
  }
  return events;
}

function countyName(adapterKey) {
  // "black-hawk-county-iowa-current-roster" -> "black-hawk"; "dallas-newworld-..." -> "dallas"
  const key = String(adapterKey);
  return key.includes("-county-") ? key.split("-county-")[0] : key.split("-")[0];
}

function cell(value) {
  return String(value ?? "—").replace(/\|/g, "\\|");
}

const events = readCompletedEvents(logFile);
const failures = events.filter((event) => event.ok !== true);
const timestamp = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

const rows = events.map(
  (event) =>
    `| ${cell(countyName(event.adapterKey))} | ${event.ok ? "ok" : "**failed**"} | ${cell(
      event.recordCount
    )} | ${cell(event.resultFailureCode ?? event.healthFailureCode)} |`
);
const table = [
  "| County | Result | Records | Failure code |",
  "| --- | --- | --- | --- |",
  ...rows
].join("\n");

const summary =
  events.length === 0
    ? `### ${state} ingest\n\nNo county reached completion. The run failed before or during the worker; see the job log.`
    : `### ${state} ingest\n\n${table}`;
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
console.log(summary);

const runFailed = events.length === 0 || failures.length > 0;
if (!runFailed || !recordFailures) process.exit(0);

const details =
  events.length === 0
    ? "- No county reached completion; the run failed before or during the worker."
    : failures
        .map(
          (event) =>
            `- **${countyName(event.adapterKey)}** (\`${event.adapterKey}\`): ${
              event.resultFailureStage ?? event.healthFailureStage ?? "unknown stage"
            } — \`${event.resultFailureCode ?? event.healthFailureCode ?? "no code"}\``
        )
        .join("\n");
const comment = `**${timestamp} · ${state}** — ${
  events.length === 0 ? "run failed" : `${failures.length} of ${events.length} counties failed`
}\n\n${details}\n\n[Run log](${runUrl})`;

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" }).trim();
}

gh([
  "label",
  "create",
  ISSUE_LABEL,
  "--color",
  "B60205",
  "--force",
  "--description",
  "Live ingest failures"
]);
let issue = gh([
  "issue",
  "list",
  "--label",
  ISSUE_LABEL,
  "--state",
  "open",
  "--json",
  "number",
  "--jq",
  ".[0].number // empty"
]);
if (!issue) {
  const url = gh([
    "issue",
    "create",
    "--title",
    ISSUE_TITLE,
    "--label",
    ISSUE_LABEL,
    "--body",
    "Automatic log of live ingest failures. Each comment records one failed run: the state, the counties that failed, their failure codes, and a link to the run. Successful runs are not logged."
  ]);
  issue = url.split("/").pop();
}
gh(["issue", "comment", issue, "--body", comment]);
console.log(`Recorded failure in issue #${issue}`);
