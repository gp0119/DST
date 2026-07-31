<script setup>
  import { computed, nextTick, ref } from 'vue'
  import { assetUrl } from '../lib/assets.js'
  import { buildExampleFormations, formatReducedRatio } from '../lib/farmingLayouts.js'

  const props = defineProps({
    seasons: {
      type: Array,
      required: true,
    },
    crops: {
      type: Array,
      required: true,
    },
    examples: {
      type: Array,
      required: true,
    },
  })

  const activeSeasonId = ref(props.seasons[0]?.id ?? 'spring')
  const cropFilter = ref('all')
  const plotCounts = [1, 2, 4]
  const activePlotCount = ref(1)
  const activeSeason = computed(() => props.seasons.find((season) => season.id === activeSeasonId.value) ?? props.seasons[0])
  const cropsById = computed(() => Object.fromEntries(props.crops.map((crop) => [crop.id, crop])))
  const seasonCrops = computed(() => activeSeason.value.cropIds.map((id) => cropsById.value[id]))
  const seasonExamples = computed(() => props.examples.filter((example) => example.seasonIds.includes(activeSeason.value.id)))
  const filteredExamples = computed(() =>
    seasonExamples.value
      .filter((example) => cropFilter.value === 'all' || example.items.some((item) => item.cropId === cropFilter.value || item.alternatives?.includes(cropFilter.value)))
  )
  function crop(id) {
    return cropsById.value[id]
  }

  async function selectSeason(id) {
    activeSeasonId.value = id
    cropFilter.value = 'all'
    await nextTick()
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }

  function cropFilterCount(cropId) {
    return seasonExamples.value.filter((example) => example.items.some((item) => item.cropId === cropId || item.alternatives?.includes(cropId))).length
  }

  function displayedCropId(example, cropId) {
    if (cropFilter.value === 'all' || cropFilter.value === cropId) return cropId

    const item = example.items.find((entry) => entry.cropId === cropId)
    return item?.alternatives?.includes(cropFilter.value) ? cropFilter.value : cropId
  }

  function itemName(item) {
    return [item.cropId, ...(item.alternatives ?? [])].map((id) => crop(id).name).join('/')
  }

  function itemCropIds(item) {
    return [item.cropId, ...(item.alternatives ?? [])]
  }

</script>

<template>
  <div class="farming-explorer" :data-season="activeSeason.id">
    <div class="season-tabs" aria-label="按季节查看巨大作物配比">
      <button
        v-for="season in seasons"
        :id="`season-tab-${season.id}`"
        :key="season.id"
        class="season-tab"
        type="button"
        :aria-pressed="activeSeasonId === season.id"
        :aria-controls="`season-panel-${season.id}`"
        @click="selectSeason(season.id)"
      >
        <span>{{ season.name }}</span>
        <small>{{ season.cropIds.length }} 种当季作物</small>
      </button>
    </div>

    <section :id="`season-panel-${activeSeason.id}`" class="season-panel" :aria-labelledby="`season-tab-${activeSeason.id}`">
      <div class="season-crop-strip" aria-label="按本季作物筛选">
        <button class="season-crop season-crop-all" type="button" :aria-pressed="cropFilter === 'all'" @click="cropFilter = 'all'">全部</button>
        <button
          v-for="item in seasonCrops"
          :key="item.id"
          class="season-crop"
          type="button"
          :aria-label="`筛选${item.name}`"
          :aria-pressed="cropFilter === item.id"
          :disabled="cropFilterCount(item.id) === 0"
          :title="`${item.name} · ${cropFilterCount(item.id)} 组`"
          @click="cropFilter = item.id"
        >
          <img :src="assetUrl(item.image)" :alt="item.name" />
          <span>{{ item.name }}</span>
        </button>
      </div>

      <section class="pdf-examples" aria-labelledby="pdf-examples-title">
        <header class="pdf-examples-heading">
          <div class="plot-count-switch" aria-label="选择示例农田数量">
            <button
              v-for="count in plotCounts"
              :key="count"
              type="button"
              :aria-pressed="activePlotCount === count"
              @click="activePlotCount = count"
            >
              {{ count }} 块地
            </button>
          </div>
          <span>{{ filteredExamples.length }} / {{ seasonExamples.length }} 组</span>
        </header>

        <div v-if="filteredExamples.length" class="pdf-example-grid">
          <article v-for="example in filteredExamples" :key="example.id" class="pdf-example-card">
            <header>
              <div>
                <h4>
                  <template v-for="(item, itemIndex) in example.items" :key="item.cropId">
                    <span v-if="itemIndex" class="example-title-plus" aria-hidden="true"> + </span>
                    <span class="example-title-item">
                      <span class="example-title-images" aria-hidden="true">
                        <img v-for="cropId in itemCropIds(item)" :key="cropId" :src="assetUrl(crop(cropId).image)" alt="" />
                      </span>
                      <span>{{ itemName(item) }}</span>
                    </span>
                  </template>
                </h4>
              </div>
              <strong>{{ formatReducedRatio(example.items) }}</strong>
            </header>

            <div
              class="pdf-example-plots"
              :class="{
                'single-field': activePlotCount === 1,
                'two-fields': activePlotCount === 2,
                'four-fields': activePlotCount === 4,
              }"
            >
              <div v-for="formation in buildExampleFormations(example, activePlotCount)" :key="formation.id" class="plot-unit pdf-example-plot" :class="formation.className">
                <span class="plot-number">▦ {{ formation.label }}</span>
                <div class="plot-grid" :class="[formation.className, { 'vertical-mirror': formation.verticalMirror }]" :style="{ '--field-columns': formation.columns }">
                  <span v-for="(cropId, slotIndex) in formation.slots" :key="slotIndex" class="plot-cell" :class="{ empty: !cropId }">
                    <img v-if="cropId" :src="assetUrl(crop(displayedCropId(example, cropId)).image)" :alt="crop(displayedCropId(example, cropId)).name" loading="lazy" />
                    <i v-else aria-hidden="true"></i>
                  </span>
                </div>
              </div>
            </div>

            <div class="pdf-example-items">
              <span v-for="item in example.items" :key="item.cropId">
                <img :src="assetUrl(crop(displayedCropId(example, item.cropId)).image)" alt="" />
                {{ itemName(item) }}
                <strong>{{ item.count }}</strong>
              </span>
            </div>

            <footer>
              <span>{{ activePlotCount }} 块地</span>
              <span>每块 {{ example.gridSize }} 格</span>
            </footer>
          </article>
        </div>

        <p v-else class="pdf-example-empty">当前筛选没有示例，请选择其他作物。</p>
      </section>
    </section>
  </div>
</template>
