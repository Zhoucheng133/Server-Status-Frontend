<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    await router.push('/')
  } catch (reason: unknown) {
    error.value = (reason as { response?: unknown }).response ? t('authError') : t('networkError')
  } finally {
    submitting.value = false
  }
}

async function checkSetup() {
  try {
    const { data } = await api.get('/status')
    if (data.needs_setup) await router.replace('/register')
  } catch { /* The form remains available while the server starts. */ }
}
void checkSetup()
</script>

<template>
  <section class="auth-layout">
    <div class="auth-aside">
      <div class="auth-aside-grid" />
      <span class="auth-brand-mark"><i class="fa-solid fa-wave-square" /></span>
      <div class="auth-aside-copy"><h1>{{ t('app') }}</h1><p>{{ t('subtitle') }}</p></div>
      
    </div>
    <form class="auth-form" @submit.prevent="submit">
      <div class="auth-form-head"><div class="eyebrow"><span class="eyebrow-dot" />{{ t('signIn') }}</div><h2>{{ t('loginTitle') }}</h2><p>{{ t('loginText') }}</p></div>
      <label class="form-field"><span>{{ t('username') }}</span><div class="input-wrap"><i class="fa-regular fa-user" /><input v-model="username" autocomplete="username" required autofocus :placeholder="t('username')" /></div></label>
      <label class="form-field"><span>{{ t('password') }}</span><div class="input-wrap"><i class="fa-solid fa-lock" /><input v-model="password" type="password" autocomplete="current-password" required :placeholder="t('password')" /></div></label>
      <p v-if="error" class="form-error"><i class="fa-solid fa-circle-exclamation" />{{ error }}</p>
      <button class="primary-button auth-submit" type="submit" :disabled="submitting || !username || !password">{{ t('enter') }}<i :class="submitting ? 'fa-solid fa-spinner spin' : 'fa-solid fa-arrow-right'" /></button>
      <p class="auth-switch"><RouterLink to="/">{{ t('backHome') }}</RouterLink><span>·</span><RouterLink to="/register">{{ t('register') }}</RouterLink></p>
    </form>
  </section>
</template>
