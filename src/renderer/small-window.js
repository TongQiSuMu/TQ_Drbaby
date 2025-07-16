import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import SmallWindow from './views/SmallWindow.vue'

Vue.use(ElementUI)

new Vue({
  render: h => h(SmallWindow)
}).$mount('#app')