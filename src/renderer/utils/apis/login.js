import request from '../request'

// login
export function login(params) {
  return request({
    url: '/voiceRecognition/sysUser/login',
    method: 'post',
    data: params
  })
}
