import axios from 'axios';
import { Message } from 'element-ui';
import config from './config';

// 设置登录（获取token）的API
const loginUrl = '/voiceRecognition/sysUser/login';

// 创建axios实例
const baseUrl = config.BASE_URL;
const requestTimeout = config.REQUEST_TIMEOUT;
let ifNeedLogin = false;

const request = axios.create({
  baseURL: baseUrl,
  timeout: requestTimeout // 请求超时时间
});

const serviIntercept = () => {
  // 请求拦截拦截器
  request.interceptors.request.use(
    config => {
      
      // 只有非登录接口才需要添加认证信息
      if (config.url !== loginUrl) {
        config.headers.userId = (() => {
          if (localStorage.userId) {
            return localStorage.userId
          } else {
            return '';
          }
        })();
        
        config.headers.token = (() => {
          if (localStorage.token) {
            return localStorage.token
          } else {
            return '';
          }
        })();
      }   
      
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );
  
  // 响应拦截 
  request.interceptors.response.use(
    res => {
      
      if (res.data.code === 410) {
        
        if (!ifNeedLogin) {
          ifNeedLogin = true;
          Message.warning(res.data?.message || '登录过期，请重新登录');
        }
        setTimeout(() => {
          localStorage.clear();
          sessionStorage.clear();
          location.href = '/login';
        }, 500);
        // 返回错误，让调用方知道请求失败
        return Promise.reject(new Error('登录过期'));
      } else {
        return res.data;
      }
    },
    // 请求失败情况
    error => {
      
      const { response } = error;
      if (response) {
        
        
        // 若状态码 非 2XX 或 1XX 判断为网络异常
        if (response.status >= 300) {
          let errorMessage = '服务故障，请检查！';
          let shouldRedirect = false;
          
          // 根据状态码显示不同错误信息
          switch (response.status) {
            case 401:
              errorMessage = '未授权，请重新登录';
              shouldRedirect = true;
              break;
            case 403:
              errorMessage = '没有权限访问该资源';
              shouldRedirect = true;
              break;
            case 404:
              errorMessage = '请求的资源不存在';
              break;
            case 500:
              errorMessage = '服务器内部错误';
              break;
            default:
              errorMessage = `请求失败: ${response.status}`;
          }
          
          Message.error(errorMessage);
          
          // 只有认证相关的错误才跳转到登录页面
          if (shouldRedirect) {
            localStorage.userId = '';
            localStorage.username = '';
            localStorage.token = '';
            localStorage.userId = '';
            localStorage.isCopy = '';
            localStorage.isRecording = '';
            location.href = '/login';
          }
        }
        return Promise.reject(response);
      } else {
        
        return Promise.reject(error);
      }
    }
  );
};

// 响应拦截方法
serviIntercept();

export default request; 