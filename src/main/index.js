const { app, BrowserWindow, screen, Menu, Tray, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 设置为单实例应用
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果已经有实例在运行，退出新实例
  app.quit();
} else {
  // 当第二个实例启动时，激活第一个实例的窗口
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 如果主窗口存在，显示并聚焦
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else {
      // 如果主窗口不存在，显示悬浮球
      if (floatingBall && !floatingBall.isDestroyed()) {
        floatingBall.show();
        floatingBall.focus();
      }
    }
  });
}

// 在开发环境中禁用安全警告
if (isDev) {
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

let mainWindow;
let floatingBall;
let transparentWindow;
let tray;

const os = require('os')

ipcMain.handle('get-local-ip', () => {
  const interfaces = os.networkInterfaces()
  for (let name in interfaces) {
    for (let iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
})

// 防止部分老显卡崩溃
// app.disableHardwareAcceleration(); // 注释掉以支持透明窗口
app.commandLine.appendSwitch('no-sandbox');

// 通用窗口加载函数
function loadWindowContent(window, url, fallbackPath) {
  return new Promise((resolve, reject) => {
    if (isDev) {
      window.loadURL(url).then(() => {
        if (isDev && window === mainWindow) {
          window.webContents.openDevTools();
        }
        resolve();
      }).catch(err => {
        console.error('Window load error:', err);
        // 重试一次
        setTimeout(() => {
          window.loadURL(url).then(resolve).catch(reject);
        }, 2000);
      });
    } else {
      window.loadFile(fallbackPath).then(resolve).catch(reject);
    }
  });
}

function createWindow() {
  try {
    // 创建浏览器窗口 - 先创建小尺寸登录窗口
    mainWindow = new BrowserWindow({
      width: 600,
      height: 400,
      x: 20,
      y: 20,
      show: false,
      frame: false,
      title: '同启医语宝',
      minimizable: true,  // 确保窗口可以最小化
      skipTaskbar: false, // 确保在任务栏显示
      paintWhenInitiallyHidden: true, // 初始隐藏时也渲染
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        webSecurity: isDev ? false : true,
        allowRunningInsecureContent: isDev ? true : false
      }
    });
    
    console.log('BrowserWindow created successfully');
  } catch (error) {
    console.error('Failed to create BrowserWindow:', error);
    throw error;
  }

  // 加载应用
  const loadMainWindow = () => {
    const url = 'http://localhost:8080';
    const fallbackPath = path.join(__dirname, '../../dist/index.html');
    
    loadWindowContent(mainWindow, url, fallbackPath).then(() => {
      console.log('Main window loaded successfully');
      // 检查是否是手动显示窗口
      if (global.isManualShow) {
        mainWindow.show();
        console.log('Manual show - window displayed normally');
      } else {
        // 自动启动时，只显示窗口，让渲染进程决定何时最小化
        console.log('Auto startup - showing window...');
        mainWindow.show();
      }
    }).catch(err => {
      console.error('Failed to load main window:', err);
    });
  };

  if (isDev) {
    setTimeout(loadMainWindow, 3000); // 等待webpack服务器启动
  } else {
    loadMainWindow();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // 监听主窗口的关闭事件
  mainWindow.on('close', (event) => {
    // 如果是从托盘退出，则不阻止关闭
    if (app.isQuitting) {
      return;
    }
    // 否则最小化到任务栏
    event.preventDefault();
    mainWindow.minimize();
    console.log('Main window minimized on close event');
  });
  
  mainWindow.setMenu(null);
}

// 创建悬浮球窗口
function createFloatingBall() {
  try {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    floatingBall = new BrowserWindow({
      width: 80,
      height: 70,
      x: width - 90,
      y: 100,
      frame: false,
      alwaysOnTop: true,
      transparent: true,
      resizable: false,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        webSecurity: isDev ? false : true
      }
    });

    const loadFloatingBall = () => {
      const url = 'http://localhost:8080/floating-ball.html';
      const fallbackPath = path.join(__dirname, '../../dist/floating-ball.html');
      
      loadWindowContent(floatingBall, url, fallbackPath).then(() => {
        console.log('Floating ball loaded successfully');
        setTimeout(() => {
          floatingBall.show();
        }, 500);
      }).catch(err => {
        console.error('Failed to load floating ball:', err);
        floatingBall = null;
      });
    };

    if (isDev) {
      setTimeout(loadFloatingBall, 2000);
    } else {
      loadFloatingBall();
    }
  } catch (error) {
    console.error('Failed to create floating ball window:', error);
    floatingBall = null;
  }

  // 设置窗口可拖拽
  floatingBall.setIgnoreMouseEvents(false);
  
  floatingBall.on('closed', () => {
    floatingBall = null;
  });

  // 监听拖拽，实现贴边功能
  let isDragging = false;
  let dragStartTime = 0;

  floatingBall.on('move', () => {
    if (!isDragging) {
      isDragging = true;
      dragStartTime = Date.now();
    }
  });

  floatingBall.on('moved', () => {
    if (isDragging) {
      setTimeout(() => {
        if (Date.now() - dragStartTime > 100) {
          snapToEdge();
          isDragging = false;
        }
      }, 100);
    }
  });
}

// 贴边功能
function snapToEdge() {
  if (!floatingBall || floatingBall.isDestroyed()) return;

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const bounds = floatingBall.getBounds();
  const windowWidth = bounds.width;
  const windowHeight = bounds.height;

  let newX = bounds.x;
  let newY = bounds.y;

  // 水平贴边
  const windowCenterX = bounds.x + windowWidth / 2;
  if (windowCenterX < width / 2) {
    newX = 0;
  } else {
    newX = width - windowWidth;
  }

  // 垂直边界限制
  if (newY < 0) newY = 0;
  if (newY > height - windowHeight) newY = height - windowHeight;

  floatingBall.setPosition(newX, newY);
}

// 创建系统托盘
function createTray() {
  try {
    const { nativeImage } = require('electron');
    const fs = require('fs');
    
    const iconPaths = [
      path.join(__dirname, '../renderer/suspen-icon.png'),
      path.join(__dirname, '../../public/suspen-icon.png'),
      path.join(__dirname, '../../public/assets/suspen-icon.png')
    ];
    
    let iconPath = null;
    for (const testPath of iconPaths) {
      if (fs.existsSync(testPath)) {
        iconPath = testPath;
        console.log('✅ 找到托盘图标:', iconPath);
        break;
      }
    }
    
    let image;
    if (iconPath) {
      image = nativeImage.createFromPath(iconPath);
      if (!image.isEmpty()) {
        image = image.resize({ width: 16, height: 16 });
      }
    }
    
    if (!image || image.isEmpty()) {
      console.log('使用默认托盘图标');
      image = nativeImage.createEmpty();
    }
    
    tray = new Tray(image);
    console.log('托盘图标创建成功');
  } catch (error) {
    console.error('托盘图标创建失败:', error);
    try {
      const { nativeImage } = require('electron');
      tray = new Tray(nativeImage.createEmpty());
    } catch (fallbackError) {
      console.error('备选托盘创建也失败:', fallbackError);
      return;
    }
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        showMainWindow();
      }
    },
    {
      label: '显示悬浮球',
      click: () => {
        if (floatingBall && !floatingBall.isDestroyed()) {
          floatingBall.show();
          floatingBall.focus();
        } else {
          createFloatingBall();
        }
      }
    },
    {
      label: '隐藏悬浮球',
      click: () => {
        if (floatingBall && !floatingBall.isDestroyed()) {
          floatingBall.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出应用',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('悬浮助手 - 右键查看选项');
  
  // 双击托盘图标显示悬浮球
  tray.on('double-click', () => {
    if (floatingBall && !floatingBall.isDestroyed()) {
      if (floatingBall.isVisible()) {
        floatingBall.hide();
      } else {
        floatingBall.show();
        floatingBall.focus();
      }
    } else {
      createFloatingBall();
    }
  });
}

// 显示主窗口
function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  } else {
    // 创建新窗口时设置标志，避免自动最小化
    global.isManualShow = true;
    createWindow();
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
      global.isManualShow = false;
    }, 100);
  }
}

