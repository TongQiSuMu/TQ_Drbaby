<template>
  <div
    class="login-container"
    :style="{ backgroundImage: `url(${loginBj2})` }"
  >
    <!-- 上半部分：背景图片区域，包含图标和标题 -->
    <div class="login-header">
      <img :src="robotLogo" alt="机器人" class="robot-image">
      <h3 class="login-title">欢迎登录体验</h3>
    </div>
    
    <!-- 下半部分：白色背景的表单区域 -->
    <div class="login-form-container">
      <el-form :model="loginForm" :rules="rules" ref="loginForm" class="login-form" size="mini">
        <el-form-item prop="userNumber">
          <el-input 
            v-model="loginForm.userNumber" 
            placeholder="请输入用户名"
            size="mini"
            @keyup.enter.native="handleLogin">
          </el-input>
        </el-form-item>
        <el-form-item prop="passWord">
          <el-input 
            v-model="loginForm.passWord" 
            type="password"
            placeholder="请输入密码"
            size="mini"
            show-password
            @keyup.enter.native="handleLogin">
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            size="mini" 
            class="login-btn"
            :loading="loading"
            @click="handleLogin">
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
        <!-- 声明同意复选框 -->
        <el-form-item class="agreement-item">
          <el-checkbox ref="agreementCheckbox" v-model="agreedToTerms" size="mini" class="agreement-checkbox" :style="{ animation: isShaking ? 'shake 0.6s ease-in-out' : '' }" @change="handleCheckboxChange">
            <span>
              我已仔细阅读并完全理解上述重要声明，知晓AI辅助工具具有局限性，承诺在使用过程中审慎对待中文语音医疗内容，
              独立承担相应的医疗责任。
            </span>
            <span class="view-terms-link" @click.stop="openTermsDialog">查看详细声明</span>
          </el-checkbox>
        </el-form-item>
      </el-form>
    </div>

    <!-- 重要声明弹窗 -->
    <el-dialog
      title="重要声明"
      :visible.sync="showTermsDialog"
      width="600px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
      class="terms-dialog">
      <div class="terms-content" ref="termsContent" @scroll="handleScroll">
        <div class="terms-header">
          <div class="terms-title">
            <i class="el-icon-warning-outline"></i>
            <span>明确告知</span>
          </div>
          <div class="terms-subtitle">请仔细阅读以下重要声明</div>
        </div>
        
        <div class="terms-section">
          <div class="section-title">
            <i class="el-icon-info"></i>
            系统说明
          </div>
          <div class="section-content">
            <p>本系统的<span class="highlight">语音转文本及AI推荐结果仅供参考</span>，不能作为诊断或治疗的唯一或主要依据。</p>
            <p>医生需<span class="highlight">自行判断并承担医疗责任</span>。所有医疗决策应基于您的专业知识、临床经验以及患者的具体情况。</p>
            <div class="warning-box">
              <i class="el-icon-warning"></i>
              <div>
                <strong>注意：</strong>
                <p>AI辅助工具存在技术局限性，可能出现识别错误或推测偏差。请务必结合临床实际情况进行综合判断。</p>
              </div>
            </div>
          </div>
        </div>

        <div class="terms-section">
          <div class="section-title">
            <i class="el-icon-document"></i>
            用户须知
          </div>
          <div class="section-content">
            <div class="subsection">
              <h4>1. 工具性质说明</h4>
              <ul>
                <li>本工具为医疗文本结构化辅助软件，属于"诊疗信息整理工具"，不属于医疗器械。</li>
                <li>仅支持：症状关键词提取、检查术语标准化、结构化分词（基于公开指南）。</li>
                <li>不包含疾病诊断、处方推荐、疗效预测等功能。</li>
              </ul>
            </div>

            <div class="subsection">
              <h4>2. 禁止用途</h4>
              <ul>
                <li>不得用于急诊、重症监护等高风险场景。</li>
                <li>不得替代医生判断或临床检查。</li>
                <li>不得将本工具输出内容直接用于疾病诊断或处方部分。</li>
                <li>不得基于本工具整理数据直接制定诊疗方案。</li>
              </ul>
            </div>

            <div class="subsection">
              <h4>3. 医生责任声明</h4>
              <p>您点击[确认]即代表同意：</p>
              <ul>
                <li>作为执业医生，您需独立承担所有诊疗决策责任。</li>
                <li>您需评估本工具结果与患者实际情况的匹配性。</li>
                <li>如因违反上述禁令导致医疗事故，工具提供方不承担连带责任。</li>
              </ul>
            </div>

            <div class="subsection">
              <h4>4. 法律依据</h4>
              <p>依据《互联网诊疗监管细则》（2022）、《人工智能医疗应用安全规范》（2024）、《医疗病历用管理规范》（2025）等相关法规。</p>
            </div>
          </div>
        </div>

        <!-- 滚动提示 -->
        <div class="scroll-indicator" v-if="!hasScrolledToBottom">
          <i class="el-icon-arrow-down"></i>
          <span>请滚动到底部查看完整内容</span>
        </div>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button 
          type="primary" 
          @click="confirmAndEnter" 
          :disabled="!hasScrolledToBottom"
          size="small">
          {{ hasScrolledToBottom ? '确认' : '请先阅读完整内容' }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { login } from "../utils/apis/login";
import robotLogo from "@/assets/image/robot-logo.webp";
import loginBj2 from "@/assets/image/login-bj2.png";
import { getLocalIP } from "../utils/ip";
export default {
  name: 'Login',
  data() {
    return {
      robotLogo,
      loginBj2,
      loginForm: {
        userNumber: '',
        passWord: ''
      },
      loading: false,
      agreedToTerms: false, // 是否同意声明
      showTermsDialog: false, // 是否显示声明弹窗
      hasScrolledToBottom: false, // 是否滚动到底部
      isConfirmingFromDialog: false, // 标记是否通过声明弹窗确认
      isShaking: false, // 控制文字抖动
      rules: {
        userNumber: [
          { required: true, message: '请输入用户名', trigger: 'blur' }
        ],
        passWord: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 8, message: '密码长度不能少于8位', trigger: 'blur' }
        ]
      },
      ipConfig: ''
    }
  },
  mounted() {
    getLocalIP().then(ip => {
        this.ipConfig = ip
    })
  },
  methods: {
    async handleLogin() {
      if (!this.agreedToTerms) {
        // 触发文字抖动效果
        this.triggerShake()
        return
      }
      
      this.$refs.loginForm.validate(async (valid) => {
        if (valid) {
          this.loading = true
          try {
            const response = await login({
              userNumber: this.loginForm.userNumber,
              passWord: this.loginForm.passWord,
              ipAddress: this.ipConfig
            })
            
            if (response && response.code === 200) {
              this.$message.success('登录成功！欢迎使用')
              // 保存登录状态
              localStorage.setItem('isLoggedIn', 'true')
              localStorage.setItem('username', this.loginForm.userNumber)
              localStorage.setItem('userId', response.data.id)
              localStorage.setItem('token', response.data.token)
              localStorage.setItem('isCopy', response.data.isCopy)
              localStorage.setItem('isRecording', response.data.isRecording)
              // 通知主进程调整窗口大小
              if (window.require) {
                const { ipcRenderer } = window.require('electron')  
                ipcRenderer.send('login-success')
              }
              // 跳转到主页
              this.$router.push('/')
            } else {
                             this.$message.error(response?.message || '登录失败，请重试！')
             }
           } catch (error) {
             console.error('登录错误:', error)
             this.$message.error('登录失败，请检查网络连接或联系管理员！')
           } finally {
             this.loading = false
           }
         } else {
           this.$message.error('请检查输入信息！')
           return false
         }
       })
     },
     
     handleCheckboxChange(value) {
       // 不允许主动勾选，只能取消勾选
       if (value === true && !this.isConfirmingFromDialog) {
         // 如果是要勾选，但不是通过声明确认的方式勾选，则阻止
         this.$nextTick(() => {
           this.agreedToTerms = false
         })
         // 触发文字抖动效果
         this.triggerShake()
       }
       // 重置标记
       this.isConfirmingFromDialog = false
     },
     
     // 触发抖动效果
     triggerShake() {
       console.log('触发抖动效果开始')
       
       // 方法1: 使用数据绑定
       this.isShaking = true
       this.$forceUpdate()
       console.log('设置抖动为true', this.isShaking)
       
       // 方法2: 直接操作 DOM
       if (this.$refs.agreementCheckbox) {
         const element = this.$refs.agreementCheckbox.$el
         element.style.animation = 'shake 0.6s ease-in-out'
         console.log('直接设置DOM动画', element.style.animation)
       }
       
       setTimeout(() => {
         this.isShaking = false
         this.$forceUpdate()
         
         // 清除 DOM 动画
         if (this.$refs.agreementCheckbox) {
           this.$refs.agreementCheckbox.$el.style.animation = ''
         }
         console.log('停止抖动', this.isShaking)
       }, 600) // 0.6秒后停止抖动
     },
     
     openTermsDialog() {
       this.showTermsDialog = true
       this.hasScrolledToBottom = false
     },
     
     handleScroll() {
       const element = this.$refs.termsContent
       if (element) {
         const { scrollTop, scrollHeight, clientHeight } = element
         // 如果滚动到底部（允许一些像素的误差）
         this.hasScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 5
       }
     },
     
     confirmAndEnter() {
       if (!this.hasScrolledToBottom) {
         return
       }
       // 标记这是通过声明弹窗确认的勾选
       this.isConfirmingFromDialog = true
       this.agreedToTerms = true
       this.showTermsDialog = false
     },
     
     handleDialogClose() {
       // 弹窗关闭时重置滚动状态
       this.hasScrolledToBottom = false
     }
   },
   
   beforeDestroy() {
     // 组件销毁前清理工作
   }
 }
