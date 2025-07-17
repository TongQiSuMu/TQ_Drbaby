<template>
  <div class="transparent-window">
    <!-- 背景层 - 使用纯色背景 -->
    <div class="background-layer"></div>
    
    <!-- 内容层 - 所有UI元素都在这一层 -->
    <div class="content-layer">
      <!-- 切换按钮区域 -->
    <div class="toggle-header">
      <div class="toggle-buttons">
        <el-button
          type="text"
          :class="{ active: activeView === 'chat' }"
          @click="switchView('chat')"
          class="view-toggle-btn"
        >
          对话记录
        </el-button>
        <el-button
          type="text"
          :class="{ active: activeView === 'info' }"
          @click="switchView('info')"
          class="view-toggle-btn"
        >
          查看病历
        </el-button>
      </div>
      <!-- 窗口控制按钮 -->
      <div class="window-controls">
        <el-button
          type="text"
          @click="toggleOpacityPanel"
          class="control-btn opacity-btn"
          title="调节透明度"
        >
          <i class="el-icon-s-operation"></i>
        </el-button>
        <el-button
          type="text"
          @click="closeWindow"
          class="control-btn close-btn"
          title="关闭"
        >
          <i class="el-icon-close"></i>
        </el-button>
      </div>

      <!-- 透明度控制面板 -->
      <div v-show="showOpacityPanel" class="opacity-panel">
        <div class="opacity-label">透明度</div>
        <input
          type="range"
          class="opacity-slider"
          :value="currentOpacity"
          @input="updateOpacity"
          min="10"
          max="100"
          step="5"
        />
        <div class="opacity-value">{{ currentOpacity }}%</div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 聊天区域 -->
      <div
        v-show="activeView === 'chat'"
        class="chat-messages"
        ref="chatMessages"
      >
        <!-- 显示历史消息 -->
        <template v-for="(messageGroup, groupIndex) in groupedMessages">
          <!-- 消息组时间 -->
          <div
            v-if="messageGroup.messages.length > 0"
            :key="`time-${groupIndex}`"
            class="message-time-group"
          >
            <div class="time-text">{{ formatTime(messageGroup.createOn) }}</div>
          </div>

          <!-- 消息组内容 -->
          <div
            v-for="(message, messageIndex) in messageGroup.messages"
            :key="`${groupIndex}-${messageIndex}`"
            class="message-group"
          >
            <div v-if="message.content" class="message-content">
              <div class="message-text">
                {{ message.content }}
              </div>
            </div>
          </div>
        </template>

        <!-- 实时显示识别中的文本 -->
        <template v-if="recognizedText.length > 0">
          <div
            v-for="(segment, segmentIndex) in splitMessageByNewline(
              recognizedText.substring(processedTextLength)
            )"
            :key="`current-${segmentIndex}`"
            class="message-group"
          >
            <div class="message-content">
              <div class="message-text">
                {{ segment }}
                <span
                  v-if="
                    segmentIndex ===
                    splitMessageByNewline(
                      recognizedText.substring(processedTextLength)
                    ).length -
                      1
                  "
                  class="recording-indicator"
                  >正在识别中...</span
                >
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 信息面板 -->
      <div v-show="activeView === 'info'" class="info-view">
        <div class="info-content">
          <div class="panel-header">
            <h3>{{ templateInfo.templateName || "信息面板" }}</h3>
          </div>
          <div class="panel-content">
            <!-- Loading state -->
            <div
              v-if="isGenerating && !generatedContent"
              class="loading-container"
            >
              <img :src="loadingImage" alt="生成中..." class="loading-gif" />
              <p>正在生成中，请稍候...</p>
            </div>
            <!-- 有解析结果时显示结构化内容 -->
            <template v-else-if="parsedResults.length > 0">
              <div
                v-for="(item, index) in parsedResults"
                :key="index"
                class="record-item"
              >
                <h4 class="record-title">
                  {{ item.title }}
                  <i
                    v-if="isCopy === true"
                    class="el-icon-copy-document"
                    @click="copyContent(item.content)"
                  ></i>
                </h4>
                <div class="record-content">{{ item.content }}</div>
              </div>
            </template>
            <!-- 有生成内容时显示原始内容 -->
            <div v-else-if="generatedContent" class="raw-content">
              {{ generatedContent }}
            </div>
            <!-- 默认空状态 -->
            <div v-else class="empty-message">完成录音后将生成相应内容</div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>