// 创建透明窗口
function createTransparentWindow() {
  console.log('🪟 开始创建透明窗口...');
  
  if (transparentWindow && !transparentWindow.isDestroyed()) {
    console.log('透明窗口已存在，跳过创建');
    transparentWindow.show();
    transparentWindow.focus();
    return;
  }
  
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // 根据操作系统选择合适的透明度实现
  const windowConfig = {
    width: 360,
    height: 700,
    x: width - 820,
    y: 20,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: false,
    show: false,
    skipTaskbar: true,
    hasShadow: false, // 去掉阴影，避免透明度问题
    backgroundThrottling: false, // 防止背景节流
    paintWhenInitiallyHidden: true, // 初始隐藏时也渲染
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // enableRemoteModule: true, // Electron 20 中已废弃
      webSecurity: isDev ? false : true,
      allowRunningInsecureContent: isDev ? true : false,
      webviewTag: true // 如果需要使用 webview
    },
    title: '透明窗口'
  };

  // Windows 特殊处理
  if (process.platform === 'win32') {
    // 在 Windows 上使用 transparent
    windowConfig.transparent = true;
    windowConfig.backgroundColor = '#00000000'; // 完全透明
  } else {
    // macOS 使用 vibrancy
    windowConfig.transparent = true;
    windowConfig.vibrancy = 'under-window';
  }

  transparentWindow = new BrowserWindow(windowConfig);
  
  // 使用 ready-to-show 事件来确保透明度正确初始化
  transparentWindow.once('ready-to-show', () => {
    setTimeout(() => {
      transparentWindow.show();
      transparentWindow.focus();
      console.log('Transparent window shown after transparency initialization');
    }, 100); // 短暂延迟确保透明度完全初始化
  });

  const loadTransparentWindow = () => {
    if (isDev) {
      transparentWindow.loadURL('http://localhost:8080/#/transparent').then(() => {
        console.log('Transparent window loaded successfully');
      }).catch(err => {
        console.log('Transparent window load error:', err);
      });
    } else {
      const indexPath = path.join(__dirname, '../../dist/index.html');
      transparentWindow.loadFile(indexPath, { hash: '#/transparent' }).then(() => {
        console.log('Transparent window loaded from file');
      });
    }
  };

  // 立即加载窗口内容，show 事件会在 ready-to-show 时触发
  loadTransparentWindow();

  transparentWindow.on('closed', () => {
    transparentWindow = null;
  });

  // 设置窗口可拖拽
  transparentWindow.webContents.once('dom-ready', () => {
    transparentWindow.webContents.insertCSS(`
      body {
        -webkit-app-region: no-drag;
        background: transparent !important;
      }
      .toggle-header {
        -webkit-app-region: drag;
      }
      .toggle-buttons, .window-controls {
        -webkit-app-region: no-drag;
      }
    `);
    
    // 禁用窗口的默认背景
    transparentWindow.setBackgroundColor('#00000000');
  });

  // 添加边缘自动隐藏功能
  setupAutoEdgeHiding(transparentWindow);
}

