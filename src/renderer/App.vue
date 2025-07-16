<template>
  <div id="app">
    <el-container>
      <!-- 主内容区域 -->
      <el-main class="app-main full-screen">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      transparentWindowTimer: null // 保存定时器引用
    }
  },
  computed: {
    username() {
      return localStorage.getItem('username') || 'Guest'
    }
  },
  watch: {
    '$route'() {
      // 路由变化时调整窗口大小
      this.$nextTick(() => {
        this.adjustWindowSizeForCurrentRoute();
      });
    }
  },
  mounted() {
    // 应用启动时检查窗口大小
    this.checkInitialWindowSize();
    
    // 监听主进程的初始登录检查事件
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      
      ipcRenderer.on('initial-login-check', () => {
        this.adjustWindowSizeForCurrentRoute();
      });
      
      // 请求检查初始窗口大小
      ipcRenderer.send('check-initial-window-size');
      
      // 检查登录状态，如果已登录则创建透明窗口
      this.checkAndCreateTransparentWindow();
    }
  },
  methods: {
    checkInitialWindowSize() {
      // 根据当前路由和登录状态调整窗口大小
      this.adjustWindowSizeForCurrentRoute();
    },
    
    adjustWindowSizeForCurrentRoute() {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const currentRoute = this.$route.path;
      
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        
        if (currentRoute === '/login') {
          // 登录页面使用小窗口
          ipcRenderer.send('resize-window', { width: 700, height: 500, resizable: false });
        } else if (isLoggedIn && currentRoute !== '/login') {
          // 已登录且不在登录页，使用大窗口
          ipcRenderer.send('resize-window', { width: 1200, height: 800, resizable: true });
        }
      }
    },
    
    checkAndCreateTransparentWindow() {
      // 检查登录状态，如果已登录且不在登录页面，则创建透明窗口
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const currentRoute = this.$route.path;
      
      if (isLoggedIn && currentRoute !== '/login' && window.require) {
        const { ipcRenderer } = window.require('electron');
        console.log('用户已登录，创建透明窗口');
        
        // 延迟创建透明窗口，确保主窗口已经完全加载
        // 清理之前的定时器
        if (this.transparentWindowTimer) {
          clearTimeout(this.transparentWindowTimer);
        }
        this.transparentWindowTimer = setTimeout(() => {
          ipcRenderer.send('create-transparent-window');
          this.transparentWindowTimer = null;
        }, 2000);
      }
    },
    
    showFloatingBall() {
      // 通过 IPC 通知主进程显示悬浮球
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('show-floating-ball');
        this.$message.success('悬浮球已显示');
      }
    },
    handleLogout() {
      this.$confirm('确认退出登录？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 通知主进程用户退出登录
        if (window.require) {
          const { ipcRenderer } = window.require('electron');
          ipcRenderer.send('user-logout');
        }

        // 清除登录状态
        localStorage.removeItem('isLoggedIn')
        localStorage.removeItem('username')
        this.$message.success('已退出登录')
        // 跳转到登录页
        this.$router.push('/login')
      }).catch(() => {
        // 取消退出
      })
    }
  },
  beforeDestroy() {
    // 清理 IPC 事件监听器
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.removeAllListeners('initial-login-check');
    }
    
    // 清理定时器
    if (this.transparentWindowTimer) {
      clearTimeout(this.transparentWindowTimer);
      this.transparentWindowTimer = null;
    }
  }
};
</script>

<style lang="less">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  height: 100vh;
}

.app-main {
  padding: 0;
  background-color: #ffffff;

  &.full-screen {
    height: 100vh;
  }

  &.login-main {
    padding: 0;
    background-color: transparent;
  }
}
</style> 