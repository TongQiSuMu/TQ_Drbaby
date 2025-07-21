const axios = require('axios')

const VLLM_BASE_URL = process.env.VLLM_BASE_URL || 'http://172.16.6.11:8000/v1'

async function callVLLM(prompt, modelName) {
  try {
    const response = await axios.post(
      `${VLLM_BASE_URL}/chat/completions`,
      {
        model: modelName,
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.1
      },
      {
        timeout: 60000
      }
    )
    
    return response.data.choices[0].message.content
  } catch (error) {
    console.error('VLLM API call error:', error.message)
    throw error
  }
}

async function* callVLLMStream(prompt, modelName) {
  try {
    const response = await axios.post(
      `${VLLM_BASE_URL}/chat/completions`,
      {
        model: modelName,
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.1,
        stream: true
      },
      {
        responseType: 'stream',
        timeout: 60000
      }
    )
    
    let buffer = ''
    
    for await (const chunk of response.data) {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.trim() === '') continue
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          
          if (data === '[DONE]') {
            return
          }
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.choices && parsed.choices.length > 0) {
              const delta = parsed.choices[0].delta || {}
              const content = delta.content || ''
              if (content) {
                yield content
              }
            }
          } catch (e) {
            console.error('Error parsing stream data:', e)
          }
        }
      }
    }
    
    if (buffer.trim()) {
      const line = buffer.trim()
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const data = line.slice(6)
          const parsed = JSON.parse(data)
          if (parsed.choices && parsed.choices.length > 0) {
            const delta = parsed.choices[0].delta || {}
            const content = delta.content || ''
            if (content) {
              yield content
            }
          }
        } catch (e) {
          console.error('Error parsing final buffer:', e)
        }
      }
    }
  } catch (error) {
    console.error('VLLM stream API call error:', error.message)
    throw error
  }
}

module.exports = {
  callVLLM,
  callVLLMStream
}