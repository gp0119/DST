# 饥荒联机版食谱大全

使用 Astro、Vue 3 和 Tailwind CSS 构建的中文食谱速查项目。项目使用 JavaScript，不包含 TypeScript；料理、配料、人物头像和三维数值图标均保存在本地。

- `/`：料理食谱
- `/farming/`：按春、夏、秋、冬整理的巨大作物配比
- `/skills/`：12 位角色的技能树与 15 点洞察模拟器

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
图片位于 `public/images`。
