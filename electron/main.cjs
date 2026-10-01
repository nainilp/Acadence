const {app,BrowserWindow,ipcMain,Tray,Menu,nativeImage,dialog,powerMonitor,screen,Notification,session}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {spawn}=require('node:child_process');
const testData=process.env.ACADENCE_DATA_DIR;
if(testData)app.setPath('userData',path.resolve(testData));
let state,core,actions,goals,mainWindow,petWindow,tray,updates,installingUpdate=false,quitting=false,fullHelper,fullScreen=false,queue=Promise.resolve(),lastPulse=Date.now(),lastCue='',lastCheckpoint=Date.now();
const dataFile=()=>path.join(app.getPath('userData'),'study-data.json');
const iconFile=path.join(__dirname,'../assets/icon.png');
const appUrl=pathToFileURL(path.join(__dirname,'../dist/index.html')).href;
function emit(channel,value){for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send(channel,value);}
async function persist(){const filename=dataFile();await fs.mkdir(path.dirname(filename),{recursive:true});const tmp=filename+'.tmp';await fs.writeFile(tmp,JSON.stringify(state,null,2),'utf8');await fs.rename(tmp,filename);}
function enqueue(fn){const result=queue.then(fn);queue=result.catch(()=>{});return result;}
function syncWindows(){if(petWindow){petWindow.setAlwaysOnTop(!!state.settings.alwaysOnTop,'screen-saver');if(state.settings.petVisible&&!(fullScreen&&state.settings.hideFullscreen))petWindow.showInactive();else petWindow.hide();}}
async function perform(action,now=Date.now()){if(installingUpdate)throw Error('Acadence is saving your study data for the update. Please wait.');return enqueue(async()=>{const next=actions.applyAction(state,action,now);const previous=state;state=next;try{await persist();}catch(e){state=previous;throw e;}if(action.type==='settings'){if(!testData)app.setLoginItemSettings({openAtLogin:!!state.settings.startup});syncWindows();}emit('state:updated',state);return state;});}
function setupUpdates(){
  if(!app.isPackaged||process.platform!=='win32')return;
  const {autoUpdater}=require('electron-updater');
  updates=require('./updates.cjs').createUpdateManager({
    updater:autoUpdater,currentVersion:app.getVersion(),
    onState:value=>emit('updates:state',value),
    canPrompt:()=>!quitting&&!installingUpdate&&!state.active&&!fullScreen,
    showDialog:options=>{if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.show();mainWindow.focus();return dialog.showMessageBox(mainWindow,options);}return dialog.showMessageBox(options);},
    prepareInstall:async()=>{
      installingUpdate=true;
      try{await enqueue(async()=>{if(state.active){state.active.elapsedMs=core.elapsed(state);state.active.runningSince=null;state.active.pauseReason='App updated — resume when ready';}await persist();emit('state:updated',state);});}
      catch(error){installingUpdate=false;throw error;}
    },
    onInstallFailure:()=>{installingUpdate=false;}
  });
}
function secure(w){w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith(appUrl))e.preventDefault();});}
function createWindows(){
  const common={preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true};
  mainWindow=new BrowserWindow({width:1320,height:900,minWidth:900,minHeight:680,title:'Acadence',backgroundColor:'#eeebed',icon:iconFile,show:false,webPreferences:common});
  mainWindow.setMenuBarVisibility(false);secure(mainWindow);mainWindow.loadURL(appUrl);
  mainWindow.once('ready-to-show',()=>mainWindow.show());
  mainWindow.on('close',event=>{if(!quitting&&tray){event.preventDefault();mainWindow.hide();}});
  const area=screen.getPrimaryDisplay().workArea;
  petWindow=new BrowserWindow({width:300,height:470,x:area.x+area.width-320,y:area.y+area.height-490,transparent:true,backgroundColor:'#00000000',frame:false,resizable:false,skipTaskbar:true,alwaysOnTop:state.settings.alwaysOnTop,show:false,hasShadow:false,webPreferences:common});
  secure(petWindow);petWindow.loadURL(appUrl+'?pet=1');petWindow.once('ready-to-show',syncWindows);
  petWindow.on('close',event=>{if(!quitting){event.preventDefault();perform({type:'settings',values:{petVisible:false}}).catch(console.error);}});
  tray=new Tray(nativeImage.createFromPath(iconFile));tray.setToolTip('Acadence • your study companion');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Open Acadence',click:()=>{mainWindow.show();mainWindow.focus();}},{label:'Show / hide companion',click:()=>perform({type:'settings',values:{petVisible:!state.settings.petVisible}}).catch(console.error)},{type:'separator'},{label:'Quit Acadence',click:()=>app.quit()}]));
  tray.on('double-click',()=>{mainWindow.show();mainWindow.focus();});
}
function trusted(event){if(![mainWindow?.webContents.id,petWindow?.webContents.id].includes(event.sender.id))throw Error('Untrusted window.');}
function handle(channel,fn){ipcMain.handle(channel,async(event,...args)=>{trusted(event);return fn(event,...args);});}
function notify(title,body){emit('session:cue',body);if(Notification.isSupported()&&!fullScreen)new Notification({title,body,icon:iconFile,silent:!state.settings.sound}).show();}
function registerIpc(){
  handle('state:get',()=>state);
  handle('state:action',(_,action)=>{if(!action||typeof action.type!=='string'||action.type==='reset')throw Error('Invalid action.');return perform(action);});
  handle('data:location',()=>app.getPath('userData'));
  handle('updates:get',()=>updates?.get()||{status:'unsupported',message:'Updates are available in the installed Windows app.'});
  handle('updates:check',()=>updates?.check(true)||{status:'unsupported',message:'Updates are available in the installed Windows app.'});
  handle('window:command',(event,command)=>{if(command==='open'){mainWindow.show();mainWindow.focus();}else if(command==='hide-pet')return perform({type:'settings',values:{petVisible:false}});else if(command==='pointer-on'&&event.sender.id===petWindow.webContents.id)petWindow.setIgnoreMouseEvents(false);else if(command==='pointer-off'&&event.sender.id===petWindow.webContents.id)petWindow.setIgnoreMouseEvents(true,{forward:true});else if(command==='quit')app.quit();});
  handle('ocr:read',async(_,data)=>{if(typeof data!=='string'||data.length>30*1024*1024||!/^data:image\/(png|jpeg|webp|bmp);base64,/.test(data))throw Error('Choose a PNG, JPEG, WebP, or BMP image under 20 MB.');const buffer=Buffer.from(data.split(',')[1],'base64');return require('./ocr.cjs').read(buffer,progress=>emit('ocr:progress',{status:progress.status,progress:progress.progress}));});
  handle('backup:export',async()=>{const result=await dialog.showSaveDialog(mainWindow,{title:'Export Acadence backup',defaultPath:`Acadence-backup-${core.dateKey()}.json`,filters:[{name:'Acadence backup',extensions:['json']}]});if(result.canceled)return false;await fs.writeFile(result.filePath,JSON.stringify(state,null,2),'utf8');return true;});
  handle('backup:restore',async()=>{const result=await dialog.showOpenDialog(mainWindow,{title:'Restore Acadence backup',properties:['openFile'],filters:[{name:'Acadence backup',extensions:['json']}]});if(result.canceled)return false;const stats=await fs.stat(result.filePaths[0]);if(stats.size>20*1024*1024)throw Error('Backup is too large.');const next=core.validateState(JSON.parse(await fs.readFile(result.filePaths[0],'utf8')));const confirm=await dialog.showMessageBox(mainWindow,{type:'question',buttons:['Cancel','Restore backup'],defaultId:0,cancelId:0,message:'Replace your current study data?',detail:'This replaces subjects, sessions, history, and settings with the selected backup.'});if(confirm.response!==1)return false;return enqueue(async()=>{if(next.active){next.active.runningSince=null;next.active.pauseReason='Restored from backup';}state=next;core.reconcile(state);await persist();syncWindows();emit('state:updated',state);return true;});});
  handle('data:clear',async()=>{const result=await dialog.showMessageBox(mainWindow,{type:'warning',buttons:['Cancel','Clear all data'],defaultId:0,cancelId:0,message:'Clear all Acadence data?',detail:'This permanently removes your subjects, timetable, study history, streaks, and settings. Export a backup first if you want to keep them. Backups you saved elsewhere are not removed.'});if(result.response!==1)return false;await perform({type:'reset'});await fs.rm(path.join(app.getPath('userData'),'study-data-recovery.json'),{force:true});if(!testData)app.setLoginItemSettings({openAtLogin:false});syncWindows();return true;});
}
async function pulse(){
  if(installingUpdate)return;
  const now=Date.now(),gap=now-lastPulse;lastPulse=now;
  if(state.active?.runningSince&&gap>15000){await perform({type:'pause',reason:'Your laptop was asleep or the app was interrupted'},now-gap);notify('Welcome back','Your timer is paused. Resume when you are ready.');}
  if(state.sessions.some(s=>core.isOverdue(s,now,state)))await perform({type:'tick'});
  const active=state.active;
  if(active&&core.elapsed(state,now)>=active.targetMs){const key=active.sessionId+'end';if(lastCue!==key){lastCue=key;await perform({type:'pause',reason:'Session time is complete'});const s=state.sessions.find(s=>s.id===active.sessionId);notify('Time to check in',s?.goalId?'Did you finish this slide block? Record your progress so I can adjust your plan.':'Did you finish your topic? Choose Finished or Need more time.');}}
  else if(!active){const s=state.sessions.find(s=>s.status==='planned'&&s.date===core.dateKey(now)&&core.at(s.date,s.start)<=now&&core.at(s.date,s.end)>now);if(s&&lastCue!==s.id){lastCue=s.id;notify(s.type==='break'?'Take a breather':'Your next study session is ready',s.type==='break'?'Step away for a moment. Your plan will be here.':goals.sessionTitle(state,s));}}
  if(active?.runningSince&&now-lastCheckpoint>30000){lastCheckpoint=now;await enqueue(async()=>{state.active.elapsedMs=core.elapsed(state,now);state.active.runningSince=now;await persist();});}
}
async function boot(){
  if(process.platform==='win32')app.setAppUserModelId('com.acadence.study');
  core=await import('../shared/planner.mjs');actions=await import('../shared/actions.mjs');goals=await import('../shared/goals.mjs');
  try{state=core.validateState(JSON.parse(await fs.readFile(dataFile(),'utf8')));}catch(e){state=core.freshState();if(e.code!=='ENOENT'){await dialog.showMessageBox({type:'warning',message:'Acadence could not read the saved data.',detail:'The original file will be preserved as study-data-recovery.json. You can restore a backup in Settings.'});await fs.copyFile(dataFile(),path.join(app.getPath('userData'),'study-data-recovery.json')).catch(()=>{});}}
  if(state.active){state.active.runningSince=null;state.active.pauseReason='App restarted — resume when ready';}core.reconcile(state);await persist();
  // Study renderers stay offline. The main-process updater uses its own network session.
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_,callback)=>callback({cancel:true}));
  session.defaultSession.setPermissionRequestHandler((_,__,callback)=>callback(false));
  setupUpdates();registerIpc();createWindows();
  if(updates&&!testData){
    setTimeout(()=>updates.check().catch(console.error),10000).unref();
    setInterval(()=>updates.check().catch(console.error),6*60*60*1000).unref();
    setInterval(()=>updates.promptPending().catch(console.error),30000).unref();
  }
  powerMonitor.on('suspend',()=>{if(state.active)perform({type:'pause',reason:'Laptop asleep'}).catch(console.error);});
  powerMonitor.on('lock-screen',()=>{if(state.active)perform({type:'pause',reason:'Screen locked'}).catch(console.error);});
  setInterval(()=>pulse().catch(console.error),1000);
  if(process.platform==='win32'&&(!testData||process.env.ACADENCE_TEST_FULLSCREEN==='1')){const helperPath=path.join(__dirname,'fullscreen.ps1').replace(/app\.asar([\\/])/,'app.asar.unpacked$1');fullHelper=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',helperPath],{windowsHide:true,stdio:['ignore','pipe','ignore']});fullHelper.stdout.on('data',data=>{fullScreen=data.toString().trim().endsWith('True');syncWindows();});fullHelper.on('error',()=>{});}
}
if(!app.requestSingleInstanceLock())app.quit();else {app.on('second-instance',()=>{mainWindow?.show();mainWindow?.focus();});app.whenReady().then(boot).catch(e=>{dialog.showErrorBox('Acadence could not start',e.message);app.exit(1);});}
app.on('before-quit',event=>{if(quitting)return;quitting=true;fullHelper?.kill();if(state?.active&&core){event.preventDefault();enqueue(async()=>{state.active.elapsedMs=core.elapsed(state);state.active.runningSince=null;await persist();}).finally(()=>app.quit());}});
app.on('window-all-closed',()=>{if(quitting)app.quit();});
