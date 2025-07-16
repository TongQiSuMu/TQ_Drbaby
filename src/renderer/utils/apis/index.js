import request from '../request'

// 标题信息
export function listAllTitles(params) {
  return request({
    url: '/voiceRecognition/aiDialogRecords/queryUserTitle',
    method: 'GET',
    params
  })
}

// 增加ai对话信息（标题和内容）
export function insertOrUpdate(params) {
  return request({
    url: '/voiceRecognition/aiDialogRecords/insertOrUpdate',
    method: 'POST',
    data: params
  })
}

// 根据 ID 查询对话内容
export function getContentById(params) {
  return request({
    url: '/voiceRecognition/aiDialogRecords/getContentById',
    method: 'GET',
    params
  })
}

// 根据 ID 查询对话内容
export function deleteById(params) {
  return request({
    url: `/voiceRecognition/aiDialogRecords/deleteAiDialogRecordsById`,
    method: 'get',
    params
  })
}

// 获取所有的模板列表
export function listAllTemplates(params) {
  return request({
    url: '/voiceRecognition/medicalRecordTemplates/listAllTemplates',
    method: 'GET',
    params
  })
}

// 通过标题增加模板内容
export function insertByTitle(params) {
  return request({
    url: '/voiceRecognition/medicalRecordTemplates/insertByTitle',
    method: 'GET',
    params
  })
}

// 通过标题增加模板内容
export function insertOrUpdateTemplate(params) {
  return request({
    url: '/voiceRecognition/medicalRecordTemplates/insertOrUpdate',
    method: 'POST',
    data: params
  })
}

// 通过id获取模板内容
export function getTemplateById(params) {
  return request({
    url: '/voiceRecognition/medicalRecordTemplates/getMedicalRecordContentById',
    method: 'GET',
    params
  })
}

// 根据就诊id查询对话记录
export function queryDialogRecordsByVoiceNumber(params) {
  return request({
    url: '/voiceRecognition/aiDialogRecords/queryDialogRecordsByVoiceNumber',
    method: 'GET',
    params
  })
}

// 保存对话门诊信息
export function insertTemplatesContent(params) {
  return request({
    url: '/voiceRecognition/aiDialogRecords/insertTemplatesContent',
    method: 'POST',
    data:params
  })
}

// 根据voiceNumber查询模板信息
export function queryTemplatesContentByVoiceNumber(params) {
  return request({
    url: '/voiceRecognition/aiDialogRecords/queryTemplatesContentByVoiceNumber',
    method: 'GET',
    params
  })
}

// 查询默认的模板信息
export function queryTemplateByIsDefault(params) {
  return request({
    url: '/voiceRecognition/sysUserTemplates/queryTemplateByIsDefault',
    method: 'GET',
    params
  })
}

// 根据voiceNumber修改titleName
export function updateTitleNameByVoiceNumber(params) {
  return request({
    url: '/voiceRecognition/aiDialogRecords/updateTitleNameByVoiceNumber',
    method: 'POST',
    data: params
  })
}

// 查询当前用户的模板信息
export function queryTemplatesByUserId(params) {
  return request({
    url: '/voiceRecognition/sysUserTemplates/queryTemplatesByUserId',
    method: 'GET',
    params
  })
}


// 根据模板id查询模板组件信息
export function queryMedicalRecordContentInfoById(params) {
  return request({
    url: '/voiceRecognition/medicalRecordTemplates/queryMedicalRecordContentInfoById',
    method: 'GET',
    params
  })
}

