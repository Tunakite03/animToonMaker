import fs from "node:fs/promises";
import path from "node:path";

export const RULE_SKILLS = [
  "vercel-composition-patterns",
  "vercel-react-best-practices",
  "vercel-react-native-skills",
];

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return unquote(trimmed);
}

function parseArrayValue(value) {
  const inner = value.trim().slice(1, -1).trim();
  if (!inner) return [];
  return inner.split(",").map((item) => parseScalar(item.trim()));
}

export function parseFrontmatter(text) {
  const match = text.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error("Missing or invalid frontmatter");
  }

  const [, rawFrontmatter, body] = match;
  const fields = {};
  const lines = rawFrontmatter.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const splitIndex = line.indexOf(":");
    if (splitIndex === -1) continue;
    const key = line.slice(0, splitIndex).trim();
    const rawValue = line.slice(splitIndex + 1).trim();
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      fields[key] = parseArrayValue(rawValue);
    } else {
      fields[key] = parseScalar(rawValue);
    }
  }

  return { fields, body };
}

function toInlineArray(items) {
  if (!items || items.length === 0) return "[]";
  const values = items.map((item) => {
    const value = String(item);
    if (/^[a-zA-Z0-9_.-]+$/.test(value)) return value;
    return JSON.stringify(value);
  });
  return `[${values.join(", ")}]`;
}

function toScalar(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  const text = String(value);
  if (/^[a-zA-Z0-9_.:/()+-]+$/.test(text)) return text;
  return JSON.stringify(text);
}

export function formatFrontmatter(fields, preferredOrder = []) {
  const keys = [
    ...preferredOrder.filter((key) => key in fields),
    ...Object.keys(fields).filter((key) => !preferredOrder.includes(key)),
  ];

  const lines = keys.map((key) => {
    const value = fields[key];
    if (Array.isArray(value)) {
      return `${key}: ${toInlineArray(value)}`;
    }
    return `${key}: ${toScalar(value)}`;
  });

  return `---\n${lines.join("\n")}\n---\n`;
}

export function serializeRule(fields, body, preferredOrder = []) {
  const fm = formatFrontmatter(fields, preferredOrder);
  return `${fm}\n${body.replace(/^\r?\n/, "")}`;
}

export function impactToScore(impact) {
  const normalized = String(impact || "").toUpperCase();
  if (normalized === "CRITICAL") return 5;
  if (normalized === "HIGH") return 4;
  if (normalized === "MEDIUM-HIGH") return 3.5;
  if (normalized === "MEDIUM") return 3;
  if (normalized === "LOW-MEDIUM") return 2;
  if (normalized === "LOW") return 1;
  return 0;
}

export async function listRuleFiles(rootDir) {
  const files = [];
  for (const skill of RULE_SKILLS) {
    const rulesDir = path.join(rootDir, ".agents", "skills", skill, "rules");
    const entries = await fs.readdir(rulesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".md")) continue;
      if (entry.name.startsWith("_")) continue;
      files.push({
        skill,
        fileName: entry.name,
        absolutePath: path.join(rulesDir, entry.name),
        relativePath: path
          .relative(rootDir, path.join(rulesDir, entry.name))
          .replaceAll("\\", "/"),
      });
    }
  }
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function readRule(ruleFile) {
  const text = await fs.readFile(ruleFile.absolutePath, "utf8");
  const { fields, body } = parseFrontmatter(text);
  return { text, fields, body };
}
