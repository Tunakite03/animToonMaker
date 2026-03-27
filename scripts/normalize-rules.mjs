import fs from "node:fs/promises";
import {
  listRuleFiles,
  readRule,
  serializeRule,
} from "./rules-utils.mjs";

const ROOT = process.cwd();

const nextOnlyRules = new Set([
  "async-api-routes.md",
  "bundle-defer-third-party.md",
  "bundle-dynamic-imports.md",
  "server-after-nonblocking.md",
  "server-auth-actions.md",
  "server-cache-lru.md",
  "server-cache-react.md",
  "server-dedup-props.md",
  "server-hoist-static-io.md",
  "server-parallel-fetching.md",
  "server-parallel-nested-fetching.md",
  "server-serialization.md",
]);

const preferredOrder = [
  "title",
  "impact",
  "impactDescription",
  "tags",
  "appliesTo",
  "runtime",
  "minReact",
  "incompatibleWith",
];

function asTagArray(tagsValue) {
  if (Array.isArray(tagsValue)) return tagsValue.map((item) => String(item));
  if (typeof tagsValue !== "string") return [];
  return tagsValue
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function classify(skill, fileName, body) {
  const fileBase = fileName.replace(/\.md$/i, "");
  const prefix = fileBase.split("-")[0];
  const lowerBody = body.toLowerCase();
  const mentionsReact19 = /react 19|useeffectevent|use\(\)|ref as a regular prop/i.test(
    body,
  );

  if (skill === "vercel-composition-patterns") {
    const react19Rule = fileName.startsWith("react19-");
    return {
      appliesTo: ["react-web", "vite-react", "nextjs-app-router"],
      runtime: "universal",
      minReact: react19Rule ? "19" : "18",
      incompatibleWith: react19Rule ? ["react<19"] : [],
    };
  }

  if (skill === "vercel-react-native-skills") {
    return {
      appliesTo: ["react-native", "expo"],
      runtime: "native",
      minReact: mentionsReact19 ? "19" : "18",
      incompatibleWith: ["react-dom-only-web"],
    };
  }

  if (skill === "vercel-react-best-practices") {
    const isNextOnly = nextOnlyRules.has(fileName);
    const runtime =
      prefix === "server" || fileName === "async-api-routes.md"
        ? "server"
        : prefix === "async"
          ? "universal"
          : "browser";

    if (isNextOnly) {
      return {
        appliesTo: ["react-web", "nextjs-app-router"],
        runtime,
        minReact: "19",
        incompatibleWith: ["vite-spa-without-next"],
      };
    }

    const incompatibleWith = [];
    if (/react\.cache|server actions|rsc|route handlers/i.test(lowerBody)) {
      incompatibleWith.push("vite-spa-without-next");
    }

    return {
      appliesTo: ["react-web", "vite-react", "nextjs-app-router"],
      runtime,
      minReact: mentionsReact19 ? "19" : "18",
      incompatibleWith,
    };
  }

  return {
    appliesTo: ["react-web"],
    runtime: "universal",
    minReact: "18",
    incompatibleWith: [],
  };
}

function normalizeTags(existingTags, extraTags = []) {
  const tags = [...asTagArray(existingTags), ...extraTags]
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => !/^tag\d+$/i.test(tag));
  return Array.from(new Set(tags));
}

function toTagString(tags) {
  return tags.join(", ");
}

async function main() {
  const files = await listRuleFiles(ROOT);
  let updated = 0;

  for (const ruleFile of files) {
    const { fields, body, text } = await readRule(ruleFile);
    const meta = classify(ruleFile.skill, ruleFile.fileName, body);

    const extraTags = [];
    if (nextOnlyRules.has(ruleFile.fileName)) {
      extraTags.push("nextjs");
    }
    if (ruleFile.skill === "vercel-react-native-skills") {
      extraTags.push("react-native");
    }
    if (ruleFile.skill === "vercel-composition-patterns") {
      extraTags.push("composition");
    }

    const normalizedFields = {
      ...fields,
      tags: toTagString(normalizeTags(fields.tags, extraTags)),
      appliesTo: meta.appliesTo,
      runtime: meta.runtime,
      minReact: meta.minReact,
      incompatibleWith: meta.incompatibleWith,
    };

    const output = serializeRule(normalizedFields, body, preferredOrder);
    if (output !== text) {
      await fs.writeFile(ruleFile.absolutePath, output, "utf8");
      updated += 1;
    }
  }

  console.log(`Normalized ${updated}/${files.length} rules`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
