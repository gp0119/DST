<template>
  <div class="puzzle-page">
    <div class="sequitor-toolbar">
      <div class="type-tabs">
        <button v-for="n in [1, 2, 3]" :key="n" :class="['type-tab', { active: type === n }]" :aria-label="`题型 ${n}`" :aria-pressed="type === n" @click="setType(n)">{{ n }}</button>
      </div>
      <button :class="['mirror-button', { active: mirrored }]" :aria-label="mirrored ? '关闭镜像' : '开启镜像'" @click="toggleMirror">镜像</button>
      <button class="toolbar-icon" :aria-label="soundEnabled ? '关闭声音' : '开启声音'" @click.stop="toggleSound"><span>{{ soundEnabled ? '🔊' : '🔇' }}</span></button>
      <button :class="['toolbar-icon', 'hint-button', { 'hint-enabled': hintsEnabled }]" :aria-label="hintsEnabled ? '隐藏下一步提示' : '显示下一步提示'" :aria-pressed="hintsEnabled" @click.stop="hintsEnabled = !hintsEnabled"><span>💡</span></button>
    </div>

    <div class="scene" :class="{ 'scene-warning': warning, 'scene-failed': state.phase === 'lost' }">
      <div class="scene-glow" />
      <span v-if="note || statusTitle || hintStatus" class="scene-notice" aria-live="polite">{{ note || statusTitle || hintStatus }}</span>
      <button class="far-bank" type="button" aria-label="跳上对岸平台" @click="tapCell({ row: 7, col: state.player.col })"><span class="bank-rune">出口</span></button>
      <div v-if="hintCell && hintCell.row === 7" class="bank-hint" :style="pieceStyle(hintCell)"><div class="hint-mark" role="img" aria-label="下一步跳上对岸平台" /></div>

      <button type="button" v-for="cell in renderedCells" :key="cell.id"
        :class="['pillar-cell', { collapsing: cell.collapsing }]"
        :style="cell.style" :aria-label="`石柱 ${cell.row + 1} 行 ${cell.col + 3} 列`" :disabled="jumping || !moves.some(move => same(move, cell))" @click="tapCell(cell)">
        <!-- Keep the idle image loaded so formation ends without replacing its sprite sheet. -->
        <div v-show="!forming" class="pillar-image"><Sprite :clip="cell.clip" :time="cell.time" :loop="cell.loop" /></div>
        <div v-if="forming" class="pillar-image"><Sprite clip="abyss_pillar-place_a-255" :time="visualTime - formedAt" :loop="false" /></div>
        <div v-if="hintCell && same(hintCell, cell)" class="hint-mark" role="img" aria-label="下一步落点" />
      </button>

      <div v-for="(follower, index) in state.followers" :key="'follower-' + index"
        :class="['piece', 'follower', { dormant: state.phase === 'ready' }]"
        :style="pieceStyle(follower)">
        <div :class="['piece-motion', { hopping: jumping && movingFollowers.includes(index) }]">
          <div class="follower-image" :style="{ transform: follower.facing === 3 ? 'scaleX(-1)' : 'none' }">
            <Sprite :clip="followerClip(follower, index)" :time="followerTime(index)" />
          </div>
        </div>
      </div>
      <div class="piece player-piece"
        :style="pieceStyle(state.player)">
        <div :class="['piece-motion', 'player-body', { hopping: jumping, falling: state.phase === 'lost' }]">
          <div class="player-avatar"><img class="avatar-image" :src="assetUrl('images/characters/wilson.png')" alt="" draggable="false" /></div>
        </div>
      </div>

      <div class="near-bank" />
    </div>

    <div class="actions-row">
      <button class="lever-button" @click="reset"><img :src="assetUrl('images/sequitor/vault_switch-idle-251.png')" alt="" draggable="false" /><span>重置</span></button>
    </div>

  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { createPuzzle, begin, step, availableMoves, timing, key, same, solve } from './rules.js'
import Sprite from './Sprite.vue'
import { assetUrl } from '../../lib/assets.js'
import { createPuzzleAudio, createBrowserAudioContext } from './sound.js'

