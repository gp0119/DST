<script setup>
import { computed, ref } from "vue";
import { assetUrl } from "../lib/assets.js";
import { generateRatioGroups } from "../lib/farmingCatalog.js";

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
});

const activeSeasonId = ref(props.seasons[0]?.id ?? "spring");
const plotCountFilter = ref("all");
const gridSizeFilter = ref("all");
const activeSeason = computed(
  () =>
    props.seasons.find((season) => season.id === activeSeasonId.value) ??
    props.seasons[0],
);
const cropsById = computed(() =>
  Object.fromEntries(props.crops.map((crop) => [crop.id, crop])),
);
const seasonCrops = computed(() =>
  activeSeason.value.cropIds.map((id) => cropsById.value[id]),
);
const completeRatioGroups = computed(() =>
  generateRatioGroups(activeSeason.value, props.crops, props.ratioCatalog),
);
const completeRatioCount = computed(() =>
  completeRatioGroups.value.reduce(
    (count, group) => count + group.entries.length,
    0,
  ),
);
const seasonExamples = computed(() =>
  props.examples.filter((example) =>
    example.seasonIds.includes(activeSeason.value.id),
  ),
);
const filteredExamples = computed(() =>
  seasonExamples.value.filter(
    (example) =>
      (plotCountFilter.value === "all" ||
        example.plotCount === plotCountFilter.value) &&
      (gridSizeFilter.value === "all" ||
        example.gridSize === gridSizeFilter.value),
  ),
);
const layoutTemplates = {
  "9|4,4": [0, 1, 0, 1, null, 1, 0, 1, 0],
  "10|5,5": [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  "9|3,3,3": [0, 0, 0, 1, 1, 1, 2, 2, 2],
  "9|4,2,2": [0, 1, 0, 2, null, 2, 0, 1, 0],
  "9|6,3": [0, 0, 1, 0, 0, 1, 0, 0, 1],
  "9|5,3,1": [0, 1, 0, 1, 0, 1, 0, 2, 0],
  "9|2,2,2,1": [0, 1, 2, 0, null, 1, 2, null, 3],
  "9|2,2,2,2": [0, 1, 2, 3, null, 3, 2, 1, 0],
  "9|3,2,2,2": [0, 1, 2, 3, 0, 1, 2, 3, 0],
  "9|4,2,2,1": [0, 1, 0, 2, 3, 2, 0, 1, 0],
  "10|4,4,2": [0, 0, 1, 1, 2, 0, 0, 1, 1, 2],
  "9|4,3,1,1": [0, 1, 0, 2, 1, 3, 0, 1, 0],
};

function crop(id) {
  return cropsById.value[id];
}

function selectSeason(id) {
  activeSeasonId.value = id;
  plotCountFilter.value = "all";
  gridSizeFilter.value = "all";
}

function filterCount(type, value) {
  return seasonExamples.value.filter((example) => example[type] === value).length;
}

function itemName(item) {
  return [item.cropId, ...(item.alternatives ?? [])]
    .map((id) => crop(id).name)
    .join("/");
}

function exampleTitle(example) {
  return example.items.map(itemName).join(" + ");
}

function exampleLayout(example, plotIndex) {
  const items = [...example.items].sort(
    (left, right) =>
      right.count - left.count || left.cropId.localeCompare(right.cropId),
  );
  const key = `${example.gridSize}|${items.map((item) => item.count).join(",")}`;
  const template = layoutTemplates[key];
  const positions = plotIndex % 2 ? [...template].reverse() : template;

  return positions.map((itemIndex) =>
    itemIndex === null ? null : items[itemIndex].cropId,
  );
}

function combinationLabel(entry) {
  return entry.items
    .map((item) => `${crop(item.cropId).name}${item.count > 1 ? ` ${item.count} 份` : ""}`)
    .join("加");
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

    <section
      :id="`season-panel-${activeSeason.id}`"
      class="season-panel"
      :aria-labelledby="`season-tab-${activeSeason.id}`"
    >
      <header class="season-heading">
        <div>
          <p class="season-eyebrow">{{ activeSeason.eyebrow }}</p>
          <h2>{{ activeSeason.name }}巨大化配比</h2>
          <p>{{ activeSeason.description }}</p>
        </div>
        <span class="season-count">{{ activeSeason.cropIds.length }}</span>
      </header>

      <div class="season-crop-strip" aria-label="本季当季作物">
        <div
          v-for="item in seasonCrops"
          :key="item.id"
          class="season-crop"
        >
          <img :src="assetUrl(item.image)" :alt="item.name" />
          <span>{{ item.name }}</span>
        </div>
      </div>

      <section class="pdf-examples" aria-labelledby="pdf-examples-title">
        <header class="pdf-examples-heading">
          <div>
            <p>PDF 种植示例</p>
            <h3 id="pdf-examples-title">{{ activeSeason.name }}配比示例图</h3>
          </div>
          <span>{{ filteredExamples.length }} / {{ seasonExamples.length }} 组</span>
        </header>

        <div class="example-filters">
          <div class="example-filter-group" aria-label="按农田数量筛选">
            <strong>农田数量</strong>
            <button
              type="button"
              :aria-pressed="plotCountFilter === 'all'"
              @click="plotCountFilter = 'all'"
            >
              全部
            </button>
            <button
              v-for="count in [1, 2, 4]"
              :key="count"
              type="button"
              :aria-pressed="plotCountFilter === count"
              :disabled="filterCount('plotCount', count) === 0"
              @click="plotCountFilter = count"
            >
              {{ count }} 块地
              <small>{{ filterCount("plotCount", count) }}</small>
            </button>
          </div>

          <div class="example-filter-group" aria-label="按单田格数筛选">
            <strong>单田规格</strong>
            <button
              type="button"
              :aria-pressed="gridSizeFilter === 'all'"
              @click="gridSizeFilter = 'all'"
            >
              全部
            </button>
            <button
              v-for="size in [9, 10]"
              :key="size"
              type="button"
              :aria-pressed="gridSizeFilter === size"
              :disabled="filterCount('gridSize', size) === 0"
              @click="gridSizeFilter = size"
            >
              {{ size }} 格
              <small>{{ filterCount("gridSize", size) }}</small>
            </button>
          </div>
        </div>

        <div v-if="filteredExamples.length" class="pdf-example-grid">
          <article
            v-for="example in filteredExamples"
            :key="example.id"
            class="pdf-example-card"
          >
            <header>
              <div>
                <span>PDF 第 {{ example.sourcePage }} 页</span>
                <h4>{{ exampleTitle(example) }}</h4>
              </div>
              <strong>{{ example.ratio }}</strong>
            </header>

            <div
              class="pdf-example-plots"
              :class="`plot-count-${example.plotCount}`"
            >
              <div
                v-for="plotIndex in example.plotCount"
                :key="plotIndex"
                class="plot-unit pdf-example-plot"
              >
                <span class="plot-number">▦ 田 {{ plotIndex }}</span>
                <div
                  class="plot-grid"
                  :class="{ 'ten-grid': example.gridSize === 10 }"
                >
                  <span
                    v-for="(cropId, slotIndex) in exampleLayout(example, plotIndex - 1)"
                    :key="slotIndex"
                    class="plot-cell"
                    :class="{ empty: !cropId }"
                  >
                    <img
                      v-if="cropId"
                      :src="assetUrl(crop(cropId).image)"
                      :alt="crop(cropId).name"
                      loading="lazy"
                    />
                    <i v-else aria-hidden="true"></i>
                  </span>
                </div>
              </div>
            </div>

            <div class="pdf-example-items">
              <span v-for="item in example.items" :key="item.cropId">
                <img :src="assetUrl(crop(item.cropId).image)" alt="" />
                {{ itemName(item) }}
                <strong>{{ item.count }}</strong>
              </span>
            </div>

            <footer>
              <span>{{ example.plotCount }} 块地</span>
              <span>每块 {{ example.gridSize }} 格</span>
              <span>养分闭环</span>
            </footer>
          </article>
        </div>

        <p v-else class="pdf-example-empty">
          当前筛选没有示例，请切换农田数量或单田规格。
        </p>
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
          <article
            v-for="group in completeRatioGroups"
            :key="group.ratio"
            class="ratio-group"
          >
            <header>
              <strong>{{ group.ratio }}</strong>
              <span>{{ group.entries.length }} 组</span>
            </header>
            <ul>
              <li
                v-for="entry in group.entries"
                :key="entry.id"
                :aria-label="combinationLabel(entry)"
              >
                <template
                  v-for="(item, itemIndex) in entry.items"
                  :key="item.cropId"
                >
                  <span v-if="itemIndex" class="ratio-plus" aria-hidden="true">
                    +
                  </span>
                  <span class="ratio-crop">
                    <span class="ratio-crop-images" aria-hidden="true">
                      <img
                        v-for="copy in item.count"
                        :key="copy"
                        :src="assetUrl(crop(item.cropId).image)"
                        alt=""
                        loading="lazy"
                      />
                    </span>
                    <span>{{ crop(item.cropId).name }}</span>
                  </span>
                </template>
              </li>
            </ul>
          </article>
        </div>

        <p class="ratio-catalog-note">
          {{ ratioCatalog.note }} 完整配比只表示养分比例，实际种植时仍需按相同比例扩种，让每种作物附近至少有 4 株。
        </p>
      </section>
    </section>
  </div>
</template>
