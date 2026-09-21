<script setup>
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { assetUrl } from '../lib/assets.js'

  const props = defineProps({
    data: {
      type: Object,
      required: true,
    },
  })

  const visibleLimit = ref(72)
  const query = ref('')
  const station = ref('')
  const unlock = ref('')

  const stationById = new Map(props.data.stations.map((station) => [station.id, station.name]))
  const categoryById = new Map(props.data.categories.map((category) => [category.id, category.name]))
  const categoryImageById = new Map(props.data.categories.map((category) => [category.id, category.image]))
  const characterById = new Map(props.data.characters.map((character) => [character.id, character.name]))
  const characterImageById = new Map(
    props.data.characters.map((character) => [
      character.id,
      `images/characters/${character.id === 'wx-78' ? 'wx78' : character.id}.png`,
    ]),
  )
  const searchTextById = new Map(props.data.items.map((item) => [item.id, [
    item.id, item.name, item.englishName, item.description,
    stationById.get(item.stationId), characterById.get(item.characterId),
    ...item.categoryIds.map((id) => categoryById.get(id)),
    ...item.materials.flatMap((material) => [material.id, material.name, material.englishName]),
  ].filter(Boolean).join(' ').toLocaleLowerCase('zh-CN')]))
  const filteredItems = computed(() => {
    const needle = query.value.trim().toLocaleLowerCase('zh-CN')
    return props.data.items.filter((item) =>
      (!needle || searchTextById.get(item.id).includes(needle)) &&
      (!station.value || item.stationId === station.value) &&
      (!unlock.value || Boolean(item[unlock.value])))
  })
  const visibleItems = computed(() => filteredItems.value.slice(0, visibleLimit.value))
  watch([query, station, unlock], () => { visibleLimit.value = 72 })

  function clearFilters() {
    query.value = ''; station.value = ''; unlock.value = ''
  }

  onMounted(() => {
    const itemId = new URLSearchParams(window.location.search).get('item')
    const itemIndex = props.data.items.findIndex((item) => item.id === itemId)
    if (itemIndex < 0) return

    visibleLimit.value = Math.max(visibleLimit.value, itemIndex + 1)
    nextTick(() => {
      requestAnimationFrame(() => {
        document.getElementById(`craft-${itemId}`)?.scrollIntoView({ block: 'center' })
      })
    })
  })

  function showMore() {
    visibleLimit.value += 72
  }
</script>

<template>
  <div class="crafting-explorer">
    <div class="crafting-category-search">
      <label for="crafting-filter-query">筛选当前制作列表</label>
      <div class="crafting-category-search-controls">
        <input id="crafting-filter-query" v-model="query" type="search" placeholder="物品、材料、制作站或英文名…" />
        <button v-if="query || station || unlock" type="button" @click="clearFilters">清除筛选</button>
      </div>
      <div class="crafting-filter-options">
        <label>制作站
          <select v-model="station">
            <option value="">全部制作站</option>
            <option v-for="entry in data.stations" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
          </select>
        </label>
        <label>解锁条件
          <select v-model="unlock">
            <option value="">全部条件</option>
            <option value="blueprint">蓝图解锁</option>
            <option value="builderSkill">技能树解锁</option>
            <option value="noUnlock">需靠近制作站</option>
          </select>
        </label>
      </div>
      <p aria-live="polite">找到 <strong>{{ filteredItems.length }}</strong> / {{ data.items.length }} 项制作</p>
    </div>
    <section class="crafting-results" aria-label="制作物列表">
      <div v-if="visibleItems.length" class="crafting-grid">
        <article v-for="item in visibleItems" :id="`craft-${item.id}`" :key="item.id" class="crafting-card">
          <header class="has-item-badges">
            <div class="crafting-item-image">
              <img :src="assetUrl(item.image)" :alt="item.name" loading="lazy" />
              <span v-if="item.output > 1">×{{ item.output }}</span>
            </div>
            <div class="crafting-item-copy">
              <p>{{ stationById.get(item.stationId) }}</p>
              <h2>{{ item.name }}</h2>
              <div class="crafting-tags">
                <span v-if="item.characterId" class="character"> {{ characterById.get(item.characterId) }}专属 </span>
                <span v-if="item.blueprint">蓝图解锁</span>
                <span v-if="item.builderSkill">技能树解锁</span>
                <span v-if="item.noUnlock">需靠近制作站</span>
                <span v-if="item.healthCost">消耗 {{ item.healthCost }} 生命</span>
                <span v-if="item.sanityCost">消耗 {{ item.sanityCost }} 理智</span>
              </div>
            </div>
            <div class="crafting-item-badges">
              <div class="crafting-item-category-icons" aria-label="所属分类">
                <span
                  v-for="id in item.categoryIds"
                  :key="id"
                  :title="categoryById.get(id)"
                  role="img"
                  :aria-label="categoryById.get(id)"
                >
                  <img :src="assetUrl(categoryImageById.get(id))" alt="" loading="lazy" />
                </span>
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
            </div>
          </header>

          <p class="crafting-description">{{ item.description }}</p>

          <div class="crafting-materials">
            <div v-if="item.materials.length" class="crafting-material-list">
              <div v-for="material in item.materials" :key="`${item.id}-${material.id}`" :title="material.englishName">
                <div class="crafting-material-image">
                  <img :src="assetUrl(material.image)" :alt="material.name" loading="lazy" />
                  <sub>{{ material.quantity === 0 ? '需持有' : `×${material.quantity}` }}</sub>
                </div>
                <span>{{ material.name }}</span>
              </div>
            </div>
            <p v-else>无普通材料要求，按对应制作站、活动或交换条件获取。</p>
          </div>
        </article>
      </div>

      <div v-else class="crafting-empty">
        <strong>没有符合条件的制作物</strong>
        <p>试试其他关键词，或清除筛选。</p>
      </div>

      <button v-if="visibleItems.length < filteredItems.length" class="crafting-load-more" type="button" @click="showMore">
        再显示 {{ Math.min(72, filteredItems.length - visibleItems.length) }} 项
      </button>
    </section>
  </div>
</template>
