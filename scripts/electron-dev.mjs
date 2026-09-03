import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.DIJITAL_MIRAS_PORT ?? 3002);

function waitForPort(targetPort, timeoutMs = 120_000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(targetPort, "127.0.0.1");
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Port ${targetPort} is not ready`));
          return;
        }
        setTimeout(attempt, 400);
      });
    };
    attempt();
  });
}

function killTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      shell: true,
      stdio: "ignore",
    });
    return;
  }
  child.kill("SIGTERM");
}

const next = spawn("npm", ["run", "dev"], {
  cwd: root,
  shell: true,
  stdio: "inherit",
  env: {
    ...process.env,
    DIJITAL_MIRAS_DATA_DIR: path.join(root, "data"),
  },
});

let electron = null;

next.on("exit", (code) => {
  if (electron) killTree(electron);
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  killTree(electron);
  killTree(next);
  process.exit(0);
});

try {
  await waitForPort(port);
} catch (error) {
  console.error(error);
  killTree(next);
  process.exit(1);
}

electron = spawn("npx", ["electron", "."], {
  cwd: root,
  shell: true,
  stdio: "inherit",
  env: {
    ...process.env,
    ELECTRON_DEV: "1",
    DIJITAL_MIRAS_PORT: String(port),
    DIJITAL_MIRAS_DATA_DIR: path.join(root, "data"),
  },
});

electron.on("exit", () => {
  killTree(next);
  process.exit(0);
});
