<script setup>
  import { computed, nextTick, onMounted, ref } from 'vue'
  import { assetUrl } from '../lib/assets.js'
  import { questItemImages } from '../lib/questItemImages.js'

  const props = defineProps({
    quests: {
      type: Array,
      required: true,
    },
  })

  const storageKey = 'dst-quest-progress-v1'
  const selectedId = ref(props.quests[0]?.id ?? '')
  const completed = ref({})
  const mobileFiltersOpen = ref(false)
  const mobileFilterButton = ref(null)
  const mobileFilterCloseButton = ref(null)

  const activeQuest = computed(() => props.quests.find((quest) => quest.id === selectedId.value) ?? props.quests[0])

  function checkedIds(quest) {
    return completed.value[quest.id] ?? []
  }

  function creditedSteps(quest) {
    return quest.steps.filter((step) => step.credit !== false)
  }

  function checkedCount(quest) {
    const ids = new Set(checkedIds(quest))
    return creditedSteps(quest).filter((step) => ids.has(step.id)).length
  }

  function requiredComplete(quest) {
    const ids = new Set(checkedIds(quest))
    return (quest.requiredStepIds ?? []).every((id) => ids.has(id))
  }

  function isComplete(quest) {
    return checkedCount(quest) >= quest.targetCount && requiredComplete(quest)
  }

  function progressPercent(quest) {
    return Math.min(100, Math.round((checkedCount(quest) / quest.targetCount) * 100))
  }

  function stepNumber(quest, step) {
    if (step.credit === false) return '准备'
    const index = creditedSteps(quest).findIndex((candidate) => candidate.id === step.id)
    return String(index + 1).padStart(2, '0')
  }

  function itemImage(name) {
    return assetUrl(questItemImages[name])
  }

  function isChecked(questId, stepId) {
    return (completed.value[questId] ?? []).includes(stepId)
  }

  function persist() {
    window.localStorage.setItem(storageKey, JSON.stringify(completed.value))
  }

  function toggleStep(questId, stepId) {
    const ids = new Set(completed.value[questId] ?? [])
    if (ids.has(stepId)) ids.delete(stepId)
    else ids.add(stepId)
    completed.value = { ...completed.value, [questId]: [...ids] }
    persist()
  }

  function resetActive() {
    const next = { ...completed.value }
    delete next[activeQuest.value.id]
    completed.value = next
    persist()
  }

  function selectQuest(id) {
    selectedId.value = id
    scrollToActiveQuest()
  }

  function scrollToActiveQuest() {
    window.requestAnimationFrame(() => {
      document.querySelector('.quest-detail')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  async function selectMobileQuest(id) {
    selectedId.value = id
    await closeMobileFilters()
    scrollToActiveQuest()
  }

  async function openMobileFilters() {
    mobileFiltersOpen.value = true
    await nextTick()
    mobileFilterCloseButton.value?.focus()
  }

  async function closeMobileFilters() {
    mobileFiltersOpen.value = false
    await nextTick()
    mobileFilterButton.value?.focus()
  }

  onMounted(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')
      if (saved && typeof saved === 'object') completed.value = saved
    } catch {
      completed.value = {}
    }
  })
</script>

<template>
  <div class="quest-explorer">
    <div class="mobile-filter-bar quest-mobile-filter-bar">
      <button
        ref="mobileFilterButton"
        class="mobile-filter-trigger"
        type="button"
        aria-controls="mobile-quest-filter-drawer"
        :aria-expanded="mobileFiltersOpen"
        :aria-label="`选择任务：${activeQuest?.title ?? '任务路线'}`"
        @click="openMobileFilters"
      >
        <svg class="mobile-filter-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16l-6.5 7.3v5.2l-3 1.5v-6.7L4 5Z" />
        </svg>
      </button>
    </div>

    <Transition name="mobile-drawer">
      <div
        v-if="mobileFiltersOpen"
        class="mobile-filter-backdrop quest-filter-backdrop"
        @pointerdown.self="closeMobileFilters"
        @keydown.esc="closeMobileFilters"
      >
        <section
          id="mobile-quest-filter-drawer"
          class="mobile-filter-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-quest-filter-title"
        >
          <header>
            <div>
              <small>FILTERS</small>
              <h2 id="mobile-quest-filter-title">筛选任务路线</h2>
            </div>
            <button ref="mobileFilterCloseButton" type="button" aria-label="关闭筛选" @click="closeMobileFilters">×</button>
          </header>

          <div class="mobile-filter-content">
            <fieldset class="mobile-filter-group">
              <legend>任务</legend>
              <div class="mobile-quest-options">
                <button
                  v-for="quest in quests"
                  :key="quest.id"
                  type="button"
                  :aria-pressed="quest.id === activeQuest.id"
                  @click="selectMobileQuest(quest.id)"
                >
                  <span>
                    <small>{{ quest.eyebrow }}</small>
                    <strong>{{ quest.title }}</strong>
                  </span>
                  <em>{{ checkedCount(quest) }}/{{ quest.targetCount }}</em>
                </button>
              </div>
            </fieldset>
          </div>
        </section>
      </div>
    </Transition>

    <div class="quest-layout">
      <aside class="quest-route-list" aria-label="任务路线">
        <button
          v-for="(quest, index) in quests"
          :key="quest.id"
          type="button"
          class="quest-route-card"
          :class="[`arc-${quest.arc}`, { active: quest.id === activeQuest.id }]"
          :aria-pressed="quest.id === activeQuest.id"
          @click="selectQuest(quest.id)"
        >
          <span class="route-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="route-copy">
            <small>{{ quest.eyebrow }}</small>
            <strong>{{ quest.title }}</strong>
            <span>{{ quest.summary }}</span>
          </span>
          <span class="route-progress" aria-hidden="true">
            <i :style="{ width: `${progressPercent(quest)}%` }"></i>
          </span>
          <span class="route-meta">
            <b>{{ checkedCount(quest) }}/{{ quest.targetCount }}</b>
            <em v-if="isComplete(quest)">已达成</em>
            <em v-else>{{ quest.difficulty }}</em>
          </span>
        </button>
      </aside>

      <article v-if="activeQuest" class="quest-detail" :class="`arc-${activeQuest.arc}`">
        <header class="quest-detail-head">
          <div>
            <p>{{ activeQuest.eyebrow }}</p>
            <h2>{{ activeQuest.title }}</h2>
            <span>{{ activeQuest.summary }}</span>
          </div>
          <div class="quest-status">
            <strong>{{ activeQuest.status }}</strong>
            <span>{{ activeQuest.difficulty }} · {{ activeQuest.duration }}</span>
          </div>
        </header>

        <section class="quest-goal" :class="{ complete: isComplete(activeQuest) }">
          <div class="goal-meter" aria-hidden="true">
            <span>{{ checkedCount(activeQuest) }}</span>
            <small>/ {{ activeQuest.targetCount }}</small>
          </div>
          <div>
            <p>{{ isComplete(activeQuest) ? '目标已达成' : '当前目标' }}</p>
            <strong>{{ activeQuest.goal }}</strong>
          </div>
          <button type="button" :disabled="checkedIds(activeQuest).length === 0" @click="resetActive">清空本路线</button>
        </section>

        <section class="quest-prerequisites" aria-labelledby="prerequisite-title">
          <div class="quest-section-heading">
            <p>BEFORE YOU GO</p>
            <h3 id="prerequisite-title">出发前确认</h3>
          </div>
          <ul>
            <li v-for="item in activeQuest.prerequisites" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section class="quest-materials" aria-labelledby="materials-title">
          <div class="quest-section-heading">
            <p>PACKING LIST</p>
            <h3 id="materials-title">物品清单</h3>
          </div>
          <div class="material-groups">
            <div v-for="group in activeQuest.inventoryGroups" :key="group.label" class="material-group">
              <header>
                <strong>{{ group.label }}</strong>
                <span v-if="group.note">{{ group.note }}</span>
              </header>
              <ul>
                <li v-for="item in group.items" :key="`${item.name}-${item.count}`" :title="[item.name, item.note].filter(Boolean).join(' · ')">
                  <div class="quest-material-image">
                    <img :src="itemImage(item.name)" :alt="item.name" loading="lazy" />
                    <b v-if="item.count">×{{ item.count }}</b>
                  </div>
                  <span class="material-copy">
                    <span>{{ item.name }}</span>
                    <small v-if="item.note">{{ item.note }}</small>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="quest-process" aria-labelledby="process-title">
          <div class="quest-section-heading process-heading">
            <div>
              <p>STEP BY STEP</p>
              <h3 id="process-title">任务流程</h3>
            </div>
            <span>点击方框记录进度</span>
          </div>

          <ol class="quest-steps">
            <li v-for="step in activeQuest.steps" :key="step.id" :class="{ checked: isChecked(activeQuest.id, step.id) }">
              <label class="step-check">
                <input type="checkbox" :checked="isChecked(activeQuest.id, step.id)" @change="toggleStep(activeQuest.id, step.id)" />
                <span aria-hidden="true"></span>
                <small>{{ stepNumber(activeQuest, step) }}</small>
              </label>
              <div class="step-body">
                <div class="step-title-row">
                  <h4>{{ step.title }}</h4>
                  <em v-if="step.credit === false">不计任务点</em>
                </div>
                <p>{{ step.summary }}</p>
                <div v-if="step.items?.length" class="step-items">
                  <span v-for="item in step.items" :key="`${item.name}-${item.count}`">
                    <img :src="itemImage(item.name)" :alt="item.name" loading="lazy" />
                    <span class="step-item-copy">
                      <span>
                        <b>{{ item.name }}</b>
                        <i v-if="item.count">× {{ item.count }}</i>
                      </span>
                      <small v-if="item.note">{{ item.note }}</small>
                    </span>
                  </span>
                </div>
                <aside v-if="step.tip" class="step-note tip">提示：{{ step.tip }}</aside>
                <aside v-if="step.warning" class="step-note warning">注意：{{ step.warning }}</aside>
              </div>
            </li>
          </ol>
        </section>

        <footer class="quest-detail-footer">
          <div>
            <p>主要奖励</p>
            <ul>
              <li v-for="reward in activeQuest.rewards" :key="reward">{{ reward }}</li>
            </ul>
          </div>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
  .quest-explorer {
    --quest-accent: #d2a951;
    --season-accent: var(--quest-accent);
    padding: 12px 0 72px;
  }

  .quest-section-heading p,
  .quest-detail-head > div > p,
  .quest-detail-footer p {
    margin: 0 0 9px;
    color: #d1a855;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.2em;
  }

  .quest-layout {
    display: grid;
    grid-template-columns: minmax(260px, 0.33fr) minmax(0, 1fr);
    gap: 14px;
    align-items: start;
  }

  .quest-route-list {
    position: sticky;
    top: 14px;
    display: grid;
    gap: 8px;
  }

  .quest-route-card {
    --route-accent: #bb9760;
    position: relative;
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 10px;
    width: 100%;
    padding: 15px;
    overflow: hidden;
    color: #a8aa9a;
    text-align: left;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 15px;
    background: rgba(22, 26, 19, 0.82);
  }

  .quest-route-card.arc-lunar {
    --route-accent: #86aeba;
  }

  .quest-route-card.arc-shadow {
    --route-accent: #a47591;
  }

  .quest-route-card:hover,
  .quest-route-card.active {
    border-color: color-mix(in srgb, var(--route-accent) 50%, transparent);
    background: linear-gradient(135deg, color-mix(in srgb, var(--route-accent) 8%, transparent), rgba(22, 26, 19, 0.94));
  }

  .quest-route-card.active {
    box-shadow: inset 3px 0 0 var(--route-accent);
  }

  .route-index {
    padding-top: 2px;
    color: var(--route-accent);
    font:
      700 11px/1 Georgia,
      serif;
  }

  .route-copy {
    display: grid;
    min-width: 0;
  }

  .route-copy small {
    color: var(--route-accent);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.12em;
  }

  .route-copy strong {
    margin-top: 5px;
    color: #dfd4b7;
    font-size: 14px;
  }

  .route-copy > span {
    display: -webkit-box;
    margin-top: 6px;
    overflow: hidden;
    color: #7f8376;
    font-size: 10px;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .route-progress {
    grid-column: 1 / -1;
    height: 3px;
    overflow: hidden;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.07);
  }

  .route-progress i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--route-accent);
    transition: width 0.2s ease;
  }

  .route-meta {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    color: #777c6f;
    font-size: 9px;
  }

  .route-meta b {
    color: #b6ad98;
  }

  .route-meta em {
    color: var(--route-accent);
    font-style: normal;
  }

  .quest-detail {
    --detail-accent: #bb9760;
    scroll-margin-top: 14px;
    overflow: hidden;
    border: 1px solid rgba(228, 187, 99, 0.14);
    border-radius: 20px;
    background: rgba(12, 15, 11, 0.58);
  }

  .quest-detail.arc-lunar {
    --detail-accent: #86aeba;
  }

  .quest-detail.arc-shadow {
    --detail-accent: #a47591;
  }

  .quest-detail-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 24px;
    align-items: start;
    padding: clamp(22px, 4vw, 38px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: radial-gradient(circle at 95% 0, color-mix(in srgb, var(--detail-accent) 14%, transparent), transparent 24rem);
  }

  .quest-detail-head > div > p {
    color: var(--detail-accent);
  }

  .quest-detail-head h2 {
    margin: 0;
    color: #eee2c4;
    font-size: clamp(29px, 4vw, 46px);
    line-height: 1.05;
    letter-spacing: -0.05em;
  }

  .quest-detail-head > div > span {
    display: block;
    max-width: 650px;
    margin-top: 13px;
    color: #969a8a;
    font-size: 12px;
    line-height: 1.7;
  }

  .quest-status {
    display: grid;
    min-width: 150px;
    gap: 5px;
    padding: 12px 14px;
    border: 1px solid color-mix(in srgb, var(--detail-accent) 28%, transparent);
    border-radius: 12px;
    background: color-mix(in srgb, var(--detail-accent) 6%, transparent);
  }

  .quest-status strong {
    color: var(--detail-accent);
    font-size: 11px;
  }

  .quest-status span {
    color: #818678;
    font-size: 9px;
  }

  .quest-goal {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 15px;
    align-items: center;
    margin: 18px;
    padding: 14px;
    border: 1px solid color-mix(in srgb, var(--detail-accent) 24%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--detail-accent) 7%, rgba(13, 16, 12, 0.8));
  }

  .quest-goal.complete {
    border-color: rgba(114, 157, 97, 0.5);
    background: rgba(82, 119, 68, 0.12);
  }

  .goal-meter {
    display: flex;
    align-items: baseline;
    min-width: 64px;
    color: var(--detail-accent);
  }

  .goal-meter span {
    font:
      700 29px/1 Georgia,
      serif;
  }

  .goal-meter small {
    color: #777c6f;
    font-size: 10px;
  }

  .quest-goal p {
    margin: 0 0 4px;
    color: #7d8174;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.12em;
  }

  .quest-goal strong {
    color: #d9cfb4;
    font-size: 12px;
    line-height: 1.5;
  }

  .quest-goal button {
    padding: 8px 10px;
    color: #9da092;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.035);
    font-size: 9px;
  }

  .quest-goal button:disabled {
    cursor: default;
    opacity: 0.35;
  }

  .quest-prerequisites,
  .quest-materials,
  .quest-process {
    padding: 26px clamp(18px, 4vw, 38px);
    border-top: 1px solid rgba(255, 255, 255, 0.055);
  }

  .quest-section-heading h3 {
    margin: 0;
    color: #e4d8bb;
    font-size: 23px;
    letter-spacing: -0.03em;
  }

  .quest-prerequisites ul,
  .quest-detail-footer ul {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
  }

  .quest-prerequisites li,
  .quest-detail-footer li {
    padding: 7px 10px;
    color: #aaa996;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.025);
    font-size: 10px;
  }

  .material-groups {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 16px;
  }

  .material-group {
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.065);
    border-radius: 14px;
    background: rgba(29, 34, 25, 0.55);
  }

  .material-group header {
    display: grid;
    gap: 4px;
    margin-bottom: 11px;
  }

  .material-group header strong {
    color: var(--detail-accent);
    font-size: 11px;
  }

  .material-group header span {
    color: #73776b;
    font-size: 9px;
  }

  .material-group ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, 48px);
    justify-content: start;
    gap: 6px 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .material-group li {
    display: grid;
    width: 48px;
    min-width: 0;
    justify-items: start;
    gap: 3px;
  }

  .quest-material-image {
    position: relative;
    display: grid;
    box-sizing: border-box;
    width: 40px;
    height: 40px;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 9px;
    background: rgba(0, 0, 0, 0.2);
  }

  .quest-material-image img {
    width: 38px;
    height: 38px;
    object-fit: contain;
    filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.45));
  }

  .material-copy {
    display: grid;
    width: 48px;
    justify-items: center;
    gap: 1px;
    min-width: 0;
  }

  .material-copy > span {
    width: 48px;
    overflow: hidden;
    color: #bbb39f;
    font-size: 10px;
    line-height: 1.2;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quest-material-image b {
    position: absolute;
    right: -7px;
    bottom: -4px;
    min-width: 18px;
    padding: 2px 3px;
    color: #e2c37e;
    border: 1px solid rgba(224, 183, 94, 0.18);
    border-radius: 6px;
    background: rgba(14, 17, 13, 0.94);
    font-size: 9px;
    font-weight: 900;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
  }

  .material-copy small {
    width: 48px;
    color: #707568;
    font-size: 8px;
    line-height: 1.35;
    text-align: center;
  }

  .process-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
  }

  .process-heading > span {
    color: #707568;
    font-size: 9px;
  }

  .quest-steps {
    display: grid;
    gap: 8px;
    margin: 18px 0 0;
    padding: 0;
    list-style: none;
  }

  .quest-steps > li {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr);
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 13px;
    background: rgba(23, 27, 20, 0.72);
    transition:
      border-color 0.18s ease,
      opacity 0.18s ease;
  }

  .quest-steps > li:hover {
    border-color: color-mix(in srgb, var(--detail-accent) 35%, transparent);
  }

  .quest-steps > li.checked {
    opacity: 0.58;
  }

  .step-check {
    display: grid;
    align-content: start;
    justify-items: center;
    gap: 7px;
    padding: 14px 8px;
    cursor: pointer;
    border-right: 1px solid rgba(255, 255, 255, 0.055);
    background: rgba(0, 0, 0, 0.12);
  }

  .step-check input {
    position: absolute;
    opacity: 0;
  }

  .step-check > span {
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--detail-accent) 50%, #333);
    border-radius: 7px;
    background: rgba(0, 0, 0, 0.25);
  }

  .step-check > span::after {
    content: '✓';
    color: #1b1b15;
    font-size: 13px;
    font-weight: 900;
    opacity: 0;
  }

  .step-check input:focus-visible + span {
    outline: 2px solid #e4bb63;
    outline-offset: 2px;
  }

  .step-check input:checked + span {
    border-color: var(--detail-accent);
    background: var(--detail-accent);
  }

  .step-check input:checked + span::after {
    opacity: 1;
  }

  .step-check small {
    color: #73786b;
    font:
      700 8px/1 Georgia,
      serif;
  }

  .step-body {
    min-width: 0;
    padding: 14px 16px 15px;
  }

  .step-title-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
  }

  .step-title-row h4 {
    margin: 0;
    color: #ded4b9;
    font-size: 15px;
  }

  .step-title-row em {
    padding: 3px 6px;
    color: #8d8f81;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    font-size: 8px;
    font-style: normal;
  }

  .step-body > p {
    margin: 7px 0 0;
    color: #929688;
    font-size: 11px;
    line-height: 1.75;
  }

  .step-items {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 10px;
  }

  .step-items > span {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    max-width: 100%;
    min-height: 40px;
    padding: 4px 8px 4px 5px;
    color: #8e9284;
    border: 1px solid color-mix(in srgb, var(--detail-accent) 16%, transparent);
    border-radius: 7px;
    background: color-mix(in srgb, var(--detail-accent) 4%, transparent);
    font-size: 9px;
  }

  .step-items img {
    width: 30px;
    height: 30px;
    object-fit: contain;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4));
  }

  .step-item-copy {
    display: grid;
    min-width: 0;
    gap: 2px;
  }

  .step-item-copy > span {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px;
  }

  .step-items b {
    color: #bdb5a0;
  }

  .step-items i {
    color: #e0bd70;
    font-style: normal;
  }

  .step-items small {
    color: #73776b;
  }

  .step-note {
    margin-top: 10px;
    padding: 8px 10px;
    color: #9bad9c;
    border-left: 2px solid #668c70;
    border-radius: 0 7px 7px 0;
    background: rgba(67, 104, 76, 0.09);
    font-size: 9px;
    line-height: 1.6;
  }

  .step-note.warning {
    color: #c7a08c;
    border-left-color: #b4674e;
    background: rgba(136, 65, 42, 0.1);
  }

  .quest-detail-footer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 0.55fr);
    gap: 24px;
    padding: 28px clamp(18px, 4vw, 38px) 34px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(0, 0, 0, 0.12);
  }

  .quest-sources {
    display: grid;
    align-content: start;
    gap: 6px;
  }

  .quest-sources a {
    color: #a6aa9a;
    font-size: 9px;
    line-height: 1.5;
    text-decoration: none;
  }

  .quest-sources a:hover {
    color: #e4bb63;
  }

  @media (max-width: 900px) {
    .quest-layout {
      grid-template-columns: 1fr;
    }

    .quest-route-list {
      position: static;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 620px) {
    .quest-explorer {
      padding-top: 4px;
    }

    .mobile-quest-options {
      display: grid;
      gap: 7px;
    }

    .mobile-quest-options button {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 12px;
      color: #a7aa9a;
      border: 0;
      border-radius: 10px;
      background: rgba(5, 7, 5, 0.42);
      text-align: left;
    }

    .mobile-quest-options button[aria-pressed='true'] {
      color: #171914;
      background: var(--quest-accent);
    }

    .mobile-quest-options button > span {
      display: grid;
      min-width: 0;
      gap: 4px;
    }

    .mobile-quest-options small {
      overflow: hidden;
      color: #73786b;
      font-size: 8px;
      letter-spacing: 0.08em;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-quest-options strong {
      font-size: 11px;
      line-height: 1.35;
    }

    .mobile-quest-options em {
      color: #777c6e;
      font-size: 9px;
      font-style: normal;
      font-weight: 900;
    }

    .mobile-quest-options button[aria-pressed='true'] small,
    .mobile-quest-options button[aria-pressed='true'] em {
      color: rgba(23, 25, 20, 0.68);
    }

    .quest-route-list {
      display: none;
    }

    .material-groups,
    .quest-detail-footer {
      grid-template-columns: 1fr;
    }

    .quest-detail-head {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .quest-status {
      min-width: 0;
    }

    .quest-goal {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .quest-goal button {
      grid-column: 1 / -1;
    }

    .quest-steps > li {
      grid-template-columns: 44px minmax(0, 1fr);
    }

    .step-check {
      padding-inline: 6px;
    }

    .step-body {
      padding: 13px 12px 14px;
    }
  }
</style>
