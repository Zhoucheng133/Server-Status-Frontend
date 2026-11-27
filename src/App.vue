<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from './stores/auth'

const { t, locale } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const theme = localStorage.getItem('theme')
const dark = ref(theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)

function applyTheme() {
  document.documentElement.dataset.theme = dark.value ? 'dark' : 'light'
  localStorage.setItem('theme', dark.value ? 'dark' : 'light')
}

function toggleLanguage() {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
  localStorage.setItem('language', locale.value)
}

function toggleTheme() {
  dark.value = !dark.value
  applyTheme()
}

async function signOut() {
  try { await auth.logout() } finally { await router.push('/') }
}

watch(() => route.path, () => window.scrollTo({ top: 0, behavior: 'smooth' }))
watch(locale, language => { document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en' }, { immediate: true })
onMounted(async () => {
  applyTheme()
  if (auth.authenticated) {
    try { await auth.loadUser() } catch { /* The HTTP client clears expired sessions after a rejected refresh. */ }
  }
})
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
        <button class="icon-button" type="button" :aria-label="dark ? t('light') : t('dark')" @click="toggleTheme">
          <i :class="dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'" />
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
