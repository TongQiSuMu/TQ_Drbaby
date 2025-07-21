# 医疗API JavaScript集成说明

## 概述

已成功将Python医疗API迁移到JavaScript，并集成到Electron应用中。API接口保持100%兼容性。

## 实现内容

### 1. 核心模块
- **vllm-client.js**: VLLM调用客户端，支持普通和流式请求
- **prompts.js**: 所有提示词模板（完整移植自Python版本）
- **generators.js**: 内容生成器，包含所有6个生成函数
- **routes.js**: Express路由，实现两个API接口
- **index.js**: 服务器主入口

### 2. API接口（与Python版本完全一致）

#### POST /api/generate-prompt
- 功能：为门诊病历和教育查房生成自定义提示词
- 请求格式：
```json
{
  "template_name": "门诊病历",
  "template_content": "主诉,现病史,治疗建议"
}
```
- 响应格式：
```json
{
  "code": 200,
  "data": {
    "prompt": "生成的提示词内容...",
    "template_name": "门诊病历"
  },
  "msg": "成功"
}
```

#### POST /api/generate-content
- 功能：生成医疗文档（SSE流式输出）
- 请求格式：
```json
{
  "dialogue_content": "患者对话内容...",
  "prompt": "提示词（门诊病历和教育查房必需）",
  "template_name": "门诊病历"
}
```
- 响应格式：SSE流式响应，Dify兼容格式

### 3. 集成方式

医疗API服务已集成到Electron主进程中：
- 应用启动时自动启动服务（端口8012）
- 应用退出时自动停止服务
- 无需手动管理服务进程

## 测试方法

### 1. 开发环境测试
```bash
# 启动应用
npm run dev

# 在另一个终端运行测试
node src/renderer/services/medical-api/test.js
```

### 2. 手动测试
```bash
# 测试生成提示词
curl -X POST http://localhost:8012/api/generate-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "template_name": "门诊病历",
    "template_content": "主诉,现病史,治疗建议"
  }'

# 测试生成内容（使用上一步返回的prompt）
curl -N http://localhost:8012/api/generate-content \
  -H "Content-Type: application/json" \
  -d '{
    "dialogue_content": "患者：医生，我最近...",
    "prompt": "（上一步返回的prompt）",
    "template_name": "门诊病历"
  }'
```

## 关键特性保留

1. **两步流程**：门诊病历和教育查房先生成提示词，再生成内容
2. **单步流程**：查房记录和随访记录直接生成内容
3. **SSE流式输出**：与Python版本格式完全一致
4. **错误处理**：相同的错误码和错误消息
5. **日志记录**：控制台输出请求和响应日志

## 注意事项

1. **VLLM服务**：确保VLLM服务在 http://172.16.6.11:8000/v1 可访问
2. **环境变量**：可通过 VLLM_BASE_URL 环境变量修改VLLM地址
3. **依赖安装**：已添加express和cors到package.json
4. **打包配置**：已更新Electron build配置，确保API文件被包含

## 迁移成功标志

✅ 所有API接口响应格式与Python版本完全一致
✅ 客户端代码无需任何修改即可使用
✅ 支持所有四种场景（门诊病历、教育查房、查房记录、随访记录）
✅ SSE流式输出正常工作
✅ 集成到Electron主进程，自动管理生命周期

## 后续建议

1. 在生产环境中测试性能和稳定性
2. 考虑添加请求日志持久化
3. 实现更详细的错误处理和重试机制
4. 添加健康检查接口