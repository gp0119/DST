import { copyFile, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const sourceRoot = resolve(process.argv[2] ?? "");
const itemTablePath = process.argv[3] ? resolve(process.argv[3]) : null;
const recipeTablePath = process.argv[4] ? resolve(process.argv[4]) : null;

if (!process.argv[2]) {
  throw new Error(
    "用法：node scripts/import-crafting-data.mjs <dst-craft 仓库路径> [ItemTable 文本] [DSTRecipes 文本]",
  );
}

const projectRoot = resolve(new URL("..", import.meta.url).pathname);
const sourceDataRoot = join(sourceRoot, "src/data");
const sourceImageRoot = join(sourceRoot, "public/images/game-items");
const sourceSkinRoot = join(sourceRoot, "public/images/skins");
const sourceCategoryImageRoot = join(sourceRoot, "public/images/category-icons");
const targetImageRoot = join(projectRoot, "public/images/crafting");
const targetCategoryImageRoot = join(projectRoot, "public/images/crafting-categories");

async function readExport(relativePath, exportName) {
  const source = await readFile(join(sourceDataRoot, relativePath), "utf8");
  const marker = `export const ${exportName}`;
  const markerIndex = source.indexOf(marker);
  const equalsIndex = source.indexOf("=", markerIndex);

  if (markerIndex === -1 || equalsIndex === -1) {
    throw new Error(`${relativePath} 中没有找到 ${exportName}`);
  }

  const expression = source.slice(equalsIndex + 1).trim().replace(/;\s*$/, "");
  return Function(`"use strict"; return (${expression});`)();
}

async function readWikiTable(path, headerPrefix) {
  if (!path) return { rows: [], patch: null };

  const source = await readFile(path, "utf8");
  const lines = source.split(/\r?\n/);
  const headerIndex = lines.findLastIndex((line) => line.startsWith(headerPrefix));
  if (headerIndex === -1) throw new Error(`${path} 中没有找到 ${headerPrefix} 表头`);

  const headers = lines[headerIndex].split("\t");
  const rows = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.startsWith("Extract data from patch")) break;
    if (!line.includes("\t")) continue;
    const values = line.split("\t");
    rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  }

  return {
    rows,
    patch: source.match(/Extract data from patch (\d+)/)?.[1] ?? null,
  };
}

const [
  items,
  materials,
  categories,
  locale,
  gameVersion,
  itemTable,
  recipeTable,
] = await Promise.all([
  readExport("items.ts", "allItems"),
  readExport("materials.ts", "materials"),
  readExport("categories.ts", "categories"),
  readExport("locales/zh_CN.ts", "zh_CN"),
  readExport("game-version.ts", "DST_GAME_VERSION"),
  readWikiTable(itemTablePath, "id\tname_cn\tname_en"),
  readWikiTable(recipeTablePath, "recipe_name\tingredient1\tamount1"),
]);

const categoryFallbacks = {
  ancient: "远古科技",
  celestial: "天体科技",
  lunar_forge: "辉煌工艺",
  shadow_forge: "暗影工艺",
  critter_lab: "小动物",
};

const stationNames = {
  none: "无需科技站",
  science_1: "科学机器",
  science_2: "炼金引擎",
  magic_1: "灵子分解器",
  magic_2: "暗影操控器",
  ancient: "远古伪科学站",
  celestial: "天体科技",
  think_tank: "智囊团",
  cartography: "制图桌",
  tackle_station: "钓具容器",
  potter_wheel: "陶轮",
  bookstation: "书柜",
  portableblender: "便携研磨器",
  lunar_forge: "辉煌铁匠铺",
  shadow_forge: "暗影术基座",
  carpentry_station: "锯马",
  turfcraftingstation: "土地夯实器",
  wagpunk_workstation: "概念制造器",
  vault_refiner: "圣所锻炉",
  critter_lab: "岩石巢穴",
  character: "角色专属",
  event: "活动制作站",
  pearl_tea_1: "珍珠茶店 · 1 级",
  pearl_tea_2: "珍珠茶店 · 2 级",
  pearl_tea_3: "珍珠茶店 · 3 级",
};

const materialById = new Map(materials.map((material) => [material.id, material]));
const sourceItemById = new Map(items.map((item) => [item.id, item]));
const wikiItemById = new Map(itemTable.rows.map((item) => [item.id, item]));
const wikiItemByEnglishName = new Map(
  itemTable.rows.filter((item) => item.name_en).map((item) => [item.name_en, item]),
);
const wikiRecipeById = new Map(
  recipeTable.rows.map((recipe) => [recipe.recipe_name, recipe]),
);
const imageNames = new Set();

const sourceImageAliases = {
  "onion.png": "quagmire_onion.png",
  "wx78_drone_delivery_small_item.png": "wx78_drone_delivery.png",
};

