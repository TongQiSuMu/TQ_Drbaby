import {
  listAllTitles,
  insertOrUpdate,
  deleteById,
  queryDialogRecordsByVoiceNumber,
  insertTemplatesContent,
  queryTemplatesContentByVoiceNumber,
  queryTemplateByIsDefault,
  updateTitleNameByVoiceNumber,
  getTemplateById
} from './apis/index';

/**
 * 聊天管理工具类
 * 封装聊天相关的API调用和数据处理逻辑
 */
export class ChatManager {
  constructor() {
    this.chatList = [];
    this.activeChat = null;
    this.messages = [];
    this.templateInfo = {
      templateId: '',
      templateName: '',
      templateContent: ''
    };
    this.currentChat = {
      id: '',
      voiceNumber: '',
      titleName: ''
    };
    this.lastDialogRecordId = null;
    this.currentSessionMessages = []; // 当前录音会话的消息
    this.sessionStartTime = null; // 当前会话开始时间
  }

  /**
   * 获取默认模板
   */
  async getDefaultTemplate() {
    try {
      const response = await queryTemplateByIsDefault();
      if (response.code === 200) {
        this.templateInfo = response.data;
        
        // 如果有模板ID，获取模板内容
        if (this.templateInfo.templateId) {
          await this.loadTemplateContent(this.templateInfo.templateId);
        }
        
        return this.templateInfo;
      }
      throw new Error(response.message || '获取默认模板失败');
    } catch (error) {
      throw new Error('获取默认模板失败: ' + error.message);
    }
  }

  /**
   * 根据模板ID加载模板内容
   */
  async loadTemplateContent(templateId) {
    try {
      const response = await getTemplateById({ id: templateId });
      if (response.code === 200 && response.data) {
        this.templateInfo.templateContent = response.data;
        return response.data;
      }
      return '';
    } catch (error) {
      console.error('获取模板内容失败:', error);
      return '';
    }
  }

  /**
   * 加载聊天列表
   */
  async loadChatList() {
    try {
      const response = await listAllTitles();
      if (response && response.data) {
        this.chatList = response.data;
        
        // 如果有聊天记录，默认选择第一个
        if (this.chatList.length > 0) {
          this.activeChat = this.chatList[0].id;
          this.currentChat = this.chatList[0];
          
          // 加载第一个聊天的消息
          await this.loadChatMessages(this.chatList[0].voiceNumber, this.chatList[0].id);
          await this.loadTemplatesContent(this.chatList[0].voiceNumber);
        }
        
        return this.chatList;
      }
      throw new Error('接口返回数据格式异常');
    } catch (error) {
      this.chatList = [];
      throw new Error('加载聊天列表失败: ' + error.message);
    }
  }

  /**
   * 根据voiceNumber查询对话记录
   */
  async loadChatMessages(voiceNumber, chatId = null) {
    try {
      const response = await queryDialogRecordsByVoiceNumber({
        voiceNumber: voiceNumber,
        ...(chatId && { id: chatId }),
      });

      if (response && response.code === 200 && response.data) {
        // 处理从数据库加载的消息，按换行符分割
        this.messages = this.processLoadedMessages(response.data);
        if (response.data.length > 0) {
          this.lastDialogRecordId = response.data[response.data.length - 1].id;
        }
        return this.messages;
      }
      this.messages = [];
      return [];
    } catch (error) {
      this.messages = [];
      throw new Error('加载对话记录失败: ' + error.message);
    }
  }

  /**
   * 处理从数据库加载的消息，按换行符分割
   */
  processLoadedMessages(rawMessages) {
    const processedMessages = [];
    
    for (const rawMessage of rawMessages) {
      if (rawMessage.content && rawMessage.content.includes('\n')) {
        // 如果消息包含换行符，分割成多个消息
        const segments = rawMessage.content.split('\n').filter(segment => segment.trim());
        
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          processedMessages.push({
            ...rawMessage,
            content: segment.trim(),
            dialogueContent: segment.trim(),
            // 添加原始消息ID和分割索引，用于分组显示
            originalMessageId: rawMessage.id,
            segmentIndex: i,
            isLastSegment: i === segments.length - 1,
            createOn: rawMessage.createOn || new Date().toISOString(),
          });
        }
      } else {
        // 没有换行符，保持原样
        processedMessages.push({
          ...rawMessage,
          originalMessageId: rawMessage.id,
          segmentIndex: 0,
          isLastSegment: true,
        });
      }
    }
    
