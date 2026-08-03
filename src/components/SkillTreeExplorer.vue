<script setup>
  import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
  import { assetUrl } from '../lib/assets.js'

  const props = defineProps({
    characters: {
      type: Array,
      required: true,
    },
    maxPoints: {
      type: Number,
      required: true,
    },
    source: {
      type: Object,
      required: true,
    },
  })

  const groupAliases = {
    allegiance1: 'allegiance',
    allegiance2: 'allegiance',
    wendy_alliegience: 'allegiance',
    bodycircuits: 'chassis',
    extrabody: 'chassis',
    ghostrevive: 'chassis',
    remotebodyswap: 'chassis',
    scoutdrone: 'drones',
    deliverydrone: 'drones',
    zapdrone: 'drones',
    extradronerange: 'drones',
  }

  const groupLabels = {
    alchemy: '转化术',
    allegiance: '阵营技能',
    amphibian: '两栖天赋',
    arsenal: '战斗武备',
    avengingghost: '复仇幽灵',
    beard: '胡须',
    beefalo: '皮弗娄牛',
    bernie: '伯尼',
    camping: '露营',
    charlie: '暗影科技',
    chassis: '备用躯体',
    circuitry: '电路系统',
    combat: '战斗',
    crafting: '植物工艺',
    curse: '诅咒变身',
    drones: '无人机',
    gathering: '生长与采集',
    ghost_command: '幽灵指令',
    ghostflower: '哀悼荣耀',
    gravestone: '墓碑',
    human: '人类形态',
    lighter: '打火机',
    lowshelf: '基础发明',
    midshelf: '进阶发明',
    might: '力量',
    naughty: '淘气倾向',
    neutral: '倾向与阵营',
    nice: '友善倾向',
    planardamage: '位面力量',
    potion_upgrades: '灵体草药',
    sisturn_upgrades: '姐妹骨灰罐',
    slingshotammo: '弹弓弹药',
    slingshotmods: '弹弓改装',
    smallghost: '小惊吓',
    songs: '战歌',
    swampmaster: '沼泽统治',
    torch: '火炬',
    training: '训练',
    wagstaff: '月亮科技',
    woby: '沃比',
  }

  const groupTitleOverrides = {
    wendy: {
      avengingghost: {
        anchor: 'wendy_avenging_ghost',
        dx: -82,
        dy: 0,
      },
      ghostflower: {
        anchor: 'wendy_ghostflower_butterfly',
        dx: 0,
        dy: 72,
      },
      gravestone: {
        anchor: 'wendy_makegravemounds',
        dx: 0,
        dy: 52,
      },
      ghost_command: {
        anchor: 'wendy_ghostcommand_3',
        dx: 0,
        dy: 72,
      },
    },
  }

  const tagLabels = {
    beard1: '胡须',
    bernie: '伯尼',
    bernie4: '伯尼',
    bernie8: '伯尼',
    blooming: '开花',
    camping: '露营',
    crafting: '植物工艺',
    curse: '诅咒',
    lighter: '打火机',
    lowshelf: '基础发明',
    midshelf: '进阶发明',
    nice1: '友善',
    naughty1: '淘气',
    slingshotammo_crafting: '弹药',
    torch1: '火炬',
    woby_basics: '沃比基础',
    woby_dash: '沃比冲刺',
    wx78_maxbody: '备用躯体',
  }

  const POSITION_SCALE_X = 1.72
  const POSITION_SCALE_Y = 2.15
  const NODE_RADIUS = 23
  const NODE_SIZE = 56

  const skillTreeImagePaths = {
    locked: 'images/skill-tree/locked.png',
    lockedHover: 'images/skill-tree/locked-hover.png',
    selectable: 'images/skill-tree/selectable.png',
    selectableHover: 'images/skill-tree/selectable-hover.png',
    selected: 'images/skill-tree/selected.png',
    selectedHover: 'images/skill-tree/selected-hover.png',
    unselected: 'images/skill-tree/unselected.png',
    unselectedHover: 'images/skill-tree/unselected-hover.png',
  }

  const canvas = ref(null)
  const canvasScroll = ref(null)
  const canvasShell = ref(null)
  const dialogCloseButton = ref(null)
  const mobileCharactersOpen = ref(false)
  const mobileCharacterButton = ref(null)
  const mobileCharacterCloseButton = ref(null)
  const activeCharacterId = ref(props.characters[0]?.id ?? '')
  const selectedByCharacter = ref(Object.fromEntries(props.characters.map((character) => [character.id, []])))
  const focusedSkillId = ref(props.characters[0]?.skills[0]?.id ?? '')
  const hoveredSkillId = ref('')
  const dialogSkillId = ref('')
  const feedback = ref('点击可用节点分配洞察；使用方向键浏览节点。')
  const viewport = reactive({
    width: 0,
    height: 0,
    dpr: 1,
    x: 0,
    y: 0,
    scale: 1,
  })
  const tooltip = reactive({
    visible: false,
    x: 0,
    y: 0,
  })

  let resizeObserver
  let drawFrame = 0
  let gesture = null
  const imageCache = new Map()

  const activeCharacter = computed(() => props.characters.find((character) => character.id === activeCharacterId.value) ?? props.characters[0])
  const skillsById = computed(() => Object.fromEntries(activeCharacter.value.skills.map((skill) => [skill.id, skill])))
  const selectedIds = computed(() => new Set(selectedByCharacter.value[activeCharacter.value.id] ?? []))
  const selectedCount = computed(() => selectedIds.value.size)
  const remainingPoints = computed(() => props.maxPoints - selectedCount.value)
  const focusedSkill = computed(() => skillsById.value[focusedSkillId.value] ?? activeCharacter.value.skills[0])
  const hoveredSkill = computed(() => skillsById.value[hoveredSkillId.value])
  const dialogSkill = computed(() => skillsById.value[dialogSkillId.value])
  const treeLayout = computed(() => {
    const sourceSkills = activeCharacter.value.skills
    const topY = Math.max(...sourceSkills.map((skill) => skill.y))
    const nodes = sourceSkills.map((skill) => ({
      ...skill,
      wx: skill.x * POSITION_SCALE_X,
      wy: (topY - skill.y) * POSITION_SCALE_Y,
    }))
    const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]))
    const groupMap = new Map()
    const titleOverrides = groupTitleOverrides[activeCharacter.value.slug] ?? {}

    for (const node of nodes) {
      const groupId = groupAliases[node.group] ?? node.group
      if (!groupMap.has(groupId)) groupMap.set(groupId, [])
      groupMap.get(groupId).push(node)
    }

    const groups = [...groupMap.entries()].map(([id, groupNodes]) => {
      const titleOverride = titleOverrides[id]
      const anchor = titleOverride ? nodeById[titleOverride.anchor] : null
      return {
        id,
        label: groupLabels[id] ?? id,
        x: anchor ? anchor.wx + titleOverride.dx : groupNodes.reduce((sum, node) => sum + node.wx, 0) / groupNodes.length,
        y: anchor ? anchor.wy + titleOverride.dy : Math.min(...groupNodes.map((node) => node.wy)) - 53,
      }
    })

    return {
      nodes,
      nodeById,
      groups,
      bounds: {
        minX: Math.min(...nodes.map((node) => node.wx)) - 58,
        maxX: Math.max(...nodes.map((node) => node.wx)) + 58,
        minY: Math.min(...nodes.map((node) => node.wy)) - 78,
        maxY: Math.max(...nodes.map((node) => node.wy)) + 72,
      },
    }
  })

  function selectCharacter(id) {
    activeCharacterId.value = id
    focusedSkillId.value = props.characters.find((character) => character.id === id)?.skills[0]?.id ?? ''
    hoveredSkillId.value = ''
    dialogSkillId.value = ''
    tooltip.visible = false
    feedback.value = '已切换角色；每位角色的模拟方案会分别保留。'
  }

  async function openMobileCharacters() {
    mobileCharactersOpen.value = true
    await nextTick()
    mobileCharacterCloseButton.value?.focus()
  }

  async function closeMobileCharacters() {
    mobileCharactersOpen.value = false
    await nextTick()
    mobileCharacterButton.value?.focus()
  }

  function skillName(id) {
    return skillsById.value[id]?.title ?? id
  }

  function skillIconPath(skill) {
    return `images/skills/${skill.id}.png`
  }

  function cachedImage(path) {
    if (!path) return null
    if (!imageCache.has(path)) {
      const image = new Image()
      image.addEventListener('load', scheduleDraw, { once: true })
      image.src = assetUrl(path)
      imageCache.set(path, image)
    }
    const image = imageCache.get(path)
    return image.complete && image.naturalWidth ? image : null
  }

  function preloadActiveImages() {
    Object.values(skillTreeImagePaths).forEach(cachedImage)
    activeCharacter.value.skills.forEach((skill) => cachedImage(skillIconPath(skill)))
  }

  function countTag(tag, ids) {
    let count = 0
    for (const id of ids) {
      if (skillsById.value[id]?.tags.includes(tag)) count += 1
    }
    return count
  }

  function unmetRequirement(skill, ids = selectedIds.value) {
    const comparisonIds = new Set(ids)
    comparisonIds.delete(skill.id)

    if (skill.parents.length && !skill.parents.some((parent) => comparisonIds.has(parent))) {
      return `需要先学习${skill.parents.map(skillName).join('或')}`
    }

    const rules = skill.requirements
    if (rules.minPoints && comparisonIds.size < rules.minPoints) {
      return `需要先投入 ${rules.minPoints} 点洞察`
    }
    for (const rule of rules.minTags ?? []) {
      if (countTag(rule.tag, comparisonIds) < rule.count) {
        return `${tagLabels[rule.tag] ?? rule.tag}分支需要先投入 ${rule.count} 点`
      }
    }
    if (rules.minTagSum) {
      const count = rules.minTagSum.tags.reduce((total, tag) => total + countTag(tag, comparisonIds), 0)
      if (count < rules.minTagSum.count) {
        return `相关分支合计需要先投入 ${rules.minTagSum.count} 点`
      }
    }
    for (const id of rules.requiredSkills ?? []) {
      if (!comparisonIds.has(id)) return `需要先学习${skillName(id)}`
    }
    for (const id of rules.excludesSkills ?? []) {
      if (comparisonIds.has(id)) return `不能与${skillName(id)}同时选择`
    }
    for (const tag of rules.excludesTags ?? []) {
      if (countTag(tag, comparisonIds)) {
        return tag === 'lunar_favor' ? '不能与月亮阵营技能同时选择' : '不能与暗影阵营技能同时选择'
      }
    }
    return ''
  }

  function canSelect(skill) {
    return selectedIds.value.has(skill.id) || (selectedCount.value < props.maxPoints && !unmetRequirement(skill))
  }

  function pruneInvalid(ids) {
    const next = new Set(ids)
    let changed = true
    while (changed) {
      changed = false
      for (const id of [...next]) {
        const skill = skillsById.value[id]
        if (skill && unmetRequirement(skill, next)) {
          next.delete(id)
          changed = true
        }
      }
    }
    return next
  }

  function toggleSkill(skill) {
    focusedSkillId.value = skill.id
    const current = new Set(selectedIds.value)

    if (current.has(skill.id)) {
      current.delete(skill.id)
      const next = pruneInvalid(current)
      const removedCount = selectedCount.value - next.size
      selectedByCharacter.value[activeCharacter.value.id] = [...next]
      feedback.value = removedCount > 1 ? `已取消${skill.title}，并同步取消 ${removedCount - 1} 项后续技能。` : `已取消${skill.title}。`
      scheduleDraw()
      return
    }

    if (selectedCount.value >= props.maxPoints) {
      feedback.value = `${props.maxPoints} 点洞察已全部分配，请先取消一项技能。`
      return
    }
    const reason = unmetRequirement(skill)
    if (reason) {
      feedback.value = reason
      scheduleDraw()
      return
    }

    current.add(skill.id)
    selectedByCharacter.value[activeCharacter.value.id] = [...current]
    feedback.value = `已学习${skill.title}，还可分配 ${props.maxPoints - current.size} 点。`
    scheduleDraw()
  }

  function resetCharacter() {
    selectedByCharacter.value[activeCharacter.value.id] = []
    feedback.value = `已重置${activeCharacter.value.name}的技能方案。`
    scheduleDraw()
  }

  function openSkillDialog(skill) {
    focusedSkillId.value = skill.id
    dialogSkillId.value = skill.id
    tooltip.visible = false
    nextTick(() => dialogCloseButton.value?.focus())
  }

  function closeSkillDialog() {
    dialogSkillId.value = ''
    nextTick(() => canvas.value?.focus())
  }

  function applyDialogSkill() {
    const skill = dialogSkill.value
    if (!skill) return
    const wasSelected = selectedIds.value.has(skill.id)
    toggleSkill(skill)
    if (wasSelected !== selectedIds.value.has(skill.id)) closeSkillDialog()
  }

  function nodeGlyph(title) {
    return title.replace(/[ⅠⅡⅢIVX\d\s]+$/g, '').slice(0, 2)
  }

  function conditionLabels(skill) {
    const labels = []
    if (skill.parents.length) labels.push(`前置：${skill.parents.map(skillName).join(' / ')}`)
    if (skill.requirements.minPoints) labels.push(`已投入 ${skill.requirements.minPoints} 点`)
    for (const rule of skill.requirements.minTags ?? []) {
      labels.push(`${tagLabels[rule.tag] ?? rule.tag} ${rule.count} 点`)
    }
    if (skill.requirements.minTagSum) labels.push(`相关分支合计 ${skill.requirements.minTagSum.count} 点`)
    if (skill.requirements.excludesTags?.length || skill.requirements.excludesSkills?.length) labels.push('互斥选择')
    return labels
  }

  function skillStatus(skill) {
    if (selectedIds.value.has(skill.id)) return '已学习 · 点击取消'
    return unmetRequirement(skill) || '可学习 · 点击分配'
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value))
  }

  function scheduleDraw() {
    if (drawFrame) return
    drawFrame = requestAnimationFrame(() => {
      drawFrame = 0
      drawTree()
    })
  }

  function fitTree() {
    if (!viewport.width || !viewport.height) return
    const bounds = treeLayout.value.bounds
    const treeWidth = bounds.maxX - bounds.minX
    const treeHeight = bounds.maxY - bounds.minY
    const scale = clamp(Math.min((viewport.width - 54) / treeWidth, (viewport.height - 54) / treeHeight), 0.32, 1.42)
    viewport.scale = scale
    viewport.x = viewport.width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale
    viewport.y = viewport.height / 2 - ((bounds.minY + bounds.maxY) / 2) * scale
    scheduleDraw()
  }

  function resizeCanvas() {
    if (!canvas.value || !canvasShell.value) return
    const rect = canvasShell.value.getBoundingClientRect()
    const nextWidth = Math.max(1, Math.round(rect.width))
    const nextHeight = Math.max(1, Math.round(rect.height))
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2)
    if (nextWidth === viewport.width && nextHeight === viewport.height && nextDpr === viewport.dpr) return

    viewport.width = nextWidth
    viewport.height = nextHeight
    viewport.dpr = nextDpr
    canvas.value.width = Math.round(viewport.width * viewport.dpr)
    canvas.value.height = Math.round(viewport.height * viewport.dpr)
    canvas.value.style.width = `${viewport.width}px`
    canvas.value.style.height = `${viewport.height}px`
    fitTree()
  }

  function centerCanvasScroll() {
    if (!canvasScroll.value) return
    canvasScroll.value.scrollLeft = Math.max(0, (canvasScroll.value.scrollWidth - canvasScroll.value.clientWidth) / 2)
  }

  function drawPolygon(context, x, y, radius, sides = 8, rotation = Math.PI / 8) {
    context.beginPath()
    for (let index = 0; index < sides; index += 1) {
      const angle = rotation + (Math.PI * 2 * index) / sides
      const px = x + Math.cos(angle) * radius
      const py = y + Math.sin(angle) * radius
      if (index === 0) context.moveTo(px, py)
      else context.lineTo(px, py)
    }
    context.closePath()
  }

  function drawNodeLabel(context, node, color) {
    const title = node.title
    const lines = title.length <= 7 ? [title] : [title.slice(0, 7), `${title.slice(7, 13)}${title.length > 13 ? '…' : ''}`]
    context.fillStyle = color
    context.font = '700 9px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'top'
    lines.forEach((line, index) => {
      context.fillText(line, node.wx, node.wy + 31 + index * 11)
    })
  }

  function nodeLinkIds(node) {
    return [...new Set([...node.parents, ...(node.requirements.requiredSkills ?? [])])]
  }

  function nodeFramePath(selected, available, focused) {
    if (selected) return focused ? skillTreeImagePaths.selectedHover : skillTreeImagePaths.selected
    if (available) return focused ? skillTreeImagePaths.selectableHover : skillTreeImagePaths.selectable
    return focused ? skillTreeImagePaths.unselectedHover : skillTreeImagePaths.unselected
  }

  function drawTree() {
    const element = canvas.value
    if (!element || !viewport.width || !viewport.height) return
    const context = element.getContext('2d')
    const { width, height, dpr, x, y, scale } = viewport
    const { nodes, nodeById, groups } = treeLayout.value

    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, width, height)

    const background = context.createLinearGradient(0, 0, 0, height)
    background.addColorStop(0, '#171a14')
    background.addColorStop(0.54, '#10130f')
    background.addColorStop(1, '#0b0d0a')
    context.fillStyle = background
    context.fillRect(0, 0, width, height)

    context.fillStyle = 'rgba(221, 190, 123, 0.055)'
    const dotOffsetX = ((x % 38) + 38) % 38
    const dotOffsetY = ((y % 38) + 38) % 38
    for (let dotX = dotOffsetX; dotX < width; dotX += 38) {
      for (let dotY = dotOffsetY; dotY < height; dotY += 38) {
        context.beginPath()
        context.arc(dotX, dotY, 0.8, 0, Math.PI * 2)
        context.fill()
      }
    }

    const vignette = context.createRadialGradient(
      width * 0.5,
      height * 0.46,
      Math.min(width, height) * 0.12,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72
    )
    vignette.addColorStop(0, 'rgba(188, 151, 82, 0.045)')
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.48)')
    context.fillStyle = vignette
    context.fillRect(0, 0, width, height)

    context.save()
    context.translate(x, y)
    context.scale(scale, scale)

    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '900 11px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
    for (const group of groups) {
      const textWidth = context.measureText(group.label).width
      context.fillStyle = 'rgba(8, 10, 8, 0.82)'
      context.fillRect(group.x - textWidth / 2 - 8, group.y - 8, textWidth + 16, 17)
      context.strokeStyle = 'rgba(220, 181, 102, 0.2)'
      context.lineWidth = 1 / scale
      context.strokeRect(group.x - textWidth / 2 - 8, group.y - 8, textWidth + 16, 17)
      context.fillStyle = '#b79b67'
      context.fillText(group.label, group.x, group.y)
    }

    context.lineCap = 'round'
    for (const node of nodes) {
      for (const parentId of nodeLinkIds(node)) {
        const parent = nodeById[parentId]
        if (!parent) continue
        const bothSelected = selectedIds.value.has(node.id) && selectedIds.value.has(parent.id)
        const available = canSelect(node)

        context.beginPath()
        context.moveTo(parent.wx, parent.wy)
        context.lineTo(node.wx, node.wy)
        context.lineWidth = (bothSelected ? 4 : 3) / scale
        context.strokeStyle = bothSelected ? '#f0ce78' : available ? 'rgba(228, 215, 180, 0.78)' : 'rgba(117, 115, 99, 0.42)'
        context.setLineDash([])
        context.stroke()
      }
    }

    for (const node of nodes) {
      const selected = selectedIds.value.has(node.id)
      const available = canSelect(node)
      const focused = focusedSkillId.value === node.id
      const frameImage = cachedImage(nodeFramePath(selected, available, focused))
      const iconImage = cachedImage(skillIconPath(node))

      context.save()
      if (selected || focused) {
        context.shadowColor = selected ? 'rgba(239, 203, 113, 0.7)' : 'rgba(226, 193, 122, 0.42)'
        context.shadowBlur = selected ? 18 / scale : 11 / scale
      }

      if (frameImage) {
        context.drawImage(frameImage, node.wx - NODE_SIZE / 2, node.wy - NODE_SIZE / 2, NODE_SIZE, NODE_SIZE)
      } else {
        drawPolygon(context, node.wx, node.wy + 2, NODE_RADIUS + 4, 8)
        context.fillStyle = selected ? '#d3aa5a' : available ? '#806238' : '#25251f'
        context.fill()
        context.lineWidth = (focused ? 3 : 2) / scale
        context.strokeStyle = focused ? '#f3d899' : selected ? '#f0cf83' : '#55574d'
        context.stroke()
      }

      context.shadowBlur = 0
      if (iconImage) {
        context.globalAlpha = available || selected ? 1 : 0.42
        context.drawImage(iconImage, node.wx - 23, node.wy - 23, 46, 46)
        context.globalAlpha = 1
      } else {
        context.fillStyle = selected ? '#332619' : available ? '#2f291f' : '#777568'
        context.font = '900 10px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(nodeGlyph(node.title), node.wx, node.wy + 0.5)
      }

      if (!available && !selected) {
        const lockImage = cachedImage(focused ? skillTreeImagePaths.lockedHover : skillTreeImagePaths.locked)
        if (lockImage) context.drawImage(lockImage, node.wx + 8, node.wy - 29, 23, 23)
      }

      drawNodeLabel(context, node, focused ? '#f2dfb7' : selected ? '#dbc28d' : available ? '#b7b39f' : '#6c6c61')
      context.restore()
    }

    context.restore()
  }

  function pointFromEvent(event) {
    const rect = canvas.value.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function screenToWorld(point) {
    return {
      x: (point.x - viewport.x) / viewport.scale,
      y: (point.y - viewport.y) / viewport.scale,
    }
  }

  function skillAtPoint(point) {
    const world = screenToWorld(point)
    const hitRadius = Math.max(NODE_RADIUS + 6, 27 / viewport.scale)
    let closest = null
    let closestDistance = Number.POSITIVE_INFINITY

    for (const node of treeLayout.value.nodes) {
      const distance = Math.hypot(world.x - node.wx, world.y - node.wy)
      if (distance <= hitRadius && distance < closestDistance) {
        closest = node
        closestDistance = distance
      }
    }
    return closest
  }

  function onPointerDown(event) {
    if (event.button === 2) return
    const point = pointFromEvent(event)
    if (event.isTrusted) canvas.value.setPointerCapture?.(event.pointerId)
    tooltip.visible = false
    const skill = skillAtPoint(point)
    gesture = skill ? {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      skillId: skill.id,
      startX: point.x,
      startY: point.y,
      moved: false,
    } : null
    if (skill) {
      focusedSkillId.value = skill.id
      hoveredSkillId.value = skill.id
      scheduleDraw()
    }
  }

  function onPointerMove(event) {
    const point = pointFromEvent(event)
    if (gesture?.pointerId === event.pointerId) {
      const movedDistance = Math.hypot(point.x - gesture.startX, point.y - gesture.startY)
      if (movedDistance > 7) gesture.moved = true
      return
    }

    if (event.pointerType === 'mouse') {
      const skill = skillAtPoint(point)
      const nextId = skill?.id ?? ''
      if (nextId !== hoveredSkillId.value) {
        hoveredSkillId.value = nextId
        if (skill) focusedSkillId.value = skill.id
        scheduleDraw()
      }
      tooltip.visible = Boolean(skill)
      tooltip.x = clamp(point.x + 16, 12, Math.max(12, viewport.width - 304))
      tooltip.y = clamp(point.y + 16, 12, Math.max(12, viewport.height - 196))
    }
  }

  function onPointerUp(event) {
    const point = pointFromEvent(event)
    if (gesture?.pointerId === event.pointerId) {
      const skill = skillsById.value[gesture.skillId]
      const releasedOn = skillAtPoint(point)
      if (skill && !gesture.moved && releasedOn?.id === skill.id) {
        if (gesture.pointerType === 'mouse') toggleSkill(skill)
        else openSkillDialog(skill)
      }
    }
    gesture = null
  }

  function onPointerCancel() {
    gesture = null
  }

  function onPointerLeave() {
    if (gesture) return
    hoveredSkillId.value = ''
    tooltip.visible = false
    scheduleDraw()
  }

  function onContextMenu(event) {
    const skill = skillAtPoint(pointFromEvent(event))
    if (!skill) return
    focusedSkillId.value = skill.id
    if (selectedIds.value.has(skill.id)) {
      toggleSkill(skill)
    } else {
      feedback.value = `${skill.title}尚未学习；左键点击可分配洞察。`
      scheduleDraw()
    }
  }

  function focusAdjacent(direction) {
    const current = treeLayout.value.nodeById[focusedSkillId.value] ?? treeLayout.value.nodes[0]
    const candidates = treeLayout.value.nodes
      .filter((node) => {
        const dx = node.wx - current.wx
        const dy = node.wy - current.wy
        if (direction === 'left') return dx < -3
        if (direction === 'right') return dx > 3
        if (direction === 'up') return dy < -3
        return dy > 3
      })
      .map((node) => {
        const dx = Math.abs(node.wx - current.wx)
        const dy = Math.abs(node.wy - current.wy)
        const score = direction === 'left' || direction === 'right' ? dx + dy * 1.7 : dy + dx * 1.7
        return { node, score }
      })
      .sort((first, second) => first.score - second.score)
    if (!candidates.length) return
    focusedSkillId.value = candidates[0].node.id
    feedback.value = skillStatus(candidates[0].node)
    scheduleDraw()
  }

  function onKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (focusedSkill.value) toggleSkill(focusedSkill.value)
      return
    }
    const directions = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    }
    if (directions[event.key]) {
      event.preventDefault()
      focusAdjacent(directions[event.key])
    }
  }

  watch(activeCharacterId, () => {
    nextTick(() => {
      preloadActiveImages()
      fitTree()
      scheduleDraw()
    })
  })

  onMounted(() => {
    preloadActiveImages()
    resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(canvasShell.value)
    resizeCanvas()
    nextTick(centerCanvasScroll)
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    if (drawFrame) cancelAnimationFrame(drawFrame)
  })
