<script setup>
import FoodStats from "./FoodStats.vue";
import IngredientRow from "./IngredientRow.vue";
import { assetUrl } from "../lib/assets.js";

defineProps({
  recipe: {
    type: Object,
    required: true,
  },
});

const tagLabels = {
  heal: "高回血",
  hunger: "高饱食",
  sanity: "高理智",
  effect: "特殊效果",
  warly: "沃利专属",
  special: "特殊产物",
};
</script>

<template>
  <article class="recipe-card">
    <div
      v-if="recipe.characters.length"
      class="character-avatars"
      aria-label="关联人物"
    >
      <span
        v-for="character in recipe.characters"
        :key="`${character.name}-${character.relationship}`"
        class="character-avatar-wrap"
        :class="character.relationship === '专属料理' ? 'exclusive' : 'favorite'"
        :title="`${character.name} · ${character.relationship}`"
      >
        <img
          class="character-avatar"
          :src="assetUrl(character.image)"
          :alt="`${character.name}${character.relationship}`"
          loading="lazy"
        />
      </span>
    </div>

    <div class="card-top">
      <div class="dish-panel">
        <img
          class="dish-image"
          :src="assetUrl(recipe.image)"
          :alt="`${recipe.zh}料理图标`"
          loading="lazy"
        />
        <div class="tag-list">
          <span
            v-for="tag in recipe.tags"
            :key="tag"
            class="tag"
            :class="tag"
          >
            {{ tagLabels[tag] }}
          </span>
        </div>
      </div>

      <div class="recipe-main">
        <div class="card-head">
          <h2 class="dish-name">{{ recipe.zh }}</h2>
        </div>
        <div class="combo-block">
          <ol class="combo-list">
            <IngredientRow
              v-for="(combo, index) in recipe.combos"
              :key="index"
              :combo="combo"
            />
          </ol>
        </div>
      </div>
    </div>

    <div class="card-bottom">
      <FoodStats
        :health="recipe.health"
        :hunger="recipe.hunger"
        :sanity="recipe.sanity"
      />

      <div class="card-details">
        <div class="perish-row">
          <span>保鲜时间</span>
          <strong>{{ recipe.perish }}</strong>
        </div>
        <div class="cook-row">
          <span>烹饪时间</span>
          <strong>{{ recipe.cook }}</strong>
        </div>
        <div class="info-block">
          <h3>制作条件</h3>
          <p>{{ recipe.condition }}</p>
        </div>
        <div
          class="info-block"
          :class="recipe.effect === '无特殊效果' ? 'muted' : 'effect'"
        >
          <h3>特殊效果</h3>
          <p>{{ recipe.effect }}</p>
        </div>
      </div>
    </div>
  </article>
</template>
