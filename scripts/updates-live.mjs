// Uses real GitHub metadata and download verification; installer launch is intercepted.
import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';

const root=process.cwd(),dataPath=path.join(root,'.test-data',`updates-live-${Date.now()}`);
await mkdir('test-results',{recursive:true});
const app=await electron.launch({executablePath:process.env.ACADENCE_EXECUTABLE||path.join(root,'release/win-unpacked/Acadence.exe'),args:[],cwd:root,env:{...process.env,ACADENCE_DATA_DIR:dataPath}});
try{
  await app.firstWindow();let page;
  for(let i=0;i<100;i++){page=app.windows().find(w=>w.url().includes('index.html')&&!w.url().includes('pet=1'));if(page)break;await new Promise(resolve=>setTimeout(resolve,100));}
  await page.waitForSelector('.app-shell');
  await app.evaluate(({app,dialog})=>{
    const appRequire=process.getBuiltinModule('node:module').createRequire(app.getAppPath()+'/package.json');
    const updater=appRequire('electron-updater').autoUpdater;
    // A disposable cache keeps downloaded test installers separate from users' update caches.
    Object.defineProperty(updater.app,'baseCachePath',{get:()=>app.getPath('userData')+'/update-cache'});
    updater.disableDifferentialDownload=true;
    global.__liveUpdate={response:1,dialogs:[],installs:0};
    dialog.showMessageBox=async(_parent,options)=>{global.__liveUpdate.dialogs.push(options||_parent);return {response:global.__liveUpdate.response};};
    updater.quitAndInstall=()=>{global.__liveUpdate.installs++;};
  });
  const initial=await page.evaluate(()=>window.acadence.checkUpdates());
  assert.equal(initial.status,'current',JSON.stringify(initial));
  console.log('Real GitHub check: current version confirmed.');
  await app.evaluate(({app})=>{
    const appRequire=process.getBuiltinModule('node:module').createRequire(app.getAppPath()+'/package.json');
    const updater=appRequire('electron-updater').autoUpdater;
    // Simulate an older client, leaving the packaged build and remote release intact.
    updater.currentVersion=new (appRequire('semver').SemVer)('1.1.1');
  });
  const available=await page.evaluate(()=>window.acadence.checkUpdates());
  assert.equal(available.status,'available',JSON.stringify(available));
  const declined=await app.evaluate(()=>global.__liveUpdate);
  assert.equal(declined.installs,0);assert.deepEqual(declined.dialogs.at(-1).buttons,['Update now','Not now']);
  console.log(`Real GitHub release detected: ${available.version}; Not now did not install.`);
  await app.evaluate(()=>{global.__liveUpdate.response=0;});
  // Request through IPC without holding the test command open during a large download.
  await page.evaluate(()=>{window.__liveCheck=window.acadence.checkUpdates();});
  await page.waitForFunction(()=>window.acadence.updateStatus().then(value=>['installing','error'].includes(value.status)),{},{timeout:180000});
  const installed=await page.evaluate(()=>window.__liveCheck);
  assert.equal(installed.status,'installing',JSON.stringify(installed));
  const calls=await app.evaluate(()=>global.__liveUpdate);assert.equal(calls.installs,1);
  await writeFile('test-results/updates-live-report.json',JSON.stringify({passed:true,currentVersionCheck:true,newerRelease:available.version,decline:true,realDownloadVerified:true,installerLaunchIntercepted:true},null,2));
  console.log('Real GitHub download and checksum verification passed; installer launch intercepted.');
}finally{await app.close();}
