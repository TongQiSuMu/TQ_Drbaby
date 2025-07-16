function WebSocketConnectMethod(config) {
  //定义socket连接方法类

  var speechSokt;
  var connKeeperID;

  var msgHandle = config.msgHandle;
  var stateHandle = config.stateHandle;
  var errorHandle = config.errorHandle; // 添加错误处理回调

  // 添加配置参数
  var configParams = config.configParams || {};

  this.wsStart = function (wssUrl) {
    var Uri = wssUrl || configParams.wssUrl || "wss://172.16.6.11:10096"; //"wss://111.205.137.58:5821/wss/" //设置wss asr online接口地址 如 wss://X.X.X.X:port/wss/
    if (Uri.match(/wss:\S*|ws:\S*/)) {
      console.log("Uri" + Uri);
    } else {
      console.error("请检查wss地址正确性");
      return 0;
    }

    if ("WebSocket" in window) {
      speechSokt = new WebSocket(Uri); // 定义socket连接对象
      speechSokt.onopen = function (e) {
        onOpen(e);
      }; // 定义响应函数
      speechSokt.onclose = function (e) {
        console.log("onclose ws!");
        //speechSokt.close();
        onClose(e);
      };
      speechSokt.onmessage = function (e) {
        onMessage(e);
      };
      speechSokt.onerror = function (e) {
        onError(e);
      };
      return 1;
    } else {
      alert("当前浏览器不支持 WebSocket");
      return 0;
    }
  };

  // 定义停止与发送函数
  this.wsStop = function () {
    if (speechSokt != undefined) {
      console.log("stop ws!");
      speechSokt.close();
    }
  };

  this.wsSend = function (oneData) {
    if (speechSokt == undefined) return;
    if (speechSokt.readyState === 1) {
      // 0:CONNECTING, 1:OPEN, 2:CLOSING, 3:CLOSED

      speechSokt.send(oneData);
    }
  };

  // SOCEKT连接中的消息与状态响应
  function onOpen(e) {
    // 发送json
    var chunk_size = new Array(5, 10, 5);
    var request = {
      chunk_size: chunk_size,
      wav_name: "h5",
      is_speaking: true,
      chunk_interval: 10,
      itn: configParams.getUseITN ? configParams.getUseITN() : true,
      mode: configParams.getAsrMode ? configParams.getAsrMode() : "2pass",
    };

    // 检查是否为文件模式
    if (configParams.isFileMode) {
      request.wav_format = configParams.fileExt || "wav";
      if (configParams.fileExt == "wav") {
        request.wav_format = "PCM";
        request.audio_fs = configParams.fileSampleRate || 16000;
      }
    }

    // 获取热词
    var hotwords = configParams.getHotwords ? configParams.getHotwords() : null;

    if (hotwords != null) {
      request.hotwords = hotwords;
    }
    console.log(JSON.stringify(request));
    speechSokt.send(JSON.stringify(request));
    console.log("连接成功");
    stateHandle(0);
  }

  function onClose(e) {
    stateHandle(1);
  }

  function onMessage(e) {
    msgHandle(e);
  }

  function onError(e) {
    // 使用错误处理回调而不是直接操作DOM
    if (errorHandle) {
      errorHandle("连接错误: " + e);
    } else {
      console.log("连接错误:", e);
    }
    stateHandle(2);
  }
}
