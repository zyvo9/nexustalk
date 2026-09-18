/**
 * NexusTalk Desktop — Electron shell
 * - Loads the NexusTalk UI (local dev server or a configured URL)
 * - Tray icon with quick actions
 * - Can auto-start the remote-control agent (python agent.py) on launch
 */
const { app, BrowserWindow, Tray, Menu, shell, nativeImage, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Where to load the UI from: override with desktop_config.json { "url": "..." }
let UI_URL = 'http://localhost:3000';
const cfgPath = path.join(__dirname, 'desktop_config.json');
if (fs.existsSync(cfgPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (cfg.url) UI_URL = cfg.url;
  } catch { /* ignore bad config */ }
}

let win = null;
let tray = null;
let agentProc = null;
let quitting = false;

function startAgent() {
  if (agentProc) return;
  const agentDir = path.join(__dirname, '..', 'agent');
  const script = path.join(agentDir, 'agent.py');
  if (!fs.existsSync(script)) {
    dialog.showMessageBox(win, { type: 'info', message: 'Agent folder pai nai (agent/agent.py). Ei PC te remote host service cholbe na.' });
    return;
  }
  agentProc = spawn('python', ['-u', 'agent.py'], { cwd: agentDir, windowsHide: true });
  agentProc.on('exit', () => { agentProc = null; });
  agentProc.on('error', () => { agentProc = null; });
}

function stopAgent() {
  if (agentProc) {
    try { agentProc.kill(); } catch { /* ignore */ }
    agentProc = null;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 420,
    minHeight: 560,
    backgroundColor: '#070b15',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Allow mic/camera/screen-share prompts inside the app window
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadURL(UI_URL);

  // Open external links in the default browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('close', (e) => {
    // Minimize to tray instead of quitting (WhatsApp-style)
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

function createTray() {
  // 16x16 transparent fallback if no icon file exists
  const iconPath = path.join(__dirname, 'icon.png');
  const img = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();
  tray = new Tray(img);
  tray.setToolTip('NexusTalk');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'NexusTalk khulo', click: () => { if (win) { win.show(); win.focus(); } } },
    { type: 'separator' },
    { label: 'Agent chalu korun (host service)', click: () => { startAgent(); if (win) win.webContents.send('agent-started'); } },
    { label: 'Agent bondho korun', click: () => stopAgent() },
    { type: 'separator' },
    { label: 'Ber hon', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('double-click', () => { if (win) { win.show(); win.focus(); } });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  // Auto-start the agent with the app (CRD-style host service)
  startAgent();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (win) win.show();
  });
});

app.on('before-quit', () => {
  quitting = true;
  stopAgent();
});

app.on('window-all-closed', () => {
  // Keep running in tray (WhatsApp-style). Quit only from tray menu.
});
