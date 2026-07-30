<script setup>
import { computed, ref } from "vue";
import RecipeCard from "./RecipeCard.vue";

const props = defineProps({
  recipes: {
    type: Array,
    required: true,
  },
});

const filters = [
  { value: "all", label: "全部" },
  { value: "heal", label: "高回血 · ≥30" },
  { value: "hunger", label: "高饱食 · ≥75" },
  { value: "sanity", label: "高理智 · ≥20" },
  { value: "effect", label: "特殊效果" },
  { value: "warly", label: "沃利专属" },
  { value: "special", label: "特殊产物" },
];

const query = ref("");
const activeFilter = ref("all");

const filteredRecipes = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase("zh-CN");

  return props.recipes.filter((recipe) => {
    const matchesFilter =
      activeFilter.value === "all" || recipe.tags.includes(activeFilter.value);
    const matchesName =
      !needle || recipe.zh.toLocaleLowerCase("zh-CN").includes(needle);

    return matchesFilter && matchesName;
  });
});

function clearSearch() {
  query.value = "";
  document.querySelector("#search")?.focus();
}
</script>

<template>
  <div>
    <div class="toolbar-wrap">
      <section class="toolbar" aria-label="食谱搜索与筛选">
        <div class="search-row">
          <label class="search-shell">
            <span class="sr-only">搜索食谱</span>
            <input
              id="search"
              v-model="query"
              type="search"
              lang="zh-CN"
              autocomplete="off"
              aria-label="按中文料理名称搜索"
              placeholder="输入中文料理名称…"
            />
          </label>
          <button class="clear-button" type="button" @click="clearSearch">
            清除搜索
          </button>
        </div>

        <div class="filter-row" role="group" aria-label="分类筛选">
          <button
            v-for="filter in filters"
            :key="filter.value"
            class="filter-button"
            type="button"
            :aria-pressed="activeFilter === filter.value"
            @click="activeFilter = filter.value"
          >
            {{ filter.label }}
          </button>
          <span class="result-count" aria-live="polite">
            {{ filteredRecipes.length }} / {{ recipes.length }}
          </span>
        </div>
      </section>
    </div>

    <details class="legend">
      <summary>先看这里：条件里的“度”是什么意思？</summary>
      <p>
        “肉度、菜度、水果度”等是食材标签数值，不等于食材件数；例如小肉通常只有
        0.5 肉度。每道料理列出两套常用完整 4
        格配料，并核对了料理优先级。制作条件仍是最终判断依据；蘑菇蛋糕等固定配方没有真正的第二套替代材料。保鲜时间按默认世界、常温和满新鲜度计算。
      </p>
    </details>

    <section id="recipes" aria-label="全部料理">
      <div class="recipe-grid">
        <RecipeCard
          v-for="recipe in filteredRecipes"
          :key="recipe.en"
          :recipe="recipe"
        />
      </div>
      <div v-if="filteredRecipes.length === 0" class="empty-state">
        <strong>没有找到对应料理</strong>
        换个中文名称，或切回“全部”试试。
      </div>
    </section>
  </div>
</template>