</script>

<template>
  <div class="skill-explorer">
    <div class="mobile-filter-bar skill-mobile-filter-bar">
      <button
        ref="mobileCharacterButton"
        class="mobile-filter-trigger"
        type="button"
        aria-controls="mobile-character-filter-drawer"
        :aria-expanded="mobileCharactersOpen"
        :aria-label="`选择角色：${activeCharacter.name}，${selectedCount} / ${maxPoints} 洞察`"
        @click="openMobileCharacters"
      >
        <svg class="mobile-filter-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16l-6.5 7.3v5.2l-3 1.5v-6.7L4 5Z" />
        </svg>
      </button>
    </div>

    <Transition name="mobile-drawer">
      <div
        v-if="mobileCharactersOpen"
        class="mobile-filter-backdrop skill-character-filter-backdrop"
        @pointerdown.self="closeMobileCharacters"
        @keydown.esc="closeMobileCharacters"
      >
        <section
          id="mobile-character-filter-drawer"
          class="mobile-filter-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-character-filter-title"
        >
        <header>
          <div>
            <small>CHARACTERS</small>
            <h2 id="mobile-character-filter-title">选择角色</h2>
          </div>
          <button
            ref="mobileCharacterCloseButton"
            type="button"
            aria-label="关闭角色选择"
            @click="closeMobileCharacters"
          >
            ×
          </button>
        </header>

        <div class="mobile-filter-content">
          <div class="mobile-character-options" aria-label="选择角色">
            <button
              v-for="character in characters"
              :key="character.id"
              type="button"
              :aria-pressed="activeCharacter.id === character.id"
              @click="selectCharacter(character.id)"
            >
              <img :src="assetUrl(character.image)" alt="" />
              <strong>{{ character.name }}</strong>
              <small>{{ selectedByCharacter[character.id].length }} / {{ maxPoints }}</small>
            </button>
          </div>
        </div>

        <footer>
          <button
            type="button"
            class="mobile-filter-apply"
            @click="closeMobileCharacters"
          >
            查看{{ activeCharacter.name }}技能树
          </button>
        </footer>
        </section>
      </div>
    </Transition>

    <div class="skill-workspace">
      <aside class="character-rail" aria-label="选择角色">
        <button
          v-for="character in characters"
          :key="character.id"
          type="button"
          :aria-pressed="activeCharacter.id === character.id"
          @click="selectCharacter(character.id)"
        >
          <img :src="assetUrl(character.image)" :alt="character.name" />
          <span>
            <strong>{{ character.name }}</strong>
            <small>{{ selectedByCharacter[character.id].length }} / {{ maxPoints }}</small>
          </span>
        </button>
      </aside>

      <section class="canvas-planner" :aria-label="`${activeCharacter.name}技能树`">
        <div class="canvas-toolbar">
          <div class="canvas-character">
            <img :src="assetUrl(activeCharacter.image)" :alt="activeCharacter.name" />
            <span>
              <small>{{ activeCharacter.title }}</small>
              <strong>{{ activeCharacter.name }}</strong>
            </span>
          </div>

          <div class="canvas-points" aria-live="polite">
            <strong>{{ selectedCount }}</strong>
            <span>/ {{ maxPoints }} 洞察</span>
            <i>{{ remainingPoints }} 点可用</i>
          </div>

          <div class="canvas-actions">
            <button type="button" class="danger" :disabled="selectedCount === 0" @click="resetCharacter">重置</button>
          </div>
        </div>

        <div ref="canvasScroll" class="skill-canvas-scroll">
          <div ref="canvasShell" class="skill-canvas-shell">
            <img class="canvas-character-mark" :src="assetUrl(activeCharacter.image)" alt="" aria-hidden="true" />
            <canvas
              ref="canvas"
              tabindex="0"
              :aria-label="`${activeCharacter.name}技能树画布。已分配 ${selectedCount} 点洞察。点击技能点选择，或使用方向键浏览节点并按回车选择。`"
              aria-describedby="canvas-feedback"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerCancel"
              @pointerleave="onPointerLeave"
              @contextmenu.prevent="onContextMenu"
              @keydown="onKeydown"
            ></canvas>

            <div v-if="tooltip.visible && hoveredSkill" class="canvas-tooltip" :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }">
              <small>{{ groupLabels[groupAliases[hoveredSkill.group] ?? hoveredSkill.group] ?? hoveredSkill.group }}</small>
              <strong>{{ hoveredSkill.title }}</strong>
              <p>{{ hoveredSkill.desc }}</p>
              <footer>
                <span>{{ skillStatus(hoveredSkill) }}</span>
                <i v-for="label in conditionLabels(hoveredSkill)" :key="label">{{ label }}</i>
              </footer>
            </div>

            <p id="canvas-feedback" class="canvas-feedback" role="status">{{ feedback }}</p>
          </div>
        </div>
      </section>
    </div>

    <div v-if="dialogSkill" class="skill-dialog-backdrop" @pointerdown.self="closeSkillDialog">
      <section
        class="skill-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-dialog-title"
        aria-describedby="skill-dialog-description"
        @keydown.esc="closeSkillDialog"
      >
        <header>
          <span class="skill-dialog-glyph">
            <img class="skill-dialog-frame" :src="assetUrl(skillTreeImagePaths.selectable)" alt="" />
            <img class="skill-dialog-icon" :src="assetUrl(skillIconPath(dialogSkill))" alt="" />
          </span>
          <div>
            <small>{{ groupLabels[groupAliases[dialogSkill.group] ?? dialogSkill.group] ?? dialogSkill.group }}</small>
            <h2 id="skill-dialog-title">{{ dialogSkill.title }}</h2>
          </div>
          <button ref="dialogCloseButton" type="button" aria-label="关闭技能介绍" @click="closeSkillDialog">×</button>
        </header>
        <em :class="{ selected: selectedIds.has(dialogSkill.id) }">{{ skillStatus(dialogSkill) }}</em>
        <p id="skill-dialog-description">{{ dialogSkill.desc }}</p>
        <div class="skill-dialog-conditions">
          <span v-for="label in conditionLabels(dialogSkill)" :key="label">{{ label }}</span>
          <span v-if="!conditionLabels(dialogSkill).length">无额外解锁条件</span>
        </div>
        <footer>
          <button type="button" :class="{ selected: selectedIds.has(dialogSkill.id) }" :disabled="!canSelect(dialogSkill)" @click="applyDialogSkill">
            {{ selectedIds.has(dialogSkill.id) ? '取消此技能' : '学习此技能' }}
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>