// 设置窗口边缘自动隐藏功能（类似QQ）
function setupAutoEdgeHiding(window) {
  const EDGE_THRESHOLD = 5; // 边缘检测阈值（像素）
  const VISIBLE_WIDTH = 3; // 隐藏时保留的可见宽度（像素）
  const ANIMATION_DURATION = 300; // 动画时长（毫秒）
  const MOUSE_CHECK_INTERVAL = 50; // 鼠标检测间隔（毫秒）
  const MOUSE_TRIGGER_DISTANCE = 5; // 鼠标触发显示的距离（像素）
  
  let isHidden = false;
  let hiddenEdge = null;
  let originalBounds = null;
  let isAnimating = false;
  let mouseCheckTimer = null;
  let checkTimer = null;
  
  // 检查窗口是否在屏幕边缘
  function checkEdgePosition() {
    if (isAnimating || isHidden) return;
    
    const bounds = window.getBounds();
    const currentDisplay = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
    const workArea = currentDisplay.workArea;
    
    // 检查左边缘
    if (bounds.x <= workArea.x + EDGE_THRESHOLD) {
      if (!isHidden || hiddenEdge !== 'left') {
        hideToEdge('left', bounds, workArea);
      }
    }
    // 检查右边缘
    else if (bounds.x + bounds.width >= workArea.x + workArea.width - EDGE_THRESHOLD) {
      if (!isHidden || hiddenEdge !== 'right') {
        hideToEdge('right', bounds, workArea);
      }
    }
    // 检查顶部边缘
    else if (bounds.y <= workArea.y + EDGE_THRESHOLD) {
      if (!isHidden || hiddenEdge !== 'top') {
        hideToEdge('top', bounds, workArea);
      }
    }
    // 如果不在边缘且已隐藏，则显示窗口
    else if (isHidden) {
      showFromEdge();
    }
  }
  
  // 隐藏窗口到边缘
  function hideToEdge(edge, bounds, workArea) {
    if (isAnimating) return;
    
    isAnimating = true;
    originalBounds = { ...bounds };
    hiddenEdge = edge;
    isHidden = true;
    
    let targetX = bounds.x;
    let targetY = bounds.y;
    
    switch (edge) {
      case 'left':
        targetX = workArea.x - bounds.width + VISIBLE_WIDTH;
        break;
      case 'right':
        targetX = workArea.x + workArea.width - VISIBLE_WIDTH;
        break;
      case 'top':
        targetY = workArea.y - bounds.height + VISIBLE_WIDTH;
        break;
    }
    
    // 执行动画
    animateWindow(window, bounds.x, bounds.y, targetX, targetY, ANIMATION_DURATION, () => {
      isAnimating = false;
      // 设置窗口始终在顶部，确保鼠标可以触发
      window.setAlwaysOnTop(true, 'screen-saver');
      // 开始检测鼠标位置
      startMouseCheck();
    });
  }
  
  // 从边缘显示窗口
  function showFromEdge() {
    if (isAnimating || !originalBounds) return;
    
    isAnimating = true;
    isHidden = false;
    
    const bounds = window.getBounds();
    const currentDisplay = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
    const workArea = currentDisplay.workArea;
    
    // 停止鼠标检测
    stopMouseCheck();
    
    // 计算显示位置，确保窗口完全在屏幕内
    let targetX = originalBounds.x;
    let targetY = originalBounds.y;
    
    // 根据隐藏的边缘调整位置，确保窗口完全显示在屏幕内
    switch (hiddenEdge) {
      case 'left':
        targetX = workArea.x + 10; // 距离左边缘10像素
        break;
      case 'right':
        targetX = workArea.x + workArea.width - originalBounds.width - 10; // 距离右边缘10像素
        break;
      case 'top':
        targetY = workArea.y + 10; // 距离顶部10像素
        break;
    }
    
    // 执行动画
    animateWindow(window, bounds.x, bounds.y, targetX, targetY, ANIMATION_DURATION, () => {
      isAnimating = false;
      hiddenEdge = null;
      window.setAlwaysOnTop(true, 'normal');
      
      // 更新原始位置为当前位置
      originalBounds = window.getBounds();
      
      // 延迟较长时间再检查，避免鼠标还在边缘时立即隐藏
      setTimeout(() => {
        // 只有当鼠标不在边缘时才检查是否需要隐藏
        const mousePos = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint(mousePos);
        const area = display.workArea;
        
        const nearEdge = (
          mousePos.x <= area.x + MOUSE_TRIGGER_DISTANCE ||
          mousePos.x >= area.x + area.width - MOUSE_TRIGGER_DISTANCE ||
          mousePos.y <= area.y + MOUSE_TRIGGER_DISTANCE
        );
        
        if (!nearEdge) {
          checkEdgePosition();
        }
      }, 2000);
    });
  }
  
  // 动画函数
  function animateWindow(window, startX, startY, endX, endY, duration, callback) {
    // 验证参数
    if (isNaN(startX) || isNaN(startY) || isNaN(endX) || isNaN(endY)) {
      console.error('Invalid animation parameters:', { startX, startY, endX, endY });
      if (callback) callback();
      return;
    }
    
    const startTime = Date.now();
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    function animate() {
      try {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数
        const easeProgress = easeInOutCubic(progress);
        
        const currentX = Math.round(startX + deltaX * easeProgress);
        const currentY = Math.round(startY + deltaY * easeProgress);
        
        // 再次验证位置值
        if (!isNaN(currentX) && !isNaN(currentY)) {
          window.setPosition(currentX, currentY);
        }
        
        if (progress < 1) {
          setTimeout(animate, 16); // 约60fps
        } else {
          if (callback) callback();
        }
      } catch (error) {
        console.error('Animation error:', error);
        if (callback) callback();
      }
    }
    
    animate();
  }
  
  // 缓动函数
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  // 监听窗口移动
  window.on('move', () => {
    if (checkTimer) clearTimeout(checkTimer);
    // 如果窗口已隐藏且正在移动，说明用户想要调整位置，先显示窗口
    if (isHidden && !isAnimating) {
      showFromEdge();
    } else {
      checkTimer = setTimeout(checkEdgePosition, 300); // 延迟检查
    }
  });
  
  // 监听窗口失去焦点
  window.on('blur', () => {
    // 延迟检查，给用户时间移动鼠标
    setTimeout(() => {
      if (!window.isFocused()) {
        checkEdgePosition();
      }
    }, 500);
  });
  
  // 开始鼠标位置检测
  function startMouseCheck() {
    if (mouseCheckTimer) clearInterval(mouseCheckTimer);
    
    mouseCheckTimer = setInterval(() => {
      if (!isHidden || isAnimating) return;
      
      const mousePos = screen.getCursorScreenPoint();
      const bounds = window.getBounds();
      const display = screen.getDisplayNearestPoint(mousePos);
      const workArea = display.workArea;
      
      let shouldShow = false;
      
      // 根据隐藏的边缘检测鼠标位置
      switch (hiddenEdge) {
        case 'left':
          // 鼠标接近左边缘
          if (mousePos.x <= workArea.x + MOUSE_TRIGGER_DISTANCE) {
            // 检查鼠标Y坐标是否在窗口原始高度范围内
            if (originalBounds && mousePos.y >= originalBounds.y && 
                mousePos.y <= originalBounds.y + originalBounds.height) {
              shouldShow = true;
            }
          }
          break;
        case 'right':
          // 鼠标接近右边缘
          if (mousePos.x >= workArea.x + workArea.width - MOUSE_TRIGGER_DISTANCE) {
            // 检查鼠标Y坐标是否在窗口原始高度范围内
            if (originalBounds && mousePos.y >= originalBounds.y && 
                mousePos.y <= originalBounds.y + originalBounds.height) {
              shouldShow = true;
            }
          }
          break;
        case 'top':
          // 鼠标接近顶部边缘
          if (mousePos.y <= workArea.y + MOUSE_TRIGGER_DISTANCE) {
            // 检查鼠标X坐标是否在窗口原始宽度范围内
            if (originalBounds && mousePos.x >= originalBounds.x && 
                mousePos.x <= originalBounds.x + originalBounds.width) {
              shouldShow = true;
            }
          }
          break;
      }
      
      if (shouldShow) {
        showFromEdge();
      }
    }, MOUSE_CHECK_INTERVAL);
  }
  
  // 停止鼠标检测
  function stopMouseCheck() {
    if (mouseCheckTimer) {
      clearInterval(mouseCheckTimer);
      mouseCheckTimer = null;
    }
  }
  
  // 监听窗口显示/隐藏
  window.on('show', () => {
    startMouseCheck();
    checkEdgePosition();
  });
  
  window.on('hide', () => {
    stopMouseCheck();
  });
  
  window.on('closed', () => {
    stopMouseCheck();
  });
  
  // 初始检查
  setTimeout(() => {
    startMouseCheck();
    checkEdgePosition();
  }, 1000);
}

