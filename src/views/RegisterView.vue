<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import api from '../api'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const username = ref('')
const password = ref('')
const confirmation = ref('')
const available = ref(true)
const error = ref('')
const submitting = ref(false)

async function checkStatus() {
  try {
    const { data } = await api.get('/status')
    available.value = Boolean(data.needs_setup)
  } catch { /* Keep setup available if the server is briefly unavailable. */ }
}

async function submit() {
  error.value = ''
  if (password.value !== confirmation.value) {
    error.value = t('passwordMismatch')
    return
  }
  submitting.value = true
  try {
    await auth.register(username.value, password.value)
    await router.push('/')
  } catch {
    error.value = t('registerError')
    await checkStatus()
  } finally {
    submitting.value = false
  }
}

onMounted(checkStatus)
</script>

<template>
  <section class="auth-layout">
    <div class="auth-aside setup-aside">
      <div class="auth-aside-grid" />
      <span class="auth-brand-mark"><i class="fa-solid fa-wave-square" /></span>
      <div class="auth-aside-copy"><h1>{{ t('setupTitle') }}</h1><p>{{ t('setupText') }}</p></div>
      <div class="auth-aside-meta"><i class="fa-solid fa-shield-halved" />{{ t('setupFirstOnly') }}</div>
    </div>
    <form class="auth-form" @submit.prevent="submit">
      <div class="auth-form-head"><div class="eyebrow"><span class="eyebrow-dot" />{{ t('register') }}</div><h2>{{ t('setupTitle') }}</h2></div>
      <div v-if="!available" class="notice notice-warn register-notice"><i class="fa-solid fa-circle-info" />{{ t('setupFirstOnly') }} <RouterLink to="/login">{{ t('signIn') }}</RouterLink></div>
      <label class="form-field"><span>{{ t('username') }}</span><div class="input-wrap"><i class="fa-regular fa-user" /><input v-model="username" autocomplete="username" required autofocus :placeholder="t('username')" /></div></label>
      <label class="form-field"><span>{{ t('password') }}</span><div class="input-wrap"><i class="fa-solid fa-lock" /><input v-model="password" type="password" autocomplete="new-password" required :placeholder="t('password')" /></div></label>
      <label class="form-field"><span>{{ t('confirmPassword') }}</span><div class="input-wrap"><i class="fa-solid fa-check" /><input v-model="confirmation" type="password" autocomplete="new-password" required :placeholder="t('confirmPassword')" /></div></label>
      <p v-if="error" class="form-error"><i class="fa-solid fa-circle-exclamation" />{{ error }}</p>
      <button class="primary-button auth-submit" type="submit" :disabled="submitting || !available || !username || !password || !confirmation">{{ t('createAccount') }}<i :class="submitting ? 'fa-solid fa-spinner spin' : 'fa-solid fa-arrow-right'" /></button>
      <p class="auth-switch"><RouterLink to="/">{{ t('backHome') }}</RouterLink><span>·</span><RouterLink to="/login">{{ t('signIn') }}</RouterLink></p>
    </form>
  </section>
</template>