const type = ref(1), mirrored = ref(false), mode = ref('practice')
const state = ref(createPuzzle()), note = ref('')
const hintsEnabled = ref(false)
const elapsed = ref(0), jumping = ref(false), movingFollowers = ref([])
const visualTime = ref(0), formedAt = ref(0), jumpAt = ref(0), collapsedAt = ref({})
// Original clips: place_a = 47 frames, collapse = 25 frames, both at 30 fps.
const FORM_TIME = Math.round(47 / 30 * 1000)
const COLLAPSE_TIME = Math.round(25 / 30 * 1000)
const JUMP_TIME = 420
const forming = computed(() => visualTime.value - formedAt.value < FORM_TIME)
const soundEnabled = ref(true)
const audioApi = { createInnerAudioContext: createBrowserAudioContext }
const audio = createPuzzleAudio(audioApi, () => {
  soundEnabled.value = false
  audio.setEnabled(false)
  note.value = '音效加载失败，可点击声音重试'
})
audio.setEnabled(soundEnabled.value)
let warningPlayed = false
function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  try { localStorage.setItem('sequitor-sound', String(soundEnabled.value)) }
  catch { note.value = '浏览器无法保存声音偏好' }
  audio.setEnabled(soundEnabled.value)
  note.value = ''
  if (soundEnabled.value) audio.play('lever')
}
let enteredAt = 0, ticker, jumpTimer, visible = true
const moves = computed(() => availableMoves(state.value))
const hintResult = computed(() => hintsEnabled.value && state.value.phase === 'playing' ? solve(state.value) : null)
const hintCell = computed(() => !jumping.value && hintResult.value?.route?.length
  ? moves.value.find(cell => cell.direction === hintResult.value.route[0]) : null)
const hintStatus = computed(() => !jumping.value && hintResult.value && !hintResult.value.route
  ? hintResult.value.exhausted ? '暂未找到提示，可尝试重置' : '当前已无通关路线，请重置' : '')
const limits = computed(() => timing(state.value))
const warning = computed(() => mode.value === 'challenge' && state.value.phase === 'playing' && elapsed.value >= limits.value.warning)
const statusTitle = computed(() => ({ won: jumping.value ? '' : '通关', lost: '挑战失败，点击重置' }[state.value.phase] ||
  (state.value.phase === 'playing' && !moves.value.length ? '无路可走，点击重置' : '')))

function position(piece) {
  if (piece.row === -1) return { x: 50 + piece.col * 18 * 1.04, y: 97, scale: 1.04, zIndex: 32 }
  if (piece.row === 7) return { x: 50 + piece.col * 18 * .74, y: 9, scale: .74, zIndex: 8 }
  const depth = (6 - piece.row) / 6
  const scale = .78 + depth * .26
  return { x: 50 + piece.col * 18 * scale, y: 18 + 64 * (.78 * depth + .22 * depth * depth), scale,
    zIndex: 10 + (6 - piece.row) * 3 }
}
function pieceStyle(piece) {
  const p = position(piece)
  return { left: p.x + '%', top: p.y + '%', transform: `scale(${p.scale})`, zIndex: p.zIndex + 2 }
}
function followerClip(follower, index) {
  const pose = jumping.value && movingFollowers.value.includes(index) ? 'jump_loop' : 'idle_on'
  return `abyss_pillar_minion-${pose}-${[2, 5, 8, 5][follower.facing]}`
}
function followerTime(index) {
  return jumping.value && movingFollowers.value.includes(index)
    ? (visualTime.value - jumpAt.value) / JUMP_TIME * 533 : visualTime.value
}
const renderedCells = computed(() => state.value.cells.map(cell => {
  const p = position(cell), id = key(cell.row, cell.col)
  const collapseTime = collapsedAt.value[id]
  const collapsing = collapseTime !== undefined && visualTime.value - collapseTime < COLLAPSE_TIME
  const isWarning = same(state.value.player, cell) && warning.value
  const clip = 'abyss_pillar-' + (collapsing ? 'collapse' : isWarning ? 'occupied_warning' : 'idle_a') + '-255'
  const time = collapsing ? visualTime.value - collapseTime : visualTime.value
  return { ...cell, id, clip, time, loop: !collapsing, collapsing, live: state.value.live.includes(id),
    style: { left: p.x + '%', top: p.y + '%', transform: `scale(${p.scale})`, zIndex: p.zIndex },
  }
}).filter(cell => cell.live || cell.collapsing))

