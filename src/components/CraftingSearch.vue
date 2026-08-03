<script setup>
  import { computed, ref } from 'vue'
  import { assetUrl } from '../lib/assets.js'

  const props = defineProps({
    items: {
      type: Array,
      required: true,
    },
  })

  const query = ref('')
  const needle = computed(() => query.value.trim().toLocaleLowerCase('zh-CN'))
  const matchingItems = computed(() => {
    if (!needle.value) return []
    return props.items.filter((item) => item.searchText.includes(needle.value))
  })
  const visibleItems = computed(() => matchingItems.value.slice(0, 18))

  function itemUrl(item) {
    const route = item.characterId
      ? `crafting/character/${item.characterId}/`
      : `crafting/${item.categoryId}/`
    return `${import.meta.env.BASE_URL}${route}?item=${encodeURIComponent(item.id)}#craft-${item.id}`
  }

  function clearSearch() {
    query.value = ''
  }
</script>

<template>
  <div class="crafting-category-search">
    <label for="crafting-global-search">搜索制作物</label>
    <div class="crafting-category-search-controls">
      <input
        id="crafting-global-search"
        v-model="query"
        type="search"
        lang="zh-CN"
        autocomplete="off"
        placeholder="物品、材料、制作站、角色或英文名…"
      />
      <button v-if="needle" type="button" @click="clearSearch">清除</button>
    </div>

    <p v-if="needle" aria-live="polite">
      找到 <strong>{{ matchingItems.length }}</strong> 项
      <span v-if="matchingItems.length > visibleItems.length">，显示前 {{ visibleItems.length }} 项</span>
    </p>
    <p v-else>在 {{ items.length }} 项制作配方中快速查找，点击结果直接进入对应页面。</p>

    <div v-if="visibleItems.length" class="crafting-search-results">
      <a v-for="item in visibleItems" :key="item.id" class="crafting-search-result" :href="itemUrl(item)">
        <img :src="assetUrl(item.image)" :alt="item.name" loading="lazy" />
        <div>
          <h3>{{ item.name }}</h3>
          <small v-if="item.englishName !== item.name" lang="en">{{ item.englishName }}</small>
          <span>
            {{ item.characterName ? `${item.characterName}专属` : item.stationName }}
            · {{ item.categoryNames.join(' · ') }}
          </span>
        </div>
        <b aria-hidden="true">→</b>
      </a>
    </div>

    <div v-else-if="needle" class="crafting-search-empty">没有找到对应制作物，试试其他名称或材料。</div>
  </div>
</template>
