<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from './stores/auth'

const { t, locale } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
type ThemeMode = 'auto' | 'light' | 'dark'
const savedTheme = localStorage.getItem('theme')
const theme = ref<ThemeMode>(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'auto')
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
const nextTheme = { auto: 'light', light: 'dark', dark: 'auto' } as const
const themeIcon = { auto: 'fa-desktop', light: 'fa-sun', dark: 'fa-moon' }
const themeHint = computed(() => t('themeSwitch', { current: t(theme.value), next: t(nextTheme[theme.value]) }))

function applyTheme() {
  const mode = theme.value
  document.documentElement.dataset.theme = mode === 'auto' ? (systemDark.matches ? 'dark' : 'light') : mode
}

function toggleLanguage() {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
  localStorage.setItem('language', locale.value)
}

function toggleTheme() {
  theme.value = nextTheme[theme.value]
  localStorage.setItem('theme', theme.value)
}

async function signOut() {
  try { await auth.logout() } finally { await router.push('/') }
}

watch(() => route.path, () => window.scrollTo({ top: 0, behavior: 'smooth' }))
watch(locale, language => { document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en' }, { immediate: true })
watch(theme, applyTheme, { immediate: true })
onMounted(async () => {
  systemDark.addEventListener('change', applyTheme)
  if (auth.authenticated) {
    try { await auth.loadUser() } catch { /* The HTTP client clears expired sessions after a rejected refresh. */ }
  }
})
onBeforeUnmount(() => systemDark.removeEventListener('change', applyTheme))
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/" :aria-label="t('app')">
        <span class="brand-mark"><i class="fa-solid fa-wave-square" /></span>
        <span>{{ t('app') }}</span>
      </RouterLink>
      <div class="topbar-right">
        <button class="utility-button" type="button" :aria-label="t('language')" @click="toggleLanguage">
          <i class="fa-solid fa-globe" /><span>{{ locale === 'zh' ? 'EN' : '中文' }}</span>
        </button>
        <button class="icon-button" type="button" :aria-label="themeHint" :title="themeHint" @click="toggleTheme">
          <i class="fa-solid" :class="themeIcon[theme]" aria-hidden="true" />
        </button>
        <template v-if="auth.authenticated">
          <span class="user-label"><span class="user-dot" />{{ auth.user?.username }}</span>
          <button class="utility-button sign-out" type="button" @click="signOut"><i class="fa-solid fa-arrow-right-from-bracket" /><span>{{ t('signOut') }}</span></button>
        </template>
        <RouterLink v-else class="utility-button sign-in-link" to="/login"><i class="fa-regular fa-user" /><span>{{ t('signIn') }}</span></RouterLink>
      </div>
    </header>
    <main class="page-container">
      <RouterView />
    </main>
  </div>
</template>