const displayItemAliases = {
  winona_catapult_item: "winona_catapult",
  winona_spotlight_item: "winona_spotlight",
  winona_battery_low_item: "winona_battery_low",
  winona_battery_high_item: "winona_battery_high",
  wormwood_carrat: "carrat",
  wormwood_lightflier: "lightflier",
  wormwood_fruitdragon: "fruitdragon",
  wx78_drone_delivery_small_item: "wx78_drone_delivery",
};

function imageCandidates(imageName) {
  const candidates = [
    join(sourceImageRoot, imageName),
    join(sourceSkinRoot, imageName),
  ];

  const alias = sourceImageAliases[imageName];
  if (alias) candidates.push(join(sourceImageRoot, alias));
  if (
    imageName.startsWith("carnivalgame_golf_shape_") ||
    imageName.startsWith("carnivalgame_golfprop_")
  ) {
    candidates.push(join(sourceImageRoot, "carnivalgame_golfgame_kit_diy.png"));
  }

  return candidates;
}

const builderTagCharacters = {
  portableengineer: "winona",
  pyromaniac: "willow",
  masterchef: "warly",
};

function characterForRecipe(recipe, sourceItem) {
  if (sourceItem?.characterOnly) return sourceItem.characterOnly;
  if (builderTagCharacters[recipe.builder_tag]) {
    return builderTagCharacters[recipe.builder_tag];
  }
  const skillCharacter = recipe.builder_skill?.split("_")[0];
  if (skillCharacter === "wx78") return "wx-78";
  return skillCharacter || null;
}

function categoryForRecipe(recipe, sourceItem, characterId) {
  if (sourceItem?.category?.length) {
    return characterId && !sourceItem.category.includes("character")
      ? [...sourceItem.category, "character"]
      : sourceItem.category;
  }
  if (characterId) return ["character"];
  if (recipe.recipe_name.startsWith("critter_")) return ["critter_lab"];
  if (recipe.recipe_name.startsWith("carnivalgame_")) return ["decorations"];
  if (recipe.recipe_name.startsWith("hermitcrabtea_")) return ["cooking"];
  return ["other"];
}

function stationForRecipe(recipe, sourceItem, characterId) {
  if (sourceItem?.station) return sourceItem.station;
  if (characterId) return "character";
  if (recipe.tech === "TECH.ORPHANAGE_ONE") return "critter_lab";
  if (recipe.tech === "TECH.CARNIVAL_GOLFPROPS_ONE") return "event";
  if (recipe.recipe_name.startsWith("hermitcrabtea_")) {
    return `pearl_tea_${recipe.recipe_name.at(-1)}`;
  }
  return "none";
}

function localizedMaterial(materialId, quantity) {
  const material = materialById.get(materialId);
  const itemLocale = locale.items[materialId];
  const materialLocale = locale.materials[materialId];
  const wikiItem =
    wikiItemById.get(materialId) ?? wikiItemByEnglishName.get(material?.name);
  const image = material?.image ?? `${materialId}.png`;
  imageNames.add(image);

  return {
    id: materialId,
    name:
      wikiItem?.name_cn ??
      materialLocale?.name ??
      itemLocale?.name ??
      material?.name ??
      materialId,
    englishName: material?.name ?? materialId,
    image: `images/crafting/${basename(image)}`,
    quantity,
  };
}

const recipes = recipeTable.rows.length
  ? recipeTable.rows
  : items.map((item) => ({
      recipe_name: item.id,
      product: item.id,
      numtogive: item.numtogive ?? 1,
      desc: "",
    }));

