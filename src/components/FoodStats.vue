<script setup>
import { computed } from "vue";
import { assetUrl } from "../lib/assets.js";

const props = defineProps({
  health: {
    type: [String, Number],
    required: true,
  },
  hunger: {
    type: [String, Number],
    required: true,
  },
  sanity: {
    type: [String, Number],
    required: true,
  },
});

const statDefinitions = [
  { key: "health", label: "生命", icon: "images/ui/health.png" },
  { key: "hunger", label: "饱食", icon: "images/ui/hunger.png" },
  { key: "sanity", label: "精神", icon: "images/ui/sanity.png" },
];

function displayStat(value) {
  const text = String(value);
  if (text === "0" || text.startsWith("-") || text === "N/A") return text;
  return `+${text}`;
}

function presentStat(value) {
  const text = String(value);
  const added = text.match(/^(.+?)\s+\+\s+([^/]+)(?:\/(.+))?$/);

  if (added) {
    return {
      main: displayStat(added[1]),
      detail: `另 ${displayStat(added[2])}`,
      duration: added[3] ? `${added[3]}内` : "",
    };
  }

  const slash = text.indexOf("/");
  if (slash > 0) {
    return {
      main: displayStat(text.slice(0, slash)),
      detail: `${text.slice(slash + 1)}内`,
      duration: "",
    };
  }

  return { main: displayStat(text), detail: "", duration: "" };
}

function splitStat(text) {
  return /^[+-]/.test(text)
    ? { sign: text[0], number: text.slice(1) }
    : { sign: "", number: text };
}

const stats = computed(() =>
  statDefinitions.map((definition) => {
    const value = props[definition.key];
    const presentation = presentStat(value);

    return {
      ...definition,
      value,
      presentation,
      mainParts: splitStat(presentation.main),
      classes: {
        negative: presentation.main.startsWith("-"),
      },
    };
  }),
);
</script>

<template>
  <div class="stats" aria-label="食用数值">
    <div
      v-for="stat in stats"
      :key="stat.key"
      class="stat"
      :class="stat.key"
      :aria-label="`${stat.label} ${displayStat(stat.value)}`"
    >
      <img class="stat-icon" :src="assetUrl(stat.icon)" alt="" />
      <strong class="stat-value" :class="stat.classes">
        <span v-if="stat.mainParts.sign" class="stat-sign" aria-hidden="true">
          {{ stat.mainParts.sign }}
        </span>
        <span>{{ stat.mainParts.number }}</span>
      </strong>
      <small class="stat-detail" aria-hidden="true">
        <span>{{ stat.presentation.detail }}</span>
        <span>{{ stat.presentation.duration }}</span>
      </small>
    </div>
  </div>
</template>
