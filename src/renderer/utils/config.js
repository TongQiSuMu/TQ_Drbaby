// 配置文件
const config = {
  // API基础URL
  BASE_URL: 'http://192.168.8.16:8089', 
  // BASE_URL: 'http://172.16.6.63:8089', 
  // BASE_URL: 'http://192.168.8.38:8089', 
  WSS_URL: 'wss://172.16.6.11:10096',
  // DIFT_URL: 'http://172.16.6.11',
  DIFT_URL: 'http://localhost:8012',
  // 请求超时时间
  REQUEST_TIMEOUT: 10000,
  
  // 是否启用服务拦截器
  SERVICE_INTERCEPT: true
}

export default config