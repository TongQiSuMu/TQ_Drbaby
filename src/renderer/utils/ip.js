// utils/ip.js
export async function getLocalIP() {
    if (window.require) {
      const { ipcRenderer } = window.require('electron')
      const ip = await ipcRenderer.invoke('get-local-ip')
      return ip
    } else {
      return '浏览器环境不支持'
    }
  }