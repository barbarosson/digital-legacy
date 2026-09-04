import { app, BrowserWindow, Notification, shell, dialog } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.ELECTRON_DEV) || !app.isPackaged;

let reminderInterval = null;
let lastReminderShownOn = null;

const projectRoot = isDev
  ? path.resolve(__dirname, "..")
  : path.join(process.resourcesPath, "app");

let mainWindow = null;
let serverProcess = null;
let serverPort = null;

function getUserDataDir() {
  return path.join(app.getPath("userData"), "data");
}

function ensureDataDirs() {
  const dataDir = getUserDataDir();
  for (const sub of ["", "backups", "videos"]) {
    fs.mkdirSync(sub ? path.join(dataDir, sub) : dataDir, { recursive: true });
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not allocate a port"));
        return;
      }
      const port = address.port;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
    server.on("error", reject);
  });
}

function buildServerEnv(port) {
  return {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    DIJITAL_MIRAS_ROOT: projectRoot,
    DIJITAL_MIRAS_DATA_DIR: getUserDataDir(),
    ELECTRON_RUN_AS_NODE: "1",
  };
}

function waitForServer(port, timeoutMs = 90_000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error("Server failed to start"));
          return;
        }
        setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}

async function startProductionServer() {
  const port = await getFreePort();
  const serverScript = path.join(projectRoot, "server.js");

  if (!fs.existsSync(serverScript)) {
    throw new Error(
      `Server not found: ${serverScript}. Run "npm run electron:pack" first.`,
    );
  }

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: projectRoot,
    env: buildServerEnv(port),
    stdio: "pipe",
    windowsHide: true,
  });

  serverProcess.stdout?.on("data", (chunk) => {
    process.stdout.write(`[server] ${chunk}`);
  });
  serverProcess.stderr?.on("data", (chunk) => {
    process.stderr.write(`[server] ${chunk}`);
  });
  serverProcess.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`Server exited (code ${code})`);
    }
  });

  await waitForServer(port);
  return port;
}

async function resolvePort() {
  if (isDev) {
    const port = Number(process.env.DIJITAL_MIRAS_PORT ?? 3002);
    await waitForServer(port);
    return port;
  }

  return startProductionServer();
}

function resolveIcon() {
  // Dev: icon is in <repo>/public/  Production: copied into extraResources/app/public/
  const candidates = [
    path.join(projectRoot, "public", "icon-256.png"),
    path.join(__dirname, "..", "public", "icon-256.png"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "Digital Legacy",
    icon: resolveIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    serverProcess = null;
  }
}

function readReminderConfig() {
  try {
    const file = path.join(getUserDataDir(), "reminder.json");
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function startReminderScheduler() {
  if (reminderInterval) return;

  reminderInterval = setInterval(() => {
    const config = readReminderConfig();
    if (!config?.enabled || !Notification.isSupported()) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const current = `${hh}:${mm}`;
    const today = now.toISOString().slice(0, 10);

    if (current === config.time && lastReminderShownOn !== today) {
      lastReminderShownOn = today;
      new Notification({
        title: "Digital Legacy",
        body: config.message || "Don't forget to record today's video.",
      }).show();
    }
  }, 30_000);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    ensureDataDirs();
    try {
      serverPort = await resolvePort();
      createWindow(serverPort);
      startReminderScheduler();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      dialog.showErrorBox(
        "Digital Legacy",
        `The app could not start.\n\n${message}`,
      );
      app.quit();
    }
  });

  app.on("window-all-closed", () => {
    stopServer();
    if (reminderInterval) clearInterval(reminderInterval);
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", stopServer);

  app.on("activate", () => {
    if (mainWindow === null && serverPort) {
      createWindow(serverPort);
    }
  });
}
