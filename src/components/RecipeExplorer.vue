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
          <button
            class="clear-button"
            type="button"
            :disabled="!query"
            @click="clearSearch"
          >
            清除
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
