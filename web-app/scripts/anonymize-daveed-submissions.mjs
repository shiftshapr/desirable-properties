#!/usr/bin/env node
/**
 * Rewrites submitter identity for any submission tied to daveed@bridgit.io
 * to Anon / noreply@themetalayer.org across JSON under web-app.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_APP_ROOT = path.resolve(__dirname, "..");

const OLD_EMAIL = "daveed@bridgit.io";
const NEW_EMAIL = "noreply@themetalayer.org";

function scrubRawContent(s) {
  if (typeof s !== "string") return s;
  let out = s.replaceAll(OLD_EMAIL, NEW_EMAIL);
  out = out.replaceAll("Daveed Benjamin", "Anon");
  out = out.replace(/\bName:\s*Daveed\b/g, "Name: Anon");
  out = out.replace(/\bLast name:\s*Benjamin\b/gi, "Last name: ");
  out = out.replace(/\bShort answer email:\s*[^\n]+/gi, `Short answer email: ${NEW_EMAIL}`);
  out = out.replace(/Submited by Daveed/g, "Submited by Anon");
  out = out.replace(/Submitted by Daveed/gi, "Submitted by Anon");
  return out;
}

function walk(node) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item);
    return;
  }
  if (typeof node !== "object") return;

  if (node.submitter && typeof node.submitter === "object") {
    const em = node.submitter.email;
    if (em === OLD_EMAIL) {
      node.submitter = {
        first_name: "Anon",
        last_name: "",
        email: NEW_EMAIL,
      };
      if (node.submission && typeof node.submission === "object" && node.submission.raw_content) {
        node.submission.raw_content = scrubRawContent(node.submission.raw_content);
      }
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(node, "submitter_email") &&
    node.submitter_email === OLD_EMAIL
  ) {
    node.submitter_email = NEW_EMAIL;
    node.submitter_name = "Anon";
  }

  if (node.submitter_name === "Daveed Benjamin") {
    node.submitter_name = "Anon";
    if (node.submitter_email === OLD_EMAIL || !node.submitter_email) {
      node.submitter_email = NEW_EMAIL;
    }
  }

  for (const key of Object.keys(node)) {
    const v = node[key];
    if (key === "raw_content" && typeof v === "string" && v.includes(OLD_EMAIL)) {
      node[key] = scrubRawContent(v);
    } else {
      walk(v);
    }
  }
}

function processFile(filePath) {
  let raw = fs.readFileSync(filePath, "utf8");
  if (!raw.includes(OLD_EMAIL) && !raw.includes("Daveed Benjamin") && !raw.includes('"Daveed"')) {
    return false;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.warn("Skip (invalid JSON):", filePath);
    return false;
  }
  walk(data);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return true;
}

function walkDir(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkDir(full, acc);
    else if (name.endsWith(".json")) acc.push(full);
  }
  return acc;
}

const roots = [
  path.join(WEB_APP_ROOT, "public", "data"),
  path.join(WEB_APP_ROOT, "data"),
  // Sibling repo folder (some deploys copy from here instead of web-app/data)
  path.join(WEB_APP_ROOT, "..", "data"),
];

let n = 0;
for (const root of roots) {
  for (const f of walkDir(root)) {
    if (processFile(f)) {
      n++;
      console.log("Updated", path.relative(WEB_APP_ROOT, f));
    }
  }
}

console.log(`Done. Files updated: ${n}`);
