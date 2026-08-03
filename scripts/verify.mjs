import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateRatioGroups } from "../src/lib/farmingCatalog.js";
import {
  buildExampleFormations,
  formatReducedRatio,
} from "../src/lib/farmingLayouts.js";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const dataPath = join(projectRoot, "src/data/cookbook.json");
const farmingDataPath = join(projectRoot, "src/data/farming.json");
const farmingExamplesPath = join(projectRoot, "src/data/farming-examples.json");
const skillDataPath = join(projectRoot, "src/data/skills.json");
const questDataPath = join(projectRoot, "src/data/quests.json");
const publicRoot = join(projectRoot, "public");
const sourceRoot = join(projectRoot, "src");
const distRoot = join(projectRoot, "dist");
const data = JSON.parse(await readFile(dataPath, "utf8"));
const farming = JSON.parse(await readFile(farmingDataPath, "utf8"));
const farmingExamples = JSON.parse(await readFile(farmingExamplesPath, "utf8"));
const skillTrees = JSON.parse(await readFile(skillDataPath, "utf8"));
const quests = JSON.parse(await readFile(questDataPath, "utf8"));
const packageJson = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }

  return files;
}

check(data.recipes.length === 81, `料理应为 81 道，实际为 ${data.recipes.length}`);
check(data.favorites.length === 19, `人物最爱应为 19 项，实际为 ${data.favorites.length}`);
check(Boolean(packageJson.dependencies.astro), "缺少 Astro 依赖");
check(Boolean(packageJson.dependencies.vue), "缺少 Vue 3 依赖");
check(Boolean(packageJson.dependencies.tailwindcss), "缺少 Tailwind CSS 依赖");
check(farming.seasons.length === 4, "巨大作物页面应包含春夏秋冬 4 个季节");
check(farming.crops.length === 14, `农作物应为 14 种，实际为 ${farming.crops.length}`);
check(skillTrees.maxPoints === 15, `角色技能点上限应为 15，实际为 ${skillTrees.maxPoints}`);
check(skillTrees.characters.length === 12, `技能树角色应为 12 位，实际为 ${skillTrees.characters.length}`);
check(quests.quests.length === 5, `任务路线应为 5 条，实际为 ${quests.quests.length}`);

const questIds = new Set();
for (const quest of quests.quests) {
  check(!questIds.has(quest.id), `任务路线 ID 重复：${quest.id}`);
  questIds.add(quest.id);
  const stepIds = new Set(quest.steps.map((step) => step.id));
  check(stepIds.size === quest.steps.length, `${quest.title}存在重复步骤 ID`);
  check(quest.targetCount > 0, `${quest.title}缺少有效完成目标`);
  check(
    quest.targetCount <= quest.steps.filter((step) => step.credit !== false).length,
    `${quest.title}的完成目标超过可计数步骤`,
  );
  for (const requiredId of quest.requiredStepIds ?? []) {
    check(stepIds.has(requiredId), `${quest.title}引用了未知必做步骤：${requiredId}`);
  }
  check(quest.sources.length > 0, `${quest.title}缺少资料来源`);
}

const imagePaths = new Set();
let skillCount = 0;
for (const character of skillTrees.characters) {
  const skillIds = new Set(character.skills.map((skill) => skill.id));
  skillCount += character.skills.length;
  imagePaths.add(character.image);
  check(
    skillIds.size === character.skills.length,
    `${character.name}存在重复技能 ID`,
  );
  for (const skill of character.skills) {
    imagePaths.add(`images/skills/${skill.id}.png`);
    check(Boolean(skill.title), `${character.name}的 ${skill.id} 缺少中文名称`);
    check(Boolean(skill.desc), `${character.name}的 ${skill.id} 缺少中文说明`);
    check(Boolean(skill.group), `${character.name}的 ${skill.id} 缺少分组`);
    check(
      Number.isFinite(skill.x) && Number.isFinite(skill.y),
      `${character.name}的 ${skill.id} 缺少游戏技能树坐标`,
    );
    for (const parent of skill.parents) {
      check(skillIds.has(parent), `${character.name}的 ${skill.id} 引用了未知前置技能：${parent}`);
    }
    for (const requirement of [
      ...(skill.requirements.requiredSkills ?? []),
      ...(skill.requirements.excludesSkills ?? []),
    ]) {
      check(skillIds.has(requirement), `${character.name}的 ${skill.id} 引用了未知条件技能：${requirement}`);
    }
  }
}
check(skillCount === 308, `角色技能应为 308 项，实际为 ${skillCount}`);
[
  "images/skill-tree/locked.png",
  "images/skill-tree/locked-hover.png",
  "images/skill-tree/selectable.png",
  "images/skill-tree/selectable-hover.png",
  "images/skill-tree/selected.png",
  "images/skill-tree/selected-hover.png",
  "images/skill-tree/unselected.png",
  "images/skill-tree/unselected-hover.png",
].forEach((path) => imagePaths.add(path));

