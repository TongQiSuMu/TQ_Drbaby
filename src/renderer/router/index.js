import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '@/renderer/views/Home.vue';
import Login from '@/renderer/views/Login.vue';
import TransparentWindow from '@/renderer/views/TransparentWindow.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/transparent',
    name: 'TransparentWindow',
    component: TransparentWindow,
    meta: { requiresAuth: true }
  }
];

const router = new VueRouter({
  mode: 'hash', // 使用hash模式，适合Electron应用
  routes
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  
  // 根据目标路由调整窗口大小
  if (window.require) {
    const { ipcRenderer } = window.require('electron');
    
    if (to.path === '/login') {
      // 登录页面使用小窗口
      ipcRenderer.send('resize-window', { width: 600, height: 400, resizable: false });
    } else if (to.matched.some(record => record.meta.requiresAuth)) {
      // 需要认证的页面使用大窗口
      ipcRenderer.send('resize-window', { width: 1200, height: 800, resizable: true });
    }
  }
  
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // 需要登录的页面
    if (!isLoggedIn) {
      next('/login')
    } else {
      // 用户已登录且访问需要认证的页面，确保透明窗口已创建
      if (window.require && to.path !== '/transparent') {
        const { ipcRenderer } = window.require('electron');
        console.log('路由守卫：用户已登录，确保透明窗口存在');
        setTimeout(() => {
          ipcRenderer.send('create-transparent-window');
        }, 1000);
      }
      next()
    }
  } else if (to.path === '/login' && isLoggedIn) {
    // 已登录用户访问登录页，重定向到首页
    next('/')
  } else if (to.path === '/login' && !isLoggedIn) {
    // 用户跳转到登录页面，确保透明窗口被关闭
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      console.log('路由守卫：跳转到登录页，关闭透明窗口');
      ipcRenderer.send('user-logout');
    }
    next()
  } else {
    next()
  }
})

export default router; 