// Rules transcribed from the locally installed DST scripts:
// prefabs/abysspillar_trial.lua and prefabs/abysspillar.lua.
// Directions are relative to the board, not the character's screen sprite.
export const DIRECTIONS = [[1, 0], [0, 1], [-1, 0], [0, -1]]
export const ARROWS = ['↑', '→', '↓', '←']
export const key = (row, col) => `${row},${col}`
export const same = (a, b) => a.row === b.row && a.col === b.col

export function createPuzzle(type = 1, mirrored = false) {
  if (![1, 2, 3].includes(type)) throw new Error('Unknown puzzle type')
  const cells = []
  const entrance = { row: 0, col: type === 3 ? (mirrored ? -1 : 1) : 0 }
  cells.push(entrance)
  for (let row = 1; row <= 5; row++) {
    const width = type === 3 && row === 5 ? 1 : 2
    for (let col = -width; col <= width; col++) cells.push({ row, col })
  }
  for (const col of type === 2 ? [-1, 1] : [0]) cells.push({ row: 6, col })
  const seeds = {
    1: [[3, -1, 1], [3, 1, 3]],
    2: [[5, -2, 2], [4, 2, 3]],
    3: [[3, 0, 0], [4, 2, 2]],
  }
  const followers = seeds[type].map(([row, col, facing]) => ({
    row, col: mirrored ? -col : col,
    facing: mirrored && facing % 2 ? (4 - facing) % 4 : facing,
  }))
  return {
    type, mirrored, cells, live: cells.map(c => key(c.row, c.col)),
    player: { row: -1, col: entrance.col, facing: 0 }, followers, moves: 0, phase: 'ready',
  }
}

export const begin = state => state.phase === 'ready' ? { ...state, phase: 'playing' } : state

export function availableMoves(state) {
  if (state.phase !== 'playing') return []
  return DIRECTIONS.map(([dr, dc], direction) => ({
    row: state.player.row + dr, col: state.player.col + dc, direction,
  })).filter(cell => (state.live.includes(key(cell.row, cell.col)) || cell.row === 7 && state.player.row === 6) &&
    !state.followers.some(follower => same(follower, cell)))
}

export function step(state, direction) {
  const target = availableMoves(state).find(cell => cell.direction === direction)
  if (!target) return null
  // Crossing the banks does not advance the followers' pillar puzzle.
  if (state.player.row === -1 || target.row === 7) {
    return { ...state, player: { row: target.row, col: target.col, facing: direction },
      live: state.live.filter(id => id !== key(state.player.row, state.player.col)),
      moves: state.moves + 1, phase: target.row === 7 ? 'won' : 'playing' }
  }
  const turn = (direction - state.player.facing + 4) % 4
  // All original platforms remain occupied during reservation. A follower
  // cannot enter a platform just vacated by another piece in the same jump.
  const reserved = new Set([key(target.row, target.col), key(state.player.row, state.player.col),
    ...state.followers.map(f => key(f.row, f.col))])
  const departed = new Set([key(state.player.row, state.player.col)])
  const followers = state.followers.map(follower => {
    const facing = (follower.facing + turn) % 4
    const [dr, dc] = DIRECTIONS[facing]
    const row = follower.row + dr, col = follower.col + dc
    const id = key(row, col)
    if (state.live.includes(id) && !reserved.has(id)) {
      reserved.add(id)
      departed.add(key(follower.row, follower.col))
      return { row, col, facing }
    }
    return { ...follower, facing }
  })
  return {
    ...state, player: { row: target.row, col: target.col, facing: direction }, followers,
    live: state.live.filter(id => !departed.has(id)), moves: state.moves + 1,
    phase: 'playing',
  }
}

export function timing(state) {
  const isolated = state.player.row > 0 && state.player.row < 6 && !availableMoves(state).length
  return isolated ? { warning: 800, collapse: 2000 } : { warning: 4000, collapse: 6000 }
}

// After the one-way bank entrance, every move destroys its departing pillar.
// Explicit budget prevents a hint request from monopolizing a phone's UI.
export function solve(initial, budget = 30000) {
  let visited = 0, exhausted = false
  const dead = new Set()
  function visit(state) {
    if (state.phase === 'won') return []
    if (++visited > budget) { exhausted = true; return null }
    const signature = JSON.stringify([state.live, state.player, state.followers])
    if (dead.has(signature)) return null
    for (const cell of availableMoves(state)) {
      const route = visit(step(state, cell.direction))
      if (route) return [cell.direction, ...route]
      if (exhausted) return null
    }
    dead.add(signature)
    return null
  }
  const route = visit(initial.phase === 'ready' ? begin(initial) : initial)
  return { route, visited, exhausted }
}
