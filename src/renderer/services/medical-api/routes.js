/**
 * API路由定义
 */

const express = require('express')
const router = express.Router()
const generators = require('./generators')

const VLLM_MODEL_NAME = 'II-Medical-8B-1706'

/**
 * 第一个接口：生成提示词（只服务于门诊病历和教育查房）
 */
router.post('/generate-prompt', async (req, res) => {
  const { template_name, template_content } = req.body
  
  console.log(`[${new Date().toISOString()}] POST /api/generate-prompt - template_name: ${template_name}`)
  
  // 验证模板名称
  if (!['门诊病历', '教育查房'].includes(template_name)) {
    console.error(`不支持的模板类型: ${template_name}`)
    return res.json({
      code: 400,
      data: null,
      msg: `不支持的模板类型: ${template_name}。只支持'门诊病历'和'教育查房'`
    })
  }
  
  try {
    let prompt
    if (template_name === '门诊病历') {
      // 生成门诊病历的自定义prompt
      prompt = await generators.generateCustomPrompt(template_content, VLLM_MODEL_NAME)
    } else {
      // 生成教育查房的自定义prompt
      prompt = await generators.generateEducationRoundPrompt(template_content, VLLM_MODEL_NAME)
    }
    
    // 返回生成的prompt（使用标准响应格式）
    return res.json({
      code: 200,
      data: {
        prompt: prompt,
        template_name: template_name
      },
      msg: '成功'
    })
    
  } catch (error) {
    console.error(`生成prompt时出错: ${error.message}`)
    return res.json({
      code: 500,
      data: null,
      msg: `服务器内部错误: ${error.message}`
    })
  }
})

/**
 * 第二个接口：生成病历内容（支持所有四种场景）
 */
router.post('/generate-content', async (req, res) => {
  const { dialogue_content, prompt, template_name } = req.body
  
  console.log(`[${new Date().toISOString()}] POST /api/generate-content - template_name: ${template_name}, has_prompt: ${!!prompt}`)
  
  // 设置SSE响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })
  
  async function* generate() {
    try {
      if (template_name === '门诊病历') {
        // 必须提供prompt
        if (!prompt) {
          const errorMsg = '门诊病历必须提供prompt参数'
          console.error(errorMsg)
          yield `data: ${JSON.stringify({ error: errorMsg })}\n\n`
          return
        }
        
        console.log(`开始生成门诊病历内容`)
        for await (const chunk of generators.generateMedicalRecordStream(
          prompt,
          dialogue_content,
          VLLM_MODEL_NAME
        )) {
          // 兼容 Dify 格式
          const data = {
            event: 'text_chunk',
            data: {
              text: chunk
            }
          }
          yield `data: ${JSON.stringify(data)}\n\n`
        }
        
      } else if (template_name === '查房记录') {
        // 不需要prompt，使用预定义的
        console.log(`开始生成查房记录内容`)
        for await (const chunk of generators.generateWardRoundRecordStream(
          dialogue_content,
          VLLM_MODEL_NAME
        )) {
          // 兼容 Dify 格式
          const data = {
            event: 'text_chunk',
            data: {
              text: chunk
            }
          }
          yield `data: ${JSON.stringify(data)}\n\n`
        }
        
      } else if (template_name === '随访记录') {
        // 不需要prompt，使用预定义的
        console.log(`开始生成随访记录内容`)
        for await (const chunk of generators.generateFollowupRecordStream(
          dialogue_content,
          VLLM_MODEL_NAME
        )) {
          // 兼容 Dify 格式
          const data = {
            event: 'text_chunk',
            data: {
              text: chunk
            }
          }
          yield `data: ${JSON.stringify(data)}\n\n`
        }
        
      } else if (template_name === '教育查房') {
        // 必须提供prompt
        if (!prompt) {
          const errorMsg = '教育查房必须提供prompt参数'
          console.error(errorMsg)
          yield `data: ${JSON.stringify({ error: errorMsg })}\n\n`
          return
        }
        
        console.log(`开始生成教育查房内容`)
        for await (const chunk of generators.generateEducationRoundContentStream(
          prompt,
          dialogue_content,
          VLLM_MODEL_NAME
        )) {
          // 兼容 Dify 格式
          const data = {
            event: 'text_chunk',
            data: {
              text: chunk
            }
          }
          yield `data: ${JSON.stringify(data)}\n\n`
        }
        
      } else {
        const errorMsg = `不支持的模板类型: ${template_name}`
        console.error(errorMsg)
        yield `data: ${JSON.stringify({ error: errorMsg })}\n\n`
        return
      }
      
      // Send completion signal (兼容 Dify 格式)
      const finishData = {
        event: 'workflow_finished',
        data: {
          outputs: {
            result: ''
          }
        }
      }
      yield `data: ${JSON.stringify(finishData)}\n\n`
      yield 'data: [DONE]\n\n'
      
      console.log(`${template_name}内容生成完成`)
      
    } catch (error) {
      console.error(`生成内容时出错: ${error.message}`)
      yield `data: ${JSON.stringify({ error: error.message })}\n\n`
    }
  }
  
  // 写入响应流
  for await (const chunk of generate()) {
    res.write(chunk)
  }
  
  res.end()
})

/**
 * API文档页面（简单的说明）
 */
router.get('/docs', (req, res) => {
  res.send(`
    <h1>Medical API Documentation</h1>
    <h2>Endpoints:</h2>
    <ul>
      <li>POST /api/generate-prompt - Generate custom prompt for outpatient and education round</li>
      <li>POST /api/generate-content - Generate medical document content with SSE streaming</li>
    </ul>
  `)
})

module.exports = router