for (const recipe of data.recipes) {
  check(recipe.combos.length === 2, `${recipe.zh} 应有 2 套常用配料`);

  for (const [index, combo] of recipe.combos.entries()) {
    check(combo.items.length === 4, `${recipe.zh} 第 ${index + 1} 套配料不是完整 4 格`);
  }
}

for (const recipe of data.recipes) {
  imagePaths.add(recipe.image);
  recipe.combos.flatMap((combo) => combo.items).forEach((item) => imagePaths.add(item.image));
  recipe.characters.forEach((character) => imagePaths.add(character.image));
}
for (const favorite of data.favorites) {
  if (favorite.image) imagePaths.add(favorite.image);
  if (favorite.characterImage) imagePaths.add(favorite.characterImage);
}
for (const crop of farming.crops) imagePaths.add(crop.image);
["images/ui/health.png", "images/ui/hunger.png", "images/ui/sanity.png"].forEach((path) =>
  imagePaths.add(path),
);

const cropsById = Object.fromEntries(farming.crops.map((crop) => [crop.id, crop]));

function exampleCoversRatio(example, entry) {
  if (example.items.length !== entry.items.length) return false;

  function match(targetIndex, usedIndexes, scale) {
    if (targetIndex === entry.items.length) return true;

    const target = entry.items[targetIndex];

    for (const [exampleIndex, item] of example.items.entries()) {
      if (
        usedIndexes.has(exampleIndex) ||
        ![item.cropId, ...(item.alternatives ?? [])].includes(target.cropId) ||
        (scale && item.count * scale.ratioCount !== target.count * scale.exampleCount)
      ) {
        continue;
      }

      const nextIndexes = new Set(usedIndexes).add(exampleIndex);
      const nextScale = scale ?? {
        exampleCount: item.count,
        ratioCount: target.count,
      };
      if (match(targetIndex + 1, nextIndexes, nextScale)) return true;
    }

    return false;
  }

  return match(0, new Set(), null);
}

let completeRatioCount = 0;
for (const season of farming.seasons) {
  for (const cropId of season.cropIds) {
    check(Boolean(cropsById[cropId]), `${season.name}引用了未知作物：${cropId}`);
    check(
      cropsById[cropId]?.seasons.includes(season.id),
      `${cropsById[cropId]?.name ?? cropId}不属于${season.name}`,
    );
  }

  const ratioGroups = generateRatioGroups(
    season,
    farming.crops,
    farming.ratioCatalog,
  );
  const seasonRatioCount = ratioGroups.reduce(
    (count, group) => count + group.entries.length,
    0,
  );
  completeRatioCount += seasonRatioCount;
  check(
    seasonRatioCount === farming.ratioCatalog.expectedCounts[season.id],
    `${season.name}完整配比应为 ${farming.ratioCatalog.expectedCounts[season.id]} 组，实际为 ${seasonRatioCount} 组`,
  );

  for (const group of ratioGroups) {
    for (const entry of group.entries) {
      const balance = entry.items.reduce(
        (result, item) => {
          const crop = cropsById[item.cropId];
          check(Boolean(crop), `${season.name}${group.ratio}引用了未知作物：${item.cropId}`);
          check(
            crop?.seasons.includes(season.id),
            `${season.name}${group.ratio}包含非当季作物：${crop?.name}`,
          );
          crop?.nutrients.forEach((value, index) => {
            result[index] += value * item.count;
          });
          return result;
        },
        [0, 0, 0],
      );
      check(
        balance.every((value) => value === 0),
        `${season.name}${group.ratio}“${entry.id}”养分不平衡：${balance.join("/")}`,
      );
      check(
        farmingExamples.examples.some(
          (example) =>
            example.seasonIds.includes(season.id) &&
            exampleCoversRatio(example, entry),
        ),
        `${season.name}${group.ratio}“${entry.id}”缺少示例图`,
      );
    }
  }
}

