import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { createPinia } from 'pinia';
import '@fortawesome/fontawesome-free/css/all.min.css';
import router from './router';
import i18n from './i18n';

const pinia = createPinia();

createApp(App)
.use(pinia)
.use(router)
.use(i18n)
.mount('#app');
