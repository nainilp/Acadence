const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('acadence', {
  get: () => ipcRenderer.invoke('state:get'),
  action: action => ipcRenderer.invoke('state:action', action),
  onState: callback => { const fn=(_,state)=>callback(state);ipcRenderer.on('state:updated',fn);return ()=>ipcRenderer.removeListener('state:updated',fn); },
  onOcr: callback => { const fn=(_,progress)=>callback(progress);ipcRenderer.on('ocr:progress',fn);return ()=>ipcRenderer.removeListener('ocr:progress',fn); },
  onCue: callback => { const fn=(_,message)=>callback(message);ipcRenderer.on('session:cue',fn);return ()=>ipcRenderer.removeListener('session:cue',fn); },
  ocr: data => ipcRenderer.invoke('ocr:read',data),
  backup: () => ipcRenderer.invoke('backup:export'),
  restore: () => ipcRenderer.invoke('backup:restore'),
  clear: () => ipcRenderer.invoke('data:clear'),
  window: command => ipcRenderer.invoke('window:command',command),
  dataLocation: () => ipcRenderer.invoke('data:location')
});