check(completeRatioCount === 79, `完整配比应为 79 组，实际为 ${completeRatioCount} 组`);
check(
  farming.seasons.every((season) => !("plans" in season)),
  "旧的推荐方案数据应已移除",
);

const seasonIds = new Set(farming.seasons.map((season) => season.id));
const exampleIds = new Set();
const supportedLayouts = new Set([
  "9|4,4",
  "10|5,5",
  "9|3,3,3",
  "9|4,2,2",
  "9|6,3",
  "9|5,3,1",
  "9|2,2,2,1",
  "9|2,2,2,2",
  "9|3,2,2,2",
  "9|4,2,2,1",
  "10|4,4,2",
  "10|4,2,2,2",
  "10|4,3,2,1",
  "10|4,2,2,1,1",
  "10|5,2,2,1",
  "10|6,2,2",
  "9|4,3,1,1",
]);

for (const example of farmingExamples.examples) {
  check(!exampleIds.has(example.id), `示例 ID 重复：${example.id}`);
  exampleIds.add(example.id);
  check([1, 2, 4].includes(example.plotCount), `${example.id} 农田数量不是 1、2 或 4`);
  check([9, 10].includes(example.gridSize), `${example.id} 单田规格不是 9 或 10 格`);
  check(
    example.items.reduce((count, item) => count + item.count, 0) <= example.gridSize,
    `${example.id} 单田作物数量超过 ${example.gridSize} 格`,
  );
  const counts = example.items
    .map((item) => item.count)
    .sort((left, right) => right - left);
  check(
    counts.join(":") === example.ratio,
    `${example.id} 的比例 ${example.ratio} 与作物数量 ${counts.join(":")} 不一致`,
  );
  check(
    supportedLayouts.has(`${example.gridSize}|${counts.join(",")}`),
    `${example.id} 缺少对应的示例田布局模板`,
  );
  for (const plotCount of [1, 2, 4]) {
    const formations = buildExampleFormations(example, plotCount);
    const formationSlots = formations.flatMap((formation) => formation.slots);
    const renderedCounts = formationSlots.reduce((countsByCrop, cropId) => {
      if (cropId) countsByCrop[cropId] = (countsByCrop[cropId] ?? 0) + 1;
      return countsByCrop;
    }, {});
    check(
      formationSlots.length === example.gridSize * plotCount,
      `${example.id} 的 ${plotCount} 块地示例图孔位数量不正确`,
    );
    check(
      formations.length === plotCount,
      `${example.id} 没有生成 ${plotCount} 块独立农田`,
    );
    if (example.gridSize === 10 && plotCount === 4) {
      check(
        formations.map((formation) => Boolean(formation.verticalMirror)).join(",") ===
          "false,false,true,true",
        `${example.id} 的四块 10 格农田没有按上下镜像排列`,
      );
      check(
        JSON.stringify(formations[0].slots) === JSON.stringify(formations[2].slots) &&
          JSON.stringify(formations[1].slots) === JSON.stringify(formations[3].slots),
        `${example.id} 的四块 10 格农田上下两排内容不对应`,
      );
    }
    for (const item of example.items) {
      check(
        renderedCounts[item.cropId] === item.count * plotCount,
        `${example.id} 的 ${plotCount} 块地示例图中 ${item.cropId} 数量不正确`,
      );
    }
  }

  for (const seasonId of example.seasonIds) {
    check(seasonIds.has(seasonId), `${example.id} 引用了未知季节：${seasonId}`);
    const balance = example.items.reduce(
      (result, item) => {
        const crop = cropsById[item.cropId];
        check(Boolean(crop), `${example.id} 引用了未知作物：${item.cropId}`);
        check(
          crop?.seasons.includes(seasonId),
          `${example.id} 的 ${crop?.name ?? item.cropId} 不属于 ${seasonId}`,
        );
        crop?.nutrients.forEach((value, index) => {
          result[index] += value * item.count;
        });

        for (const alternativeId of item.alternatives ?? []) {
          const alternative = cropsById[alternativeId];
          check(Boolean(alternative), `${example.id} 引用了未知替换作物：${alternativeId}`);
          check(
            alternative?.seasons.includes(seasonId),
            `${example.id} 的替换作物 ${alternative?.name ?? alternativeId} 不属于 ${seasonId}`,
          );
          check(
            alternative?.nutrients.join(",") === crop?.nutrients.join(","),
            `${example.id} 的 ${alternative?.name ?? alternativeId} 不能等量替换 ${crop?.name}`,
          );
        }
        return result;
      },
      [0, 0, 0],
    );
    check(
      balance.every((value) => value === 0),
      `${example.id} 在 ${seasonId} 的养分不平衡：${balance.join("/")}`,
    );
  }
}

