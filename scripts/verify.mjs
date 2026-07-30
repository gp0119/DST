import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateRatioGroups } from "../src/lib/farmingCatalog.js";
import { buildExampleFormations } from "../src/lib/farmingLayouts.js";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const dataPath = join(projectRoot, "src/data/cookbook.json");
const farmingDataPath = join(projectRoot, "src/data/farming.json");
const farmingExamplesPath = join(projectRoot, "src/data/farming-examples.json");
const publicRoot = join(projectRoot, "public");
const sourceRoot = join(projectRoot, "src");
const distRoot = join(projectRoot, "dist");
const data = JSON.parse(await readFile(dataPath, "utf8"));
const farming = JSON.parse(await readFile(farmingDataPath, "utf8"));
const farmingExamples = JSON.parse(await readFile(farmingExamplesPath, "utf8"));
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

for (const recipe of data.recipes) {
  check(recipe.combos.length === 2, `${recipe.zh} 应有 2 套常用配料`);

  for (const [index, combo] of recipe.combos.entries()) {
    check(combo.items.length === 4, `${recipe.zh} 第 ${index + 1} 套配料不是完整 4 格`);
  }
}

const imagePaths = new Set();
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
  "9|4,3,1,1",
]);

for (const example of farmingExamples.examples) {
  check(!exampleIds.has(example.id), `PDF 示例 ID 重复：${example.id}`);
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
  check(
    example.items.every((item) => item.count * example.plotCount >= 4),
    `${example.id} 扩种后仍有作物不足 4 株`,
  );

  const formations = buildExampleFormations(example);
  const formationSlots = formations.flatMap((formation) => formation.slots);
  const renderedCounts = formationSlots.reduce((countsByCrop, cropId) => {
    if (cropId) countsByCrop[cropId] = (countsByCrop[cropId] ?? 0) + 1;
    return countsByCrop;
  }, {});
  check(
    formationSlots.length === example.gridSize * example.plotCount,
    `${example.id} 最终示例图孔位数量不正确`,
  );
  check(
    example.gridSize === 9
      ? formations.length === 1
      : formations.length === example.plotCount,
    `${example.id} 最终示例图没有按相邻农田合并`,
  );
  for (const item of example.items) {
    check(
      renderedCounts[item.cropId] === item.count * example.plotCount,
      `${example.id} 最终示例图中的 ${item.cropId} 数量不正确`,
    );
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
      "potato", "potato", "potato", "potato", "potato", "potato",
      "potato", "onion", "onion", "onion", "onion", "potato",
      null, "garlic", "garlic", "garlic", "garlic", null,
    ],
  },
  {
    id: "spring-10",
    slots: [
      "toma", "toma", "toma", "toma", "toma", "toma",
      "toma", "potato", "potato", "potato", "potato", "toma",
      "toma", "potato", "dragonfruit", "dragonfruit", "potato", "toma",
      "toma", "potato", "dragonfruit", "dragonfruit", "potato", "toma",
      "toma", "potato", "potato", "potato", "potato", "toma",
      "toma", "toma", "toma", "toma", "toma", "toma",
    ],
  },
  {
    id: "spring-11",
    slots: [
      null, "onion", "onion", "onion", "onion", null,
      null, "garlic", "garlic", "garlic", "garlic", null,
      "potato", "potato", "dragonfruit", "dragonfruit", "potato", "potato",
      "potato", "potato", "dragonfruit", "dragonfruit", "potato", "potato",
      null, "garlic", "garlic", "garlic", "garlic", null,
      null, "onion", "onion", "onion", "onion", null,
    ],
  },
  {
    id: "spring-13",
    slots: [
      null, "watermelon", "watermelon", "watermelon", "watermelon", null,
      "potato", "corn", "onion", "onion", "corn", "potato",
      "potato", "corn", "onion", "onion", "corn", "potato",
      "potato", "corn", "onion", "onion", "corn", "potato",
      "potato", "corn", "onion", "onion", "corn", "potato",
      null, "watermelon", "watermelon", "watermelon", "watermelon", null,
    ],
  },
  {
    id: "spring-15",
    slots: [
      "dragonfruit", "dragonfruit", "dragonfruit", "dragonfruit", "dragonfruit", "dragonfruit",
      "toma", "onion", "garlic", "garlic", "onion", "toma",
      "toma", "onion", "garlic", "garlic", "onion", "toma",
      "toma", "onion", "garlic", "garlic", "onion", "toma",
      "toma", "onion", "garlic", "garlic", "onion", "toma",
      "dragonfruit", "dragonfruit", "dragonfruit", "dragonfruit", "dragonfruit", "dragonfruit",
    ],
  },
  {
    id: "spring-17",
    slots: [
      "corn", "corn", "carrot", "carrot", "corn", "corn",
      "corn", "corn", "carrot", "carrot", "corn", "corn",
      "dragonfruit", "dragonfruit", "onion", "onion", "dragonfruit", "dragonfruit",
      "dragonfruit", "dragonfruit", "onion", "onion", "dragonfruit", "dragonfruit",
      "corn", "corn", "carrot", "carrot", "corn", "corn",
      "corn", "corn", "carrot", "carrot", "corn", "corn",
    ],
  },
  {
    id: "spring-special-4",
    slots: [
      "dragonfruit", "toma", "toma", "toma", "toma", "dragonfruit",
      "dragonfruit", "toma", "toma", "toma", "toma", "dragonfruit",
      "dragonfruit", "garlic", "onion", "onion", "garlic", "dragonfruit",
      "dragonfruit", "garlic", "onion", "onion", "garlic", "dragonfruit",
      "dragonfruit", "toma", "toma", "toma", "toma", "dragonfruit",
      "dragonfruit", "toma", "toma", "toma", "toma", "dragonfruit",
    ],
  },
  {
    id: "winter-02",
    slots: [
      "potato", "potato", "garlic",
      "potato", "potato",
      "carrot", "carrot", "garlic",
      "carrot", "carrot",
      "garlic", "potato", "potato",
      "potato", "potato",
      "garlic", "carrot", "carrot",
      "carrot", "carrot",
    ],
  },
];

for (const expected of effectLayoutCases) {
  const example = farmingExamples.examples.find(({ id }) => id === expected.id);
  const slots = buildExampleFormations(example).flatMap((formation) => formation.slots);
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
    `${season.name} PDF 示例应为 ${farmingExamples.expectedCounts[season.id]} 组，实际为 ${count} 组`,
  );
}
check(
  [1, 2, 4].every((count) =>
    farmingExamples.examples.some((example) => example.plotCount === count),
  ),
  "PDF 示例缺少 1、2 或 4 块农田筛选数据",
);
check(
  [9, 10].every((size) =>
    farmingExamples.examples.some((example) => example.gridSize === size),
  ),
  "PDF 示例缺少 9 或 10 格筛选数据",
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
await access(join(distRoot, "farming/index.html"));
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
  `验证通过：${data.recipes.length} 道料理、${farming.seasons.length} 个季节、${farmingExamples.examples.length} 张 PDF 示例卡、${seasonalExampleCount} 个季节示例、${completeRatioCount} 组完整配比、${imagePaths.size} 个本地图片引用。`,
);
