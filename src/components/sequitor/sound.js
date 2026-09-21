// Lazily create audio only after a gesture. Each effect has its own channel so
// landing never cuts off a collapsing pillar. No background playback.
import { soundSources } from './media.js'
export function createPuzzleAudio(api, onError = () => {}) {
  const channels = new Map()
  let enabled = true, destroyed = false
  const volumes = { lever: .55, form: .45, jump: .35, land: .25, warning: .35, collapse: .45 }
  function stop() { channels.forEach(channel => channel.stop()) }
  return {
    play(name) {
      if (!enabled || destroyed || !(name in volumes)) return
      try {
        let channel = channels.get(name)
        if (!channel) {
          channel = api.createInnerAudioContext()
          channel.src = soundSources[name]
          channel.volume = volumes[name]
          channel.onError(error => { if (!destroyed) onError(error) })
          channels.set(name, channel)
        }
        channel.stop()
        const pending = channel.play()
        pending?.catch(error => {
          // Stopping/resetting during browser audio startup is intentional.
          if (!destroyed && error.name !== 'AbortError') onError(error)
        })
      } catch (error) { onError(error) }
    },
    setEnabled(value) { enabled = value; if (!value) stop() },
    stop,
    destroy() {
      if (destroyed) return
      destroyed = true
      channels.forEach(channel => { channel.stop(); channel.destroy() })
      channels.clear()
    },
  }
}

// H5's uni audio wrapper drops HTMLMediaElement.play()'s promise. Keep it so
// muting/leaving immediately after a tap cannot produce an unhandled rejection.
export function createBrowserAudioContext() {
  const media = new Audio()
  media.preload = 'auto'
  return {
    set src(value) { media.src = value },
    set volume(value) { media.volume = value },
    onError(handler) { media.onerror = () => handler(media.error) },
    play() { return media.play() },
    stop() { media.pause(); media.currentTime = 0 },
    destroy() { media.onerror = null; media.pause(); media.removeAttribute('src'); media.load() },
  }
}
