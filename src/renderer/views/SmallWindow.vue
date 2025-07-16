<template>
  <div class="small-window" v-if="isLoggedIn">
    <div class="window-header">
      <h3>悬浮助手</h3>
      <div class="user-info">
        <span>{{ username }}</span>
      </div>
    </div>
    
    <div class="window-content">
      <!-- 实时时钟 -->
      <div class="clock-section">
        <div class="current-time">{{ currentTime }}</div>
        <div class="current-date">{{ currentDate }}</div>
      </div>
      
      <!-- 系统状态 -->
      <div class="status-section">
        <div class="status-item">
          <i class="el-icon-monitor"></i>
          <span>系统正常运行</span>
        </div>
      </div>
      
      <!-- 快捷操作 -->
      <div class="actions-section">
        <el-button size="small" type="primary" @click="showMainWindow">
          <i class="el-icon-house"></i> 主界面
        </el-button>
        <el-button size="small" type="success" @click="toggleFloatingBall">
          <i class="el-icon-view"></i> {{ floatingBallVisible ? '隐藏' : '显示' }}悬浮球
        </el-button>
        <el-button size="small" type="warning" @click="logout">
          <i class="el-icon-switch-button"></i> 退出登录
        </el-button>
        <el-button size="small" type="danger" @click="quitApp">
          <i class="el-icon-close"></i> 退出应用
        </el-button>
      </div>
    </div>
  </div>
  <div class="login-required" v-else>
    <div class="login-message">
      <i class="el-icon-warning"></i>
      <p>请先登录系统</p>
      <el-button type="primary" @click="goToLogin">前往登录</el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SmallWindow',
  data() {
    return {
      currentTime: '',
      currentDate: '',
      floatingBallVisible: true,
      timer: null
    }
  },
  computed: {
    isLoggedIn() {
      return localStorage.getItem('isLoggedIn') === 'true'
    },
    username() {
      return localStorage.getItem('username') || 'Guest'
    }
  },
  mounted() {
    this.updateTime()
    this.timer = setInterval(this.updateTime, 1000)
  },
  beforeDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  },
  methods: {
    updateTime() {
      const now = new Date()
      this.currentTime = now.toLocaleTimeString('zh-CN', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      this.currentDate = now.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })
    },
    showMainWindow() {
      if (window.require) {
        const { ipcRenderer } = window.require('electron')
        ipcRenderer.send('show-main-window')
      }
    },
    toggleFloatingBall() {
      if (window.require) {
        const { ipcRenderer } = window.require('electron')
        if (this.floatingBallVisible) {
          ipcRenderer.send('hide-floating-ball')
        } else {
          ipcRenderer.send('show-floating-ball')
        }
        this.floatingBallVisible = !this.floatingBallVisible
      }
    },
    logout() {
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

        localStorage.removeItem('isLoggedIn')
        localStorage.removeItem('username')
        localStorage.removeItem('token')
        localStorage.removeItem('userId')
        localStorage.removeItem('isCopy')
        localStorage.removeItem('isRecording')
        this.$message.success('已退出登录')
        // 关闭当前小窗口
        if (window.require) {
          const { remote } = window.require('electron')
          remote.getCurrentWindow().close()
        } else {
          window.close()
        }
      }).catch(() => {
        // 取消
      })
    },
    quitApp() {
      this.$confirm('确认退出应用？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        if (window.require) {
          const { ipcRenderer } = window.require('electron')
          ipcRenderer.send('quit-app')
        }
      }).catch(() => {
        // 取消
      })
    },
    goToLogin() {
      // 打开主窗口并跳转到登录页
      if (window.require) {
        const { ipcRenderer } = window.require('electron')
        ipcRenderer.send('show-main-window')
        const { remote } = window.require('electron')
        remote.getCurrentWindow().close()
      }
    }
  }
}
</script>

<style scoped>
.small-window {
  padding: 15px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  font-family: 'Microsoft YaHei', sans-serif;
}

.window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e1e8ed;
}

.window-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 16px;
}

.user-info {
  font-size: 12px;
  color: #7f8c8d;
}

.window-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.clock-section {
  text-align: center;
  background: rgba(255, 255, 255, 0.8);
  padding: 15px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.current-time {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
}

.current-date {
  font-size: 14px;
  color: #7f8c8d;
}

.status-section {
  background: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #27ae60;
  font-size: 14px;
}

.actions-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.actions-section .el-button {
  justify-content: flex-start;
}

.login-required {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-message {
  text-align: center;
  background: rgba(255, 255, 255, 0.95);
  padding: 30px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.login-message i {
  font-size: 48px;
  color: #f39c12;
  margin-bottom: 15px;
}

.login-message p {
  font-size: 16px;
  color: #2c3e50;
  margin: 15px 0;
}
</style>