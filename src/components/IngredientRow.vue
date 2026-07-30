<script setup>
import { assetUrl } from "../lib/assets.js";

defineProps({
  combo: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <li class="combo-row" :aria-label="combo.text">
    <div class="ingredient-grid">
      <span
        v-for="(item, index) in combo.items"
        :key="`${item.id}-${index}`"
        class="ingredient-item"
      >
        <img
          class="ingredient-image"
          :src="assetUrl(item.image)"
          :alt="item.name"
          loading="lazy"
        />
        <span class="ingredient-name" :title="item.name">{{ item.name }}</span>
      </span>
    </div>
  </li>
</template>
