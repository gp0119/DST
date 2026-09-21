<template>
  <div class="sprite-window">
    <img class="sprite-strip" :src="source" alt="" draggable="false" :style="stripStyle" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import clips from './static/clips.json'
import { assetUrl } from '../../lib/assets.js'
const props = defineProps({ clip: String, time: { type: Number, default: 0 }, loop: { type: Boolean, default: true } })
const clip = computed(() => clips[props.clip])
const source = computed(() => assetUrl(`images/sequitor/${clip.value.file}`))
const stripStyle = computed(() => {
  const { count, duration } = clip.value
  const frame = Math.max(0, Math.floor(props.time / duration * count))
  const index = props.loop ? frame % count : Math.min(count - 1, frame)
  return { width: count * 100 + '%', left: -index * 100 + '%' }
})
</script>

<style scoped>
.sprite-window { position: relative; overflow: hidden; width: 100%; height: 100%; pointer-events: none; }
.sprite-strip { position: absolute; top: 0; height: 100%; max-width: none; pointer-events: none; }
</style>
