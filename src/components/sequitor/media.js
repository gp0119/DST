import { assetUrl } from '../../lib/assets.js'

const names = ['collapse', 'form', 'jump', 'land', 'lever', 'warning']

export const soundSources = Object.fromEntries(
  names.map(name => [name, assetUrl(`images/sequitor/audio/${name}.wav`)])
)