<script>
import config from "../utils/config";
import { SpeechRecognition } from "../utils/speechRecognition";
import { ChatManager } from "../utils/chatManager";
import loadingImage from "@/assets/image/loading.webp";
const { ipcRenderer } = window.require("electron");
export default {
  name: "TransparentWindow",
  data() {
    return {
      config,
      loadingImage,
      activeView: "chat",
      speechRecognition: null,
      recognizedText: "",
      processedTextLength: 0,
      isRecording: false,
      isPaused: false,
      chatManager: null,
      messages: [],
      templateInfo: { templateName: "" },
      isGenerating: false,
      generatedContent: "",
      parsedResults: [],
      isCopy: false,
      showOpacityPanel: false,
      currentOpacity: 80,
      hideOpacityTimer: null,
    };
  },
  computed: {
    groupedMessages() {
      const groups = {};
      this.messages.forEach((message) => {
        const groupId = message.originalMessageId || message.id;
        if (!groups[groupId]) {
          groups[groupId] = {
            messages: [],
            createOn: message.createOn,
          };
        }
        groups[groupId].messages.push(message);
      });
      return Object.values(groups).sort(
        (a, b) => new Date(a.createOn) - new Date(b.createOn)
      );
    },
    backgroundOpacity() {
      return this.currentOpacity / 100;
    },
  },
  async mounted() {
    this.isCopy = localStorage.getItem("isCopy") === "true";
    this.$nextTick(() => {
      this.loadOpacitySettings();
      
      // 背景透明度已通过数据绑定设置
      console.log('初始背景透明度:', this.backgroundOpacity);
    });
    
    await this.initializeChatManager();
    this.initializeSpeechRecognition();
    this.setupEventListeners();
    
    // 请求当前聊天数据
    setTimeout(() => {
      if (window.require) {
        ipcRenderer.send("request-current-chat-data");
      }
    }, 500);
    
    // 背景透明度已经通过数据绑定自动应用
  },
  
  methods: {
    setupEventListeners() {
      document.addEventListener("click", this.handleOutsideClick);
      
      if (window.require) {
        // 先移除可能已存在的监听器，防止重复绑定
        ipcRenderer.removeAllListeners("start-recording");
        ipcRenderer.removeAllListeners("pause-recording");
        ipcRenderer.removeAllListeners("continue-recording");
        ipcRenderer.removeAllListeners("stop-recording");
        ipcRenderer.removeAllListeners("active-chat-changed");
        
        // 录音控制监听
        ipcRenderer.on("start-recording", this.startRecording);
        ipcRenderer.on("pause-recording", this.pauseRecording);
        ipcRenderer.on("continue-recording", this.continueRecording);
        ipcRenderer.on("stop-recording", this.stopRecording);
        ipcRenderer.on("active-chat-changed", (event, chatData) => {
          this.handleActiveChatChanged(chatData);
        });
      }
    },
    
    // 发送录音状态更新 - 统一处理
    updateRecordingStatus(status) {
      if (window.require) {
        ipcRenderer.send("recording-status-update", status);
      }
    },
    
    async startRecording() {
      try {
        this.chatManager.startRecordingSession();
        await this.speechRecognition.startRecording();
        this.isRecording = true;
        this.$message.success("开始录音");
        this.updateRecordingStatus({ isRecording: true, isPaused: false });
      } catch (error) {
        this.handleError(error.message);
      }
    },
    
    pauseRecording() {
      try {
        this.speechRecognition.pauseRecording();
        this.isPaused = true;
        this.isRecording = false;
        this.$message.info("录音已暂停");
        this.updateRecordingStatus({ isRecording: false, isPaused: true });
      } catch (error) {
        this.handleError(error.message);
      }
    },
    
    continueRecording() {
      try {
        this.speechRecognition.continueRecording();
        this.isRecording = true;
        this.isPaused = false;
        this.$message.success("继续录音");
        this.updateRecordingStatus({ isRecording: true, isPaused: false });
      } catch (error) {
        this.handleError(error.message);
      }
    },
    
    async stopRecording() {
      try {
        const result = this.speechRecognition.stopRecording();
        this.isRecording = false;
        this.isPaused = false;
        this.$message.success(`录音结束，时长：${result.duration}秒`);
        this.chatManager.endRecordingSession();
        this.updateRecordingStatus({ isRecording: false, isPaused: false });
        
        // 自动切换到查看病历页面
        this.activeView = 'info';
        
        // 设置生成中状态，显示加载动画
        this.isGenerating = true;
        this.generatedContent = "";
        this.parsedResults = [];
        
        // 通知主窗口生成病历
        if (window.require && ipcRenderer) {
          ipcRenderer.send("trigger-generate-record");
        }
      } catch (error) {
        this.handleError(error.message);
      }
    },
    handleSentenceComplete(sentence) {
      this.chatManager.addMessage(sentence);
      this.messages = [...this.chatManager.messages];
      this.scrollToBottom();
    },
    handleSpeechMessage(data) {
      this.recognizedText = data.recognizedText;
      this.processedTextLength = data.processedTextLength;
    },
    handleSpeechStateChange(connState, isConnected) {
      if (connState === 0) {
        this.$message.success("语音识别服务连接成功");
      } else if (connState === 2) {
        this.$message.error("语音识别服务连接失败");
      }
    },
    handleError(error) {
      this.$message.error(error);
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const chatMessages = this.$refs.chatMessages;
        if (chatMessages) {
          chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
        }
      });
    },
    splitMessageByNewline(content) {
      if (!content) return [];
      const segments = content.split("\n").filter((segment) => segment.trim());
      return segments.length === 0 ? [content] : segments;
    },
    formatTime(timeString) {
      if (!timeString) return "";
      const date = new Date(timeString);
      const pad = (n) => String(n).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    },
    async copyContent(content) {
      if (!content) {
        this.$message.warning("没有可复制的内容");
        return;
      }
      try {
        await navigator.clipboard.writeText(content);
        this.$message.success("复制成功");
      } catch (err) {
        console.error("复制失败:", err);
        this.$message.error("复制失败，请稍后重试");
      }
    },
    
    handleActiveChatChanged(chatData) {
      try {
        if (chatData.chatMessages) this.messages = chatData.chatMessages;
        if (chatData.recognizedText !== undefined)
          this.recognizedText = chatData.recognizedText;
        if (chatData.processedTextLength !== undefined)
          this.processedTextLength = chatData.processedTextLength;
        if (chatData.medicalInfo) {
          const mi = chatData.medicalInfo;
          if (mi.templateInfo) this.templateInfo = mi.templateInfo;
          if (mi.parsedResults) this.parsedResults = mi.parsedResults;
          if (mi.generatedContent !== undefined)
            this.generatedContent = mi.generatedContent;
          if (mi.isGenerating !== undefined) this.isGenerating = mi.isGenerating;
        }
        if (this.chatManager && chatData.activeChat) {
          this.chatManager.activeChat = chatData.activeChat;
          this.chatManager.currentChat = chatData.currentChat;
          this.chatManager.messages = chatData.chatMessages;
          if (chatData.medicalInfo && chatData.medicalInfo.templateInfo) {
            this.chatManager.templateInfo = chatData.medicalInfo.templateInfo;
          }
        }
      } catch (error) {
        console.error("处理活动对话变化时出错:", error);
      }
    },
    
    switchView(view) {
      this.activeView = view;
    },
    
    toggleOpacityPanel() {
      this.showOpacityPanel = !this.showOpacityPanel;
      if (!this.showOpacityPanel) {
        this.saveOpacitySettings();
      }
    },
    
    updateOpacity(event) {
      const opacity = parseInt(event.target.value);
      this.currentOpacity = opacity;
      console.log('调节窗口透明度:', opacity);
      
      // 发送到主进程更新窗口透明度
      if (window.require && ipcRenderer) {
        ipcRenderer.send("update-transparent-window-opacity", opacity);
      }
      
      // 防抖：清除之前的定时器
      if (this.hideOpacityTimer) {
        clearTimeout(this.hideOpacityTimer);
      }
      
      // 设置新的定时器，2秒后自动隐藏面板
      this.hideOpacityTimer = setTimeout(() => {
        this.showOpacityPanel = false;
        this.saveOpacitySettings();
        this.hideOpacityTimer = null;
      }, 2000);
    },
    
    saveOpacitySettings() {
      localStorage.setItem("transparentWindowOpacity", this.currentOpacity.toString());
    },
    
    loadOpacitySettings() {
      const savedOpacity = localStorage.getItem("transparentWindowOpacity");
      if (savedOpacity) {
        this.currentOpacity = parseInt(savedOpacity);
        console.log('加载保存的透明度:', this.currentOpacity);
        // 应用保存的透明度
        if (window.require && ipcRenderer) {
          ipcRenderer.send("update-transparent-window-opacity", this.currentOpacity);
        }
      } else {
        console.log('没有保存的透明度设置，使用默认值:', this.currentOpacity);
        // 应用默认透明度
        if (window.require && ipcRenderer) {
          ipcRenderer.send("update-transparent-window-opacity", this.currentOpacity);
        }
      }
    },
    
    handleOutsideClick(event) {
      const opacityBtn = event.target.closest(".opacity-btn");
      const opacityPanel = event.target.closest(".opacity-panel");
      if (!opacityBtn && !opacityPanel && this.showOpacityPanel) {
        this.showOpacityPanel = false;
        this.saveOpacitySettings();
      }
    },
    
    closeWindow() {
      if (window.require) {
        ipcRenderer.send("close-window");
      } else {
        window.close();
      }
    },
    
    async initializeChatManager() {
      try {
        this.chatManager = new ChatManager();
        await this.chatManager.getDefaultTemplate();
        this.messages = this.chatManager.messages || [];
        this.templateInfo = this.chatManager.templateInfo || { templateName: "" };
      } catch (error) {
        console.error("初始化聊天管理器失败:", error);
      }
    },
    
    initializeSpeechRecognition() {
      try {
        this.speechRecognition = new SpeechRecognition({
          onSentenceComplete: this.handleSentenceComplete,
          onMessage: this.handleSpeechMessage,
          onError: this.handleError,
          onStateChange: this.handleSpeechStateChange,
        });
      } catch (error) {
        console.error("初始化语音识别失败:", error);
      }
    },
    
    // 测试透明度功能
    testOpacity() {
      console.log('开始测试窗口透明度功能...');
      if (window.require && ipcRenderer) {
        console.log('ipcRenderer 可用，测试设置透明度为50%');
        ipcRenderer.send("update-transparent-window-opacity", 50);
        
        setTimeout(() => {
          console.log('测试设置透明度为100%');
          ipcRenderer.send("update-transparent-window-opacity", 100);
        }, 3000);
      } else {
        console.error('无法测试：ipcRenderer 不可用');
      }
    },
  },
  beforeDestroy() {
    if (this.speechRecognition) {
      this.speechRecognition.destroy();
    }
    // 清理定时器
    if (this.hideOpacityTimer) {
      clearTimeout(this.hideOpacityTimer);
    }
    document.removeEventListener("click", this.handleOutsideClick);
    
    // 清理ipcRenderer事件监听器
    if (window.require) {
      ipcRenderer.removeAllListeners("start-recording");
      ipcRenderer.removeAllListeners("pause-recording");
      ipcRenderer.removeAllListeners("continue-recording");
      ipcRenderer.removeAllListeners("stop-recording");
      ipcRenderer.removeAllListeners("active-chat-changed");
    }
  },
};
</script>


