<template>
    <el-dialog
      :visible="visible"
      :show-close="false"
      width="800px"
      min-height="700px"
      custom-class="template-dialog"
      center
      :modal-append-to-body="false"
      :title="''"
      :close-on-click-modal="false"
      :show-header="false"
      @close="handleClose"
    >
      <div class="template-dialog-content">
        <!-- 左侧模板选择 -->
        <div class="template-sidebar">
          <h3>选择模版</h3>
          <div class="template-list">
            <div
              v-for="template in templateList"
              :key="template.id"
              class="template-item"
              :class="{ active: selectedTemplate === template.templateName }"
              @click="selectTemplate(template)"
            >
              {{ template.templateName }}
            </div>
          </div>
        </div>
  
        <!-- 右侧内容区 -->
        <div class="template-main">
          <div class="template-main" v-if="selectedTemplateId === 3">
            <div class="medical-record-template">
              <!-- 主观情况 -->
              <div class="record-item">
                <div class="record-icon">
                  <i class="el-icon-user-solid"></i>
                  <div class="record-title">主观情况</div>
                </div>
                <div class="record-content">
                  <div class="record-desc">记录患者自述的症状、不适感受、疼痛程度等主观感受</div>
                </div>
              </div>
              
              <!-- 客观情况 -->
              <div class="record-item">
                <div class="record-icon">
                  <i class="el-icon-data-analysis"></i>
                  <div class="record-title">客观情况</div>
                </div>
                <div class="record-content">
                  <div class="record-desc">包括生命体征、体格检查、实验室检查等客观医学指标</div>
                </div>
              </div>
              
              <!-- 综合评估 -->
              <div class="record-item">
                <div class="record-icon">
                  <i class="el-icon-document-checked"></i>
                  <div class="record-title">综合评估</div>
                </div>
                <div class="record-content">
                  <div class="record-desc">基于主客观情况对患者病情进行综合分析和评价</div>
                </div>
              </div>
              
              <!-- 护理建议 -->
              <div class="record-item">
                <div class="record-icon">
                  <i class="el-icon-first-aid-kit"></i>
                  <div class="record-title">护理建议</div>
                </div>
                <div class="record-content">
                  <div class="record-desc">包括护理计划、用药指导、生活护理等具体建议</div>
                </div>
              </div>
            </div>
          </div>
          <template v-else>
            <div class="template-header">
              <div class="header-row">
                <h2>您希望当前病历有哪些内容？</h2>
                <el-button
                  type="text"
                  size="mini"
                  icon="el-icon-close"
                  @click="handleClose"
                  class="close-btn"
                ></el-button>
              </div>
              <p class="header-desc">接下来的内容将基于您自定义的信息智能生成</p>
            </div>
    
            <el-input
              type="textarea"
              v-model="templateContent"
              placeholder="请输入"
              :rows="10"
              class="content-textarea"
            ></el-input>
    
            <!-- 标签选择 -->
            <div class="template-tags">
              <el-tag
                v-for="tag in selectedTags"
                :key="tag"
                type="info"
                effect="plain"
                @click="toggleTag(tag)"
                class="template-tag clickable-tag"
              >
                +{{ tag }}
              </el-tag>
            </div>
          </template>
          
          
          <!-- 操作按钮 -->
          <div class="template-actions">
            <el-button size="mini" @click="handleClose">取消</el-button>
            <el-button size="mini" type="primary" @click="handleSave">保存</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </template>
  
  <script>
  import {
    queryTemplatesByUserId,
    queryMedicalRecordContentInfoById,
    getTemplateById,
    insertOrUpdateTemplate,
  } from "../utils/apis/index";
  
  export default {
    name: "TemplateDialog",
    props: {
      visible: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        templateList: [],
        selectedTemplate: "",
        templateContent: "",
        selectedTags: [],
        selectedTemplateId: null,
      };
    },
    watch: {
      visible(newVal) {
        if (newVal) {
          this.initDialog();
        }
      },
    },
    methods: {
      async initDialog() {
        this.templateContent = "";
        this.selectedTags = [];
        this.selectedTemplate = "";
        this.selectedTemplateId = null;
        
        // 加载模板列表
        await this._queryTemplatesByUserId();
        
        // 尝试从本地存储恢复之前的选择
        this.loadSavedSettings();
      },
    
    loadSavedSettings() {
      try {
        const savedSettings = localStorage.getItem("templateSettings");
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          // 检查保存的模板是否在当前模板列表中
          const savedTemplate = this.templateList.find(
            t => t.templateId === settings.selectedTemplateId
          );
          if (savedTemplate) {
            this.selectTemplate(savedTemplate);
            return;
          }
        }
      } catch (error) {
        console.warn("加载保存的模板设置失败:", error);
      }
      
      // 如果没有保存的设置或加载失败，选择第一个模板
      if (this.templateList.length > 0 && !this.selectedTemplate) {
        this.selectTemplate(this.templateList[0]);
      }
    },
  
    async _queryTemplatesByUserId() {
      try {
        const response = await queryTemplatesByUserId();

        if (response && response.code === 200 && response.data) {
          this.templateList = response.data;
        } else {
          this.$message.warning("加载模板列表失败");
          this.templateList = [];
        }
      } catch (error) {
        console.error("加载模板列表失败:", error);
        this.$message.error("加载模板列表失败，请重试");
        this.templateList = [];
      }
    },
  
    async loadTemplateTags(templateId) {
      try {
        const response = await queryMedicalRecordContentInfoById({
          templatesId: templateId,
        });

        if (response && response.code === 200 && response.data) {
          this.selectedTags = response.data;
        } else {
          console.warn("获取模板标签失败");
          this.selectedTags = [];
        }
      } catch (error) {
        console.error("获取模板标签失败:", error);
        this.selectedTags = [];
      }
    },
  
    async selectTemplate(template) {
      this.selectedTemplate = template.templateName;
      this.selectedTemplateId = template.templateId;

      // 先清空当前内容，避免显示旧内容
      this.templateContent = "";

      // 根据选中的模板ID获取模板内容
      try {
        const templateResponse = await getTemplateById({
          id: template.templateId,
        });

        if (
          templateResponse &&
          templateResponse.code === 200 &&
          templateResponse.data
        ) {
          this.templateContent = templateResponse.data;
          console.log("获取到的模板内容:", this.templateContent);
        } else {
          this.templateContent = "";
          console.warn("获取模板内容失败");
        }
      } catch (error) {
        console.error("获取模板内容失败:", error);
        this.templateContent = "";
      }

      // 根据选中的模板ID获取标签
      await this.loadTemplateTags(template.templateId);
    },

  
    toggleTag(tag) {
      // 将选中的标签添加到模板内容中
      if (this.templateContent) {
        // 如果已有内容，在末尾添加换行和标签
        this.templateContent += "\n" + tag;
      } else {
        // 如果内容为空，直接添加标签
        this.templateContent = tag;
      }
    },
  
    async handleSave() {
      try {
        // 调用接口保存模板内容
        console.log("保存模板内容:", this.selectedTemplateId, this.templateContent);
        const response = await insertOrUpdateTemplate({
          id: this.selectedTemplateId,
          newContent: this.templateContent,
        });

        if (response && response.code === 200) {
          this.$message.success("模板内容已保存到服务器");
          
          // 只有保存成功后才应用选中的模板并关闭弹框
          this.applySelectedTemplate();
        } else {
          this.$message.error(response?.message || "保存失败");
        }
      } catch (error) {
        console.error("保存模板设置失败:", error);
        this.$message.error("保存失败，请重试");
      }
    },

    handleClose() {
      // 关闭时不应用模板，直接关闭弹框
      this.$emit("update:visible", false);
    },
    
    applySelectedTemplate() {
      // 确保有选中的模板
      if (!this.selectedTemplate || !this.selectedTemplateId) {
        // 如果没有选中模板，尝试选择第一个可用模板
        if (this.templateList.length > 0) {
          this.selectedTemplate = this.templateList[0].templateName;
          this.selectedTemplateId = this.templateList[0].templateId;
        } else {
          this.$message.warning("没有可用的模板");
          return;
        }
      }
      
      // 构建模板设置对象
      const settings = {
        selectedTemplate: this.selectedTemplate,
        selectedTemplateId: this.selectedTemplateId,
        templateContent: this.templateContent,
        selectedTags: this.selectedTags,
      };
      
      // 保存到本地存储
      localStorage.setItem("templateSettings", JSON.stringify(settings));
      
      // 关闭弹框并传递选中的模板信息
      this.$emit("update:visible", false);
      this.$emit("template-applied", settings);
    },
    },
  };
  </script>
  
  <style lang="less" scoped>
  :deep(.el-dialog) {
    border-radius: 20px !important;
    border: 1.5px solid #e0e3ea !important;
    overflow: hidden !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    background-clip: padding-box !important;
    border-radius: 30px !important;
  }
  
  :deep(.el-dialog__header),
  :deep(.el-dialog__headerwrapper) {
    display: none !important;
    height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    overflow: hidden !important;
  }
  
  /* 移除弹窗内容区域的padding */
  :deep(.el-dialog__body) {
    padding: 0 !important;
    margin: 0 !important;
  }
  
  /* 确保弹窗内容区域没有额外的间距 */
  .template-dialog .el-dialog {
    margin: 0 !important;
    padding: 0 !important;
  }
  
  .template-dialog .el-dialog__wrapper {
    padding: 0 !important;
  }
  
  /* 移除弹窗的默认样式 */
  .template-dialog .el-dialog__headerbtn {
    display: none !important;
  }
  
  .template-dialog .el-dialog__title {
    display: none !important;
  }
  
  /* 只针对template-dialog的样式覆盖 */
  .template-dialog .el-dialog__header {
    display: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  
  .template-dialog .el-dialog__body {
    padding: 0 !important;
    margin: 0 !important;
  }
  
  .template-dialog .el-dialog {
    margin: 0 !important;
    padding: 0 !important;
  }
  
  .template-dialog-content {
    display: flex;
    background-color: #ffffff;
    // height: 500px;
  }
  
  .medical-record-template {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0;
    .record-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      border: 1px solid #e0e0e0; 
      border-radius: 16px;
      padding: 16px 20px;
      transition: all 0.2s ease;
    }
    .record-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      transition: all 0.2s ease;
    }
  }
  
  .record-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    transition: all 0.2s ease;
  }
  
  .record-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background-color: #ffffff;
    flex-shrink: 0;
    /* gap: 4px; */
  }
  
  .record-icon i {
    font-size: 20px;
    color: #5496d3;
  }
  
  .record-icon .record-title {
    font-size: 13px;
    color: #000000;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
  }



  .record-desc {
    font-size: 14px;
    color: #666666;
    font-weight: 400;
    line-height: 1.4;
    text-align: center;
    margin-top: 2px;
  }
  .template-sidebar {
    width: 200px;
    background-color: #f5f5f5;
    border-right: 1px solid #bdbdbd;
    padding: 30px 20px;
    border-radius: 30px 0 0 30px;
  }
  
  .template-sidebar h3 {
    font-size: 16px;
    color: #000000;
    margin-bottom: 30px;
    font-weight: 400;
    padding-left: 2px;
  }
  
  .template-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .template-item {
    padding: 7px 14px;
    font-size: 16px;
    color: #000000;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s ease;
    line-height: 18px;
  }
  
  .template-item:hover {
    background-color: rgba(217, 217, 217, 0.3);
  }
  
  .template-item.active {
    background-color: rgba(217, 217, 217, 0.57);
  }
  
  .template-main {
    flex: 1;
    padding: 30px 35px 35px 35px;
    display: flex;
    flex-direction: column;
    position: relative;
    justify-content: space-between;
    overflow: auto;
  }
  ::-webkit-scrollbar {
    display: none;
  }
  .template-header {
    display: flex;
    flex-direction: column;
  }
  
  .header-row {
    display: flex;
    align-items: center;
  }
  
  .header-row h2 {
    font-size: 18px;
    color: #222;
    font-weight: 500;
    margin: 0;
    line-height: 1.3;
  }
  
  .header-row .close-btn {
    margin-left: auto;
  }
  
  .header-desc {
    font-size: 13px;
    color: #888;
    margin: 8px 0 0 0;
    line-height: 1.5;
  }
  
  .content-textarea {
    margin-bottom: 10px;
  }
  
  .template-tags {
    display: flex;
    gap: 14px;
    margin-bottom: 30px;
    flex-wrap: wrap;
  }
  
  .template-tag {
    border-radius: 13px;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    font-weight: 400;
  }
  
  .template-tag.el-tag--info {
    background-color: rgba(84, 150, 211, 0.21);
    color: #498cca;
  }
  
  .template-tag.el-tag--info:hover {
    background-color: rgba(84, 150, 211, 0.3);
  }
  
  .template-tag.el-tag--primary {
    background-color: #5496d3;
    color: #ffffff;
  }
  
  .clickable-tag {
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid #d9d9d9;
  }
  
  .clickable-tag:hover {
    background-color: #409eff !important;
    color: #ffffff !important;
    border-color: #409eff !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  }
  
  .template-actions {
    display: flex;
    justify-content: flex-end;
  }
  
  .template-actions .el-button {
    width: 80px;
    height: 35px;
    font-size: 16px;
    border-radius: 10px;
    font-weight: 400;
    transition: all 0.2s ease;
  }
  
  :deep(.el-dialog--center) {
    border-radius: 30px !important;
  }
  </style>