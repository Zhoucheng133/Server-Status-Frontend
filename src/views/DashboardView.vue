<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api, { type RecentIP, type MetricPoint, type Overview } from '../api'
import { historyChart, treemap } from '../charts'
import HistoryPlot from '../components/HistoryPlot.vue'
import { useAuthStore } from '../stores/auth'

const { t, locale } = useI18n()
const auth = useAuthStore()
const overview = ref<Overview>({ metrics: [], requests: [], countries: [], sites: [] })
const recentIPs = ref<RecentIP[]>([])
const live = ref<MetricPoint | null>(null)
const sources = ref<string[]>([])
const selectedSources = ref<string[]>([])
const showSettings = ref(false)
const loading = ref(true)
const saving = ref(false)
const failure = ref('')
const settingsError = ref('')
const needsSetup = ref(false)
const selectedMetric = ref<'cpu' | 'memory' | 'in' | 'out'>('cpu')
let overviewTimer: number | undefined
let liveTimer: number | undefined

const selectedSite = ref('')
const updatedAt = ref(Date.now())
let overviewVersion = 0
const regionNames = computed(() => new Intl.DisplayNames([locale.value], { type: 'region' }))
const rectangles = computed(() => treemap(overview.value.countries))
function countryName(code: string) {
  if (/^[A-Z]{2}$/.test(code)) return regionNames.value.of(code) ?? code
  if (!code || code.toLowerCase() === 'unknown') return t('unknown')
  if (code.toLowerCase().includes('private')) return t('privateNetwork')
  return code
}

const latest = computed(() => overview.value.metrics.at(-1))
const metricDefinition = computed(() => ({
  cpu: { label: t('cpu'), color: '#e45d4d', value: (point: MetricPoint) => point.cpu_percent, suffix: '%' },
  memory: { label: t('memory'), color: '#2a9d8f', value: (point: MetricPoint) => point.memory_percent, suffix: '%' },
  in: { label: t('inbound'), color: '#3b82c4', value: (point: MetricPoint) => point.network_in_bytes, suffix: '' },
  out: { label: t('outbound'), color: '#b37b2b', value: (point: MetricPoint) => point.network_out_bytes, suffix: '' },
}[selectedMetric.value]))

const performanceChart = computed(() => historyChart(overview.value.metrics.map(point => ({
  time: point.timestamp, value: metricDefinition.value.value(point),
})), updatedAt.value, false, selectedMetric.value === 'cpu' || selectedMetric.value === 'memory' ? 100 : 1))
const requestChart = computed(() => historyChart(overview.value.requests.map(point => ({
  time: point.timestamp, value: point.count,
})), updatedAt.value, true))

