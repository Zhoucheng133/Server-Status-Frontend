import axios from 'axios'
import { shallowRef } from 'vue'

interface Tokens { access_token: string; refresh_token: string }
export const accessToken = shallowRef(localStorage.getItem('access_token'))

export function setSession(tokens: Tokens | null) {
  for (const key of ['access_token', 'refresh_token'] as const) {
    if (tokens) localStorage.setItem(key, tokens[key])
    else localStorage.removeItem(key)
  }
  accessToken.value = tokens?.access_token ?? null
}

const api = axios.create({ baseURL: '/api', timeout: 12000 })
let refreshRequest: Promise<void> | null = null

api.interceptors.request.use((config) => {
  if (accessToken.value) config.headers.Authorization = `Bearer ${accessToken.value}`
  return config
})

api.interceptors.response.use(undefined, async (error) => {
  const request = error.config
  const refresh = localStorage.getItem('refresh_token')
  if (error.response?.status !== 401 || !request || request._retry || !refresh ||
      ['/auth/login', '/auth/register', '/auth/refresh'].includes(request.url)) throw error

  request._retry = true
  if (request.headers.Authorization === `Bearer ${accessToken.value}`) {
    refreshRequest ??= axios.post<Tokens>('/api/auth/refresh', { refresh_token: refresh }, { timeout: 12000 })
      .then(({ data }) => {
        if (localStorage.getItem('refresh_token') === refresh) setSession(data)
      })
      .catch((reason) => {
        if (reason.response?.status === 401 && localStorage.getItem('refresh_token') === refresh) setSession(null)
        throw reason
      })
      .finally(() => { refreshRequest = null })
    await refreshRequest
  }
  if (!accessToken.value) throw error
  if (request.url === '/auth/logout') request.data = { refresh_token: localStorage.getItem('refresh_token') }
  return api(request)
})

export default api

export interface MetricPoint {
  timestamp: string
  cpu_percent: number
  memory_percent: number
  network_in_bytes: number
  network_out_bytes: number
}
export interface CountPoint { timestamp: string; count: number }
export interface CountryCount { country: string; count: number }
export interface RecentIP extends CountryCount { ip: string; last_seen: string }
export interface Overview {
  metrics: MetricPoint[]
  requests: CountPoint[]
  countries: CountryCount[]
  sites: string[]
}
