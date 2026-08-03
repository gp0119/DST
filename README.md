# 饥荒联机版生存工具箱

使用 Astro、Vue 3 和 Tailwind CSS 构建的中文速查项目。项目使用 JavaScript，不包含 TypeScript；页面数据与图片均保存在本地。

- `/`：全部工具的总导航页
- `/recipes/`：81 道料理食谱与人物最爱食物
- `/crafting/`：先按分类浏览 967 项制作；冒险家物品可继续按人物进入专属列表
- `/farming/`：按春、夏、秋、冬整理的巨大作物配比
- `/skills/`：12 位角色的技能树与 15 点洞察模拟器
- `/quests/`：5 条关键任务路线与本地进度

## 本地运行

```sh
pnpm install
pnpm dev
```

## 构建与校验

```sh
pnpm build
pnpm test
```

食谱数据位于 `src/data/cookbook.json`；四季作物和 79 组完整配比位于
`src/data/farming.json`；PDF 中转录的 52 张种植卡位于
`src/data/farming-examples.json`；角色技能树位于 `src/data/skills.json`；
制作数据位于 `src/data/crafting.json`；图片位于 `public/images`。

制作数据需要刷新时，可从对应的结构化数据快照重新导入：

```sh
node scripts/import-crafting-data.mjs \
  /path/to/dst-craft \
  /path/to/ItemTable.txt \
  /path/to/DSTRecipes.txt
```
