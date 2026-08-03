<script setup>
import { computed, onMounted, ref, watch } from "vue";

const props = defineProps({
  quests: {
    type: Array,
    required: true,
  },
  updated: {
    type: String,
    required: true,
  },
});

const storageKey = "dst-quest-progress-v1";
const selectedArc = ref("all");
const selectedId = ref(props.quests[0]?.id ?? "");
const completed = ref({});

const arcOptions = [
  { id: "all", label: "全部任务" },
  { id: "side", label: "支线" },
  { id: "lunar", label: "月亮线" },
  { id: "shadow", label: "暗影线" },
];

const visibleQuests = computed(() =>
  selectedArc.value === "all"
    ? props.quests
    : props.quests.filter((quest) => quest.arc === selectedArc.value),
);

const activeQuest = computed(
  () =>
    props.quests.find((quest) => quest.id === selectedId.value) ??
    visibleQuests.value[0] ??
    props.quests[0],
);

const formatUpdated = computed(() => props.updated.replaceAll("-", "."));

function checkedIds(quest) {
  return completed.value[quest.id] ?? [];
}

function creditedSteps(quest) {
  return quest.steps.filter((step) => step.credit !== false);
}

function checkedCount(quest) {
  const ids = new Set(checkedIds(quest));
  return creditedSteps(quest).filter((step) => ids.has(step.id)).length;
}

function requiredComplete(quest) {
  const ids = new Set(checkedIds(quest));
  return (quest.requiredStepIds ?? []).every((id) => ids.has(id));
}

function isComplete(quest) {
  return checkedCount(quest) >= quest.targetCount && requiredComplete(quest);
}

function progressPercent(quest) {
  return Math.min(100, Math.round((checkedCount(quest) / quest.targetCount) * 100));
}

function stepNumber(quest, step) {
  if (step.credit === false) return "准备";
  const index = creditedSteps(quest).findIndex((candidate) => candidate.id === step.id);
  return String(index + 1).padStart(2, "0");
}

function isChecked(questId, stepId) {
  return (completed.value[questId] ?? []).includes(stepId);
}

function persist() {
  window.localStorage.setItem(storageKey, JSON.stringify(completed.value));
}

function toggleStep(questId, stepId) {
  const ids = new Set(completed.value[questId] ?? []);
  if (ids.has(stepId)) ids.delete(stepId);
  else ids.add(stepId);
  completed.value = { ...completed.value, [questId]: [...ids] };
  persist();
}

function resetActive() {
  const next = { ...completed.value };
  delete next[activeQuest.value.id];
  completed.value = next;
  persist();
}

function selectQuest(id) {
  selectedId.value = id;
  window.requestAnimationFrame(() => {
    document.querySelector(".quest-detail")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

watch(visibleQuests, (quests) => {
  if (!quests.some((quest) => quest.id === selectedId.value)) {
    selectedId.value = quests[0]?.id ?? "";
  }
});

onMounted(() => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
    if (saved && typeof saved === "object") completed.value = saved;
  } catch {
    completed.value = {};
  }
});
</script>

<template>
  <div class="quest-explorer">
    <header class="quest-hero">
      <div class="quest-hero-copy">
        <p class="quest-kicker">SURVIVOR'S FIELD NOTES</p>
        <h1>任务路线指南</h1>
        <p>
          从奶奶岛到两条终局主线，逐步查看前置条件、需要携带的物品和完整流程。
          勾选进度只保存在当前浏览器。
        </p>
      </div>
      <div class="quest-hero-stats" aria-label="页面统计">
        <span><strong>{{ quests.length }}</strong> 条路线</span>
        <span><strong>2</strong> 条阵营线</span>
        <small>资料更新 {{ formatUpdated }}</small>
      </div>
    </header>

    <div class="quest-filter" aria-label="任务类型筛选">
      <button
        v-for="option in arcOptions"
        :key="option.id"
        type="button"
        :aria-pressed="selectedArc === option.id"
        @click="selectedArc = option.id"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="quest-layout">
      <aside class="quest-route-list" aria-label="任务路线">
        <button
          v-for="(quest, index) in visibleQuests"
          :key="quest.id"
          type="button"
          class="quest-route-card"
          :class="[`arc-${quest.arc}`, { active: quest.id === activeQuest.id }]"
          :aria-pressed="quest.id === activeQuest.id"
          @click="selectQuest(quest.id)"
        >
          <span class="route-index">{{ String(index + 1).padStart(2, "0") }}</span>
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
            <p>{{ isComplete(activeQuest) ? "目标已达成" : "当前目标" }}</p>
            <strong>{{ activeQuest.goal }}</strong>
          </div>
          <button
            type="button"
            :disabled="checkedIds(activeQuest).length === 0"
            @click="resetActive"
          >
            清空本路线
          </button>
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
            <div
              v-for="group in activeQuest.inventoryGroups"
              :key="group.label"
              class="material-group"
            >
              <header>
                <strong>{{ group.label }}</strong>
                <span v-if="group.note">{{ group.note }}</span>
              </header>
              <ul>
                <li v-for="item in group.items" :key="`${item.name}-${item.count}`">
                  <span>{{ item.name }}</span>
                  <b v-if="item.count">× {{ item.count }}</b>
                  <small v-if="item.note">{{ item.note }}</small>
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
            <li
              v-for="step in activeQuest.steps"
              :key="step.id"
              :class="{ checked: isChecked(activeQuest.id, step.id) }"
            >
              <label class="step-check">
                <input
                  type="checkbox"
                  :checked="isChecked(activeQuest.id, step.id)"
                  @change="toggleStep(activeQuest.id, step.id)"
                />
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
                    <b>{{ item.name }}</b>
                    <i v-if="item.count">× {{ item.count }}</i>
                    <small v-if="item.note">{{ item.note }}</small>
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
          <div class="quest-sources">
            <p>资料来源</p>
            <a
              v-for="source in activeQuest.sources"
              :key="source.url"
              :href="source.url"
              target="_blank"
              rel="noreferrer"
            >
              {{ source.label }} ↗
            </a>
          </div>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.quest-explorer {
  --quest-accent: #d2a951;
  padding: 12px 0 72px;
}

.quest-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 32px;
  align-items: end;
  padding: clamp(28px, 5vw, 58px);
  overflow: hidden;
  border: 1px solid rgba(228, 187, 99, 0.2);
  border-radius: 24px;
  background:
    radial-gradient(circle at 87% 8%, rgba(213, 171, 83, 0.2), transparent 20rem),
    linear-gradient(135deg, rgba(37, 44, 31, 0.95), rgba(13, 16, 12, 0.96));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.24);
}

