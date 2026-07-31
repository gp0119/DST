import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const dataPath = join(projectRoot, "src/data/skills.json");
const luaRoot = process.argv[2];

if (!luaRoot) {
  throw new Error("用法：node scripts/add-skill-positions.mjs <饥荒脚本 prefabs 目录>");
}

const fileByCharacter = {
  wigfrid: "wathgrithr",
};

function splitExpressions(source) {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "(") depth += 1;
    if (source[index] === ")") depth -= 1;
    if (source[index] === "," && depth === 0) {
      parts.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(source.slice(start).trim());
  return parts;
}

function evaluateExpression(expression, constants) {
  const normalized = expression
    .replace(/--.*$/, "")
    .replace(/\bmath\.floor\b/g, "Math.floor")
    .replace(/\bmath\.ceil\b/g, "Math.ceil")
    .replace(/\bmath\.abs\b/g, "Math.abs")
    .replace(/\bmath\.sin\b/g, "Math.sin")
    .replace(/\bmath\.cos\b/g, "Math.cos")
    .replace(/\bmath\.atan2\b/g, "Math.atan2")
    .replace(/\bmath\.pi\b/g, "Math.PI")
    .replace(/\^/g, "**")
    .trim();

  if (
    !normalized ||
    /[^A-Za-z0-9_+\-*/().\s]/.test(normalized) ||
    /\b(?:function|return|globalThis|process|constructor)\b/.test(normalized)
  ) {
    return null;
  }

  const mathIdentifiers = new Set(["Math", "floor", "ceil", "abs", "sin", "cos", "atan2", "PI"]);
  const identifiers = [...new Set(normalized.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) ?? [])]
    .filter((name) => !mathIdentifiers.has(name));
  if (identifiers.some((name) => !Object.hasOwn(constants, name))) return null;

  try {
    const value = Function(
      ...identifiers,
      `"use strict"; return (${normalized});`,
    )(...identifiers.map((name) => constants[name]));
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function readConstants(source) {
  const constants = {};

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^local\s+([A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*[A-Za-z_][A-Za-z0-9_]*)*)\s*=\s*(.+)$/);
    if (!match) continue;

    const names = match[1].split(",").map((name) => name.trim());
    const expressions = splitExpressions(match[2]);
    if (names.length !== expressions.length) continue;

    const values = expressions.map((expression) => evaluateExpression(expression, constants));
    if (values.some((value) => value === null)) continue;
    names.forEach((name, index) => {
      constants[name] = values[index];
    });
  }

  return constants;
}

function findClosingBrace(source, openIndex) {
  let depth = 0;
  let quote = "";
  let inComment = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inComment) {
      if (char === "\n") inComment = false;
      continue;
    }
    if (!quote && char === "-" && next === "-") {
      inComment = true;
      index += 1;
      continue;
    }
    if (quote) {
      if (char === "\\" && next) {
        index += 1;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parsePosition(pairSource, constants) {
  const parts = splitExpressions(pairSource);
  if (parts.length !== 2) return null;
  const x = evaluateExpression(parts[0], constants);
  const y = evaluateExpression(parts[1], constants);
  return x === null || y === null ? null : [x, y];
}

function readNamedPositions(source, constants) {
  const positions = new Map();
  const tablePattern = /local\s+POSITIONS\s*=\s*\{/g;

  for (const match of source.matchAll(tablePattern)) {
    const openIndex = source.indexOf("{", match.index);
    const closeIndex = findClosingBrace(source, openIndex);
    if (closeIndex < 0) continue;
    const tableSource = source.slice(openIndex + 1, closeIndex);

    for (const entry of tableSource.matchAll(/([a-z][a-z0-9_]+)\s*=\s*\{([^{}]+)\}/g)) {
      const pairSource = /\bx\s*=/.test(entry[2])
        ? entry[2].replace(/\bx\s*=\s*/, "").replace(/\by\s*=\s*/, "")
        : entry[2];
      const position = parsePosition(pairSource, constants);
      if (position) positions.set(entry[1], position);
    }
  }
  return positions;
}

function readSkillPosition(source, skillId, constants, namedPositions) {
  if (namedPositions.has(skillId)) return namedPositions.get(skillId);

  const pattern = new RegExp(`\\b${skillId}\\s*=\\s*\\{`, "g");
  for (const match of source.matchAll(pattern)) {
    const openIndex = source.indexOf("{", match.index);
    const closeIndex = findClosingBrace(source, openIndex);
    if (closeIndex < 0) continue;
    const block = source.slice(openIndex + 1, closeIndex);
    const positionMatch = block.match(/\bpos\s*=\s*\{([^{}]+)\}/);
    if (!positionMatch) continue;
    const position = parsePosition(positionMatch[1], constants);
    if (position) return position;
  }
  return null;
}

const data = JSON.parse(await readFile(dataPath, "utf8"));
const missing = [];

for (const character of data.characters) {
  const luaName = fileByCharacter[character.slug] ?? character.slug;
  const source = await readFile(join(luaRoot, `skilltree_${luaName}.lua`), "utf8");
  const constants = readConstants(source);
  const namedPositions = readNamedPositions(source, constants);

  for (const skill of character.skills) {
    const position = readSkillPosition(source, skill.id, constants, namedPositions);
    if (!position) {
      missing.push(`${character.slug}:${skill.id}`);
      continue;
    }
    [skill.x, skill.y] = position.map((value) => Math.round(value * 100) / 100);
  }
}

if (missing.length) {
  throw new Error(`未找到 ${missing.length} 个技能坐标：\n${missing.join("\n")}`);
}

await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`已写入 ${data.characters.reduce((total, character) => total + character.skills.length, 0)} 个技能坐标。`);
