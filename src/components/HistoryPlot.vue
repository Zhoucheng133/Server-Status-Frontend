<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import type { historyChart } from '../charts'

const props = defineProps<{
  chart: ReturnType<typeof historyChart>
  label: string
  color: string
  formatValue: (value: number) => string
}>()

const { locale, t } = useI18n()
const gradientId = useId()
const selection = ref<number | null>(null)
const lastIndex = computed(() => props.chart.buckets.length - 1)
const selected = computed(() => selection.value === null ? undefined : props.chart.buckets[selection.value])
const formatter = computed(() => new Intl.DateTimeFormat(locale.value, {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
}))
const timeText = computed(() => selected.value ? formatter.value.format(selected.value.time) : '')
const reading = computed(() => selected.value?.value === undefined ? t('noData') : props.formatValue(selected.value.value))

function inspectPointer(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (!bounds.width) return
  const svgX = (event.clientX - bounds.left) / bounds.width * 760
  const first = props.chart.buckets[0]!.x
  const last = props.chart.buckets[lastIndex.value]!.x
  selection.value = Math.max(0, Math.min(lastIndex.value, Math.round((svgX - first) / (last - first) * lastIndex.value)))
}

function inspectLatest() {
  if (selection.value !== null) return
  let index = lastIndex.value
  while (index > 0 && props.chart.buckets[index]?.value === undefined) index--
  selection.value = index
}

function onKeydown(event: KeyboardEvent) {
  const current = selection.value ?? lastIndex.value
  switch (event.key) {
    case 'ArrowLeft': selection.value = Math.max(0, current - 1); break
    case 'ArrowRight': selection.value = Math.min(lastIndex.value, current + 1); break
    case 'Home': selection.value = 0; break
    case 'End': selection.value = lastIndex.value; break
    case 'Escape': selection.value = null; break
    default: return
  }
  event.preventDefault()
}
</script>

<template>
  <div class="history-plot" tabindex="0" role="slider" :aria-label="label" :aria-valuemin="0"
    :aria-valuemax="lastIndex" :aria-valuenow="selection ?? lastIndex" :aria-valuetext="selected ? timeText + ', ' + reading : undefined"
    @pointermove="inspectPointer" @pointerdown="inspectPointer" @pointerleave="event => { if (event.pointerType !== 'touch') selection = null }"
    @pointercancel="selection = null" @focus="inspectLatest" @blur="selection = null" @keydown="onKeydown">
    <svg class="line-chart" viewBox="0 0 760 188" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient :id="gradientId" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity=".23" />
          <stop offset="100%" :stop-color="color" stop-opacity=".01" />
        </linearGradient>
      </defs>
      <line v-for="y in [14, 54, 94, 134, 174]" :key="y" x1="8" :y1="y" x2="752" :y2="y" class="chart-gridline" />
      <g v-for="(segment, index) in chart.segments" :key="index">
        <polygon :points="segment.area" :fill="'url(#' + gradientId + ')'" />
        <ellipse v-if="segment.dot" :cx="segment.dot.x" :cy="segment.dot.y" rx="3" ry="3" :fill="color" />
        <polyline v-else :points="segment.line" fill="none" :stroke="color" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      </g>
      <line v-if="selected" :x1="selected.x" :x2="selected.x" y1="12" y2="176" class="chart-inspection-line" />
    </svg>
    <template v-if="selected">
      <span v-if="selected.y !== undefined" class="chart-inspection-dot" aria-hidden="true"
        :style="{ left: selected.x / 760 * 100 + '%', top: selected.y / 188 * 100 + '%', backgroundColor: color }" />
      <div class="chart-tooltip" :class="{ 'chart-tooltip-left': selected.x > 380 }"
        :style="{ left: selected.x / 760 * 100 + '%' }" aria-hidden="true">
        <span>{{ timeText }}</span>
        <strong>{{ label }} · {{ reading }}</strong>
      </div>
    </template>
  </div>
</template>
