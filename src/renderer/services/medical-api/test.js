const axios = require('axios')

const API_URL = 'http://localhost:8012/api'

async function testGeneratePrompt() {
  console.log('\n测试 /api/generate-prompt 接口...')
  
  try {
    const response = await axios.post(`${API_URL}/generate-prompt`, {
      template_name: '门诊病历',
      template_content: '主诉,现病史,治疗建议'
    })
    
    console.log('响应状态:', response.status)
    console.log('响应数据:', JSON.stringify(response.data, null, 2))
    
    if (response.data.code === 200 && response.data.data.prompt) {
      console.log('✅ generate-prompt 测试通过')
      return response.data.data.prompt
    } else {
      console.log('❌ generate-prompt 测试失败')
      return null
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
    return null
  }
}

async function testGenerateContent(prompt) {
  console.log('\n测试 /api/generate-content 接口...')
  
  try {
    const response = await axios.post(`${API_URL}/generate-content`, {
      dialogue_content: '患者：医生，我最近晚上总是频繁起夜上厕所，已经持续两天了。',
      prompt: prompt,
      template_name: '门诊病历'
    }, {
      responseType: 'stream'
    })
    
    console.log('开始接收流式响应...')
    
    let fullContent = ''
    response.data.on('data', chunk => {
      const lines = chunk.toString().split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data)
              if (parsed.event === 'text_chunk') {
                process.stdout.write(parsed.data.text)
                fullContent += parsed.data.text
              } else if (parsed.event === 'workflow_finished') {
                console.log('\n\n✅ 流式响应完成')
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    })
    
    response.data.on('end', () => {
      console.log('\n✅ generate-content 测试完成')
      console.log('生成内容长度:', fullContent.length)
    })
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message)
  }
}

async function runTests() {
  console.log('开始测试医疗API服务...')
  console.log('确保服务已在 http://localhost:8012 启动')
  
  // 先测试生成提示词
  const prompt = await testGeneratePrompt()
  
  if (prompt) {
    // 再测试生成内容
    await testGenerateContent(prompt)
  }
}

// 延迟执行，给服务启动时间
setTimeout(() => {
  runTests()
}, 2000)

console.log('等待2秒后开始测试...')