.quest-kicker,
.quest-section-heading p,
.quest-detail-head > div > p,
.quest-detail-footer p {
  margin: 0 0 9px;
  color: #d1a855;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.2em;
}

.quest-hero h1 {
  margin: 0;
  color: #f1e5c7;
  font-size: clamp(38px, 7vw, 78px);
  line-height: 0.96;
  letter-spacing: -0.065em;
}

.quest-hero-copy > p:last-child {
  max-width: 680px;
  margin: 22px 0 0;
  color: #9ca08f;
  font-size: 14px;
  line-height: 1.8;
}

.quest-hero-stats {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 10px;
}

.quest-hero-stats span {
  display: grid;
  min-width: 112px;
  padding: 14px;
  color: #9ca08f;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 13px;
  background: rgba(0, 0, 0, 0.17);
  font-size: 10px;
}

.quest-hero-stats strong {
  color: #eadbb9;
  font: 700 30px/1 Georgia, serif;
}

.quest-hero-stats small {
  grid-column: 1 / -1;
  color: #727768;
  font-size: 9px;
  text-align: right;
}

.quest-filter {
  display: flex;
  gap: 6px;
  margin: 14px 0;
  padding: 7px;
  overflow-x: auto;
  border: 1px solid rgba(228, 187, 99, 0.13);
  border-radius: 14px;
  background: rgba(13, 16, 12, 0.72);
  scrollbar-width: none;
}

.quest-filter button {
  flex: 0 0 auto;
  padding: 9px 14px;
  color: #9ca08f;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  font-size: 11px;
  font-weight: 800;
}

.quest-filter button:hover {
  color: #e9ddbf;
  background: rgba(255, 255, 255, 0.04);
}

.quest-filter button[aria-pressed="true"] {
  color: #211b13;
  border-color: #dfb65f;
  background: #d3aa59;
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
  font: 700 11px/1 Georgia, serif;
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
  font: 700 29px/1 Georgia, serif;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.material-group li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 6px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.16);
}

.material-group li span {
  min-width: 0;
  color: #bbb39f;
  font-size: 10px;
}

.material-group li b {
  color: #e2c37e;
  font-size: 10px;
}

.material-group li small {
  grid-column: 1 / -1;
  color: #707568;
  font-size: 8px;
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
  transition: border-color 0.18s ease, opacity 0.18s ease;
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
  content: "✓";
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
  font: 700 8px/1 Georgia, serif;
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
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
  padding: 5px 8px;
  color: #8e9284;
  border: 1px solid color-mix(in srgb, var(--detail-accent) 16%, transparent);
  border-radius: 7px;
  background: color-mix(in srgb, var(--detail-accent) 4%, transparent);
  font-size: 9px;
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
  .quest-hero {
    grid-template-columns: 1fr;
  }

  .quest-hero-stats {
    justify-content: start;
  }

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

  .quest-hero {
    gap: 24px;
    padding: 24px 20px;
    border-radius: 18px;
  }

  .quest-hero h1 {
    font-size: 44px;
  }

  .quest-route-list,
  .material-groups,
  .material-group ul,
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
