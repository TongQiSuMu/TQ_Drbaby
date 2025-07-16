import config from './config';

/**
 * 语音识别封装类
 * 封装了语音录音、识别和处理相关功能
 */
export class SpeechRecognition {
  constructor(options = {}) {
    this.options = {
      wssUrl: config.WSS_URL,
      onMessage: null,
      onStateChange: null,
      onError: null,
      onSentenceComplete: null,
      onRecordingStopped: null,
      ...options
    };

    // 语音识别相关
    this.wsconnecter = null;
    this.recorder = null;
    this.sampleBuf = new Int16Array();
    this.recognizedText = '';
    this.offlineText = '';
    this.isConnected = false;
    this.processedTextLength = 0;

    // 录音状态
    this.isRecording = false;
    this.isPaused = false;
    this.recordingTimer = null;
    this.recordingDuration = 0;

    this.init();
  }

  /**
   * 初始化语音识别
   */
  init() {
    // 检查依赖是否加载
    if (!window.WebSocketConnectMethod) {
      throw new Error('语音识别模块未正确加载');
    }

    if (!window.Recorder) {
      throw new Error('录音模块未正确加载');
    }

    try {
      // 初始化WebSocket连接
      this.wsconnecter = new window.WebSocketConnectMethod({
        msgHandle: this.handleRecognitionMessage.bind(this),
        stateHandle: this.handleConnectionState.bind(this),
        errorHandle: this.handleError.bind(this),
        configParams: {
          wssUrl: this.options.wssUrl,
          getAsrMode: () => "2pass",
          getUseITN: () => true,
          getHotwords: () => null,
          isFileMode: false,
        },
      });

      // 初始化录音器
      this.recorder = window.Recorder({
        type: "wav", // 改为wav格式以便正确保存
        bitRate: 16,
        sampleRate: 16000,
        onProcess: this.recProcess.bind(this),
      });
    } catch (error) {
      throw new Error('初始化语音识别失败: ' + error.message);
    }
  }

  /**
   * 开始录音
   */
  async startRecording() {
    if (!this.wsconnecter || !this.recorder) {
      throw new Error('语音识别组件未初始化');
    }

    // 清空之前的识别结果
    this.recognizedText = '';
    this.offlineText = '';
    this.processedTextLength = 0;

    // 总是重新连接WebSocket以确保状态正确
    const ret = this.wsconnecter.wsStart(this.options.wssUrl);
    if (ret !== 1) {
      throw new Error('语音识别服务连接失败');
    }
  }

  /**
   * 打开录音器
   */
  openRecorder() {
    return new Promise((resolve, reject) => {
      this.recorder.open(
        () => {
          this.recorder.start();
          this.isRecording = true;
          this.isPaused = false;
          this.recordingDuration = 0;
          this.processedTextLength = 0;

          // 开始计时
          this.recordingTimer = setInterval(() => {
            this.recordingDuration++;
          }, 1000);

          resolve();
        },
        (error) => {
          reject(new Error('打开录音器失败: ' + error));
        }
      );
    });
  }

