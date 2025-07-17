<template>
  <div class="chat-container">

    <!-- 左侧对话列表 -->
    <div class="chat-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="header-top">
          <el-button
            type="text"
            size="small"
            @click="toggleSidebar"
            class="sidebar-toggle-btn"
            :title="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
          >
            <i class="iconfont icon-zhankaishouqi"></i>
          </el-button>
        </div>
        <el-button
          v-if="!sidebarCollapsed"
          type="primary"
          size="small"
          class="new-chat-btn"
          :disabled="isRecording || isPaused"
          @click="createNewChat"
        >
          <i class="el-icon-plus"></i>
          新对话
        </el-button>
        <el-button
          v-else
          type="primary"
          size="small"
          class="new-chat-btn collapsed-btn"
          :disabled="isRecording || isPaused"
          title="新对话"
          @click="createNewChat"
        >
          <i class="el-icon-plus"></i>
        </el-button>
      </div>

      <div class="chat-list" v-if="!sidebarCollapsed">
        <div
          v-for="chat in chatList"
          :key="chat.id"
          class="chat-item"
          :class="{ 
            active: activeChat === chat.id,
            'recording-disabled': isRecording || isPaused
          }"
          @click="selectChat(chat)"
        >
          <div class="chat-info">
            <div class="chat-name">{{ chat.titleName }}</div>
            <div class="chat-time">{{ chat.createTime }}</div>
          </div>
          <el-dropdown
            @command="handleChatCommand"
            trigger="hover"
            class="chat-dropdown"
          >
            <el-button type="text" size="mini" class="more-btn" @click.stop>
              <i class="el-icon-more"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown" class="chat-dropdown-menu">
              <el-dropdown-item
                :command="{ action: 'rename', ...chat }"
                class="dropdown-item"
                :disabled="isRecording || isPaused"
              >
                <div class="item-content" :class="{ 'disabled': isRecording || isPaused }">
                  <i class="el-icon-edit"></i>
                  <span>重命名</span>
                </div>
              </el-dropdown-item>
              <el-dropdown-item
                :command="{ action: 'delete', ...chat }"
                class="dropdown-item delete-item"
                :disabled="isRecording || isPaused"
              >
                <div class="item-content" :class="{ 'disabled': isRecording || isPaused }">
                  <i class="el-icon-delete"></i>
                  <span>删除</span>
                </div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </div>

      <!-- 收缩状态下的对话列表 -->
      <div class="chat-list-collapsed" v-if="sidebarCollapsed">
        <div
          v-for="chat in chatList"
          :key="chat.id"
          class="chat-item-collapsed"
          :class="{ 
            active: activeChat === chat.id,
            'recording-disabled': isRecording || isPaused
          }"
          @click="selectChat(chat)"
          :title="chat.titleName"
        >
          <div class="chat-indicator"></div>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="user-profile" v-if="!sidebarCollapsed">
          <img
            :src="robotLogo"
            alt="用户"
            class="profile-avatar"
          />
          <div class="profile-info">
            <div class="profile-name">{{ username }}</div>
            <!-- <div class="profile-status">在线</div> -->
          </div>
          <el-dropdown
            @command="handleCommand"
            trigger="hover"
            class="user-dropdown"
          >
            <div class="dropdown-trigger">
              <i class="el-icon-more"></i>
            </div>
            <el-dropdown-menu slot="dropdown" class="user-dropdown-menu">
              <el-dropdown-item 
                command="template" 
                class="dropdown-item"
                :disabled="isRecording || isPaused"
              >
                <div class="item-content" :class="{ 'disabled': isRecording || isPaused }">
                  <i class="iconfont icon-shezhi"></i>
                  <span>模板设置</span>
                </div>
              </el-dropdown-item>
              <el-dropdown-item
                command="feedback"
                class="dropdown-item"
              >
                <div class="item-content">
                  <i class="iconfont icon-message"></i>
                  <span>意见反馈</span>
                </div>
              </el-dropdown-item>
              <el-dropdown-item
                command="logout"
                class="dropdown-item logout-item"
              >
                <div class="item-content">
                  <i class="iconfont icon-tuichu"></i>
                  <span>退出登录</span>
                </div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
        <div class="user-profile-collapsed" v-else>
          <img
            :src="robotLogo"
            alt="用户"
            class="profile-avatar"
            :title="username"
          />
        </div>
      </div>
    </div>

    <!-- 主聊天区域 -->
    <div class="chat-main">
      <div class="chat-messages" ref="chatMessages">
        <!-- 显示历史消息 -->
        <template v-for="(messageGroup, groupIndex) in groupedMessages">
          <!-- 消息组时间 -->
          <div v-if="messageGroup.messages.length > 0" :key="`time-${groupIndex}`" class="message-time-group">
            <div class="time-text">{{ formatTime(messageGroup.createOn) }}</div>
          </div>
          
          <!-- 消息组内容 -->
          <div
            v-for="(message, messageIndex) in messageGroup.messages"
            :key="`${groupIndex}-${messageIndex}`"
            class="message-group"
            :class="message.type"
          >
            <div v-if="message.content" class="message-content">
              <div class="message-text">
                {{ message.content }}
              </div>
            </div>
          </div>
        </template>

        <!-- 实时显示识别中的文本（只显示未分句的部分） -->
        <template v-if="recognizedText && (isRecording || isPaused) && recognizedText.length > processedTextLength">
          <div
            v-for="(segment, segmentIndex) in splitMessageByNewline(recognizedText.substring(processedTextLength))"
            :key="`current-${segmentIndex}`"
            class="message-group"
          >
            <div v-if="segment.trim()" class="message-content">
              <div class="message-text">
                {{ segment }}
                <span v-if="segmentIndex === splitMessageByNewline(recognizedText.substring(processedTextLength)).length - 1" class="recording-indicator">
                  {{ isRecording ? '正在识别中...' : '录音已暂停' }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 录音波浪动画 -->
      <div v-if="isRecording" class="audio-wave-container">
        <div class="audio-wave">
          <div class="wave-bar" v-for="i in 20" :key="i" :style="`animation-delay: ${i * 0.1}s`"></div>
        </div>
        <span class="recording-text">正在录音中...</span>
      </div>

      <div class="voice-controls-container">
        <div class="voice-control-group">
          <!-- 开始录音 -->
          <div
            v-if="!isRecording && !isPaused"
            class="simple-btn"
            @click="startRecording"
          >
            <i class="iconfont icon-kaishiluyin" style="color: #70a1de"></i>
            <span>开始录音</span>
          </div>

          <!-- 录音中：暂停 -->
          <div v-if="isRecording" class="simple-btn" @click="pauseRecording">
            <i class="iconfont icon-jixu-copy" style="color: #eb964a"></i>
            <span>暂停</span>
          </div>

          <!-- 暂停中：继续 -->
          <div v-if="isPaused" class="simple-btn" @click="continueRecording">
            <i class="iconfont icon-zanting" style="color: #65d58e"></i>
            <span>继续录音</span>
          </div>

          <!-- 通用：结束 -->
          <div
            v-if="isRecording || isPaused"
            class="simple-btn"
            @click="stopRecording"
          >
            <svg
              class="icon"
              viewBox="0 0 1024 1024"
              width="56"
              height="56"
              style="font-size: 56px"
            >
              <path
                d="M512 1024A512 512 0 1 1 512 0a512 512 0 0 1 0 1024z"
                fill="#FB260A"
                fill-opacity=".3"
              />
              <path
                d="M887.552 511.872a373.632 373.632 0 1 1-747.2 0 373.632 373.632 0 0 1 747.2 0"
                fill="#E76352"
              />
              <path
                d="M601.6 664.128H426.24a64.576 64.576 0 0 1-64.576-64.64V424.32c0-35.648 28.928-64.576 64.576-64.576H601.6c35.648 0 64.576 28.928 64.576 64.64v175.232c0 35.648-28.928 64.576-64.64 64.576"
                fill="#FFFFFF"
              />
            </svg>
            <span>结束</span>
          </div>
        </div>

        <!-- 生成病历按钮 -->
          <div v-if="messages.length > 0 && messages.some(msg => msg.content)" class="generate-btn-container">
          <el-button
            type="primary"
            size="small"
            :loading="isGenerating"
            :disabled="isRecording || isPaused"
            @click="generateRecord"
          >
            {{ isGenerating ? "生成中..." : "生成病历" }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 右侧信息面板 -->
    <div class="info-sidebar" :class="{ collapsed: infoPanelCollapsed }">
      <div class="info-panel">
        <div class="panel-header">
          <h3 v-if="!infoPanelCollapsed">{{ templateInfo.templateName }}</h3>
          <div class="header-controls">
            <el-button
              type="text"
              size="small"
              @click="toggleInfoPanel"
              class="info-toggle-btn"
              :title="infoPanelCollapsed ? '展开信息面板' : '收起信息面板'"
            >
              <i class="iconfont icon-zhankaishouqi" :class="{ 'rotated': infoPanelCollapsed }"></i>
            </el-button>
          </div>
        </div>
        <div class="panel-content" v-if="!infoPanelCollapsed">
          <!-- Loading state - 只在生成中且没有任何文字内容时显示 -->
          <div v-if="isGenerating && !generatedContent" class="loading-container">
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
              <h4 class="record-title">{{ item.title }} <i v-if="isCopy === true" class="el-icon-copy-document" @click="copyContent(item.content)"></i> </h4>
              <div class="record-content">{{ item.content }}</div>
            </div>
          </template>
          <!-- 有生成内容时显示原始内容 -->
          <div v-else-if="generatedContent" class="raw-content">
            {{ generatedContent }}
          </div>
          <!-- 默认空状态 -->
          <div
            v-else
            class="empty-message"
          >
            完成录音后将生成相应内容
          </div>
        </div>
        <!-- 收缩状态显示 -->
        <div v-if="infoPanelCollapsed" class="panel-content-collapsed">
          <div 
            class="collapsed-indicator" 
            :title="templateInfo.templateName || '点击展开信息面板'" 
            @click="toggleInfoPanel"
          >
            <i class="iconfont icon-wenjian"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置模板弹窗 -->
    <template-dialog
      :visible="templateDialogVisible"
      @update:visible="templateDialogVisible = $event"
      @template-applied="handleTemplateApplied"
    />

    <!-- 重命名弹窗 -->
    <el-dialog
      :visible.sync="renameDialogVisible"
      title="重命名聊天"
      width="400px"
      center
    >
      <el-input
        v-model="currentChat.titleName"
        placeholder="请输入新的聊天名称"
        @keyup.enter.native="saveRename"
      ></el-input>
      <span slot="footer" class="dialog-footer">
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRename">确定</el-button>
      </span>
    </el-dialog>

    <!-- 意见反馈弹窗 -->
    <el-dialog
      :visible.sync="feedbackDialogVisible"
      title="意见反馈"
      width="400px"
      center
      :close-on-click-modal="false"
    >
      <div class="feedback-content">
        <p class="feedback-text">扫描下方二维码，提交您的宝贵意见</p>
        <div class="qrcode-container">
          <img :src="qrcodeImage" alt="意见反馈二维码" class="qrcode-image" />
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="feedbackDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import config from "../utils/config";
import TemplateDialog from "../components/TemplateDialog.vue";
import { SpeechRecognition } from "../utils/speechRecognition";
import { ChatManager } from "../utils/chatManager";
import robotLogo from "@/assets/image/robot-logo.webp";
import loadingImage from "@/assets/image/loading.webp";
import qrcodeImage from "@/assets/image/QRcode.png";

export default {
  name: "Home",
  components: {
    TemplateDialog,
  },
  data() {
    return {
      config,
      robotLogo,
      loadingImage,
      qrcodeImage,
      // UI状态
      showInfoPanel: true,
      sidebarCollapsed: false,
      infoPanelCollapsed: false,
      templateDialogVisible: false,
      renameDialogVisible: false,
      feedbackDialogVisible: false,
      
      // 语音识别状态
      speechRecognition: null,
      recognizedText: "",
      processedTextLength: 0,
      typingInterval: null, // 用于存储打字效果定时器
      
      // 聊天管理
      chatManager: null,
      
      // 生成病历相关
      isGenerating: false,
      generatedContent: "",
      parsedResults: [],
      shouldSaveRecording: null, // 控制是否保存录音的字段
      isCopy: null
    };
  },
  computed: {
    username() {
      return localStorage.getItem("username");
    },
    // 当前聊天状态
    activeChat() {
      return this.chatManager?.activeChat || null;
    },
    chatList() {
      return this.chatManager?.chatList || [];
    },
    messages() {
      return this.chatManager?.messages || [];
    },
    templateInfo() {
      return this.chatManager?.templateInfo || { templateId: '', templateName: '' };
    },
    currentChat() {
      return this.chatManager?.currentChat || { id: '', voiceNumber: '', titleName: '' };
    },
    // 语音识别状态
    isRecording() {
      return this.speechRecognition?.getState().isRecording || false;
    },
    isPaused() {
      return this.speechRecognition?.getState().isPaused || false;
    },
    recordingDuration() {
      return this.speechRecognition?.getState().recordingDuration || 0;
    },
    // 按消息组分组显示
    groupedMessages() {
      const groups = {};
      
      this.messages.forEach(message => {
        const groupId = message.originalMessageId || message.id;
        
        if (!groups[groupId]) {
          groups[groupId] = {
            messages: [],
            createOn: message.createOn
          };
        }
        
        groups[groupId].messages.push(message);
      });
      
      // 转换为数组并按时间排序
      return Object.values(groups).sort((a, b) => {
        return new Date(a.createOn) - new Date(b.createOn);
      });
    },
  },
  watch: {
    // 监听activeChat变化，同步到透明窗口
    activeChat: {
      handler(newChatId, oldChatId) {
        if (newChatId !== oldChatId) {
          this.syncActiveChatToTransparent();
        }
      },
      immediate: true // 立即执行一次
    },
    // 监听聊天消息变化，同步到透明窗口
    messages: {
      handler() {
        this.syncActiveChatToTransparent();
      },
      deep: true
    },
    // 监听病历解析结果变化，同步到透明窗口
    parsedResults: {
      handler() {
        this.syncActiveChatToTransparent();
      },
      deep: true
    },
    // 监听生成内容变化，同步到透明窗口
    generatedContent: {
      handler() {
        this.syncActiveChatToTransparent();
      }
    },
    // 监听识别文字变化，同步到透明窗口
    recognizedText: {
      handler() {
        this.syncActiveChatToTransparent();
      }
    }
  },
  async created() {
    this.initializeComponents();
    this.setupTestFunctions();
    this.scrollToBottom();
  },
  async mounted() {
    this.isCopy = localStorage.getItem('isCopy') === 'true'
    this.shouldSaveRecording = localStorage.getItem('isRecording') === 'true'
    
    await this.initializeChatManager();
    this.initializeSpeechRecognition();
    
    // 监听来自主进程的请求，向透明窗口发送当前数据
    if (window.require) {
      const { ipcRenderer } = window.require("electron");
      
      ipcRenderer.on('send-current-data-to-transparent', () => {
        console.log('Main window received request to send current data to transparent');
        this.syncActiveChatToTransparent();
      });
      
      // 监听透明窗口触发的生成病历事件
      ipcRenderer.on('trigger-generate-record', () => {
        console.log('收到透明窗口生成病历请求');
        this.generateRecord();
      });

      // 监听来自悬浮框的录音控制事件
      ipcRenderer.on('floating-start-recording', () => {
        console.log('收到悬浮框开始录音事件');
        this.startRecordingFromFloating();
      });

      ipcRenderer.on('floating-pause-recording', () => {
        console.log('收到悬浮框暂停录音事件');
        this.pauseRecordingFromFloating();
      });

      ipcRenderer.on('floating-continue-recording', () => {
        console.log('收到悬浮框继续录音事件');
        this.continueRecordingFromFloating();
      });

      ipcRenderer.on('floating-stop-recording', () => {
        console.log('收到悬浮框停止录音事件');
        this.stopRecordingFromFloating();
      });
    }
  },
  methods: {
    // ====================
    // 透明窗口同步方法
    // ====================
    
    // 同步当前活动对话到透明窗口
    syncActiveChatToTransparent() {
      if (window.require) {
        try {
          const { ipcRenderer } = window.require("electron");
          
          // 准备要同步的数据 - 区分聊天消息和病历信息
          const chatData = {
            activeChat: this.activeChat,
            currentChat: this.currentChat,
            // 对话记录数据 - 对应左侧聊天区域
            chatMessages: this.messages, // 原始聊天消息
            groupedMessages: this.groupedMessages, // 分组的聊天消息
            recognizedText: this.recognizedText, // 实时识别文字
            processedTextLength: this.processedTextLength,
            // 病历信息数据 - 对应右侧信息面板
            medicalInfo: {
              templateInfo: this.templateInfo,
              parsedResults: this.parsedResults, // 结构化的病历数据
              generatedContent: this.generatedContent,
              isGenerating: this.isGenerating
            }
          };
          
          // 发送到主进程，再转发给透明窗口
          ipcRenderer.send('sync-active-chat-to-transparent', chatData);
          
          console.log('Synced chat data to transparent window:', {
            chatMessagesCount: chatData.chatMessages.length,
            parsedResultsCount: chatData.medicalInfo.parsedResults.length,
            templateName: chatData.medicalInfo.templateInfo.templateName
          });
        } catch (error) {
          console.error('Failed to sync chat data to transparent window:', error);
        }
      }
    },
    
    // ====================
    // 初始化相关方法
    // ====================
    
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

    initializeComponents() {
      // 初始化聊天管理器
      this.chatManager = new ChatManager();
    },
    
    async initializeChatManager() {
      try {
        await this.chatManager.getDefaultTemplate();
        await this.chatManager.loadChatList();
        
        // 尝试应用保存的模板设置
        await this.loadSavedTemplateSettings();
        
        // 同步初始数据到Vue的响应式数据中
        await this.syncDataFromChatManager();
      } catch (error) {
        this.handleError(error.message);
      }
    },
    
    async loadSavedTemplateSettings() {
      try {
        const savedSettings = localStorage.getItem("templateSettings");
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.selectedTemplateId && settings.selectedTemplate) {
            // 应用保存的模板设置
            this.chatManager.templateInfo = {
              templateId: settings.selectedTemplateId,
              templateName: settings.selectedTemplate,
              templateContent: ''
            };
            
            // 加载模板内容
            await this.chatManager.loadTemplateContent(settings.selectedTemplateId);
            
            console.log("已加载保存的模板设置:", settings.selectedTemplate);
          }
        }
      } catch (error) {
        console.warn("加载保存的模板设置失败:", error);
      }
    },
    
    async syncDataFromChatManager() {
      // 如果有聊天记录，加载第一个聊天的模板内容
      if (this.chatManager.chatList.length > 0) {
        try {
          const firstChat = this.chatManager.chatList[0];
          const templatesContent = await this.chatManager.loadTemplatesContent(firstChat.voiceNumber);
          this.parsedResults = templatesContent;
        } catch (error) {
          console.error('加载初始模板内容失败:', error);
          this.parsedResults = [];
        }
      } else {
        this.parsedResults = [];
        this.generatedContent = "";
      }
      this.$forceUpdate();
    },
    
    initializeSpeechRecognition() {
      // 延迟初始化，确保JS文件加载完成
      setTimeout(() => {
        try {
          this.speechRecognition = new SpeechRecognition({
            onSentenceComplete: this.handleSentenceComplete,
            onMessage: this.handleSpeechMessage,
            onError: this.handleError,
            onStateChange: this.handleSpeechStateChange,
            onRecordingStopped: this.handleRecordingStopped,
          });
        } catch (error) {
          this.handleError(error.message);
        }
      }, 1000);
    },
    
    setupTestFunctions() {
      // 添加全局测试函数
      window.testApi = async () => {
        await this.loadChatList();
      };

      window.testNewChat = async () => {
        await this.createNewChat();
      };

      // 测试分句功能（开发时使用）
      if (window.location.hostname === "localhost") {
        window.testSplit = (text) => {
          // 模拟实时输入
          this.recognizedText = "";
          this.processedTextLength = 0;

          // 逐字符添加，模拟实时识别
          let index = 0;
          // 清理之前的定时器（如果存在）
          if (this.typingInterval) {
            clearInterval(this.typingInterval);
          }
          this.typingInterval = setInterval(() => {
            if (index < text.length) {
              this.recognizedText += text[index];
              index++;
            } else {
              // 处理剩余文本
              if (this.recognizedText.length > this.processedTextLength) {
                const remainingText = this.recognizedText.substring(
                  this.processedTextLength
                );
                if (remainingText.trim()) {
                  this.chatManager.addMessage(remainingText.trim());
                  this.$forceUpdate();
                }
              }
              clearInterval(this.typingInterval);
              this.typingInterval = null;
            }
          }, 100);
        };
      }
    },

    // ====================
    // 聊天管理相关方法
    // ====================
    
    async selectChat(row) {
      // 检查是否正在录音，如果是则提示用户先停止录音
      if (this.isRecording || this.isPaused) {
        this.$message.warning("正在录音中，请先停止录音后再切换聊天");
        return;
      }
      
      try {
        // 结束当前录音会话（如果有的话）
        this.chatManager.endRecordingSession();
        
        // 先清除之前的数据
        this.parsedResults = [];
        this.generatedContent = "";
        
        const result = await this.chatManager.selectChat(row);
        
        // 同步模板内容到Vue的响应式数据中
        this.parsedResults = result.templatesContent || [];
        
        // 同步选中的对话到透明窗口
        this.$nextTick(() => {
          this.syncActiveChatToTransparent();
        });
        
        this.scrollToBottom();
      } catch (error) {
        this.handleError(error.message);
        // 错误时也要清除数据
        this.parsedResults = [];
        this.generatedContent = "";
      }
    },

    async createNewChat() {
      // 检查是否正在录音，如果是则提示用户先停止录音
      if (this.isRecording || this.isPaused) {
        this.$message.warning("正在录音中，请先停止录音后再创建新对话");
        return;
      }
      
      try {
        // 结束当前录音会话（如果有的话）
        this.chatManager.endRecordingSession();
        
        // 先清除当前数据
        this.parsedResults = [];
        this.generatedContent = "";
        
        const result = await this.chatManager.createNewChat();
        this.$message.success(result.message);
        
        // 同步新对话到透明窗口
        this.$nextTick(() => {
          this.syncActiveChatToTransparent();
        });
        
        // 强制更新视图以确保聊天列表更新
        this.$forceUpdate();
      } catch (error) {
        this.handleError(error.message);
      }
    },

    async loadChatList() {
      try {
        await this.chatManager.loadChatList();
        
        // 重新同步数据
        await this.syncDataFromChatManager();
      } catch (error) {
        this.handleError(error.message);
      }
    },

    // ====================
    // UI 相关方法
    // ====================
    
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },

    toggleInfoPanel() {
      this.infoPanelCollapsed = !this.infoPanelCollapsed;
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const chatMessages = this.$refs.chatMessages;
        if (chatMessages) {
          // 平滑滚动到底部
          chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    },

    // 检查是否需要自动滚动
    checkAndAutoScroll() {
      this.$nextTick(() => {
        const chatMessages = this.$refs.chatMessages;
        if (chatMessages) {
          const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 100;
          if (isNearBottom) {
            this.scrollToBottom();
          }
        }
      });
    },

    // 处理错误
    handleError(error) {
      this.$message.error(error);
    },

    // 按照换行符分割消息内容
    splitMessageByNewline(content) {
      if (!content) return [];
      
      // 按照换行符分割，并过滤掉空内容
      const segments = content.split('\n').filter(segment => segment.trim());
      
      // 如果没有有效内容，返回原始内容
      if (segments.length === 0) {
        return [content];
      }
      
      return segments;
    },

    // 格式化时间显示
    formatTime(timeString) {
      if (!timeString) return '';
      
      const date = new Date(timeString);
      
      // 显示完整的年月日时分秒
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    // ====================
    // 语音识别相关方法
    // ====================
    
    async startRecording() {
      try {
        // 开始新的录音会话
        this.chatManager.startRecordingSession();
        await this.speechRecognition.startRecording();
        this.$message.success("开始录音");
      } catch (error) {
        this.handleError(error.message);
      }
    },

    pauseRecording() {
      try {
        this.speechRecognition.pauseRecording();
        this.$message.info("录音已暂停");
      } catch (error) {
        this.handleError(error.message);
      }
    },

    continueRecording() {
      try {
        this.speechRecognition.continueRecording();
        this.$message.success("继续录音");
      } catch (error) {
        this.handleError(error.message);
      }
    },

    async stopRecording() {
      try {
        const result = this.speechRecognition.stopRecording();
        this.$message.success(`录音结束，时长：${result.duration}秒`);
        
        // 录音结束后，保存对话信息
        if (this.messages.length > 0) {
          await this.chatManager.saveOrUpdateChat(this.messages);
          // 重新加载聊天列表，但不重新同步右侧面板数据（因为当前聊天没变）
          // await this.chatManager.loadChatList();
          this.$forceUpdate();
          
          // 自动生成病历
          await this.generateRecord();
        }
        
        // 结束录音会话
        this.chatManager.endRecordingSession();
      } catch (error) {
        this.handleError(error.message);
        // 错误时也要结束会话
        this.chatManager.endRecordingSession();
      }
    },

    // ====================
    // 来自悬浮球的录音控制方法（不显示消息提示）
    // ====================
    
    async startRecordingFromFloating() {
      try {
        // 开始新的录音会话
        this.chatManager.startRecordingSession();
        await this.speechRecognition.startRecording();
        // 不显示消息提示，因为透明窗口已经显示了
      } catch (error) {
        this.handleError(error.message);
      }
    },

    pauseRecordingFromFloating() {
      try {
        this.speechRecognition.pauseRecording();
        // 不显示消息提示，因为透明窗口已经显示了
      } catch (error) {
        this.handleError(error.message);
      }
    },

    continueRecordingFromFloating() {
      try {
        this.speechRecognition.continueRecording();
        // 不显示消息提示，因为透明窗口已经显示了
      } catch (error) {
        this.handleError(error.message);
      }
    },

    async stopRecordingFromFloating() {
      try {
        const result = this.speechRecognition.stopRecording();
        // 不显示消息提示，因为透明窗口已经显示了
        
        // 录音结束后，保存对话信息
        if (this.messages.length > 0) {
          await this.chatManager.saveOrUpdateChat(this.messages);
          this.$forceUpdate();
          
          // 自动生成病历
          await this.generateRecord();
        }
        
        // 结束录音会话
        this.chatManager.endRecordingSession();
      } catch (error) {
        this.handleError(error.message);
        // 错误时也要结束会话
        this.chatManager.endRecordingSession();
      }
    },

    // 语音识别回调函数
    handleSentenceComplete(sentence) {
      this.chatManager.addMessage(sentence);
      this.$forceUpdate();
      this.scrollToBottom();
    },

    handleSpeechMessage(data) {
      this.recognizedText = data.recognizedText;
      this.processedTextLength = data.processedTextLength;
      // 实时文字更新时检查是否需要自动滚动
      this.checkAndAutoScroll();
    },

    handleSpeechStateChange(connState, isConnected) {
      // 处理连接状态变化
      if (connState === 0) {
        this.$message.success("语音识别服务连接成功");
      } else if (connState === 2) {
        this.$message.error("语音识别服务连接失败");
      }
    },

    // 处理录音停止，保存录音文件
    async handleRecordingStopped(blob, duration) {
      if (!this.shouldSaveRecording || !blob) {
        return;
      }

      try {
        // 检查是否在Electron环境中
        if (!window.require) {
          console.warn('非Electron环境，无法保存录音文件');
          return;
        }

        console.log('开始保存录音文件，Blob信息:', {
          size: blob.size,
          type: blob.type,
          duration: duration
        });

        const fs = window.require('fs');
        const path = window.require('path');
        
        // 创建录音文件夹路径
        const recordingsDir = 'D:\\录音文件';
        
        // 检查文件夹是否存在，不存在则创建
        if (!fs.existsSync(recordingsDir)) {
          fs.mkdirSync(recordingsDir, { recursive: true });
          console.log('已创建录音文件夹:', recordingsDir);
        }
        
        // 生成文件名（使用当前时间戳）
        const now = new Date();
        const timestamp = now.getFullYear() + 
          String(now.getMonth() + 1).padStart(2, '0') + 
          String(now.getDate()).padStart(2, '0') + '_' +
          String(now.getHours()).padStart(2, '0') + 
          String(now.getMinutes()).padStart(2, '0') + 
          String(now.getSeconds()).padStart(2, '0');
        
        const fileName = `录音_${timestamp}.wav`;
        const filePath = path.join(recordingsDir, fileName);
        
        // 验证blob数据
        if (blob.size === 0) {
          throw new Error('录音数据为空');
        }
        
        if (!blob.type || !blob.type.includes('audio')) {
          console.warn('Blob类型可能不正确:', blob.type);
        }
        
        // 将blob转换为buffer并保存
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log('准备写入文件:', {
          filePath: filePath,
          bufferSize: buffer.length,
          expectedSize: blob.size
        });
        
        fs.writeFileSync(filePath, buffer);
        
        // 验证文件是否正确保存
        const stats = fs.statSync(filePath);
        console.log('文件保存完成:', {
          filePath: filePath,
          fileSize: stats.size,
          originalSize: blob.size
        });
        
        if (stats.size === 0) {
          throw new Error('保存的文件大小为0');
        }
        
        this.$message.success(`录音已保存到: ${filePath} (${(stats.size / 1024).toFixed(1)} KB)`);
        console.log('录音文件保存成功:', filePath, '时长:', duration, '秒', '文件大小:', stats.size, '字节');
        
      } catch (error) {
        console.error('保存录音文件失败:', error);
        this.$message.error('保存录音文件失败: ' + error.message);
      }
    },

    // ====================
    // 模板管理相关方法
    // ====================
    
    showTemplateDialog() {
      this.templateDialogVisible = true;
    },

    showFeedbackDialog() {
      this.feedbackDialogVisible = true;
    },

    async handleTemplateApplied(settings) {
      try {
        console.log("应用模板设置:", settings);
        
        // 更新聊天管理器的模板信息
        if (this.chatManager && settings.selectedTemplateId) {
          this.chatManager.templateInfo = {
            templateId: settings.selectedTemplateId,
            templateName: settings.selectedTemplate,
            templateContent: ''
          };
          
          // 加载新模板的内容
          await this.chatManager.loadTemplateContent(settings.selectedTemplateId);
          
          // 如果当前有活跃聊天，更新其titleName
          if (this.chatManager.activeChat && this.chatManager.currentChat) {
            this.chatManager.currentChat.titleName = settings.selectedTemplate;
          }
          
          // 强制更新视图
          this.$forceUpdate();
          
          this.$message.success(`已切换到模板：${settings.selectedTemplate}`);
        }
      } catch (error) {
        console.error("应用模板设置失败:", error);
        this.$message.error("应用模板设置失败");
      }
    },

    updateGeneratedContent(content) {
      this.generatedContent = content;
      try {
        this.parsedResults = this.chatManager.parseWorkflowResult(content);
      } catch (error) {
        this.parsedResults = [];
      }
    },

    clearResults() {
      this.generatedContent = "";
      this.parsedResults = [];
      this.$message.success("已清空生成结果");
    },

    // ====================
    // 用户管理相关方法
    // ====================
    
    handleCommand(command) {
      switch (command) {
        case "template":
          // 检查是否正在录音，如果是则提示用户先停止录音
          if (this.isRecording || this.isPaused) {
            this.$message.warning("正在录音中，请先停止录音后再进行模板设置");
            return;
          }
          this.showTemplateDialog();
          break;
        case "feedback":
          this.showFeedbackDialog();
          break;
        case "logout":
          this.logout();
          break;
      }
    },

    logout() {
      this.$confirm("确定要退出登录吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(() => {
          // 通知主进程用户退出登录
          if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('user-logout');
          }

          // 清除本地存储的用户信息
          localStorage.removeItem("username");
          localStorage.removeItem("token");
          localStorage.removeItem("isLoggedIn");
          localStorage.removeItem("userId");
          localStorage.removeItem("isCopy");
          localStorage.removeItem("isRecording");

          // 跳转到登录页面
          this.$router.push("/login");

          this.$message.success("已退出登录");
        })
        .catch(() => {
          // 用户取消退出
        });
    },

    // ====================
    // 聊天操作相关方法
    // ====================
    
    handleChatCommand(row) {
      // 检查是否正在录音，如果是则提示用户先停止录音
      if (this.isRecording || this.isPaused) {
        this.$message.warning("正在录音中，请先停止录音后再进行操作");
        return;
      }
      
      const { action } = row;
      switch (action) {
        case "rename":
          this.showRenameDialog(row);
          break;
        case "delete":
          this.confirmDeleteChat(row);
          break;
      }
    },

    showRenameDialog(row) {
      this.currentChat = { ...row };
      this.renameDialogVisible = true;
    },

    async saveRename() {
      if (!this.currentChat.titleName.trim()) {
        this.$message.warning("请输入聊天名称");
        return;
      }

      try {
        const result = await this.chatManager.renameChat(
          this.currentChat.voiceNumber,
          this.currentChat.titleName
        );
        this.$message.success(result.message);
        // 重命名后重新同步数据
        this.$forceUpdate();
      } catch (error) {
        this.handleError(error.message);
      }

      this.renameDialogVisible = false;
    },

    confirmDeleteChat(row) {
      this.$confirm("确定要删除这个聊天吗？删除后无法恢复。", "确认删除", {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(async () => {
          try {
            const result = await this.chatManager.deleteChat(row.voiceNumber);
            this.$message.success(result.message);
            
            // 删除后清除右侧面板数据，然后重新同步
            this.parsedResults = [];
            this.generatedContent = "";
            await this.syncDataFromChatManager();
          } catch (error) {
            this.handleError(error.message);
          }
        })
        .catch(() => {
          // 用户取消删除
        });
    },

    // ====================
    // 窗口控制相关方法
    // ====================
    
    minimizeWindow() {
      if (window.require) {
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send("minimize-window");
      }
    },
    
    closeWindow() {
      if (window.require) {
        const { ipcRenderer } = window.require("electron");
        ipcRenderer.send("close-window");
      } else {
        window.close();
      }
    },
    // ====================
    // 病历生成相关方法
    // ====================
    
    async generateRecord() {
      if (this.isGenerating) return;
      
      // 检查是否正在录音，如果是则提示用户先停止录音
      if (this.isRecording || this.isPaused) {
        this.$message.warning("正在录音中，请先停止录音后再生成病历");
        return;
      }

      this.isGenerating = true;
      this.$message.info("正在生成病历，请稍候...");
      
      // 同步生成状态到透明窗口
      this.syncActiveChatToTransparent();

      try {
        const currentChatData = this.chatList.find(
          (chat) => chat.id === this.activeChat
        );
        
        if (!currentChatData) {
          this.$message.error("请先选择一个对话");
          return;
        }

        // 调用工作流API生成病历
        const generatedContent = await this.callWorkflowAPI(currentChatData);
        
        if (generatedContent) {
          // 保存生成的病历内容
          await this.chatManager.saveTemplatesContent(generatedContent);
          
          // 重新加载当前聊天的模板内容，确保右侧面板显示最新数据
          if (this.currentChat.voiceNumber) {
            const templatesContent = await this.chatManager.loadTemplatesContent(this.currentChat.voiceNumber);
            this.parsedResults = templatesContent || [];
          }
          
          this.$message.success("病历生成完成！");
          
          // 同步生成完成的数据到透明窗口
          this.syncActiveChatToTransparent();
        }
      } catch (error) {
        this.handleError("生成病历失败，请重试");
        console.error("生成病历错误:", error);
      } finally {
        this.isGenerating = false;
        // 同步最终状态到透明窗口
        this.syncActiveChatToTransparent();
      }
    },

    async callWorkflowAPI(currentChat) {
      const res = await fetch(`${config.DIFT_URL}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            voice_number: currentChat.voiceNumber || currentChat.id + "",
            template_content: this.chatManager.templateInfo.templateContent || "",
            template_name: this.chatManager.templateInfo.templateName || "",
            dialogue_content: this.messages
              .map((message) => message.content || message.dialogueContent)
              .join("\n"),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      return await this.processStreamingResponse(res);
    },

    async processStreamingResponse(response) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let generatedContent = "";
      let reading = true;

      while (reading) {
        const { done, value } = await reader.read();

        if (done) {
          reading = false;
          break;
        }

        // 解码流数据
        const chunk = decoder.decode(value, { stream: true });
        
        // 解析流式数据
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.trim() && line.startsWith("data: ")) {
            const jsonStr = line.substring(6);
            if (jsonStr.trim() !== "[text_chunk]") {
              try {
                const data = JSON.parse(jsonStr);

                // 处理 text_chunk 事件
                if (data.event === "text_chunk" && data.data?.text) {
                  generatedContent += data.data.text;
                  this.updateGeneratedContent(generatedContent);
                }

                // 处理 workflow_finished 事件
                if (data.event === "workflow_finished" && data.data?.outputs) {
                  const finalResult = data.data.outputs.result;
                  if (finalResult) {
                    generatedContent = finalResult;
                    this.updateGeneratedContent(generatedContent);
                  }
                }
              } catch (parseError) {
                console.warn("解析JSON数据失败:", parseError);
              }
            }
          }
        }
      }

      return generatedContent;
    },
  },

  beforeDestroy() {
    // 清理 IPC 事件监听器
    if (window.require) {
      const { ipcRenderer } = window.require("electron");
      
      // 移除所有 IPC 事件监听器
      ipcRenderer.removeAllListeners('send-current-data-to-transparent');
      ipcRenderer.removeAllListeners('floating-start-recording');
      ipcRenderer.removeAllListeners('floating-pause-recording');
      ipcRenderer.removeAllListeners('floating-continue-recording');
      ipcRenderer.removeAllListeners('floating-stop-recording');
    }
    
    // 清理语音识别资源
    if (this.speechRecognition) {
      this.speechRecognition.destroy();
    }
    
    // 清理定时器（如果有）
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }
  },
};
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background-color: #ffffff;
  position: relative;
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.loading-gif {
  width: 80px;
  height: 80px;
}

.generating-content {
  width: 100%;
  height: 100%;
}

.generating-header {
  padding: 8px 0 12px 0;
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 12px;
}

.generating-indicator {
  font-size: 12px;
  color: #409eff;
  font-weight: 500;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 音频波浪动画 */
.audio-wave-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.audio-wave {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  gap: 2px;
  margin-bottom: 8px;
}

.wave-bar {
  width: 3px;
  height: 10px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border-radius: 2px;
  animation: wave 1.5s ease-in-out infinite;
  transform-origin: center;
}

.recording-text {
  font-size: 12px;
  color: #409eff;
  font-weight: 500;
  animation: pulse 1.5s infinite;
}

@keyframes wave {
  0%, 100% {
    height: 10px;
    opacity: 0.6;
  }
  50% {
    height: 30px;
    opacity: 1;
  }
}

/* 自定义标题栏 */
.custom-title-bar {
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  -webkit-app-region: drag;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 1001;
}

.title-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.app-title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.5px;
}

.title-controls {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.title-btn {
  width: 28px;
  height: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.title-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.close-btn:hover {
  background: #ff5f57;
}

.minimize-btn:hover {
  background: #ffbd2e;
}

/* 拖拽区域 */
.drag-region {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  -webkit-app-region: drag;
  z-index: 1000;
  pointer-events: none;
}

/* 左侧对话列表 */
.chat-sidebar {
  width: 260px;
  background-color: #f7f7f8;
  border-right: 1px solid #e3e3e3;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;
}

.chat-sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 12px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.chat-sidebar.collapsed .header-top {
  justify-content: center;
}

.sidebar-toggle-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  padding: 0;
  color: #8e8ea0;
  -webkit-app-region: no-drag;
  transition: all 0.2s ease;
}

.sidebar-toggle-btn:hover {
  background-color: #ececec;
  color: #1f1f1f;
}

.new-chat-btn {
  width: 100%;
  height: 40px;
  border-radius: 8px;
  font-weight: 500;
  -webkit-app-region: no-drag;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #5394d2 0%, #275c8e 100%);
  border: none;
  color: white;
  font-size: 14px;
  text-align: left;
  padding-left: 24px;
}

.new-chat-btn:hover {
  background: linear-gradient(135deg, #4884c1 0%, #1e4a79 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(83, 148, 210, 0.3);
}

.new-chat-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(83, 148, 210, 0.2);
}

.new-chat-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #cccccc !important;
  transform: none !important;
  box-shadow: none !important;
}

.new-chat-btn:disabled:hover {
  background: #cccccc !important;
  transform: none !important;
  box-shadow: none !important;
}

.collapsed-btn {
  width: 36px;
  padding: 0;
  background: linear-gradient(135deg, #5394d2 0%, #275c8e 100%);
  border: none;
  color: white;
  text-align: center !important;
  padding-left: 0 !important;
}

.collapsed-btn:hover {
  background: linear-gradient(135deg, #4884c1 0%, #1e4a79 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(83, 148, 210, 0.3);
}

.collapsed-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #cccccc !important;
  transform: none !important;
  box-shadow: none !important;
}

.collapsed-btn:disabled:hover {
  background: #cccccc !important;
  transform: none !important;
  box-shadow: none !important;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.chat-list-collapsed {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  -webkit-app-region: no-drag;
}

.chat-item:hover {
  background-color: #ececec;
}

.chat-item.active {
  background-color: #e3f2fd;
}

.chat-item.recording-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.chat-item.recording-disabled:hover {
  background-color: transparent;
}

.chat-item-collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
  height: 36px;
}

.chat-item-collapsed:hover {
  background-color: #ececec;
}

.chat-item-collapsed.active {
  background-color: #e3f2fd;
}

.chat-item-collapsed.recording-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.chat-item-collapsed.recording-disabled:hover {
  background-color: transparent;
}

.chat-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #8e8ea0;
  transition: all 0.2s ease;
}

.chat-item-collapsed.active .chat-indicator {
  background-color: #409eff;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f1f1f;
  margin-bottom: 2px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chat-time {
  font-size: 12px;
  color: #8e8ea0;
}

.more-btn {
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 6px;
  border-radius: 6px;
  -webkit-app-region: no-drag;
  color: #6b7280;
  background-color: transparent;
}

.chat-item:hover .more-btn {
  opacity: 1;
  color: #374151;
  background-color: rgba(107, 114, 128, 0.1);
}

.more-btn:hover {
  background-color: rgba(107, 114, 128, 0.2) !important;
  color: #1f2937 !important;
  transform: scale(1.05);
}

.sidebar-footer {
  border-top: 1px solid #e3e3e3;
  padding: 12px;
}

.user-profile {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
  -webkit-app-region: no-drag;
}

.user-profile:hover {
  background-color: #ececec;
}

.user-profile-collapsed {
  display: flex;
  justify-content: center;
  padding: 8px;
  -webkit-app-region: no-drag;
}

.profile-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 8px;
}

.user-profile-collapsed .profile-avatar {
  margin-right: 0;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f1f1f;
  margin-bottom: 2px;
}

.profile-status {
  font-size: 12px;
  color: #10a37f;
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.chat-header {
  padding: 16px 24px;
  padding-top: 46px; /* 为拖拽区域留出空间 */
  border-bottom: 1px solid #e3e3e3;
  background-color: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-title h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f1f1f;
}

.chat-model {
  font-size: 13px;
  color: #8e8ea0;
}

.window-controls {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  padding: 0;
  color: #8e8ea0;
}

.control-btn:hover {
  background-color: #ececec;
  color: #1f1f1f;
}

.close-btn:hover {
  background-color: #ff5f57;
  color: white;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background-color: #ffffff;
}

.message-group {
  display: flex;
  margin-bottom: 24px;
  gap: 12px;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background-color: #10a37f;
  color: white;
}

.user-avatar {
  background-color: #5436da;
}

.assistant-avatar {
  background-color: #10a37f;
}

.message-content {
  max-width: 70%;
  min-width: 100px;
}

.message-text {
  background-color: #dbe9f6;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.6;
  color: #1f1f1f;
  word-wrap: break-word;
}

.message-time {
  font-size: 12px;
  color: #8e8ea0;
  margin-top: 6px;
  text-align: right;
}

.message-time-group {
  display: flex;
  justify-content: center;
  margin: 8px 0 16px 0;
  padding: 0 16px;
}

.time-text {
  font-size: 14px;
  color: #8e8ea0;
}

/* 语音控制容器 */
.voice-controls-container {
  border: 1px solid #e8e8e8;
  margin: 10px;
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.voice-control-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
}

.simple-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 16px;
}

.simple-btn i {
  font-size: 56px;
  margin-bottom: 8px;
}

.simple-btn span {
  font-size: 14px;
  font-weight: 500;
}

.simple-btn svg.icon {
  display: block;
  margin: 0 auto 8px auto;
  vertical-align: middle;
}

.generate-btn-container {
  position: absolute;
  bottom: 10px;
  right: 10px;
}

.generate-record-btn {
  height: 80px;
  width: 120px;
  font-size: 14px;
  font-weight: 500;
}

.generate-btn-container .el-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #cccccc !important;
  border-color: #cccccc !important;
  color: #999 !important;
}

.generate-btn-container .el-button:disabled:hover {
  background-color: #cccccc !important;
  border-color: #cccccc !important;
  color: #999 !important;
}

/* 右侧信息面板 */
.info-sidebar {
  width: 320px;
  display: flex;
  flex-direction: column;
  border: 1px solid #e8e8e8;
  padding: 16px;
  margin: 16px;
  border-radius: 16px;
  transition: width 0.3s ease;
}

.info-sidebar.collapsed {
  width: 80px;
}

.info-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fafafa;
  border: 1px solid #e8e8e8;
  overflow: hidden;
}

.panel-header {
  padding: 10px;
  border-bottom: 1px solid #e8e8e8;
  background-color: #f5f5f5;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.header-controls {
  display: flex;
  align-items: center;
}

.panel-content {
  flex: 1;
  padding: 24px;
  display: flex;
  background-color: #fbfbfb;
  flex-direction: column;
  overflow-y: auto;
}

.empty-message {
  font-size: 14px;
  color: #8e8ea0;
  line-height: 1.6;
  width: 100%;
  flex: 1;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 200px;
}

.case-content {
  width: 100%;
  flex: 1;
  padding: 16px;
}

.case-preview {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e9ecef;
}

.case-preview p {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.message-preview {
  font-size: 13px;
  color: #6c757d;
  background-color: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.message-count {
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

.message-summary {
  max-height: 120px;
  overflow-y: auto;
}

.message-item {
  margin-bottom: 6px;
  line-height: 1.4;
}

.message-item:last-child {
  margin-bottom: 0;
}

.message-type {
  font-weight: 500;
  color: #007bff;
  margin-right: 4px;
}

.message-text {
  color: #6c757d;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

.content-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.clear-btn {
  color: #6c757d;
  padding: 4px;
}

.clear-btn:hover {
  color: #dc3545;
}

.content-text {
  flex: 1;
  overflow-y: auto;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 12px;
}

.content-text pre {
  margin: 0;
  font-family: "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #495057;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.recording-indicator {
  display: inline-block;
  margin-left: 8px;
  font-size: 12px;
  color: #999;
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

/* 滚动条样式 */
.chat-list::-webkit-scrollbar,
.chat-list-collapsed::-webkit-scrollbar,
.chat-messages::-webkit-scrollbar,
.info-content::-webkit-scrollbar {
  width: 6px;
}

.chat-list::-webkit-scrollbar-track,
.chat-list-collapsed::-webkit-scrollbar-track,
.chat-messages::-webkit-scrollbar-track,
.info-content::-webkit-scrollbar-track {
  background: transparent;
}

.chat-list::-webkit-scrollbar-thumb,
.chat-list-collapsed::-webkit-scrollbar-thumb,
.chat-messages::-webkit-scrollbar-thumb,
.info-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.chat-list::-webkit-scrollbar-thumb:hover,
.chat-list-collapsed::-webkit-scrollbar-thumb:hover,
.chat-messages::-webkit-scrollbar-thumb:hover,
.info-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 用户下拉菜单样式 */
.user-dropdown {
  position: relative;
}
.dropdown-trigger {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #8e8ea0;
  background-color: transparent;
}

.dropdown-trigger:hover {
  background-color: #f0f0f0;
  color: #1f1f1f;
}

.dropdown-trigger i {
  font-size: 14px;
}

.user-dropdown-menu {
  border-radius: 8px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid #e3e3e3 !important;
  padding: 4px 0 !important;
  min-width: 120px !important;
  background-color: #ffffff !important;
}

.dropdown-item {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  background: none !important;
}

.dropdown-item .item-content {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  font-size: 13px;
  color: #1f1f1f;
  transition: all 0.2s ease;
  border-radius: 4px;
  margin: 0 2px;
}

.dropdown-item:hover .item-content {
  background-color: #f5f5f5;
  color: #409eff;
}

.dropdown-item .item-content i {
  margin-right: 8px;
  font-size: 14px;
  width: 14px;
  text-align: center;
}

.dropdown-item .item-content span {
  font-weight: 500;
}

.logout-item .item-content {
  color: #f56c6c;
}

.logout-item:hover .item-content {
  background-color: #fef0f0;
  color: #f56c6c;
}

.user-dropdown-menu .dropdown-item .item-content.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #999 !important;
}

.user-dropdown-menu .dropdown-item .item-content.disabled:hover {
  background-color: transparent !important;
  color: #999 !important;
}

/* 移除Element UI默认样式 */
.user-dropdown-menu .el-dropdown-menu__item {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  background: none !important;
}

.user-dropdown-menu .el-dropdown-menu__item:hover {
  background-color: transparent !important;
  color: inherit !important;
}

/* 聊天下拉菜单样式 */
.chat-dropdown {
  position: relative;
}

.chat-dropdown-menu {
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  border: none !important;
  padding: 8px !important;
  min-width: 110px !important;
  background-color: #ffffff !important;
  backdrop-filter: blur(10px) !important;
}

.chat-dropdown-menu .dropdown-item {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  background: none !important;
}

.chat-dropdown-menu .dropdown-item .item-content {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  font-size: 13px;
  color: #374151;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  margin: 2px 0;
  font-weight: 500;
}

.chat-dropdown-menu .dropdown-item:hover .item-content {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #1e40af;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(30, 64, 175, 0.15);
}

.chat-dropdown-menu .dropdown-item .item-content i {
  margin-right: 8px;
  font-size: 14px;
  width: 16px;
  text-align: center;
  opacity: 0.8;
}

.chat-dropdown-menu .dropdown-item .item-content span {
  font-weight: 500;
  letter-spacing: 0.025em;
}

.chat-dropdown-menu .delete-item .item-content {
  color: #dc2626;
}

.chat-dropdown-menu .delete-item:hover .item-content {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  color: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);
}

.chat-dropdown-menu .dropdown-item .item-content.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #999 !important;
}

.chat-dropdown-menu .dropdown-item .item-content.disabled:hover {
  background: transparent !important;
  transform: none !important;
  box-shadow: none !important;
  color: #999 !important;
}

/* 移除Element UI默认样式 */
.chat-dropdown-menu .el-dropdown-menu__item {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  background: none !important;
}

.chat-dropdown-menu .el-dropdown-menu__item:hover {
  background-color: transparent !important;
  color: inherit !important;
}

/* 解析结果样式 */
.parsed-results {
  padding: 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.results-list {
  margin-top: 12px;
}

.result-item {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.result-title {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
  font-size: 14px;
}

.result-content {
  color: #5a6c7d;
  line-height: 1.5;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

.content-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.clear-btn {
  color: #6c757d;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  color: #dc3545;
  background-color: #f8f9fa;
}

.generated-content {
  padding: 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.content-text {
  margin-top: 12px;
}

.content-text pre {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #495057;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.case-preview {
  padding: 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.case-preview p {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-weight: 600;
  font-size: 14px;
}

.message-preview {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
}

.message-count {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 8px;
}

.message-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message-item {
  display: flex;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.4;
}

.message-type {
  font-weight: 600;
  color: #409eff;
  margin-right: 4px;
  min-width: 40px;
}

.message-text {
  color: #495057;
  flex: 1;
}

.empty-message {
  text-align: center;
  color: #6c757d;
  font-size: 14px;
  padding: 40px 20px;
}

.record-item {
  margin-bottom: 14px;
}

.record-title {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.record-content {
  font-size: 14px;
  line-height: 1.6;
  color: #495057;
  white-space: pre-wrap;
  word-break: break-word;
}

.raw-content {
  font-size: 14px;
  line-height: 1.6;
  color: #495057;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

/* 意见反馈弹窗样式 */
.feedback-content {
  text-align: center;
  padding: 20px 0;
}

.feedback-text {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
  line-height: 1.5;
}

.qrcode-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px 0;
}

.qrcode-image {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e8e8e8;
}

.info-sidebar.collapsed .panel-content-collapsed {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  background-color: #f8f9fa;
  border: 1px solid #e8e8e8;
}

.info-sidebar.collapsed .collapsed-indicator {
  font-size: 24px;
  color: #8e8ea0;
}

.info-sidebar.collapsed .collapsed-indicator:hover {
  color: #409eff;
}

.info-toggle-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  padding: 0;
  color: #8e8ea0;
  -webkit-app-region: no-drag;
  transition: all 0.2s ease;
}

.info-toggle-btn:hover {
  background-color: #ececec;
  color: #1f1f1f;
}

.info-toggle-btn.rotated {
  transform: rotate(180deg);
}

/* 信息面板收缩相关样式 */
.panel-content-collapsed {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background-color: #fbfbfb;
}

.collapsed-indicator {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 18px;
  color: #8e8ea0;
  transition: all 0.2s ease;
  cursor: pointer;
}

.collapsed-indicator:hover {
  background-color: #f0f0f0;
  color: #409eff;
}

.info-toggle-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  padding: 0;
  color: #8e8ea0;
  -webkit-app-region: no-drag;
  transition: all 0.2s ease;
}

.info-toggle-btn:hover {
  background-color: #ececec;
  color: #1f1f1f;
}

.info-toggle-btn .iconfont.rotated {
  transform: rotate(180deg);
}
</style>
