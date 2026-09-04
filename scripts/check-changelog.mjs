#!/usr/bin/env node
/**
 * Fails when watched site files change without an update to changelog.json.
 *
 * Copy into a site repo (or invoke via path). Env:
 *   CHANGELOG_FILE   default changelog.json
 *   CHANGELOG_WATCH  comma-separated path prefixes (optional)
 *   GITHUB_BASE_SHA / GITHUB_HEAD_SHA  set by Actions
 *   BASE_SHA         local override (e.g. origin/main)
 *
 * Desert-connect used src/data/changelog.ts; pass CHANGELOG_FILE for that.
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const CHANGELOG_FILE = process.env.CHANGELOG_FILE || "changelog.json";

const DEFAULT_WATCH = [
  "src/",
  "app/",
  "pages/",
  "public/",
  "docs/",
  "sites/",
  "static/",
];

const EXCLUDED = new Set(
  (process.env.CHANGELOG_EXCLUDE || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .concat([CHANGELOG_FILE])
);

const watched = (process.env.CHANGELOG_WATCH || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const prefixes = watched.length ? watched : DEFAULT_WATCH;

const isWatchedChange = (file) => {
  if (!file || EXCLUDED.has(file)) return false;
  if (file.startsWith("src/test/") || file.startsWith("tests/")) return false;
  return prefixes.some((prefix) => file === prefix || file.startsWith(prefix));
};

const runGit = (command) =>
  execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const resolveRange = () => {
  const base = process.env.GITHUB_BASE_SHA;
  const head = process.env.GITHUB_HEAD_SHA ?? process.env.GITHUB_SHA ?? "HEAD";
  if (base && head) return { base, head, label: `${base}...${head}` };
  if (process.env.BASE_SHA) {
    return { base: process.env.BASE_SHA, head: "HEAD", label: `${process.env.BASE_SHA}...HEAD` };
  }
  try {
    runGit("git rev-parse --verify origin/main");
    return { base: "origin/main", head: "HEAD", label: "origin/main...HEAD" };
  } catch {
    return { base: "HEAD~1", head: "HEAD", label: "HEAD~1...HEAD" };
  }
};

const { base, head, label } = resolveRange();

let changedFiles = [];
try {
  changedFiles = runGit(`git diff --name-only ${base} ${head}`)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
} catch (error) {
  console.error("check-changelog: could not read git diff");
  console.error(error.stderr?.toString() ?? error.message);
  process.exit(1);
}

const siteChanges = changedFiles.filter(isWatchedChange);
const changelogUpdated = changedFiles.includes(CHANGELOG_FILE);

if (siteChanges.length === 0) {
  console.log(`check-changelog: no watched site files changed (${label})`);
  process.exit(0);
}

if (!changelogUpdated) {
  console.error("");
  console.error(`check-changelog: site files changed but ${CHANGELOG_FILE} was not updated.`);
  console.error("");
  console.error("Add a plain-language entry (estate-changelog/v1).");
  console.error(`Diff range: ${label}`);
  console.error("");
  console.error("Changed site files:");
  for (const file of siteChanges) console.error(`  - ${file}`);
  console.error("");
  process.exit(1);
}

const abs = resolve(CHANGELOG_FILE);
if (!existsSync(abs) && CHANGELOG_FILE.endsWith(".json")) {
  console.error(`check-changelog: ${CHANGELOG_FILE} is missing`);
  process.exit(1);
}

if (CHANGELOG_FILE.endsWith(".json")) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(abs, "utf8"));
  } catch (e) {
    console.error(`check-changelog: ${CHANGELOG_FILE} is not valid JSON`);
    process.exit(1);
  }
  if (doc.schema !== "estate-changelog/v1") {
    console.error(`check-changelog: schema must be estate-changelog/v1`);
    process.exit(1);
  }
  if (!Array.isArray(doc.entries) || doc.entries.length === 0) {
    console.error("check-changelog: entries must be a non-empty array");
    process.exit(1);
  }
}

console.log(`check-changelog: changelog updated for ${siteChanges.length} site file(s)`);
process.exit(0);
