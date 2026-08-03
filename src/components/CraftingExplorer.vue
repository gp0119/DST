<script setup>
  import { computed, nextTick, onMounted, ref } from 'vue'
  import { assetUrl } from '../lib/assets.js'

  const props = defineProps({
    data: {
      type: Object,
      required: true,
    },
  })

  const visibleLimit = ref(72)

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
  const visibleItems = computed(() => props.data.items.slice(0, visibleLimit.value))

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
        <strong>暂无制作物</strong>
      </div>

      <button v-if="visibleItems.length < data.items.length" class="crafting-load-more" type="button" @click="showMore">
        再显示 {{ Math.min(72, data.items.length - visibleItems.length) }} 项
      </button>
    </section>
  </div>
</template>