<style>
/* 全局样式，确保所有文字元素清晰 */
* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 确保 Element UI 组件文字不透明 */
.el-button {
  opacity: 1 !important;
}

.el-button span {
  opacity: 1 !important;
}

/* 确保HTML和body也是透明的 */
html, body {
  background: transparent !important;
  margin: 0;
  padding: 0;
}

#app {
  background: transparent !important;
  width: 100%;
  height: 100%;
}

.transparent-window {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  /* 移除背景设置 */
}

/* 背景层 - 使用纯色背景 */
.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  background-color: #f5f5f5; /* 纯色背景 */
  pointer-events: none; /* 确保点击事件穿透到内容层 */
}

/* 内容层 - 包含所有UI元素，保持不透明 */
.content-layer {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 1;
  display: flex;
  flex-direction: column;
  /* 确保内容层本身是透明的，不会阻挡背景层的透明效果 */
  background: transparent;
}


/* 顶部切换区域 */
.toggle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  /* 使用白色背景，确保内容清晰 */
  background: rgba(255, 255, 255, 1);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  -webkit-app-region: drag;
  position: relative;
  z-index: 10;
}

.toggle-buttons {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
  z-index: 10;
  position: relative;
}

.view-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  transition: all 0.3s ease;
  color: #333;
  font-weight: 600;
  /* 纯色按钮背景 */
  background: rgba(255, 255, 255, 1);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.view-toggle-btn:hover {
  background: rgba(240, 240, 240, 1);
  color: #333;
  border-color: rgba(0, 0, 0, 0.2);
}

