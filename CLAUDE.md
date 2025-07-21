# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

同启医语宝 (TQ Medical Voice Assistant) is a Chinese medical voice assistant desktop application built with Electron and Vue.js. It provides real-time speech recognition and AI-powered medical documentation capabilities for healthcare providers.

## Development Commands

### Running the Application
```bash
# Development mode (Vue dev server + Electron)
npm run dev

# Vue dev server only
npm run serve

# Electron app only
npm run electron
```

### Building the Application
```bash
# Windows
npm run build:win
npm run build:win:portable  # Portable .exe

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## Architecture Overview

### Multi-Process Architecture
- **Main Process** (`src/main/index.js`): Manages Electron windows, IPC communication, and system integration
- **Renderer Process** (`src/renderer/`): Vue.js application with three separate windows:
  - Main Window: Primary application interface with login and chat
  - Floating Ball: Always-on-top mini interface
  - Transparent Window: Semi-transparent overlay with edge-hiding

### Key Technical Components

1. **Speech Recognition System**
   - WebSocket connection to `wss://172.16.6.11:10096`
   - Real-time PCM/WAV audio streaming
   - Audio recording via Web Audio API in `public/assets/js/`

2. **API Architecture**
   - Main API: `http://192.168.8.16:8089`
   - Secondary service: `http://192.168.8.37:8012`
   - Axios interceptors in `src/renderer/utils/request.js`

3. **Window Management**
   - IPC channels for inter-process communication
   - System tray integration
   - Global keyboard shortcuts
   - Window state persistence

### Multi-Page Configuration
The application uses Vue CLI's multi-page setup defined in `vue.config.js`:
- `index`: Main application window
- `floatingBall`: Floating assistant ball
- `transparent`: Transparent overlay window

Each page has its own entry point and HTML template in the `public/` directory.

## Important Development Notes

1. **Environment Configuration**: Copy `env.example` to `.env` and configure API endpoints
2. **Security**: Node integration is enabled and web security is disabled in development - be cautious with external content
3. **Audio Processing**: Custom audio recording libraries are in `public/assets/js/`
4. **Window Communication**: Use IPC channels defined in `src/main/index.js` for main-renderer communication
5. **Build Output**: Production builds are output to the `release/` directory

## Code Structure Patterns

- Vue components follow standard Vue 2.7 patterns with Element UI
- API calls are centralized in `src/renderer/utils/`
- Window-specific logic is separated by page entry points
- Electron main process handles all system-level operations