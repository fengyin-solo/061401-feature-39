<script setup lang="ts">
import type { PriorityItem } from '@/types/game'

interface Props {
  priorities: PriorityItem[]
  disabled?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  selectAction: [action: PriorityItem['action']]
}>()

function getUrgencyStyles(urgency: PriorityItem['urgency']): {
  badge: string
  border: string
  glow: string
  rank: string
} {
  switch (urgency) {
    case 'critical':
      return {
        badge: 'bg-red-500 text-white',
        border: 'border-red-500/60',
        glow: 'shadow-[0_0_20px_rgba(239,68,68,0.25)]',
        rank: 'text-red-400',
      }
    case 'high':
      return {
        badge: 'bg-orange-500 text-white',
        border: 'border-orange-500/50',
        glow: 'shadow-[0_0_16px_rgba(249,115,22,0.2)]',
        rank: 'text-orange-400',
      }
    case 'medium':
      return {
        badge: 'bg-yellow-500 text-gray-900',
        border: 'border-yellow-500/40',
        glow: 'shadow-[0_0_12px_rgba(234,179,8,0.15)]',
        rank: 'text-yellow-400',
      }
    default:
      return {
        badge: 'bg-gray-500 text-white',
        border: 'border-gray-600/40',
        glow: '',
        rank: 'text-gray-400',
      }
  }
}

function getUrgencyLabel(urgency: PriorityItem['urgency']): string {
  switch (urgency) {
    case 'critical':
      return '紧急'
    case 'high':
      return '优先'
    case 'medium':
      return '建议'
    default:
      return '可选'
  }
}
</script>

<template>
  <div class="bg-game-card rounded-2xl p-6 border border-game-border shadow-xl">
    <h2 class="text-xl font-bold text-white mb-5 flex items-center gap-2">
      <span>🎯</span>
      <span>回合优先级</span>
    </h2>
    <div class="space-y-3">
      <div
        v-for="(item, index) in priorities"
        :key="item.action"
        @click="!disabled && emit('selectAction', item.action)"
        :class="[
          'relative rounded-xl border-2 p-4 transition-all duration-200',
          getUrgencyStyles(item.urgency).border,
          getUrgencyStyles(item.urgency).glow,
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]',
          index === 0 ? 'bg-gradient-to-r from-game-card via-game-card/80 to-game-card' : 'bg-game-card/50',
        ]"
      >
        <div class="flex items-start gap-3">
          <div
            :class="[
              'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xl font-bold',
              getUrgencyStyles(item.urgency).rank,
              index === 0 ? 'bg-white/10' : 'bg-white/5',
            ]"
          >
            {{ index + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1.5">
              <span class="text-xl">{{ item.icon }}</span>
              <span class="font-semibold text-white">{{ item.name }}</span>
              <span
                :class="[
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  getUrgencyStyles(item.urgency).badge,
                ]"
              >
                {{ getUrgencyLabel(item.urgency) }}
              </span>
              <span
                :class="[
                  'ml-auto text-xs font-mono px-2 py-0.5 rounded',
                  item.score >= 50 ? 'text-green-400 bg-green-500/10' : item.score >= 0 ? 'text-gray-400 bg-gray-500/10' : 'text-red-400 bg-red-500/10',
                ]"
              >
                {{ item.score >= 0 ? '+' : '' }}{{ item.score }}
              </span>
            </div>
            <p class="text-sm text-gray-400 leading-relaxed">{{ item.reason }}</p>
          </div>
        </div>
        <div
          v-if="index === 0 && !disabled"
          class="absolute -top-2 -right-2"
        >
          <span class="px-2 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 text-xs font-bold rounded-full shadow-lg animate-pulse-soft">
            ⭐ 推荐
          </span>
        </div>
      </div>
    </div>
    <p class="mt-4 text-xs text-gray-500 text-center">
      每次行动后自动刷新优先级排序
    </p>
  </div>
</template>