function clearJump() { clearTimeout(jumpTimer); jumping.value = false; movingFollowers.value = [] }
function reset() {
  clearJump(); audio.stop(); audio.play('lever'); audio.play('form')
  formedAt.value = Date.now(); visualTime.value = Date.now(); collapsedAt.value = {}; warningPlayed = false
  state.value = createPuzzle(type.value, mirrored.value)
  note.value = ''; elapsed.value = 0
}
function setType(n) { if (type.value !== n) { type.value = n; reset() } }
function toggleMirror() { mirrored.value = !mirrored.value; reset() }
function start() { if (forming.value || state.value.phase !== 'ready') return; state.value = begin(state.value); enteredAt = Date.now(); elapsed.value = 0; note.value = ''; warningPlayed = false }
function tick() {
  if (visible) {
    visualTime.value = Date.now()
    if (state.value.phase === 'ready' && !forming.value) start()
  }
  if (!visible || mode.value !== 'challenge' || state.value.phase !== 'playing' || state.value.player.row === -1) return
  elapsed.value = Date.now() - enteredAt
  if (warning.value && !warningPlayed) { warningPlayed = true; audio.play('warning') }
  if (elapsed.value >= limits.value.collapse) {
    collapsedAt.value = { ...collapsedAt.value, [key(state.value.player.row, state.value.player.col)]: Date.now() }
    audio.stop(); audio.play('collapse')
    state.value = { ...state.value, phase: 'lost', live: state.value.live.filter(id => id !== key(state.value.player.row, state.value.player.col)) }
    note.value = ''
  }
}
function move(direction) {
  tick() // A delayed timer must never let an expired move through.
  if (jumping.value) return
  const next = step(state.value, direction)
  if (!next) return
  movingFollowers.value = state.value.player.row >= 0 && next.player.row <= 6 ? next.followers.map((_, i) => i) : []
  const now = Date.now()
  collapsedAt.value = { ...collapsedAt.value, ...Object.fromEntries(state.value.live.filter(id => !next.live.includes(id)).map(id => [id, now])) }
  jumpAt.value = now; visualTime.value = now; warningPlayed = false
  audio.play('jump')
  if (next.live.length < state.value.live.length) audio.play('collapse')
  state.value = next; note.value = ''; elapsed.value = 0; enteredAt = Date.now()
  jumping.value = true
  jumpTimer = setTimeout(() => { jumping.value = false; movingFollowers.value = []; if (visible && state.value.phase !== 'lost') audio.play('land') }, JUMP_TIME)
}
function tapCell(cell) {
  const target = moves.value.find(m => same(m, cell))
  if (target) move(target.direction)
}
function resume() {
  visible = true; enteredAt = Date.now() - elapsed.value
  clearInterval(ticker); ticker = setInterval(tick, 80)
}
function pause() { tick(); visible = false; clearInterval(ticker); clearJump(); audio.stop() }
function dispose() { clearInterval(ticker); clearJump(); audio.destroy() }
function visibilityChanged() { if (document.hidden) pause(); else resume() }
function keyboard(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable]')) return
  const direction = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(event.key)
  if (direction !== -1 && visible && state.value.phase === 'playing') { event.preventDefault(); move(direction) }
}
onMounted(() => {
  try { soundEnabled.value = localStorage.getItem('sequitor-sound') !== 'false' }
  catch { note.value = '浏览器无法读取声音偏好' }
  audio.setEnabled(soundEnabled.value)
  formedAt.value = Date.now(); visualTime.value = formedAt.value
  visibilityChanged()
  document.addEventListener('visibilitychange', visibilityChanged)
  window.addEventListener('keydown', keyboard)
})
onUnmounted(() => {
  dispose()
  document.removeEventListener('visibilitychange', visibilityChanged)
  window.removeEventListener('keydown', keyboard)
})
</script>