// 禁用证书验证（用于WSS连接）
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(async () => {
  console.log('Electron app ready, starting initialization...');
  
  // 处理证书错误
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });
  
  // 创建主窗口
  try {
    console.log('Creating main window...');
    createWindow();
    console.log('✅ Main window created successfully');
  } catch (error) {
    console.error('❌ Failed to create main window:', error);
    return;
  }
  
  // 注册快捷键
  try {
    console.log('Registering shortcuts...');
    
    globalShortcut.register('CommandOrControl+Q', () => {
      console.log('Global shortcut Ctrl+Q pressed - quitting app');
      app.quit();
    });
    
    globalShortcut.register('CommandOrControl+Shift+Q', () => {
      console.log('Global shortcut Ctrl+Shift+Q pressed - force quit');
      process.exit(0);
    });
    
    console.log('✅ Global shortcuts registered successfully');
  } catch (error) {
    console.error('❌ Failed to register shortcuts:', error);
  }
  
  // 延迟创建悬浮球
  setTimeout(() => {
    try {
      console.log('Creating floating ball...');
      createFloatingBall();
      console.log('✅ Floating ball created successfully');
    } catch (error) {
      console.error('❌ Failed to create floating ball:', error);
    }
  }, 3000);
  
  // 延迟创建托盘
  setTimeout(() => {
    try {
      console.log('Creating system tray...');
      createTray();
      console.log('✅ System tray created successfully');
    } catch (error) {
      console.error('❌ Failed to create tray:', error);
    }
  }, 6000);
});