</script>

<style lang="less" scoped>
.login-container {
  width: 100%;
  background-size: cover;
}

.login-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0 8px;
}

.robot-image {
  width: 80px;
  height: 80px;
}

.login-title {
  text-align: left;
  margin: 0;
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.login-form-container {
  background: #ffffff;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 40px 40px 0 0;
}

.login-form {
  width: 100%;
  max-width: 320px;
  margin-top: 40px;
  :deep(.el-input__inner) {
    background: #F5F5F5;
    padding: 20px 0 20px 10px;
    border-radius: 10px;
    border: none;
  }
}

/* 全局动画定义 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-4px);
  }
  60% {
    transform: translateY(-2px);
  }
}

.agreement-item {
  margin-bottom: 10px;

  :deep(.el-checkbox) {
    display: flex;
    align-items: flex-start;
    white-space: normal;
    text-align: left;
  }
  
  :deep(.el-checkbox__input) {
    margin-top: 3px; /* 微调，让选框和文字对齐 */
    flex-shrink: 0;
  }
  
  :deep(.el-checkbox__label) {
    line-height: 1.5;
    word-break: break-word;
    white-space: normal; /* 确保label内的文字可以换行 */
  }

  .view-terms-link {
    color: #5496D3;
    cursor: pointer;
    text-decoration: underline;
    margin-left: 4px; /* 和前面的文字稍微隔开 */
    transition: all 0.1s ease;
  }
  
  .view-terms-link:hover {
    color: darken(#5496D3, 10%);
  }
}