.view-toggle-btn.active {
  background: #409eff;
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  border-color: transparent;
}

.view-toggle-btn i {
  font-size: 16px;
}

/* 窗口控制按钮 */
.window-controls {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
  z-index: 10;
  position: relative;
}

.control-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.8);
  /* 纯色按钮背景 */
  background: rgba(255, 255, 255, 1);
  transition: all 0.2s ease;
}

/* 确保图标不透明 */
.control-btn i {
  opacity: 1 !important;
}

.control-btn:hover {
  background: rgba(240, 240, 240, 1);
  color: rgba(0, 0, 0, 0.9);
}

/* 透明度控制面板 */
.opacity-panel {
  position: absolute;
  top: 60px;
  right: 16px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  width: 200px;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  /* 确保面板不会被遮挡但也不会过度覆盖内容 */
  pointer-events: auto;
}

.opacity-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px;
  text-align: center;
}

.opacity-slider {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  margin-bottom: 8px;
}

.opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.opacity-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
}

.opacity-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.opacity-slider::-webkit-slider-track {
  background: rgba(255, 255, 255, 0.2);
  height: 4px;
  border-radius: 2px;
}

.opacity-slider::-moz-range-track {
  background: rgba(255, 255, 255, 0.2);
  height: 4px;
  border-radius: 2px;
  border: none;
}

