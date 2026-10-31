import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')