const normalizedItems = recipes.map((recipe, index) => {
  const sourceItem = sourceItemById.get(recipe.recipe_name);
  const productId = recipe.product || recipe.recipe_name;
  const wikiItem =
    wikiItemById.get(productId) ??
    wikiItemById.get(recipe.recipe_name) ??
    wikiItemById.get(
      displayItemAliases[recipe.recipe_name] ??
        (recipe.recipe_name.startsWith("carnivalgame_golf_shape_")
          ? "carnivalgame_golf_shape"
          : ""),
    ) ??
    wikiItemByEnglishName.get(sourceItem?.name);
  const translation = locale.items[productId] ?? locale.items[recipe.recipe_name] ?? {};
  const image =
    sourceItem?.image ?? materialById.get(productId)?.image ?? `${productId}.png`;
  const characterId = characterForRecipe(recipe, sourceItem);
  const recipeMaterials = recipeTable.rows.length
    ? Array.from({ length: 6 }, (_, materialIndex) => ({
        materialId: recipe[`ingredient${materialIndex + 1}`],
        quantity: Number(recipe[`amount${materialIndex + 1}`]),
      })).filter((material) => material.materialId)
    : sourceItem.materials;
  const healthMaterial = recipeMaterials.find(
    (material) => material.materialId === "decrease_health",
  );
  const sanityMaterial = recipeMaterials.find(
    (material) => material.materialId === "decrease_sanity",
  );
  imageNames.add(image);

  return {
    id: recipe.recipe_name,
    name: wikiItem?.name_cn ?? translation.name ?? sourceItem?.name ?? productId,
    englishName: wikiItem?.name_en ?? sourceItem?.name ?? productId,
    description: recipe.desc || translation.desc || sourceItem?.description || "暂无说明。",
    image: `images/crafting/${basename(image)}`,
    categoryIds: categoryForRecipe(recipe, sourceItem, characterId),
    stationId: stationForRecipe(recipe, sourceItem, characterId),
    materials: recipeMaterials
      .filter(
        (material) =>
          !["decrease_health", "decrease_sanity"].includes(material.materialId),
      )
      .map((material) => localizedMaterial(material.materialId, material.quantity)),
    characterId,
    healthCost: healthMaterial?.quantity ?? sourceItem?.healthCost ?? null,
    sanityCost: sanityMaterial?.quantity ?? null,
    blueprint: Boolean(sourceItem?.blueprint || recipe.tech === "TECH.LOST"),
    noUnlock: Boolean(sourceItem?.nounlock || recipe.nounlock === "☑"),
    builderSkill: recipe.builder_skill || sourceItem?.builderSkill || null,
    output: Number(recipe.numtogive) || sourceItem?.numtogive || 1,
    sortOrder: sourceItem?.sortOrder ?? 1000 + index,
  };
});

const usedStationIds = [...new Set(normalizedItems.map((item) => item.stationId))];
const usedCharacterIds = [
  ...new Set(normalizedItems.map((item) => item.characterId).filter(Boolean)),
];

const output = {
  meta: {
    itemCount: normalizedItems.length,
    steamBuildId: gameVersion.steamBuildId,
    gameDataUpdatedAt: gameVersion.dataUpdatedAt,
    chineseDataPatch: itemTable.patch ?? recipeTable.patch,
    importedAt: new Date().toISOString().slice(0, 10),
    sourceRepository: "https://github.com/fankimm/dst-craft",
    sourceCommit: "12f24816113367902cf6f493bf344b5b3527a52a",
    wikiSource:
      "https://dontstarve.wiki.gg/wiki/Crafting/Don%27t_Starve_Together",
    chineseItemSource:
      "https://dontstarve.huijiwiki.com/wiki/Data%3AItemTable.tabx",
    chineseRecipeSource:
      "https://dontstarve.huijiwiki.com/wiki/Data%3ADSTRecipes.tabx",
  },
  categories: [
    ...categories.filter((category) => category.id !== "all"),
    { id: "other", name: "特殊与活动", order: 99 },
  ].map((category) => ({
      id: category.id,
      name:
        locale.categories[category.id]?.name ??
        categoryFallbacks[category.id] ??
        category.name,
      englishName: category.name,
      order: category.order,
      image:
        category.id === "other"
          ? null
          : `images/crafting-categories/${category.id}.png`,
    })),
  stations: usedStationIds.map((id) => ({
    id,
    name: stationNames[id] ?? id,
  })),
  characters: usedCharacterIds.map((id) => ({
    id,
    name: locale.characters[id]?.name ?? id,
  })),
  items: normalizedItems,
};

await mkdir(targetImageRoot, { recursive: true });

for (const existingImage of await readdir(targetImageRoot)) {
  if (!imageNames.has(existingImage)) {
    await unlink(join(targetImageRoot, existingImage));
  }
}

const missingImages = [];
await Promise.all(
  [...imageNames].map(async (imageName) => {
    for (const sourcePath of imageCandidates(imageName)) {
      try {
        await copyFile(sourcePath, join(targetImageRoot, basename(imageName)));
        return;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }

    missingImages.push(imageName);
  }),
);

await writeFile(
  join(projectRoot, "src/data/crafting.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(`已导入 ${normalizedItems.length} 条制作记录。`);
console.log(`已复制 ${imageNames.size - missingImages.length} 张制作与材料图标。`);
if (missingImages.length > 0) {
  console.warn(`缺少 ${missingImages.length} 张图标：${missingImages.join(", ")}`);
}

const categoryImageNames = output.categories
  .filter((category) => category.image)
  .map((category) => basename(category.image));

await mkdir(targetCategoryImageRoot, { recursive: true });
for (const existingImage of await readdir(targetCategoryImageRoot)) {
  if (!categoryImageNames.includes(existingImage)) {
    await unlink(join(targetCategoryImageRoot, existingImage));
  }
}
await Promise.all(
  categoryImageNames.map((imageName) =>
    copyFile(
      join(sourceCategoryImageRoot, imageName),
      join(targetCategoryImageRoot, imageName),
    ),
  ),
);
console.log(`已复制 ${categoryImageNames.length} 张游戏原版分类图标。`);