.opacity-value {
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  text-align: center;
  font-weight: 500;
}

/* 内容区域 */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.chat-view,
.info-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden; /* 确保不会超出容器 */
  position: relative;
  z-index: 1;
}

/* 聊天区域样式 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

.message-time-group {
  display: flex;
  justify-content: center;
  margin: 8px 0 16px 0;
}

.time-text {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  /* 纯色时间背景 */
  background: rgba(240, 240, 240, 1);
  padding: 4px 8px;
  border-radius: 12px;
}

.message-group {
  margin-bottom: 12px;
  position: relative;
  z-index: 2;
}

.message-content {
  /* max-width: 80%; */
}

.message-text {
  /* 消息背景保持不透明，确保文字清晰 */
  background: rgba(64, 158, 255, 1);
  color: white;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.5;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.recording-indicator {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  margin-left: 8px;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%,
  50%,
  100% {
    opacity: 1;
  }
  25%,
  75% {
    opacity: 0.3;
  }
}

/* 录音控制区域 */
.voice-controls {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.control-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.voice-btn {
  min-width: 100px;
  height: 40px;
  border-radius: 20px;
  font-weight: 500;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 信息面板样式 */
.info-content {
  flex: 1;
  /* 纯色信息面板背景 */
  background: rgba(255, 255, 255, 1);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 1;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(250, 250, 250, 1);
}

.panel-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
  font-weight: 500;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  color: #333;
  min-height: 0; /* 确保 flex 子元素可以正确收缩 */
  background-color: transparent;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.loading-gif {
  width: 60px;
  height: 60px;
  opacity: 0.8;
}

.record-item {
  margin-bottom: 20px;
  /* margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1); */
}

.record-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}

.record-title i {
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.record-title i:hover {
  opacity: 1;
}

.record-content {
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  color: #333;
}

.raw-content {
  color: #333;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  padding: 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.empty-message {
  text-align: center;
  color: #666;
  font-size: 14px;
  padding: 40px 20px;
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar,
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track,
.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb,
.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover,
.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

</style>
