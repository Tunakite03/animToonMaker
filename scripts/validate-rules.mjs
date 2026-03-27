import fs from "node:fs/promises";
import path from "node:path";
import {
  RULE_SKILLS,
  listRuleFiles,
  parseFrontmatter,
} from "./rules-utils.mjs";

const ROOT = process.cwd();
const REQUIRED_FIELDS = [
  "title",
  "impact",
  "tags",
  "appliesTo",
  "runtime",
  "minReact",
  "incompatibleWith",
];

function normalizeImpact(impact) {
  return String(impact || "").trim().toUpperCase();
}

function asArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === null || value === undefined) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractRuleCount(text) {
  const exact = text.match(/Contains\s+(\d+)\s+rules/i);
  if (exact) return { kind: "exact", value: Number(exact[1]) };

  const plus = text.match(/Contains\s+(\d+)\+\s+rules/i);
  if (plus) return { kind: "minimum", value: Number(plus[1]) };

  return null;
}

async function validateCounts(ruleFiles, errors) {
  for (const skill of RULE_SKILLS) {
    const skillDir = path.join(ROOT, ".agents", "skills", skill);
    const actual = ruleFiles.filter((file) => file.skill === skill).length;

    for (const docName of ["SKILL.md", "AGENTS.md"]) {
      const docPath = path.join(skillDir, docName);
      let content = "";
      try {
        content = await fs.readFile(docPath, "utf8");
      } catch {
        continue;
      }

      const count = extractRuleCount(content);
      if (!count) continue;

      if (count.kind === "exact" && count.value !== actual) {
        errors.push(
          `${path.relative(ROOT, docPath)}: declared ${count.value} rules, found ${actual}`,
        );
      }
      if (count.kind === "minimum" && actual < count.value) {
        errors.push(
          `${path.relative(ROOT, docPath)}: declared minimum ${count.value}+ rules, found ${actual}`,
        );
      }
    }
  }
}

async function main() {
  const errors = [];
  const ruleFiles = await listRuleFiles(ROOT);

  for (const ruleFile of ruleFiles) {
    const text = await fs.readFile(ruleFile.absolutePath, "utf8");
    let parsed;
    try {
      parsed = parseFrontmatter(text);
    } catch (error) {
      errors.push(`${ruleFile.relativePath}: ${error.message}`);
      continue;
    }

    const { fields, body } = parsed;
    for (const requiredField of REQUIRED_FIELDS) {
      if (!(requiredField in fields)) {
        errors.push(`${ruleFile.relativePath}: missing "${requiredField}"`);
      }
    }

    const tags = asArray(fields.tags);
    if (tags.some((tag) => /^tag\d+$/i.test(tag))) {
      errors.push(`${ruleFile.relativePath}: contains placeholder tags`);
    }
    if (tags.length === 0) {
      errors.push(`${ruleFile.relativePath}: tags must not be empty`);
    }

    const appliesTo = asArray(fields.appliesTo);
    if (appliesTo.length === 0) {
      errors.push(`${ruleFile.relativePath}: appliesTo must not be empty`);
    }

    const incompatibleWith = asArray(fields.incompatibleWith);
    if (
      appliesTo.includes("nextjs-app-router") &&
      !incompatibleWith.includes("vite-spa-without-next") &&
      (ruleFile.fileName.startsWith("server-") ||
        ruleFile.fileName === "async-api-routes.md" ||
        ruleFile.fileName === "bundle-dynamic-imports.md" ||
        ruleFile.fileName === "bundle-defer-third-party.md")
    ) {
      errors.push(
        `${ruleFile.relativePath}: Next-specific rule should declare incompatibleWith "vite-spa-without-next"`,
      );
    }

    const impactBodyMatch = body.match(/\*\*Impact:\s*([A-Z-]+)/);
    if (impactBodyMatch) {
      const bodyImpact = normalizeImpact(impactBodyMatch[1]);
      const frontmatterImpact = normalizeImpact(fields.impact);
      if (bodyImpact && frontmatterImpact && bodyImpact !== frontmatterImpact) {
        errors.push(
          `${ruleFile.relativePath}: impact mismatch frontmatter=${frontmatterImpact} body=${bodyImpact}`,
        );
      }
    }

    const placeholderReferenceRe =
      /^Reference:\s*\[[^\]]+\]\((?:https?:\/\/example\.com|#)\)/im;
    if (placeholderReferenceRe.test(body)) {
      errors.push(`${ruleFile.relativePath}: contains placeholder reference URL`);
    }
    if (/Reference:\s*\[Link to documentation or resource\]/i.test(body)) {
      errors.push(`${ruleFile.relativePath}: contains placeholder reference text`);
    }
    if (/Rule Title Here/i.test(body)) {
      errors.push(`${ruleFile.relativePath}: contains template placeholder title`);
    }
  }

  await validateCounts(ruleFiles, errors);

  if (errors.length > 0) {
    console.error(`Rule validation failed with ${errors.length} issue(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Rule validation passed (${ruleFiles.length} files)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
