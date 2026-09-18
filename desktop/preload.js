const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexustalkDesktop', {
  isDesktop: true,
  version: process.versions.electron,
  onAgentStarted: (cb) => ipcRenderer.on('agent-started', cb),
});