// IPC 通信处理
ipcMain.on('show-main-window', () => {
  showMainWindow();
});

ipcMain.on('create-transparent-window', () => {
  console.log('Received create-transparent-window event');
  if (transparentWindow && !transparentWindow.isDestroyed()) {
    transparentWindow.show();
    transparentWindow.focus();
  } else {
    createTransparentWindow();
  }
});

ipcMain.on('show-floating-ball', () => {
  if (floatingBall && !floatingBall.isDestroyed()) {
    floatingBall.show();
  } else {
    createFloatingBall();
  }
});

ipcMain.on('hide-floating-ball', () => {
  if (floatingBall && !floatingBall.isDestroyed()) {
    floatingBall.hide();
  }
});

// 动态调整悬浮球窗口大小
ipcMain.on('expand-floating-ball', (event, direction) => {
  if (floatingBall && !floatingBall.isDestroyed()) {
    const bounds = floatingBall.getBounds();
    const expandedWidth = 250;
    const expandedHeight = 70;
    
    // 根据方向调整位置，确保展开后悬浮球位置不变
    if (direction === 'left') {
      // 向左展开，需要调整x坐标
      floatingBall.setBounds({
        x: bounds.x - (expandedWidth - bounds.width),
        y: bounds.y,
        width: expandedWidth,
        height: expandedHeight
      });
    } else {
      // 向右展开，x坐标不变
      floatingBall.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: expandedWidth,
        height: expandedHeight
      });
    }
  }
});