const effectLayoutCases = [
  {
    id: "spring-03",
    slots: [
      "potato", "potato", "potato",
      "corn", "corn", "corn",
      "carrot", "carrot", "carrot",
    ],
  },
  {
    id: "spring-01",
    slots: [
      "potato", "potato", "potato",
      "potato", null, "toma",
      "toma", "toma", "toma",
    ],
  },
  {
    id: "spring-02",
    slots: [
      "carrot", "carrot", "carrot",
      "carrot", "carrot",
      "watermelon", "watermelon", "watermelon",
      "watermelon", "watermelon",
    ],
  },
  {
    id: "spring-07",
    slots: [
      "potato", "potato", "potato",
      "potato", "onion", "onion",
      null, "garlic", "garlic",
    ],
  },
  {
    id: "summer-02",
    slots: [
      "dragonfruit", "dragonfruit", "dragonfruit",
      "toma", "toma", "toma",
      "toma", "toma", "toma",
    ],
  },
  {
    id: "spring-10",
    slots: [
      "toma", "toma", "toma",
      "toma", "potato", "potato",
      "toma", "potato", "dragonfruit",
    ],
  },
  {
    id: "spring-11",
    slots: [
      null, "onion", "onion",
      null, "garlic", "garlic",
      "potato", "potato", "dragonfruit",
    ],
  },
  {
    id: "spring-13",
    slots: [
      null, "watermelon", "watermelon",
      "potato", "corn", "onion",
      "potato", "corn", "onion",
    ],
  },
  {
    id: "spring-15",
    slots: [
      "dragonfruit", "dragonfruit", "dragonfruit",
      "toma", "onion", "garlic",
      "toma", "onion", "garlic",
    ],
  },
  {
    id: "spring-17",
    slots: [
      "corn", "corn", "carrot",
      "corn", "corn", "carrot",
      "dragonfruit", "dragonfruit", "onion",
    ],
  },
  {
    id: "spring-special-4",
    slots: [
      "dragonfruit", "toma", "toma",
      "dragonfruit", "toma", "toma",
      "dragonfruit", "garlic", "onion",
    ],
  },
  {
    id: "winter-02",
    slots: [
      "potato", "potato", "garlic",
      "potato", "potato",
      "carrot", "carrot", "garlic",
      "carrot", "carrot",
    ],
  },
  {
    id: "advanced-4-2-2-2-spring-autumn",
    slots: [
      "potato", "potato", "toma",
      "potato", "toma",
      "potato", "carrot", "carrot",
      "corn", "corn",
    ],
  },
  {
    id: "advanced-4-3-2-1-spring",
    slots: [
      "watermelon", "watermelon", "onion",
      "watermelon", "onion",
      "watermelon", "potato", "onion",
      "potato", "garlic",
    ],
  },
  {
    id: "advanced-4-2-2-1-1-spring",
    slots: [
      "corn", "corn", "potato",
      "corn", "potato",
      "corn", "carrot", "onion",
      "carrot", "dragonfruit",
    ],
  },
  {
    id: "advanced-5-2-2-1-spring-autumn",
    slots: [
      "potato", "potato", "potato",
      "potato", "potato",
      "onion", "garlic", "garlic",
      "onion", "toma",
    ],
  },
  {
    id: "advanced-6-2-2-spring",
    slots: [
      "toma", "toma", "toma",
      "toma", "toma",
      "toma", "dragonfruit", "dragonfruit",
      "potato", "potato",
    ],
  },
];

