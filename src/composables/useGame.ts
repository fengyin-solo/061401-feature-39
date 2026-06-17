import { ref, computed, watch } from 'vue'
import type { GameState, LogEntry, RandomEvent, ActionType, ActionEffect, PriorityItem } from '@/types/game'
import { randomEvents } from '@/data/events'

const STORAGE_KEY_HIGH_SCORE = 'survival_game_high_score'
const MAX_STAT = 100

const actionEffects: Record<ActionType, ActionEffect> = {
  gatherWood: {
    health: -5, hunger: 5, thirst: 3, wood: 10, stone: 0 },
  gatherStone: {
    health: -8, hunger: 6, thirst: 4, wood: 0, stone: 8 },
  hunt: {
    health: 15, hunger: -20, thirst: 5, wood: -5, stone: 0 },
  drink: {
    health: 0, hunger: 2, thirst: -25, wood: -3, stone: 0 },
}

const actionNames: Record<ActionType, string> = {
  gatherWood: '采集木头',
  gatherStone: '采集石头',
  hunt: '打猎',
  drink: '喝水',
}

export function useGame() {
  const state = ref<GameState>({
    health: 80,
    hunger: 30,
    thirst: 30,
    wood: 10,
    stone: 5,
    turn: 0,
    isGameOver: false,
    logs: [],
  })

  const highScore = ref<number>(0)
  let logIdCounter = 0

  const canAct = computed(() => !state.value.isGameOver)

  function loadHighScore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HIGH_SCORE)
      if (saved) {
        highScore.value = parseInt(saved, 10) || 0
      }
    } catch (e) {
      highScore.value = 0
    }
  }

  function saveHighScore() {
    if (state.value.turn > highScore.value) {
      highScore.value = state.value.turn
      try {
        localStorage.setItem(STORAGE_KEY_HIGH_SCORE, String(highScore.value))
      } catch (e) {
        // ignore
      }
    }
  }

  function addLog(text: string, type: LogEntry['type'] = 'action') {
    state.value.logs.unshift({
      id: ++logIdCounter,
      text,
      type,
      turn: state.value.turn,
    })
    if (state.value.logs.length > 50) {
      state.value.logs.pop()
    }
  }

  function clampStat(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  function applyEffects(effects: ActionEffect) {
    if (effects.health !== undefined) {
      state.value.health = clampStat(state.value.health + effects.health, 0, MAX_STAT)
    }
    if (effects.hunger !== undefined) {
      state.value.hunger = clampStat(state.value.hunger + effects.hunger, 0, MAX_STAT)
    }
    if (effects.thirst !== undefined) {
      state.value.thirst = clampStat(state.value.thirst + effects.thirst, 0, MAX_STAT)
    }
    if (effects.wood !== undefined) {
      state.value.wood = Math.max(0, state.value.wood + effects.wood)
    }
    if (effects.stone !== undefined) {
      state.value.stone = Math.max(0, state.value.stone + effects.stone)
    }
  }

  function getRandomEvent(): RandomEvent {
    const index = Math.floor(Math.random() * randomEvents.length)
    return randomEvents[index]
  }

  function checkGameOver() {
    if (state.value.health <= 0 || state.value.hunger >= MAX_STAT || state.value.thirst >= MAX_STAT) {
      state.value.isGameOver = true
      saveHighScore()
      addLog('你没能在荒野中生存下来...', 'system')
    }
  }

  function canPerformAction(action: ActionType): boolean {
    if (state.value.isGameOver) return false
    const effects = actionEffects[action]
    if (effects.wood !== undefined && state.value.wood + effects.wood < 0) {
      return false
    }
    if (effects.stone !== undefined && state.value.stone + effects.stone < 0) {
      return false
    }
    return true
  }

  function performAction(action: ActionType) {
    if (!canPerformAction(action)) return

    const effects = actionEffects[action]
    applyEffects(effects)
    state.value.turn++

    addLog(`第 ${state.value.turn} 回合：${actionNames[action]}`, 'action')

    const event = getRandomEvent()
    applyEffects(event.effects)

    const eventLogType = event.type === 'good' ? 'good' : event.type === 'bad' ? 'bad' : 'event'
    addLog(event.text, eventLogType)

    checkGameOver()
  }

  function gatherWood() {
    performAction('gatherWood')
  }

  function gatherStone() {
    performAction('gatherStone')
  }

  function hunt() {
    performAction('hunt')
  }

  function drink() {
    performAction('drink')
  }

  function getUrgencyLevel(score: number): PriorityItem['urgency'] {
    if (score >= 80) return 'critical'
    if (score >= 50) return 'high'
    if (score >= 20) return 'medium'
    return 'low'
  }

  function buildReason(action: ActionType, score: number): string {
    const s = state.value
    const reasons: string[] = []

    switch (action) {
      case 'hunt':
        if (s.health <= 30) reasons.push('生命值危急')
        else if (s.health <= 50) reasons.push('生命值偏低')
        if (s.hunger >= 80) reasons.push('即将饿死')
        else if (s.hunger >= 60) reasons.push('饥饿严重')
        if (s.hunger >= 50 && s.wood >= 5) reasons.push('有足够木材打猎')
        break
      case 'drink':
        if (s.thirst >= 80) reasons.push('即将渴死')
        else if (s.thirst >= 60) reasons.push('口渴严重')
        if (s.thirst >= 50 && s.wood >= 3) reasons.push('有木材烧水')
        break
      case 'gatherWood':
        if (s.wood < 3 && s.thirst >= 40) reasons.push('需要木材烧水喝')
        if (s.wood < 5 && s.hunger >= 40) reasons.push('需要木材打猎')
        if (s.wood < 10) reasons.push('木材储备不足')
        break
      case 'gatherStone':
        if (s.stone < 5) reasons.push('石头储备不足')
        if (s.health > 50 && s.hunger < 60 && s.thirst < 60) reasons.push('状态良好可采集')
        break
    }

    if (reasons.length === 0) {
      if (score >= 50) reasons.push('当前合理选择')
      else reasons.push('可选行动')
    }

    return reasons.join('，')
  }

  function calculatePriority(): PriorityItem[] {
    const s = state.value
    const MAX = MAX_STAT

    const weights = {
      healthCrisis: 3.0,
      hungerCrisis: 2.8,
      thirstCrisis: 2.8,
      healthImprove: 1.5,
      hungerImprove: 1.3,
      thirstImprove: 1.3,
      resourceValue: 0.8,
    }

    function scoreAction(action: ActionType): number {
      const eff = actionEffects[action]
      let score = 0

      if (eff.health !== undefined) {
        const healthGap = s.health <= 30 ? (30 - s.health) * weights.healthCrisis : 0
        const healthGain = eff.health > 0 ? eff.health * (s.health < 50 ? weights.healthImprove : 0.6) : 0
        const healthLoss = eff.health < 0 ? -eff.health * (s.health <= 40 ? 2.5 : 1) : 0
        score += healthGap + healthGain - healthLoss
      }

      if (eff.hunger !== undefined) {
        const hungerGap = s.hunger >= 70 ? (s.hunger - 70) * weights.hungerCrisis : 0
        const hungerReduce = eff.hunger < 0 ? -eff.hunger * (s.hunger > 40 ? weights.hungerImprove : 0.5) : 0
        const hungerIncrease = eff.hunger > 0 ? eff.hunger * (s.hunger >= 60 ? 2.0 : 1) : 0
        score += hungerGap + hungerReduce - hungerIncrease
      }

      if (eff.thirst !== undefined) {
        const thirstGap = s.thirst >= 70 ? (s.thirst - 70) * weights.thirstCrisis : 0
        const thirstReduce = eff.thirst < 0 ? -eff.thirst * (s.thirst > 40 ? weights.thirstImprove : 0.5) : 0
        const thirstIncrease = eff.thirst > 0 ? eff.thirst * (s.thirst >= 60 ? 2.0 : 1) : 0
        score += thirstGap + thirstReduce - thirstIncrease
      }

      if (eff.wood !== undefined) {
        const woodNeed = (s.wood < 5 ? (5 - s.wood) * 1.5 : s.wood < 10 ? (10 - s.wood) * 0.5 : 0)
        const woodGain = eff.wood > 0 ? eff.wood * weights.resourceValue * (s.wood < 15 ? 1.5 : 1) : 0
        const woodLoss = eff.wood < 0 && s.wood + eff.wood < 3 ? (-eff.wood) * 2 : 0
        score += (eff.wood > 0 ? woodNeed * 0.8 : 0) + woodGain - woodLoss
      }

      if (eff.stone !== undefined) {
        const stoneNeed = (s.stone < 3 ? (3 - s.stone) * 1.2 : s.stone < 8 ? (8 - s.stone) * 0.4 : 0)
        const stoneGain = eff.stone > 0 ? eff.stone * weights.resourceValue * (s.stone < 12 ? 1.3 : 1) : 0
        score += (eff.stone > 0 ? stoneNeed * 0.7 : 0) + stoneGain
      }

      if (!canPerformAction(action)) {
        score -= 50
      }

      return Math.round(score)
    }

    const actionInfo: Record<ActionType, { name: string; icon: string }> = {
      gatherWood: { name: '采集木头', icon: '🪵' },
      gatherStone: { name: '采集石头', icon: '🪨' },
      hunt: { name: '打猎', icon: '🏹' },
      drink: { name: '喝水', icon: '💧' },
    }

    const actions: ActionType[] = ['gatherWood', 'gatherStone', 'hunt', 'drink']
    const items: PriorityItem[] = actions.map(action => {
      const score = scoreAction(action)
      return {
        action,
        name: actionInfo[action].name,
        icon: actionInfo[action].icon,
        score,
        reason: buildReason(action, score),
        urgency: getUrgencyLevel(score),
      }
    })

    return items.sort((a, b) => b.score - a.score)
  }

  const priorities = computed(() => calculatePriority())

  function restart() {
    state.value = {
      health: 80,
      hunger: 30,
      thirst: 30,
      wood: 10,
      stone: 5,
      turn: 0,
      isGameOver: false,
      logs: [],
    }
    logIdCounter = 0
    addLog('你醒来发现自己身处荒野中，需要想办法生存下去...', 'system')
  }

  loadHighScore()
  addLog('你醒来发现自己身处荒野中，需要想办法生存下去...', 'system')

  return {
    state,
    highScore,
    canAct,
    canPerformAction,
    priorities,
    gatherWood,
    gatherStone,
    hunt,
    drink,
    restart,
  }
}