ipcMain.on('collapse-floating-ball', () => {
  if (floatingBall && !floatingBall.isDestroyed()) {
    const bounds = floatingBall.getBounds();
    const collapsedWidth = 80;
    const collapsedHeight = 70;
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
    
    // 判断当前是向左还是向右展开的
    const centerX = bounds.x + bounds.width / 2;
    const isLeftExpanded = centerX > screenWidth / 2;
    
    if (isLeftExpanded) {
      // 如果是向左展开的，收缩时需要调整x坐标
      floatingBall.setBounds({
        x: bounds.x + (bounds.width - collapsedWidth),
        y: bounds.y,
        width: collapsedWidth,
        height: collapsedHeight
      });
    } else {
      // 向右展开的，x坐标不变
      floatingBall.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: collapsedWidth,
        height: collapsedHeight
      });
    }
  }
});

ipcMain.on('quit-app', () => {
  app.isQuitting = true;
  app.quit();
});

ipcMain.on('force-quit', () => {
  console.log('Force quit requested');
  process.exit(0);
});

// 窗口控制事件
ipcMain.on('minimize-window', () => {
  console.log('Minimize window event received');
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      // 对于无边框窗口，确保最小化能正常工作
      mainWindow.minimize();
      console.log('Window minimized successfully');
    } catch (error) {
      console.error('Failed to minimize window:', error);
      // 如果最小化失败，尝试隐藏窗口
      mainWindow.hide();
    }
  }
});

ipcMain.on('close-window', () => {
  if (transparentWindow && !transparentWindow.isDestroyed()) {
    transparentWindow.minimize(); // 最小化窗口
  }
});

// 调整窗口大小
ipcMain.on('resize-window', (event, options) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const { width, height, resizable } = options;
    mainWindow.setSize(width, height);
    mainWindow.setResizable(resizable);
    mainWindow.center();
  }
});

// 检查初始窗口大小
ipcMain.on('check-initial-window-size', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('initial-login-check');
  }
});

// 显示右键菜单
ipcMain.on('show-context-menu', (event) => {
  const { Menu } = require('electron');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        showMainWindow();
      }
    },
    { type: 'separator' },
    {
      label: '隐藏悬浮球',
      click: () => {
        if (floatingBall && !floatingBall.isDestroyed()) {
          floatingBall.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出应用',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  contextMenu.popup({ window: floatingBall });
});

// 登录成功后调整窗口大小
ipcMain.on('login-success', () => {
  console.log('Received login-success event');
  if (mainWindow && !mainWindow.isDestroyed()) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setSize(1200, 800);
    mainWindow.setResizable(true);
    mainWindow.setPosition(20, 20);
    // 登录成功后最小化主窗口到任务栏
    setTimeout(() => {
      if (!mainWindow.isMinimized()) {
        mainWindow.minimize();
        console.log('Main window minimized after login success');
      }
    }, 500);
  }
  
  // 登录成功后创建透明窗口
  if (!transparentWindow || transparentWindow.isDestroyed()) {
    setTimeout(() => {
      createTransparentWindow();
    }, 1000);
  }
});

