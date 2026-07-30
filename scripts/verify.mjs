import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const dataPath = join(projectRoot, "src/data/cookbook.json");
const publicRoot = join(projectRoot, "public");
const sourceRoot = join(projectRoot, "src");
const distRoot = join(projectRoot, "dist");
const data = JSON.parse(await readFile(dataPath, "utf8"));
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
["images/ui/health.png", "images/ui/hunger.png", "images/ui/sanity.png"].forEach((path) =>
  imagePaths.add(path),
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
check(
  explorerSource.includes('recipe.zh.toLocaleLowerCase("zh-CN").includes(needle)'),
  "搜索应只匹配中文料理名称",
);
check(
  !explorerSource.includes("recipe.en.toLocaleLowerCase"),
  "搜索不应匹配英文料理名称",
);

await access(join(distRoot, "index.html"));
await access(join(distRoot, "data.json"));
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
  `验证通过：${data.recipes.length} 道料理、${data.favorites.length} 项人物最爱、${imagePaths.size} 个本地图片引用。`,
);
