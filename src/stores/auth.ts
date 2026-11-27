import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import api, { accessToken, setSession } from '../api'

interface UserInfo { username: string; configured: boolean; log_sources: string[] }

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const authenticated = computed(() => Boolean(accessToken.value))
  watch(authenticated, (signedIn) => { if (!signedIn) user.value = null })

  async function authenticate(path: string, username: string, password: string) {
    const { data } = await api.post(path, { username, password })
    setSession(data)
    await loadUser()
  }

  async function loadUser() {
    if (!authenticated.value) return
    const { data } = await api.get<UserInfo>('/auth/me')
    if (authenticated.value) user.value = data
  }

  async function logout() {
    try {
      await api.post('/auth/logout', { refresh_token: localStorage.getItem('refresh_token') })
    } finally {
      setSession(null)
      user.value = null
    }
  }

  return {
    user, authenticated, loadUser, logout,
    login: (name: string, pass: string) => authenticate('/auth/login', name, pass),
    register: (name: string, pass: string) => authenticate('/auth/register', name, pass),
  }
})