// 退出登录事件处理
ipcMain.on('user-logout', () => {
  console.log('Received user-logout event');
  
  // 关闭透明窗口
  if (transparentWindow && !transparentWindow.isDestroyed()) {
    console.log('关闭透明窗口');
    transparentWindow.close();
    transparentWindow = null;
  }
  
  // 调整主窗口为登录窗口大小
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setSize(600, 400);
    mainWindow.setResizable(false);
    mainWindow.center();
  }
});

// 处理悬浮框通知显示 - 已禁用
ipcMain.on('show-floating-notification', (event, message) => {
  console.log('悬浮框通知已禁用:', message);
  // 不再处理通知显示，避免改变窗口大小和位置
});

// 切换窗口最小化/恢复状态
ipcMain.on('toggle-window-minimize', () => {
  console.log('Received toggle-window-minimize event');
  
  const allWindows = BrowserWindow.getAllWindows();
  const normalWindows = allWindows.filter(window => window !== floatingBall);
  
  let hasVisibleWindows = false;
  
  normalWindows.forEach((window) => {
    const isVisible = window.isVisible();
    const isMinimized = window.isMinimized();
    
    if (isVisible && !isMinimized) {
      hasVisibleWindows = true;
    }
  });
  
  normalWindows.forEach((window, index) => {
    try {
      if (hasVisibleWindows) {
        if (window.isVisible() && !window.isMinimized()) {
          console.log(`Minimizing window ${index}: ${window.getTitle()}`);
          window.minimize();
        }
      } else {
        console.log(`Restoring window ${index}: ${window.getTitle()}`);
        if (window.isMinimized()) {
          window.restore();
        }
        window.show();
        window.focus();
      }
    } catch (error) {
      console.error(`Error handling window ${index}:`, error);
    }
  });
  
  if (normalWindows.length === 0) {
    console.log('No windows found, creating main window');
    showMainWindow();
  }
});

// 获取悬浮球窗口位置信息
ipcMain.handle('get-window-position', () => {
  if (floatingBall && !floatingBall.isDestroyed()) {
    const { width } = screen.getPrimaryDisplay().workAreaSize;
    const [x] = floatingBall.getPosition();
    return {
      windowX: x,
      screenWidth: width
    };
  }
  return null;
});

// 拖拽窗口事件
ipcMain.on('drag-window', (event, { mouseX, mouseY, offsetX, offsetY }) => {
  if (floatingBall && !floatingBall.isDestroyed()) {
    const newX = mouseX - offsetX;
    const newY = mouseY - offsetY;
    
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const bounds = floatingBall.getBounds();
    const windowWidth = bounds.width;
    const windowHeight = bounds.height;
    
    const clampedX = Math.max(0, Math.min(newX, width - windowWidth));
    const clampedY = Math.max(0, Math.min(newY, height - windowHeight));
    
    floatingBall.setPosition(clampedX, clampedY);
  }
});

// 拖拽结束事件
ipcMain.on('drag-end', () => {
  console.log('Drag end received, executing snap to edge');
  snapToEdge();
  setTimeout(() => {
    sendPositionUpdate();
  }, 200);
});

// 发送窗口位置更新给悬浮球
function sendPositionUpdate() {
  if (floatingBall && !floatingBall.isDestroyed()) {
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
    const bounds = floatingBall.getBounds();
    
    floatingBall.webContents.send('window-position-update', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      screenWidth: screenWidth
    });
  }
}

// 响应位置请求
ipcMain.on('request-window-position', () => {
  sendPositionUpdate();
});

// 调整悬浮球窗口大小
ipcMain.on('adjust-floating-window-size', (event, { width, height }) => {
  if (floatingBall && !floatingBall.isDestroyed()) {
    const [x, y] = floatingBall.getPosition();
    floatingBall.setBounds({
      x: x,
      y: y,
      width: width,
      height: height
    });
    
    setTimeout(() => {
      snapToEdge();
    }, 100);
  }
});

