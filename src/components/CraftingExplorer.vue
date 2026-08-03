<script setup>
  import { computed, ref, watch } from 'vue'
  import { assetUrl } from '../lib/assets.js'

  const props = defineProps({
    data: {
      type: Object,
      required: true,
    },
  })

  const query = ref('')
  const stationId = ref('all')
  const visibleLimit = ref(72)

  const stationById = new Map(props.data.stations.map((station) => [station.id, station.name]))
  const categoryById = new Map(props.data.categories.map((category) => [category.id, category.name]))
  const characterById = new Map(props.data.characters.map((character) => [character.id, character.name]))
  const characterImageById = new Map(
    props.data.characters.map((character) => [
      character.id,
      `images/characters/${character.id === 'wx-78' ? 'wx78' : character.id}.png`,
    ]),
  )
  const searchableItems = props.data.items.map((item) => ({
    item,
    searchText: [
      item.id,
      item.name,
      item.englishName,
      item.description,
      stationById.get(item.stationId),
      characterById.get(item.characterId),
      ...item.categoryIds.map((id) => categoryById.get(id)),
      ...item.materials.flatMap((material) => [material.id, material.name, material.englishName]),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('zh-CN'),
  }))

  const filteredItems = computed(() => {
    const needle = query.value.trim().toLocaleLowerCase('zh-CN')

    return searchableItems
      .filter(({ item, searchText }) => {
        const matchesQuery = !needle || searchText.includes(needle)
        const matchesStation = stationId.value === 'all' || item.stationId === stationId.value

        return matchesQuery && matchesStation
      })
      .map(({ item }) => item)
  })

  const visibleItems = computed(() => filteredItems.value.slice(0, visibleLimit.value))
  const hasActiveFilters = computed(() => Boolean(query.value.trim()) || stationId.value !== 'all')

  watch([query, stationId], () => {
    visibleLimit.value = 72
  })

  function clearFilters() {
    query.value = ''
    stationId.value = 'all'
  }

  function showMore() {
    visibleLimit.value += 72
  }
</script>

<template>
  <div class="crafting-explorer">
    <section class="crafting-toolbar" aria-label="制作搜索与制作站筛选">
      <label class="crafting-search">
        <span>搜索</span>
        <input v-model="query" type="search" lang="zh-CN" autocomplete="off" placeholder="物品、材料、科技站或英文名…" />
      </label>

      <div class="crafting-select-grid">
        <label>
          <span>制作站</span>
          <select v-model="stationId">
            <option value="all">全部制作站</option>
            <option v-for="station in data.stations" :key="station.id" :value="station.id">
              {{ station.name }}
            </option>
          </select>
        </label>
      </div>

      <div class="crafting-toolbar-footer">
        <p aria-live="polite">
          显示 <strong>{{ filteredItems.length }}</strong> / {{ data.items.length }} 项
        </p>
        <button type="button" :disabled="!hasActiveFilters" @click="clearFilters">清除筛选</button>
      </div>
    </section>

    <section class="crafting-results" aria-label="制作物列表">
      <div v-if="visibleItems.length" class="crafting-grid">
        <article v-for="item in visibleItems" :id="`craft-${item.id}`" :key="item.id" class="crafting-card">
          <header :class="{ 'has-character-avatar': item.characterId }">
            <div class="crafting-item-image">
              <img :src="assetUrl(item.image)" :alt="item.name" loading="lazy" />
              <span v-if="item.output > 1">×{{ item.output }}</span>
            </div>
            <div>
              <p>{{ stationById.get(item.stationId) }}</p>
              <h2>{{ item.name }}</h2>
              <small v-if="item.englishName !== item.name" lang="en">
                {{ item.englishName }}
              </small>
            </div>
            <div
              v-if="item.characterId"
              class="crafting-item-character"
              :title="`${characterById.get(item.characterId)}专属`"
            >
              <img
                :src="assetUrl(characterImageById.get(item.characterId))"
                :alt="`${characterById.get(item.characterId)}专属`"
                loading="lazy"
              />
            </div>
          </header>

          <p class="crafting-description">{{ item.description }}</p>

          <div class="crafting-item-categories">
            <strong>所属分类</strong>
            <span v-for="id in item.categoryIds" :key="id">
              {{ categoryById.get(id) }}
            </span>
          </div>

          <div class="crafting-tags">
            <span v-if="item.characterId" class="character"> {{ characterById.get(item.characterId) }}专属 </span>
            <span v-if="item.blueprint">蓝图解锁</span>
            <span v-if="item.builderSkill">技能树解锁</span>
            <span v-if="item.noUnlock">需靠近制作站</span>
            <span v-if="item.healthCost">消耗 {{ item.healthCost }} 生命</span>
            <span v-if="item.sanityCost">消耗 {{ item.sanityCost }} 理智</span>
          </div>

          <div class="crafting-materials">
            <div v-if="item.materials.length" class="crafting-material-list">
              <div v-for="material in item.materials" :key="`${item.id}-${material.id}`" :title="material.englishName">
                <img :src="assetUrl(material.image)" :alt="material.name" loading="lazy" />
                <span>{{ material.name }}</span>
                <strong>{{ material.quantity === 0 ? '需持有' : `×${material.quantity}` }}</strong>
              </div>
            </div>
            <p v-else>无普通材料要求，按对应制作站、活动或交换条件获取。</p>
          </div>
        </article>
      </div>

      <div v-else class="crafting-empty">
        <strong>没有找到对应制作物</strong>
        <p>试试物品名、材料名或英文名，或清除部分筛选。</p>
        <button type="button" @click="clearFilters">清除筛选</button>
      </div>

      <button v-if="visibleItems.length < filteredItems.length" class="crafting-load-more" type="button" @click="showMore">
        再显示 {{ Math.min(72, filteredItems.length - visibleItems.length) }} 项
      </button>
    </section>
  </div>
</template>
