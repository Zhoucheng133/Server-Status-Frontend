import type { CountryCount } from './api'

export interface Rectangle extends CountryCount { x: number; y: number; width: number; height: number }

export function treemap(countries: CountryCount[]): Rectangle[] {
  const result: Rectangle[] = []
  function partition(items: CountryCount[], x: number, y: number, width: number, height: number) {
    if (items.length === 0) return
    if (items.length === 1) {
      result.push({ ...items[0]!, x, y, width, height })
      return
    }
    const total = items.reduce((sum, item) => sum + item.count, 0)
    let split = 1
    let first = items[0]!.count
    while (split < items.length - 1 && Math.abs(total / 2 - first - items[split]!.count) < Math.abs(total / 2 - first)) {
      first += items[split]!.count
      split++
    }
    // The chart is roughly three times as wide as it is tall.
    if (width * 3 > height) {
      const cut = width * first / total
      partition(items.slice(0, split), x, y, cut, height)
      partition(items.slice(split), x + cut, y, width - cut, height)
    } else {
      const cut = height * first / total
      partition(items.slice(0, split), x, y, width, cut)
      partition(items.slice(split), x, y + cut, width, height - cut)
    }
  }
  partition(countries.filter(item => item.count > 0).sort((a, b) => b.count - a.count), 0, 0, 100, 100)
  return result
}

export const historyIntervalMs = 5 * 60_000
const bucketCount = 288

export interface ChartBucket {
  time: number
  value: number | undefined
  x: number
  y: number | undefined
}

export function historyChart(points: { time: string; value: number }[], end: number, fillZero: boolean, minimumMax = 1) {
  const lastBucket = Math.floor(end / historyIntervalMs) * historyIntervalMs
  const start = lastBucket - (bucketCount - 1) * historyIntervalMs
  const values = new Map(points.map(point => [Math.floor(Date.parse(point.time) / historyIntervalMs) * historyIntervalMs, point.value]))
  const max = Math.max(minimumMax, ...values.values())
  const buckets: ChartBucket[] = []
  const segments: ChartBucket[][] = []
  let segment: ChartBucket[] = []
  for (let i = 0; i < bucketCount; i++) {
    const time = start + historyIntervalMs * i
    const value = values.get(time) ?? (fillZero ? 0 : undefined)
    const bucket = { time, value, x: 8 + 744 * i / (bucketCount - 1), y: value === undefined ? undefined : 176 - 164 * value / max }
    buckets.push(bucket)
    if (value === undefined) {
      if (segment.length) segments.push(segment)
      segment = []
    } else {
      segment.push(bucket)
    }
  }
  if (segment.length) segments.push(segment)
  return { max, start: new Date(start).toISOString(), end: new Date(lastBucket).toISOString(), buckets,
    segments: segments.map(points => {
      const first = points[0]!
      const last = points.at(-1)!
      const line = points.map(point => `${point.x.toFixed(2)},${point.y!.toFixed(2)}`).join(' ')
      return { line, area: `${first.x},176 ${line} ${last.x},176`, dot: points.length === 1 ? first : null }
    }),
  }
}
