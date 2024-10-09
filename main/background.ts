import { app, dialog, ipcMain, shell } from "electron";
import serve from "electron-serve";
import express from "express";
import { createServer } from "http";
import path from "path";
import { createWindow } from "./helpers";

const oauthServer = express();
const AUTH_PORT = 42813;
let mainWindow;
const isProd = process.env.NODE_ENV === "production";

// Đăng ký giao thức deep link cho cả macOS và Windows
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("ahihi", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("ahihi");
}

if (process.platform === "win32") {
  app.setAsDefaultProtocolClient("ahihi");
}

// Xử lý để đảm bảo ứng dụng chỉ có một instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    // Tìm URL deep link trong commandLine trên Windows
    const url = commandLine.find((arg) => arg.startsWith("ahihi://"));

    if (url) {
      const screen = new URL(url).searchParams.get("screen");
      console.log("Deep link URL received on second instance:", url); // Debugging

      if (screen === "next") {
        if (isProd) {
          mainWindow.loadURL("app://./next");
        } else {
          mainWindow.loadURL(`http://localhost:${process.argv[2]}/next`);
        }
      } else {
        dialog.showErrorBox("Error", `URI: ${url}`);
      }
    }
  });

  app.whenReady().then(() => {
    createWindows(); // Gọi hàm tạo cửa sổ tại lúc ứng dụng sẵn sàng
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();

    console.log("Deep link URL received:", url); // Debugging

    // Kiểm tra và khởi tạo lại mainWindow nếu cần thiết
    if (!mainWindow) {
      mainWindow = createWindow("main", {
        width: 1000,
        height: 600,
        webPreferences: {
          preload: path.join(__dirname, "preload.js"),
        },
      });

      mainWindow.once("ready-to-show", () => {
        mainWindow.show();
      });
    }

    // Điều hướng dựa trên URL nhận được
    const screen = new URL(url).searchParams.get("screen");
    if (screen === "next") {
      if (isProd) {
        mainWindow.loadURL("app://./next");
      } else {
        mainWindow.loadURL(`http://localhost:${process.argv[2]}/next`);
      }
    } else {
      dialog.showErrorBox("Successfully", `URI: ${url}`);
    }
  });
}

// Serve app trong môi trường production và development
if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

// OAuth server cho authentication
oauthServer.get("/", async (req, res) => {
  try {
    const deepLinkUrl = `ahihi://?screen=next`;

    res.send(`
        <html>
          <head>
            <style>
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
                background-color: #f0f0f0;
              }
              .message {
                text-align: center;
                font-size: 24px;
                color: #333;
              }
            </style>
          </head>
          <body>
            <div class="message">
              Xác thực thành công! Đang quay lại ứng dụng...
            </div>
            <script>
              window.location.href = '${deepLinkUrl}';
            </script>
          </body>
        </html>
      `);
  } catch (error) {
    console.error("OAuth error:", error.message);
    res.send("Authentication failed.");
  }
});

// Tạo OAuth server
const server = createServer(oauthServer);
server.listen(AUTH_PORT, () => {
  console.log(`OAuth server is running on http://localhost:${AUTH_PORT}`);
});

// Hàm tạo cửa sổ mainWindow
async function createWindows() {
  mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isProd) {
    await mainWindow.loadURL("app://./home");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }
}

// Xử lý khi tất cả cửa sổ bị đóng
app.on("window-all-closed", () => {
  app.quit();
});

// IPC handlers
ipcMain.on("shell:huhu", () => {
  const pagePath = "http://localhost:42813/";
  shell.openExternal(pagePath);
});

ipcMain.on("message", async (event, arg) => {
  event.reply("message", `${arg} World!`);
});