  /**
   * 暂停录音
   */
  pauseRecording() {
    if (this.recorder) {
      this.recorder.pause();
    }

    this.isRecording = false;
    this.isPaused = true;

    // 暂停计时
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  /**
   * 继续录音
   */
  continueRecording() {
    if (this.recorder) {
      this.recorder.resume();
    }

    this.isRecording = true;
    this.isPaused = false;

    // 继续计时
    this.recordingTimer = setInterval(() => {
      this.recordingDuration++;
    }, 1000);
  }

  /**
   * 停止录音
   */
  stopRecording() {
    // 发送剩余的音频数据
    if (this.sampleBuf.length > 0 && this.isConnected) {
      this.wsconnecter.wsSend(this.sampleBuf);
      this.sampleBuf = new Int16Array();
    }

    // 发送结束标志
    if (this.isConnected) {
      const request = {
        chunk_size: [5, 10, 5],
        wav_name: "vue_app",
        is_speaking: false,
        chunk_interval: 10,
        mode: "2pass",
      };
      this.wsconnecter.wsSend(JSON.stringify(request));
    }

    // 停止录音
    if (this.recorder) {
      this.recorder.stop((blob, duration) => {
        // 录音停止回调
        if (this.options.onRecordingStopped && blob) {
          this.options.onRecordingStopped(blob, duration);
        }
      });
    }

    this.isRecording = false;
    this.isPaused = false;

    // 停止计时
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    const duration = this.recordingDuration;
    this.recordingDuration = 0;

    // 处理剩余的识别文本
    if (this.recognizedText && this.recognizedText.length > this.processedTextLength) {
      const remainingText = this.recognizedText.substring(this.processedTextLength);
      if (remainingText.trim()) {
        this.addSentenceToMessages(remainingText.trim());
      }
      this.recognizedText = '';
      this.offlineText = '';
      this.processedTextLength = 0;
    }

    // 延迟断开WebSocket连接，等待最终结果
    setTimeout(() => {
      if (this.wsconnecter) {
        this.wsconnecter.wsStop();
        this.isConnected = false;
      }
    }, 3000);

    return { duration };
  }

  /**
   * 录音处理
   */
  recProcess(buffer, powerLevel, bufferDuration, bufferSampleRate, newBufferIdx, asyncEnd) {
    if (this.isRecording && !this.isPaused && this.isConnected) {
      try {
        const data_48k = buffer[buffer.length - 1];
        const array_48k = new Array(data_48k);
        const data_16k = window.Recorder.SampleData(
          array_48k,
          bufferSampleRate,
          16000
        ).data;

        this.sampleBuf = Int16Array.from([...this.sampleBuf, ...data_16k]);
        const chunk_size = 960;

        while (this.sampleBuf.length >= chunk_size) {
          const sendBuf = this.sampleBuf.slice(0, chunk_size);
          this.sampleBuf = this.sampleBuf.slice(chunk_size, this.sampleBuf.length);
          this.wsconnecter.wsSend(sendBuf);
        }
      } catch (error) {
        // 录音处理错误，静默处理
      }
    }
  }

  /**
   * 处理识别消息
   */
  handleRecognitionMessage(jsonMsg) {
    const data = JSON.parse(jsonMsg.data);
    const rectxt = data.text || '';
    const asrmodel = data.mode;
    const is_final = data.is_final;

    if (asrmodel === '2pass-offline' || asrmodel === 'offline') {
      this.offlineText += rectxt;
      this.recognizedText = this.offlineText;
    } else {
      this.recognizedText += rectxt;
    }

    // 实时分句处理
    this.processRealtimeSentences();

    // 如果是最终结果，处理剩余的文本
    if (is_final) {
      if (this.recognizedText.length > this.processedTextLength) {
        const remainingText = this.recognizedText.substring(this.processedTextLength);
        if (remainingText.trim()) {
          this.addSentenceToMessages(remainingText.trim());
        }
      }
      // 清空识别文本
      this.recognizedText = '';
      this.offlineText = '';
      this.processedTextLength = 0;
    }

    // 触发消息回调
    if (this.options.onMessage) {
      this.options.onMessage({
        recognizedText: this.recognizedText,
        processedTextLength: this.processedTextLength,
        isRecording: this.isRecording,
        is_final
      });
    }
  }

  /**
   * 实时处理句子
   */
  processRealtimeSentences() {
    // 只处理新增的文本部分
    const unprocessedText = this.recognizedText.substring(this.processedTextLength);
    if (!unprocessedText) return;

    // 查找完整的句子（以标点结尾）
    const sentenceRegex = /[^。！？.!?]+[。！？.!?]/g;
    let match;
    let lastMatchEnd = 0;

    while ((match = sentenceRegex.exec(this.recognizedText)) !== null) {
      // 如果这个句子的结束位置大于已处理的长度，说明是新句子
      if (match.index + match[0].length > this.processedTextLength) {
        const sentence = match[0].trim();
        if (sentence) {
          this.addSentenceToMessages(sentence);
        }
        lastMatchEnd = match.index + match[0].length;
      }
    }

    // 更新已处理的文本长度
    if (lastMatchEnd > this.processedTextLength) {
      this.processedTextLength = lastMatchEnd;
    }
  }

  /**
   * 添加句子到消息列表
   */
  addSentenceToMessages(sentence) {
    if (this.options.onSentenceComplete) {
      this.options.onSentenceComplete(sentence);
    }
  }

  /**
   * 处理连接状态
   */
  handleConnectionState(connState) {
    if (connState === 0) {
      // 连接成功
      this.isConnected = true;
      this.openRecorder().catch(error => {
        if (this.options.onError) {
          this.options.onError(error.message);
        }
      });
    } else if (connState === 1) {
      // 连接关闭
      this.isConnected = false;
    } else if (connState === 2) {
      // 连接错误
      this.isConnected = false;
      if (this.options.onError) {
        this.options.onError('语音识别服务连接失败');
      }
    }

    if (this.options.onStateChange) {
      this.options.onStateChange(connState, this.isConnected);
    }
  }

  /**
   * 处理错误
   */
  handleError(error) {
    if (this.options.onError) {
      this.options.onError(error);
    }
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      isConnected: this.isConnected,
      recordingDuration: this.recordingDuration,
      recognizedText: this.recognizedText,
      processedTextLength: this.processedTextLength
    };
  }

  /**
   * 销毁实例
   */
  destroy() {
    // 清理资源
    if (this.wsconnecter) {
      this.wsconnecter.wsStop();
    }
    if (this.recorder) {
      this.recorder.stop();
      this.recorder.close();
    }
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }
  }
}

export default SpeechRecognition;