    return processedMessages;
  }

  /**
   * 加载模板内容
   */
  async loadTemplatesContent(voiceNumber) {
    try {
      const response = await queryTemplatesContentByVoiceNumber({
        voiceNumber: voiceNumber,
      });

      if (response && response.code === 200 && response.data) {
        return this.parseWorkflowResult(response.data);
      }
      return [];
    } catch (error) {
      console.error('加载模板内容失败:', error);
      return [];
    }
  }

  /**
   * 选择聊天
   */
  async selectChat(chat) {
    this.activeChat = chat.id;
    this.currentChat = chat;
    
    const messages = await this.loadChatMessages(chat.voiceNumber, chat.id);
    const templatesContent = await this.loadTemplatesContent(chat.voiceNumber);
    
    return {
      messages,
      templatesContent
    };
  }

  /**
   * 创建新聊天
   */
  async createNewChat() {
    try {
      const response = await insertOrUpdate({
        titleName: this.templateInfo.templateName
      });
      
      if (response && response.data) {
        await this.loadChatList();
        if (this.chatList.length > 0) {
          this.activeChat = this.chatList[0].id;
        }
        // 清空当前显示的内容
        this.messages = [];
        return {
          success: true,
          message: '新对话创建成功'
        };
      }
      throw new Error('创建新对话失败');
    } catch (error) {
      throw new Error('创建新对话失败: ' + error.message);
    }
  }

  /**
   * 保存或更新对话信息
   */
  async saveOrUpdateChat(messages) {
    try {
      // 只保存当前录音会话新增的消息
      const sessionMessages = this.getCurrentSessionMessages();
      
      // 如果当前会话没有新消息，则不保存
      if (sessionMessages.length === 0) {
        return {
          success: true,
          message: '没有新的对话内容需要保存'
        };
      }

      const response = await insertOrUpdate({
        // id: this.lastDialogRecordId,
        titleName: this.currentChat.titleName,
        voiceNumber: this.currentChat.voiceNumber,
        templatesId: this.templateInfo.templateId,
        content: sessionMessages
          .map((message) => message.content)
          .join("\n"),
      });

      if (response && response.code === 200) {
        // 重新查询获取最新的对话记录
        const dialogResponse = await queryDialogRecordsByVoiceNumber({
          voiceNumber: this.currentChat.voiceNumber,
          id: this.currentChat.id,
        });

        if (
          dialogResponse &&
          dialogResponse.code === 200 &&
          dialogResponse.data &&
          dialogResponse.data.length > 0
        ) {
          this.lastDialogRecordId = dialogResponse.data[dialogResponse.data.length - 1].id;
          this.messages = this.processLoadedMessages(dialogResponse.data);
        }

        // 保存成功后结束当前会话
        this.endRecordingSession();

        return {
          success: true,
          message: '对话信息保存成功'
        };
      }
      throw new Error(response?.message || '保存对话信息失败');
    } catch (error) {
      throw new Error('保存对话信息失败: ' + error.message);
    }
  }

  /**
   * 重命名聊天
   */
  async renameChat(voiceNumber, newName) {
    try {
      const response = await updateTitleNameByVoiceNumber({
        voiceNumber: voiceNumber,
        titleName: newName,
      });

      if (response && response.code === 200) {
        await this.loadChatList();
        return {
          success: true,
          message: '重命名成功'
        };
      }
      throw new Error(response?.message || '重命名失败');
    } catch (error) {
      throw new Error('重命名失败: ' + error.message);
    }
  }

  /**
   * 删除聊天
   */
  async deleteChat(voiceNumber) {
    try {
      const response = await deleteById({ voiceNumber: voiceNumber });

      if (response && response.code === 200) {
        await this.loadChatList();
        return {
          success: true,
          message: '删除成功'
        };
      }
      throw new Error(response?.message || '删除失败');
    } catch (error) {
      throw new Error('删除失败: ' + error.message);
    }
  }

  /**
   * 保存模板内容
   */
  async saveTemplatesContent(templatesContent) {
    try {
      const response = await insertTemplatesContent({
        id: this.lastDialogRecordId,
        templatesContent: JSON.stringify(templatesContent),
        voiceNumber: this.currentChat.voiceNumber,
      });

      if (response && response.code === 200) {
        return {
          success: true,
          message: '模板内容保存成功'
        };
      }
      throw new Error(response?.message || '保存模板内容失败');
    } catch (error) {
      throw new Error('保存模板内容失败: ' + error.message);
    }
  }

  /**
   * 解析工作流结果
   */
  parseWorkflowResult(data) {
    // 如果是 JSON 字符串，先转为对象
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        // 如果不是JSON，直接使用字符串
        data = { outputs: { text: data } };
      }
    }

    const result = [];
    const fullText = data?.outputs?.text || data || "";

    // 使用正则表达式匹配 title: 和 content: 的模式
    const titleContentRegex = /title:\s*([^:]+)：\s*content:\s*(.*?)(?=\s*title:|$)/gs;
    let match;

    while ((match = titleContentRegex.exec(fullText)) !== null) {
      result.push({
        title: match[1].trim() + "：",
        content: match[2].trim(),
      });
    }

    // 如果没有匹配到，尝试其他格式
    if (result.length === 0) {
      const blocks = fullText.split("\n\n");
      for (const block of blocks) {
        const titleMatch = block.match(/title:\s*(.*)/);
        const contentMatch = block.match(/content:\s*(.*)/);

        if (titleMatch && contentMatch) {
          result.push({
            title: titleMatch[1].trim(),
            content: contentMatch[1].trim(),
          });
        }
      }
    }

    return result;
  }

  /**
   * 开始新的录音会话
   */
  startRecordingSession() {
    this.sessionStartTime = new Date().toISOString();
    this.currentSessionMessages = [];
  }

  /**
   * 结束录音会话
   */
  endRecordingSession() {
    this.sessionStartTime = null;
    this.currentSessionMessages = [];
  }

  /**
   * 获取当前会话的消息
   */
  getCurrentSessionMessages() {
    if (!this.sessionStartTime) {
      return [];
    }
    
    // 返回当前会话中新增的消息
    return this.currentSessionMessages;
  }

  /**
   * 添加消息到消息列表
   * 支持根据换行符分割内容，每个分割部分作为独立消息
   */
  addMessage(message) {
    if (!message || !message.trim()) {
      return null;
    }

    // 生成一个唯一的消息组ID
    const messageGroupId = Date.now() + Math.random();
    const currentTime = new Date().toISOString();

    // 如果消息包含换行符，则分割成多个消息
    if (message.includes('\n')) {
      const segments = message.split('\n').filter(segment => segment.trim());
      const addedMessages = [];
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const newMessage = {
          content: segment.trim(),
          dialogueContent: segment.trim(),
          originalMessageId: messageGroupId,
          segmentIndex: i,
          isLastSegment: i === segments.length - 1,
          createOn: currentTime,
        };
        this.messages.push(newMessage);
        addedMessages.push(newMessage);
        
        // 如果是当前会话，添加到会话消息列表
        if (this.sessionStartTime) {
          this.currentSessionMessages.push(newMessage);
        }
      }
      
      return addedMessages;
    } else {
      // 没有换行符，作为单个消息添加
      const newMessage = {
        content: message,
        dialogueContent: message,
        originalMessageId: messageGroupId,
        segmentIndex: 0,
        isLastSegment: true,
        createOn: currentTime,
      };
      this.messages.push(newMessage);
      
      // 如果是当前会话，添加到会话消息列表
      if (this.sessionStartTime) {
        this.currentSessionMessages.push(newMessage);
      }
      
      return newMessage;
    }
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      chatList: this.chatList,
      activeChat: this.activeChat,
      messages: this.messages,
      templateInfo: this.templateInfo,
      currentChat: this.currentChat,
      lastDialogRecordId: this.lastDialogRecordId,
      currentSessionMessages: this.currentSessionMessages,
      sessionStartTime: this.sessionStartTime
    };
  }

  /**
   * 重置状态
   */
  reset() {
    this.chatList = [];
    this.activeChat = null;
    this.messages = [];
    this.lastDialogRecordId = null;
    this.currentSessionMessages = [];
    this.sessionStartTime = null;
  }
}

export default ChatManager;