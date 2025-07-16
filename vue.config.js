const { defineConfig } = require('@vue/cli-service')
const path = require('path')

module.exports = defineConfig({
  lintOnSave: false,
  transpileDependencies: true,
  
  // 输出目录
  outputDir: 'dist',
  
  // 静态资源目录
  assetsDir: 'static',
  
  // 公共路径
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
  
  // 开发服务器配置
  devServer: {
    port: 8080,
    open: false,
    hot: true,
    proxy: {
      '/apiFlows': {
        target: 'http://192.168.8.37:8000/',
        changeOrigin: true,
        pathRewrite: {
          '^/apiFlows': '' // 路径重写规则
        },
        onProxyReq(proxyReq, req) {
          console.log('[Proxy Request]', {
            time: new Date().toISOString(),
            method: req.method,
            originalUrl: req.originalUrl,
            target: proxyReq.path
          })
        },
        onProxyRes(proxyRes, req) {
          console.log('[Proxy Response]', {
            time: new Date().toISOString(),
            statusCode: proxyRes.statusCode,
            url: req.originalUrl
          })
        }
      }
    }
  },
  
  // 路径别名和入口文件配置
  configureWebpack: {
    entry: './src/renderer/main.js',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    externals: {
      'electron': 'commonjs electron'
    }
  },
  
  // 指定模板文件
  indexPath: 'index.html',
  
  // 链式配置
  chainWebpack: config => {
    // 修改 HTML 模板路径
    config.plugin('html').tap(args => {
      args[0].template = './public/index.html'
      return args
    })
    
    // 添加悬浮框页面配置
    config.plugin('html-floating-ball')
      .use(require('html-webpack-plugin'), [{
        template: './src/renderer/floating-ball.html',
        filename: 'floating-ball.html',
        chunks: [],
        inject: false
      }])
      
    config.plugin('html-small-window')
      .use(require('html-webpack-plugin'), [{
        template: './src/renderer/small-window.html',
        filename: 'small-window.html',
        chunks: [],
        inject: false
      }])
      
    // 确保静态资源被正确复制
    config.plugin('copy-assets')
      .use(require('copy-webpack-plugin'), [{
        patterns: [
          {
            from: 'src/assets/image',
            to: 'assets/image'
          },
          {
            from: 'src/renderer/suspen-icon.png',
            to: 'suspen-icon.png'
          }
        ]
      }])
  }
}) 