const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('desktop',{call:(method,args)=>ipcRenderer.invoke('album',method,args)});
