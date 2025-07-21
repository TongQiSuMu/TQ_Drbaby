/**
 * 内容生成器模块
 * 
 * 该模块负责调用VLLM服务生成医疗文档内容
 * 使用prompts模块提供的提示词模板
 */

const prompts = require('./prompts')
const { callVLLM, callVLLMStream } = require('./vllm-client')

/**
 * 生成门诊病历的自定义prompt
 * @param {string} templateContent - 用户选择的字段列表
 * @param {string} modelName - 使用的模型名称
 * @returns {Promise<string>} 生成的自定义prompt
 */
async function generateCustomPrompt(templateContent, modelName) {
  const metaPrompt = prompts.getMetaPromptForOutpatient(templateContent)
  return await callVLLM(metaPrompt, modelName)
}

/**
 * 生成门诊病历内容（流式）
 * @param {string} customPrompt - 第一步生成的自定义prompt
 * @param {string} dialogueContent - 患者对话内容
 * @param {string} modelName - 使用的模型名称
 * @yields {string} 生成的内容片段
 */
async function* generateMedicalRecordStream(customPrompt, dialogueContent, modelName) {
  const finalPrompt = prompts.combinePromptWithDialogueOutpatient(customPrompt, dialogueContent)
  for await (const chunk of callVLLMStream(finalPrompt, modelName)) {
    yield chunk
  }
}

/**
 * 生成查房记录（流式）
 * @param {string} dialogueContent - 对话内容
 * @param {string} modelName - 使用的模型名称
 * @yields {string} 生成的内容片段
 */
async function* generateWardRoundRecordStream(dialogueContent, modelName) {
  const prompt = prompts.getContentPromptForWardRound(dialogueContent)
  for await (const chunk of callVLLMStream(prompt, modelName)) {
    yield chunk
  }
}

/**
 * 生成随访记录（流式）
 * @param {string} dialogueContent - 对话内容
 * @param {string} modelName - 使用的模型名称
 * @yields {string} 生成的内容片段
 */
async function* generateFollowupRecordStream(dialogueContent, modelName) {
  const prompt = prompts.getContentPromptForFollowup(dialogueContent)
  for await (const chunk of callVLLMStream(prompt, modelName)) {
    yield chunk
  }
}

/**
 * 生成教育查房的自定义prompt
 * @param {string} templateContent - 用户选择的字段列表
 * @param {string} modelName - 使用的模型名称
 * @returns {Promise<string>} 生成的自定义prompt
 */
async function generateEducationRoundPrompt(templateContent, modelName) {
  const metaPrompt = prompts.getMetaPromptForEducationRound(templateContent)
  return await callVLLM(metaPrompt, modelName)
}

/**
 * 生成教育查房内容（流式）
 * @param {string} customPrompt - 第一步生成的自定义prompt
 * @param {string} dialogueContent - 教育查房对话内容
 * @param {string} modelName - 使用的模型名称
 * @yields {string} 生成的内容片段
 */
async function* generateEducationRoundContentStream(customPrompt, dialogueContent, modelName) {
  const finalPrompt = prompts.combinePromptWithDialogueEducation(customPrompt, dialogueContent)
  for await (const chunk of callVLLMStream(finalPrompt, modelName)) {
    yield chunk
  }
}

module.exports = {
  generateCustomPrompt,
  generateMedicalRecordStream,
  generateWardRoundRecordStream,
  generateFollowupRecordStream,
  generateEducationRoundPrompt,
  generateEducationRoundContentStream
}