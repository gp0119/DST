<script setup>
  import { computed, nextTick, ref } from 'vue'
  import { assetUrl } from '../lib/assets.js'
  import { generateRatioGroups } from '../lib/farmingCatalog.js'
  import { buildExampleFormations } from '../lib/farmingLayouts.js'

  const props = defineProps({
    seasons: {
      type: Array,
      required: true,
    },
    crops: {
      type: Array,
      required: true,
    },
    ratioCatalog: {
      type: Object,
      required: true,
    },
    examples: {
      type: Array,
      required: true,
    },
  })

  const activeSeasonId = ref(props.seasons[0]?.id ?? 'spring')
  const cropFilter = ref('all')
  const activeSeason = computed(() => props.seasons.find((season) => season.id === activeSeasonId.value) ?? props.seasons[0])
  const cropsById = computed(() => Object.fromEntries(props.crops.map((crop) => [crop.id, crop])))
  const seasonCrops = computed(() => activeSeason.value.cropIds.map((id) => cropsById.value[id]))
  const completeRatioGroups = computed(() => generateRatioGroups(activeSeason.value, props.crops, props.ratioCatalog))
  const completeRatioCount = computed(() => completeRatioGroups.value.reduce((count, group) => count + group.entries.length, 0))
  const seasonExamples = computed(() => props.examples.filter((example) => example.seasonIds.includes(activeSeason.value.id)))
  const filteredExamples = computed(() =>
    seasonExamples.value
      .filter((example) => cropFilter.value === 'all' || example.items.some((item) => item.cropId === cropFilter.value || item.alternatives?.includes(cropFilter.value)))
      .sort((left, right) => left.plotCount - right.plotCount)
  )
  function crop(id) {
    return cropsById.value[id]
  }

  function startsPlotGroup(index) {
    return index === 0 || filteredExamples.value[index - 1].plotCount !== filteredExamples.value[index].plotCount
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

  function combinationLabel(entry) {
    return entry.items.map((item) => `${crop(item.cropId).name}${item.count > 1 ? ` ${item.count} 份` : ''}`).join('加')
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
          <span>{{ filteredExamples.length }} / {{ seasonExamples.length }} 组</span>
        </header>

        <div v-if="filteredExamples.length" class="pdf-example-grid">
          <article v-for="(example, exampleIndex) in filteredExamples" :key="example.id" class="pdf-example-card" :class="{ 'plot-group-start': startsPlotGroup(exampleIndex) }">
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
              <strong>{{ example.ratio }}</strong>
            </header>

            <div
              class="pdf-example-plots"
              :class="{
                'combined-fields': example.gridSize === 9,
                'single-ten-field': example.gridSize === 10 && example.plotCount === 1,
                'multiple-ten-fields': example.gridSize === 10 && example.plotCount > 1,
              }"
            >
              <div v-for="formation in buildExampleFormations(example)" :key="formation.id" class="plot-unit pdf-example-plot" :class="formation.className">
                <span class="plot-number">▦ {{ formation.label }}</span>
                <div class="plot-grid" :class="formation.className" :style="{ '--field-columns': formation.columns }">
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
              <span>{{ example.plotCount }} 块地</span>
              <span>每块 {{ example.gridSize }} 格</span>
            </footer>
          </article>
        </div>

        <p v-else class="pdf-example-empty">当前筛选没有示例，请切换农田数量或单田规格。</p>
      </section>

      <section class="ratio-catalog" aria-labelledby="complete-ratios-title">
        <header class="ratio-catalog-heading">
          <div>
            <p>COMPLETE RATIOS</p>
            <h3 id="complete-ratios-title">{{ activeSeason.name }}完整配比</h3>
          </div>
          <span>{{ completeRatioCount }} 组</span>
        </header>

        <div class="ratio-group-grid">
          <article v-for="group in completeRatioGroups" :key="group.ratio" class="ratio-group">
            <header>
              <strong>{{ group.ratio }}</strong>
              <span>{{ group.entries.length }} 组</span>
            </header>
            <ul>
              <li v-for="entry in group.entries" :key="entry.id" :aria-label="combinationLabel(entry)">
                <template v-for="(item, itemIndex) in entry.items" :key="item.cropId">
                  <span v-if="itemIndex" class="ratio-plus" aria-hidden="true"> + </span>
                  <span class="ratio-crop">
                    <span class="ratio-crop-images" aria-hidden="true">
                      <img v-for="copy in item.count" :key="copy" :src="assetUrl(crop(item.cropId).image)" alt="" loading="lazy" />
                    </span>
                    <span>{{ crop(item.cropId).name }}</span>
                  </span>
                </template>
              </li>
            </ul>
          </article>
        </div>

      </section>
    </section>
  </div>
</template>