// 为录音面板调整悬浮球窗口
ipcMain.on('adjust-floating-window-for-recording', (event, { show }) => {
  if (floatingBall && !floatingBall.isDestroyed()) {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const [currentX, currentY] = floatingBall.getPosition();
    
    if (show) {
      const panelWidth = 340;
      const panelHeight = 200;
      
      let newX = currentX;
      let newY = currentY;
      
      if (currentX + panelWidth > screenWidth) {
        newX = screenWidth - panelWidth - 10;
      }
      
      if (currentY + panelHeight > screenHeight) {
        newY = screenHeight - panelHeight - 10;
      }
      
      floatingBall.setBounds({
        x: newX,
        y: newY,
        width: panelWidth,
        height: panelHeight
      });
    } else {
      floatingBall.setBounds({
        x: currentX,
        y: currentY,
        width: 60,
        height: 60
      });
      
      setTimeout(() => {
        snapToEdge();
      }, 100);
    }
  }
});

// 确保透明窗口显示
ipcMain.on('ensure-transparent-window-visible', () => {
  console.log('确保透明窗口显示');
  if (transparentWindow && !transparentWindow.isDestroyed()) {
    transparentWindow.show();
    transparentWindow.focus();
  } else {
    console.log('透明窗口不存在，创建新的透明窗口');
    createTransparentWindow();
  }
});

// 处理悬浮球的录音控制
ipcMain.on('start-recording-from-floating', () => {
  console.log('悬浮球开始录音，同步到所有窗口');
  if (transparentWindow && !transparentWindow.isDestroyed()) {
    transparentWindow.webContents.send('start-recording');
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('floating-start-recording');
  }
});

ipcMain.on('pause-recording-from-floating', () => {
  console.log('悬浮球暂停录音，同步到所有窗口');
  if (transparentWindow && !transparentWindow.isDestroyed()) {
    transparentWindow.webContents.send('pause-recording');
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('floating-pause-recording');
  }
});

ipcMain.on('continue-recording-from-floating', () => {
  console.log('悬浮球继续录音，同步到所有窗口');
  if (transparentWindow && !transparentWindow.isDestroyed()) {
    transparentWindow.webContents.send('continue-recording');
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('floating-continue-recording');
  }
});

ipcMain.on('stop-recording-from-floating', () => {
  console.log('悬浮球停止录音，同步到所有窗口');
  if (transparentWindow && !transparentWindow.isDestroyed()) {
    transparentWindow.webContents.send('stop-recording');
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('floating-stop-recording');
  }
});

// 转发录音状态给悬浮球
ipcMain.on('recording-status-update', (event, status) => {
  console.log('主进程收到录音状态更新:', status);
  if (floatingBall && !floatingBall.isDestroyed()) {
    console.log('转发录音状态到悬浮球');
    floatingBall.webContents.send('recording-status-changed', status);
  } else {
    console.log('悬浮球窗口不存在或已销毁');
  }
});

// 更新透明窗口透明度
ipcMain.on("update-transparent-window-opacity", (event, opacity) => {
  console.log("更新透明窗口透明度:", opacity);
  if (transparentWindow && !transparentWindow.isDestroyed()) {
    // 使用 setOpacity 控制整个窗口的透明度
    // 注意：在 Electron 20+ 中，setOpacity 可能与 transparent: true 产生冲突
    // 如果透明度控制不正常，可以考虑通过 CSS 控制内容透明度而非窗口透明度
    const systemOpacity = opacity / 100;
    transparentWindow.setOpacity(systemOpacity);
    console.log("窗口透明度已设置为:", systemOpacity);
  }
});

// 同步主界面选中的对话到透明窗口
ipcMain.on('sync-active-chat-to-transparent', (event, chatData) => {
  if (transparentWindow && !transparentWindow.isDestroyed()) {
    transparentWindow.webContents.send('active-chat-changed', chatData);
  }
  
  // 同步生成状态到悬浮球
  if (floatingBall && !floatingBall.isDestroyed() && chatData.medicalInfo) {
    floatingBall.webContents.send('generation-status-changed', {
      isGenerating: chatData.medicalInfo.isGenerating
    });
  }
});

// 透明窗口触发生成病历
ipcMain.on('trigger-generate-record', () => {
  console.log('透明窗口触发生成病历');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('trigger-generate-record');
  }
});

// 透明窗口请求当前数据
ipcMain.on('request-current-chat-data', () => {
  console.log('Transparent window requesting current chat data');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('send-current-data-to-transparent');
  }
});

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用即将退出时清理资源
app.on('will-quit', () => {
  const { globalShortcut } = require('electron');
  globalShortcut.unregisterAll();
});

// 初始化退出标志
app.isQuitting = false;

// 处理应用退出前的事件
app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 