<style scoped>
.puzzle-page { width: 100%; max-width: 560px; height: clamp(520px, calc(100dvh - 150px), 820px); margin: 0 auto; border-radius: 12px; box-sizing: border-box; padding: 6px 7px; padding-bottom: calc(6px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 6px; overflow: hidden; background: #10171b; color: #e7e2cf; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
button { margin: 0; border: 0; padding: 0; line-height: 1.4; border-radius: 5px; font-size: 12px; }
button::after { border: none; }
button:focus-visible { outline: 2px solid #ffe19b; outline-offset: 3px; }
img { object-fit: contain; }
button[disabled] { color: #66706e; background: #1c2528; opacity: .5; }
.sequitor-toolbar { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.type-tabs { display: flex; gap: 3px; flex: 1; min-width: 0; }
.type-tab { flex: 1; padding: 7px 0; background: #1a272b; color: #98adaa; }
.mirror-button { flex-shrink: 0; padding: 7px 10px; background: #1a272b; color: #98adaa; }
.active { color: #e6ce8f; background: #303930; }
.scene { flex: 1; min-height: 0; position: relative; overflow: hidden; border: 0.5px solid #425456; border-radius: 8px; background: radial-gradient(ellipse at 50% 0%, #253239 0%, #0b1218 38%, #040709 78%); }
.toolbar-icon { display: flex; flex: 0 0 32px; align-items: center; justify-content: center; width: 32px; height: 31px; background: #1a272b; font-size: 16px; }
.hint-button { opacity: .5; }
.hint-button.hint-enabled { opacity: 1; background: #51452b; }
.scene-notice { position: absolute; bottom: 9px; left: 6px; right: 6px; z-index: 190; text-align: center; color: #e5d9b2; font-size: 11.5px; pointer-events: none; }
.scene-glow { position: absolute; left: 15%; right: 15%; top: -20%; height: 75%; background: radial-gradient(ellipse, #53716833, transparent 65%); pointer-events: none; }
.far-bank, .near-bank { position: absolute; box-sizing: border-box; text-align: center; background: repeating-linear-gradient(90deg, transparent 0, transparent 38px, #131d2580 39px, #131d2580 40.5px), linear-gradient(#46515a, #26323b); border-top: 1px solid #71807880; border-bottom: 4px solid #131d25; pointer-events: none; }
.far-bank { top: 5%; left: 27%; width: 46%; height: 9%; transform: perspective(120px) rotateX(40deg); transform-origin: center bottom; box-shadow: 0 12.5px 15px #000; pointer-events: auto; }
.bank-hint { position: absolute; width: 40px; margin-left: -20px; pointer-events: none; }
.bank-rune { color: #c9e1c8; font-size: 15px; }
.near-bank { bottom: -2%; left: -5%; width: 110%; height: 10%; transform: perspective(180px) rotateX(40deg); transform-origin: center bottom; z-index: 31; }
.pillar-cell:disabled { opacity: 1; background: transparent; cursor: default; }
.pillar-cell { background: transparent; position: absolute; width: 48px; height: 74px; margin-left: -24px; margin-top: -7px; transform-origin: 24px 7px; transition: opacity .32s, transform .32s; }
.pillar-image { position: absolute; top: -5px; left: 10.5px; width: 39px; height: 71px; opacity: .9; pointer-events: none; }
.pillar-image::after { content: ''; position: absolute; left: -15%; right: -15%; top: 55%; bottom: -12%; border-radius: 50%; background: radial-gradient(ellipse at center, #040709cc 0%, #04070980 35%, #04070900 72%); filter: blur(2.5px); }
.collapsing { pointer-events: none; }
.hint-mark { position: absolute; top: -14px; left: 50%; width: 14px; height: 16px; transform: translateX(-50%); pointer-events: none; }
.hint-mark::before { content: ''; position: absolute; top: 0; left: 6px; width: 2px; height: 14px; background: #ffe19b; }
.hint-mark::after { content: ''; position: absolute; bottom: 1px; left: 3.5px; width: 7px; height: 7px; box-sizing: border-box; border-right: 2px solid #ffe19b; border-bottom: 2px solid #ffe19b; transform: rotate(45deg); }
.exit-mark { position: absolute; left: 12px; top: 12.5px; color: #def2d5; font-size: 9.5px; z-index: 2; white-space: nowrap; text-shadow: 0 1px 2.5px #000; }
.piece { position: absolute; width: 40px; height: 42px; margin-left: -20px; margin-top: -37.5px; transform-origin: 20px 37.5px; pointer-events: none; transition: left .42s ease, top .42s ease, transform .42s ease; }
.piece-motion { position: relative; width: 100%; height: 100%; }
/* The sprite's foot is at (36, 108) in each 96 × 112 frame; mirror around it. */
.follower-image { position: absolute; left: 50%; bottom: -1.5px; margin-left: -13.125px; width: 35px; height: 38px; transform-origin: 13.125px 36.65px; }
.dormant { opacity: .38; }
.player-body { display: flex; align-items: center; justify-content: flex-end; flex-direction: column; }
.player-avatar { position: relative; width: 24px; height: 27px; overflow: hidden; }
.avatar-image { max-width: none; position: absolute; width: 39px; height: 39px; left: -6.75px; top: -6.75px; }
.hopping { animation: hop .42s ease; }
.shaking { animation: shake .14s linear infinite; }
.falling { animation: fall .5s forwards; }
.scene-warning { border-color: #bb704f; }
.scene-failed { border-color: #69473b; }
.actions-row { display: flex; gap: 6px; height: 40px; flex-shrink: 0; }
.lever-button { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; background: #2a3433; color: #d6d8c4; }
.lever-button img { width: 16px; height: 25px; }
@keyframes pulse { 50% { opacity: .5; transform: scale(.75); } }
@keyframes hop { 50% { transform: translateY(-12px); } }
@keyframes shake { 25% { transform: translateX(-1px); } 75% { transform: translateX(1px); } }
@keyframes fall { to { transform: translateY(45px) scale(.2); opacity: 0; } }
@media (min-width: 900px) {
  .puzzle-page { max-width: 900px; height: clamp(650px, calc(100dvh - 180px), 1050px); padding: 12px; gap: 12px; }
  button { font-size: 16px; }
  .type-tab, .mirror-button { padding-block: 10px; }
  .toolbar-icon { flex-basis: 44px; width: 44px; height: 42px; font-size: 22px; }
  .pillar-cell, .piece, .bank-hint { scale: 1.5; }
  .bank-hint { transform-origin: center top; }
  .scene-notice { font-size: 16px; }
  .bank-rune { font-size: 20px; }
  .actions-row { height: 50px; }
  .lever-button img { width: 22px; height: 34px; }
}
</style>