.login-btn {
  width: 100%;
  height: 40px;
  font-size: 14px;
  border-radius: 6px;
  background: #5496D3;
  border: none;
  font-weight: 500;
  transition: all 0.2s ease;
  color: white;

  &:hover:not(:disabled) {
    background: darken(#5496D3, 10%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px fade(#5496D3, 40%);
  }
  
  &:disabled {
    background: #c0c4cc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
}

// 弹窗样式
:deep(.terms-dialog) {
  .el-dialog {
    max-height: 74vh; /* 限制弹窗最大高度 */
    display: flex;
    flex-direction: column;
    overflow: hidden; /* 防止弹窗整体滚动 */
    border-radius: 12px;
  }
  
  .el-dialog__header {
    background: #5496D3 ;
    color: #000000;
    // padding: 20px 24px;
    border-bottom: none;
    flex-shrink: 0; /* 头部固定，不参与滚动 */
    border-radius: 12px 12px 0 0;
    
    .el-dialog__title {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    .el-dialog__headerbtn {
      .el-dialog__close {
        color: #ffffff;
        font-size: 20px;
        
        &:hover {
          color: #f0f0f0;
        }
      }
    }
  }
  
  .el-dialog__body {
    padding: 0;
    flex: 1; /* 占用剩余空间 */
    overflow: hidden; /* 防止body本身滚动 */
    display: flex;
    flex-direction: column;
  }
  
  .el-dialog__footer {
    padding: 20px 24px;
    border-top: 1px solid #e9ecef;
    background: #f8f9fa;
    flex-shrink: 0; /* 底部固定，不参与滚动 */
  }
}

.terms-content {
  flex: 1; /* 占用剩余空间 */
  overflow-y: auto; /* 内容区域可以滚动 */
  padding: 24px; /* 给内容添加内边距 */
  max-height: 55vh; /* 限制最大高度 */
  position: relative;
  
  /* 美化滚动条 */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #5496D3;
    border-radius: 4px;
    
    &:hover {
      background:#5496D3;
    }
  }
  
  .terms-header {
    margin-bottom: 24px;
    text-align: center;
    
    .terms-title {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 8px;
      
      i {
        font-size: 20px;
        color: #e74c3c;
        margin-right: 8px;
      }
    }
    
    .terms-subtitle {
      font-size: 13px;
      color: #7f8c8d;
      font-weight: 500;
    }
  }
  
  .terms-section {
    margin-bottom: 24px;
    
    .section-title {
      display: flex;
      align-items: center;
      font-size: 15px;
      font-weight: 600;
      color: #34495e;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #ecf0f1;
      
      i {
        font-size: 16px;
        color: #3498db;
        margin-right: 8px;
      }
    }
    
    .section-content {
      font-size: 13px;
      line-height: 1.6;
      color: #555;
      
      p {
        margin-bottom: 12px;
      }
      
      .highlight {
        color: #e74c3c;
        font-weight: 600;
        background: rgba(231, 76, 60, 0.1);
        padding: 1px 4px;
        border-radius: 3px;
      }
      
      .warning-box {
        background: linear-gradient(135deg, #fff3cd 0%, #fef7e0 100%);
        border: 1px solid #f39c12;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        color: #d68910;
        font-size: 13px;
        display: flex;
        align-items: flex-start;
        
        i {
          font-size: 18px;
          margin-right: 12px;
          margin-top: 2px;
          color: #f39c12;
        }
        
        div {
          flex: 1;
          
          strong {
            display: block;
            margin-bottom: 8px;
            color: #b7950b;
            font-size: 14px;
          }
          
          p {
            margin: 0;
          }
        }
      }
      
      .subsection {
        margin-bottom: 20px;
        
        h4 {
          font-size: 14px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 8px;
          padding-left: 12px;
          border-left: 3px solid #3498db;
        }
        
        ul {
          padding-left: 20px;
          margin: 8px 0;
          
          li {
            margin-bottom: 6px;
            position: relative;
            
            &:before {
              content: '•';
              color: #3498db;
              font-weight: bold;
              position: absolute;
              left: -12px;
            }
          }
        }
      }
    }
  }
  
  .scroll-indicator {
    position: sticky;
    bottom: -40px;
    // background: linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%);
    padding: 16px;
    text-align: center;
    color: #7f8c8d;
    font-size: 12px;
    font-weight: 500;
    animation: bounce 2s infinite;
    
    i {
      font-size: 14px;
      margin-right: 6px;
      color: #3498db;
    }
  }
}

.dialog-footer {
  text-align: center;
  
  .el-button {
    min-width: 140px;
    height: 40px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 20px;
    background: #5496D3;
    border: none;
    color: #ffffff;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      background: #5496D3;
    }
    
    &:disabled {
      background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%) !important;
      border: none !important;
      color: #ffffff !important;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
      opacity: 0.8;
    }
  }
}
</style>

<style lang="less">
/* 非 scoped 样式 - 确保动画能正确应用 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}
</style>