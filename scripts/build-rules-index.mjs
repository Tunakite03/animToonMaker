import fs from "node:fs/promises";
import path from "node:path";
import {
  impactToScore,
  listRuleFiles,
  readRule,
} from "./rules-utils.mjs";

const ROOT = process.cwd();

function asArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === null || value === undefined) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [String(value)];
}

function parseTags(tags) {
  return asArray(tags);
}

async function detectProjectContext() {
  const packageJsonPath = path.join(ROOT, "package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const deps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  };

  const hasNext =
    "next" in deps ||
    (await fileExists(path.join(ROOT, "next.config.js"))) ||
    (await fileExists(path.join(ROOT, "next.config.mjs"))) ||
    (await fileExists(path.join(ROOT, "next.config.ts")));

  const hasReactNative =
    "react-native" in deps || "expo" in deps || "expo-router" in deps;
  const hasVite =
    "vite" in deps || (await fileExists(path.join(ROOT, "vite.config.ts")));
  const hasTauri =
    "@tauri-apps/api" in deps || (await fileExists(path.join(ROOT, "src-tauri")));

  return {
    hasNext,
    hasReactNative,
    hasVite,
    hasTauri,
  };
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function evaluateRuleEnabled(appliesTo, incompatibleWith, context) {
  const targets = new Set();
  targets.add("react-web");
  if (context.hasVite) targets.add("vite-react");
  if (context.hasNext) targets.add("nextjs-app-router");
  if (context.hasReactNative) {
    targets.add("react-native");
    targets.add("expo");
  }

  const matchesTarget = appliesTo.some((target) => targets.has(target));
  if (!matchesTarget) return false;

  if (
    incompatibleWith.includes("vite-spa-without-next") &&
    context.hasVite &&
    !context.hasNext
  ) {
    return false;
  }
  if (
    incompatibleWith.includes("react-dom-only-web") &&
    !context.hasReactNative
  ) {
    return false;
  }
  return true;
}

async function main() {
  const context = await detectProjectContext();
  const ruleFiles = await listRuleFiles(ROOT);
  const entries = [];

  for (const ruleFile of ruleFiles) {
    const { fields } = await readRule(ruleFile);
    const appliesTo = asArray(fields.appliesTo);
    const incompatibleWith = asArray(fields.incompatibleWith);
    const enabled = evaluateRuleEnabled(appliesTo, incompatibleWith, context);

    entries.push({
      id: `${ruleFile.skill}/${ruleFile.fileName.replace(/\.md$/i, "")}`,
      skill: ruleFile.skill,
      path: ruleFile.relativePath,
      title: fields.title || "",
      impact: fields.impact || "",
      impactScore: impactToScore(fields.impact),
      tags: parseTags(fields.tags),
      appliesTo,
      runtime: fields.runtime || "universal",
      minReact: fields.minReact ?? null,
      incompatibleWith,
      enabled,
    });
  }

  const byImpact = [...entries].sort((a, b) => b.impactScore - a.impactScore);
  const summary = {
    totalRules: entries.length,
    enabledRules: entries.filter((rule) => rule.enabled).length,
    nextSpecificRules: entries.filter((rule) =>
      rule.incompatibleWith.includes("vite-spa-without-next"),
    ).length,
    nativeRules: entries.filter((rule) =>
      rule.appliesTo.includes("react-native"),
    ).length,
  };

  const index = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    projectContext: context,
    summary,
    rules: byImpact,
  };

  const outputPath = path.join(ROOT, ".agents", "rules-index.json");
  await fs.writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(`Enabled ${summary.enabledRules}/${summary.totalRules} rules`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