for (const expected of effectLayoutCases) {
  const example = farmingExamples.examples.find(({ id }) => id === expected.id);
  const slots = buildExampleFormations(example, 1)[0].slots;
  check(
    JSON.stringify(slots) === JSON.stringify(expected.slots),
    `${expected.id} 示例图与效果图阵型不一致`,
  );
}

let seasonalExampleCount = 0;
for (const season of farming.seasons) {
  const count = farmingExamples.examples.filter((example) =>
    example.seasonIds.includes(season.id),
  ).length;
  seasonalExampleCount += count;
  check(
    count === farmingExamples.expectedCounts[season.id],
    `${season.name}示例应为 ${farmingExamples.expectedCounts[season.id]} 组，实际为 ${count} 组`,
  );
}
check(
  [1, 2, 4].every((count) =>
    farmingExamples.examples.some((example) => example.plotCount === count),
  ),
  "示例缺少 1、2 或 4 块农田筛选数据",
);
check(
  [9, 10].every((size) =>
    farmingExamples.examples.some((example) => example.gridSize === size),
  ),
  "示例缺少 9 或 10 格筛选数据",
);
const exampleRatios = new Set(
  farmingExamples.examples.map((example) => formatReducedRatio(example.items)),
);
check(
  farmingExamples.expectedRatios.every((ratio) => exampleRatios.has(ratio)),
  `约分比例缺失：${farmingExamples.expectedRatios.filter((ratio) => !exampleRatios.has(ratio)).join("、")}`,
);
check(
  exampleRatios.size === farmingExamples.expectedRatios.length,
  `示例包含未登记的约分比例：${[...exampleRatios].filter((ratio) => !farmingExamples.expectedRatios.includes(ratio)).join("、")}`,
);

for (const imagePath of imagePaths) {
  try {
    await access(join(publicRoot, imagePath));
  } catch {
    failures.push(`缺少本地图片：${imagePath}`);
  }
}

const sourceFiles = await walk(sourceRoot);
check(
  sourceFiles.every((file) => !/\.(ts|tsx)$/.test(file)),
  "src 中不应包含 TypeScript 文件",
);

for (const file of sourceFiles) {
  if (!/\.(astro|vue|js|css|json)$/.test(file)) continue;
  const content = await readFile(file, "utf8");
  check(!content.includes("data:image/"), `${file} 中不应包含 Base64 图片`);
}

const explorerSource = await readFile(
  join(sourceRoot, "components/RecipeExplorer.vue"),
  "utf8",
);
const globalCss = await readFile(join(sourceRoot, "styles/global.css"), "utf8");
check(
  explorerSource.includes('recipe.zh.toLocaleLowerCase("zh-CN").includes(needle)'),
  "搜索应只匹配中文料理名称",
);
check(
  !explorerSource.includes("recipe.en.toLocaleLowerCase"),
  "搜索不应匹配英文料理名称",
);
check(
  globalCss.includes(".plot-grid.ten-grid > .plot-cell:nth-child(10)") &&
    globalCss.includes("grid-template-columns: repeat(6, minmax(0, 1fr))") &&
    (globalCss.match(/\.plot-grid\.ten-grid > \.plot-cell:nth-child/g) ?? [])
      .length === 10,
  "10 格农田应按 PDF 的 3+2+3+2 交错布局",
);

await access(join(distRoot, "index.html"));
await access(join(distRoot, "data.json"));
await access(join(distRoot, "recipes/index.html"));
await access(join(distRoot, "farming/index.html"));
await access(join(distRoot, "skills/index.html"));
await access(join(distRoot, "quests/index.html"));
const distFiles = await walk(distRoot);
const builtCss = await Promise.all(
  distFiles
    .filter((file) => file.endsWith(".css"))
    .map((file) => readFile(file, "utf8")),
);
check(
  builtCss.some((content) => content.includes(".sr-only")),
  "构建产物中未检测到 Tailwind CSS 工具类",
);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  `验证通过：${data.recipes.length} 道料理、${farming.seasons.length} 个季节、${farmingExamples.examples.length} 张示例卡、${seasonalExampleCount} 个季节示例、${completeRatioCount} 组完整配比、${skillTrees.characters.length} 位技能树角色、${skillCount} 项技能、${quests.quests.length} 条任务路线、${imagePaths.size} 个本地图片引用。`,
);