function formatBytes(value: number, perSecond = false) {
  if (!Number.isFinite(value) || value < 0) return '0 B' + (perSecond ? '/s' : '')
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++ }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unit]}${perSecond ? '/s' : ''}`
}

function formatMetricValue(value: number) {
  if (selectedMetric.value === 'in' || selectedMetric.value === 'out') return formatBytes(value, true)
  return new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 1 }).format(value / 100)
}

function formatRequestCount(value: number) {
  return `${value.toLocaleString(locale.value)} ${t('perMinute')}`
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale.value === 'zh' ? 'zh-CN' : 'en', { hour: '2-digit', minute: '2-digit' }).format(date)
}

const currentMetric = computed(() => live.value ?? latest.value)
const cardReadings = computed(() => {
  const sample = currentMetric.value
  return {
    cpu: sample?.cpu_percent.toFixed(1),
    memory: sample?.memory_percent.toFixed(1),
    inbound: sample && formatBytes(sample.network_in_bytes, true),
    outbound: sample && formatBytes(sample.network_out_bytes, true),
  }
})

function iconHint(metric: keyof typeof cardReadings.value) {
  const sample = currentMetric.value
  if (!sample) return t('noData')
  const unit = metric === 'cpu' || metric === 'memory' ? '%' : ''
  return [t(metric), cardReadings.value[metric] + unit, formatTimestamp(sample.timestamp)].join(' · ')
}

async function loadOverview() {
  const version = ++overviewVersion
  loading.value = true
  try {
    const { data } = await api.get<Overview>('/overview', { params: { site: selectedSite.value || undefined } })
    if (version !== overviewVersion) return
    updatedAt.value = Date.now()
    overview.value = { metrics: data.metrics ?? [], requests: data.requests ?? [], countries: data.countries ?? [], sites: data.sites ?? [] }
    failure.value = ''
  } catch {
    if (version === overviewVersion) failure.value = 'networkError'
  } finally {
    if (version === overviewVersion) loading.value = false
  }
}

async function loadLive() {
  try {
    const { data } = await api.get<MetricPoint>('/live')
    if (auth.authenticated) live.value = data
  } catch {
    live.value = null
  }
}

async function loadIPs() {
  if (!auth.authenticated) {
    recentIPs.value = []
    return
  }
  try {
    const { data } = await api.get('/ips')
    if (auth.authenticated) recentIPs.value = data.recent_ips ?? []
  } catch {
    recentIPs.value = []
  }
}

async function loadSources() {
  try {
    const { data } = await api.get('/log-sources')
    if (auth.authenticated) sources.value = data.sources ?? []
  } catch {
    sources.value = []
  }
}

async function loadStatus() {
  try {
    const { data } = await api.get('/status')
    needsSetup.value = Boolean(data.needs_setup)
  } catch {
    needsSetup.value = false
  }
}

async function openSettings() {
  if (!auth.authenticated) return
  await loadSources()
  if (!auth.authenticated) return
  selectedSources.value = [...(auth.user?.log_sources ?? [])]
  settingsError.value = ''
  showSettings.value = true
}

async function saveSettings() {
  if (!selectedSources.value.length) {
    settingsError.value = t('chooseLogs')
    return
  }
  saving.value = true
  settingsError.value = ''
  try {
    await api.put('/settings/log-sources', { sources: selectedSources.value })
    if (auth.user) auth.user.log_sources = [...selectedSources.value]
    if (auth.user) auth.user.configured = true
    needsSetup.value = false
    showSettings.value = false
    await refreshDashboard()
  } catch {
    settingsError.value = t('saveError')
  } finally {
    saving.value = false
  }
}

async function refreshDashboard() {
  await Promise.all([loadOverview(), loadIPs()])
}

function toggleSource(name: string) {
  selectedSources.value = selectedSources.value.includes(name)
    ? selectedSources.value.filter((item) => item !== name)
    : [...selectedSources.value, name]
}

function startLiveSampling() {
  if (auth.authenticated) {
    void loadLive()
    liveTimer = window.setInterval(loadLive, 5000)
  } else {
    live.value = null
    recentIPs.value = []
    sources.value = []
    selectedSources.value = []
    showSettings.value = false
    if (liveTimer) window.clearInterval(liveTimer)
  }
}

watch(() => auth.authenticated, startLiveSampling)
watch(() => auth.authenticated, loadIPs)
watch(selectedSite, loadOverview)
watch(() => auth.user?.configured, (configured) => {
  if (configured === false) void openSettings()
}, { immediate: true })
onMounted(() => {
  void loadStatus()
  void loadOverview()
  void loadIPs()
  overviewTimer = window.setInterval(refreshDashboard, 60000)
  startLiveSampling()
})
onBeforeUnmount(() => {
  if (overviewTimer) window.clearInterval(overviewTimer)
  if (liveTimer) window.clearInterval(liveTimer)
})
</script>

<template>
  <section class="dashboard-heading">
    <div>
      <div class="eyebrow"><span class="eyebrow-dot" />{{ t('last24') }}</div>
      <h1>{{ t('dashboard') }}</h1>
      <p>{{ t('subtitle') }}</p>
    </div>
    <div class="heading-actions">
      <button v-if="auth.authenticated" class="outline-button" type="button" :disabled="loading" @click="refreshDashboard"><i class="fa-solid fa-rotate" :class="{ 'spin': loading }" />{{ t('refresh') }}</button>
      <button v-if="auth.authenticated" class="outline-button" type="button" @click="openSettings"><i class="fa-solid fa-sliders" />{{ t('settings') }}</button>
      <RouterLink v-else-if="needsSetup" class="primary-button" to="/register"><i class="fa-solid fa-plus" />{{ t('setupAction') }}</RouterLink>
    </div>
  </section>

  <div v-if="failure" class="notice notice-error"><i class="fa-solid fa-circle-exclamation" />{{ t(failure) }}</div>
  <div v-if="auth.authenticated && (needsSetup || (auth.user && !auth.user.configured))" class="notice notice-warn">
    <i class="fa-solid fa-triangle-exclamation" />{{ t('notConfigured') }}
    <button class="text-button" type="button" @click="openSettings">{{ t('sourceSettings') }} <i class="fa-solid fa-arrow-right" /></button>
  </div>

  <section class="metric-grid" :aria-label="t('overview')">
    <article class="metric-card metric-cpu">
      <div class="metric-top"><span class="metric-icon" role="img" tabindex="0" :aria-label="iconHint('cpu')"><i class="fa-solid fa-microchip" aria-hidden="true" /><span class="metric-hint" aria-hidden="true">{{ iconHint('cpu') }}</span></span><span class="metric-caption">{{ live ? t('live') : t('overview') }}</span></div>
      <div class="metric-label">{{ t('cpu') }}</div>
      <div class="metric-value">{{ cardReadings.cpu ?? '—' }}<span>%</span></div>
      <div class="metric-foot"><span class="status-dot" :class="auth.authenticated && live ? 'dot-green' : 'dot-muted'" />{{ auth.authenticated && live ? t('liveOn') : auth.authenticated ? t('loading') : t('liveOff') }}</div>
      <div class="metric-track"><span :style="{ width: `${Math.min(100, live?.cpu_percent ?? latest?.cpu_percent ?? 0)}%` }" /></div>
    </article>
    <article class="metric-card metric-memory">
      <div class="metric-top"><span class="metric-icon" role="img" tabindex="0" :aria-label="iconHint('memory')"><i class="fa-solid fa-memory" aria-hidden="true" /><span class="metric-hint" aria-hidden="true">{{ iconHint('memory') }}</span></span><span class="metric-caption">{{ live ? t('live') : t('last24') }}</span></div>
      <div class="metric-label">{{ t('memory') }}</div>
      <div class="metric-value">{{ cardReadings.memory ?? '—' }}<span>%</span></div>
      <div class="metric-foot">{{ live ? t('live') : t('overview') }}</div>
      <div class="metric-track"><span :style="{ width: `${Math.min(100, live?.memory_percent ?? latest?.memory_percent ?? 0)}%` }" /></div>
    </article>
    <article class="metric-card metric-network-in">
      <div class="metric-top"><span class="metric-icon" role="img" tabindex="0" :aria-label="iconHint('inbound')"><i class="fa-solid fa-arrow-down" aria-hidden="true" /><span class="metric-hint" aria-hidden="true">{{ iconHint('inbound') }}</span></span><span class="metric-caption">{{ live ? t('live') : t('last24') }}</span></div>
      <div class="metric-label">{{ t('inbound') }}</div>
      <div class="metric-value metric-bandwidth">{{ cardReadings.inbound ?? '—' }}</div>
      <div class="metric-foot">{{ live ? t('liveOn') : t('overview') }}</div>
    </article>
    <article class="metric-card metric-network-out">
      <div class="metric-top"><span class="metric-icon" role="img" tabindex="0" :aria-label="iconHint('outbound')"><i class="fa-solid fa-arrow-up" aria-hidden="true" /><span class="metric-hint" aria-hidden="true">{{ iconHint('outbound') }}</span></span><span class="metric-caption">{{ live ? t('live') : t('last24') }}</span></div>
      <div class="metric-label">{{ t('outbound') }}</div>
      <div class="metric-value metric-bandwidth">{{ cardReadings.outbound ?? '—' }}</div>
      <div class="metric-foot">{{ live ? t('liveOn') : t('overview') }}</div>
    </article>
  </section>

  <section class="content-grid">
    <article class="panel performance-panel">
      <div class="panel-heading">
        <div><h2>{{ t('overview') }}</h2><p>{{ metricDefinition.label }} · {{ t('last24') }}</p></div>
        <div class="segmented-control" role="tablist" :aria-label="t('overview')">
          <button v-for="item in [{ id: 'cpu', text: t('cpu') }, { id: 'memory', text: t('memory') }, { id: 'in', text: t('inbound') }, { id: 'out', text: t('outbound') }]" :key="item.id" type="button" :class="{ active: selectedMetric === item.id }" @click="selectedMetric = item.id as typeof selectedMetric">{{ item.text }}</button>
        </div>
      </div>
      <div v-if="loading && !overview.metrics.length" class="chart-empty">{{ t('loading') }}</div>
      <div v-else-if="!overview.metrics.length" class="chart-empty">{{ t('noData') }}</div>
      <div v-else class="chart-wrap">
        <div class="chart-scale"><span>{{ selectedMetric === 'cpu' || selectedMetric === 'memory' ? '100%' : formatBytes(performanceChart.max, true) }}</span><span>{{ selectedMetric === 'cpu' || selectedMetric === 'memory' ? '50%' : formatBytes(performanceChart.max / 2, true) }}</span><span>0</span></div>
        <HistoryPlot :chart="performanceChart" :label="metricDefinition.label" :color="metricDefinition.color"
          :format-value="formatMetricValue" />
        <div class="chart-axis"><span>{{ formatTimestamp(performanceChart.start) }}</span><span>{{ formatTimestamp(performanceChart.end) }}</span></div>
      </div>
    </article>

    <article class="panel traffic-panel">
      <div class="panel-heading"><div><h2>{{ t('requests') }}</h2><p>{{ t('last24') }}</p></div><span class="panel-total">{{ overview.requests.reduce((sum, point) => sum + point.count, 0).toLocaleString() }}</span></div>
      <select v-model="selectedSite" class="site-select" :aria-label="t('site')"><option value="">{{ t('allSites') }}</option><option v-for="site in overview.sites" :key="site" :value="site">{{ site }}</option></select>
      <div v-if="!overview.requests.length" class="chart-empty">{{ loading ? t('loading') : t('noData') }}</div>
      <div v-else class="chart-wrap traffic-chart-wrap">
        <div class="chart-scale"><span>{{ requestChart.max.toLocaleString() }}</span><span>{{ Math.round(requestChart.max / 2).toLocaleString() }}</span><span>0</span></div>
        <HistoryPlot :chart="requestChart" :label="t('requests')" color="#c77449"
          :format-value="formatRequestCount" />
        <div class="chart-axis"><span>{{ formatTimestamp(requestChart.start) }}</span><span>{{ formatTimestamp(requestChart.end) }}</span></div>
      </div>
    </article>
  </section>

  <section class="bottom-grid">
    <article class="panel country-panel">
      <div class="panel-heading"><div><h2>{{ t('countries') }}</h2><p>{{ t('last24') }}</p></div><span class="location-total"><i class="fa-solid fa-earth-asia" />{{ overview.countries.reduce((sum, item) => sum + item.count, 0).toLocaleString() }}</span></div>
      <div v-if="!overview.countries.length" class="chart-empty compact-empty">{{ loading ? t('loading') : t('noData') }}</div>
      <div v-else class="treemap" role="list">
        <div v-for="(item, index) in rectangles" :key="item.country" class="treemap-cell" :class="`map-color-${index % 6}`" :style="{ left: item.x + '%', top: item.y + '%', width: item.width + '%', height: item.height + '%' }" role="listitem" :title="`${countryName(item.country)} · ${t('visits')} ${item.count.toLocaleString(locale)}`">
          <span class="treemap-country">{{ countryName(item.country) }}</span><strong>{{ item.count.toLocaleString() }}</strong>
        </div>
      </div>
      <a class="geo-credit" href="https://db-ip.com" target="_blank" rel="noopener noreferrer">IP Geolocation by DB-IP</a>
    </article>
    <article v-if="auth.authenticated" class="panel sources-panel">
      <div class="panel-heading"><div><h2>{{ t('sourceSettings') }}</h2><p>{{ t('chooseLogs') }}</p></div><span class="source-indicator"><i class="fa-solid fa-file-lines" />{{ auth.user?.log_sources.length ?? 0 }}</span></div>
      <div v-if="auth.user?.log_sources.length" class="source-list">
        <div v-for="source in auth.user.log_sources" :key="source" class="source-item"><span class="source-file-icon"><i class="fa-regular fa-file-code" /></span><span class="source-name">{{ source }}</span><i class="fa-solid fa-circle-check source-ok" /></div>
      </div>
      <div v-else class="chart-empty compact-empty">{{ t('noLogs') }}</div>
      <button class="source-edit-button" type="button" @click="openSettings"><i class="fa-solid fa-gear" />{{ t('settings') }}<i class="fa-solid fa-chevron-right" /></button>
    </article>
  </section>

  <section v-if="auth.authenticated" class="panel ip-panel">
    <div class="panel-heading"><div><h2>{{ t('recentIPs') }}</h2><p>{{ t('last24') }}</p></div><span class="protected-label"><i class="fa-solid fa-lock" />{{ t('private') }}</span></div>
    <div class="table-scroll">
      <table>
        <thead><tr><th>{{ t('address') }}</th><th>{{ t('country') }}</th><th>{{ t('visits') }}</th><th>{{ t('lastSeen') }}</th></tr></thead>
        <tbody v-if="recentIPs.length">
          <tr v-for="(item, index) in recentIPs" :key="`${item.ip}-${index}`"><td class="ip-address">{{ item.ip }}</td><td><span class="country-chip"><i class="fa-solid fa-location-dot" />{{ countryName(item.country) }}</span></td><td>{{ item.count.toLocaleString() }}</td><td>{{ formatTimestamp(item.last_seen) }}</td></tr>
        </tbody>
        <tbody v-else><tr><td colspan="4" class="empty-cell">{{ t('noData') }}</td></tr></tbody>
      </table>
    </div>
  </section>


  <div v-if="auth.authenticated && showSettings" class="modal-backdrop" @click.self="showSettings = false">
    <section class="settings-modal" role="dialog" aria-modal="true" :aria-label="t('sourceSettings')">
      <div class="modal-heading"><div><span class="modal-icon"><i class="fa-solid fa-file-circle-check" /></span><div><h2>{{ t('sourceSettings') }}</h2><p>{{ t('chooseLogs') }}</p></div></div><button class="icon-button" type="button" :aria-label="t('cancel')" @click="showSettings = false"><i class="fa-solid fa-xmark" /></button></div>
      <div class="source-choices">
        <p v-if="!sources.length" class="chart-empty">{{ t('noSources') }}</p>
        <label v-for="source in sources" :key="source" class="source-choice" :class="{ checked: selectedSources.includes(source) }">
          <input type="checkbox" :checked="selectedSources.includes(source)" @change="toggleSource(source)" />
          <span class="source-file-icon"><i class="fa-regular fa-file-code" /></span><span>{{ source }}</span>
          <i class="fa-solid fa-check choice-check" />
        </label>
      </div>
      <p v-if="settingsError" class="form-error settings-error"><i class="fa-solid fa-circle-exclamation" />{{ settingsError }}</p>
      <div class="modal-actions"><button class="outline-button" type="button" @click="showSettings = false">{{ t('cancel') }}</button><button class="primary-button" type="button" :disabled="saving || !sources.length" @click="saveSettings"><i v-if="saving" class="fa-solid fa-spinner spin" />{{ t('save') }}</button></div>
    </section>
  </div>
</template>
