import 'core-js/stable';
import 'regenerator-runtime/runtime';
import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import App from './App.vue';
import router from './router';

// 引入本地iconfont
import '../assets/style/iconfont/iconfont.css';

Vue.use(ElementUI);

Vue.config.productionTip = false;

new Vue({
  router,
  render: h => h(App)
}).$mount('#app'); 