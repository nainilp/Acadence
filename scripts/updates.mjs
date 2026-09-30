import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dateKey,addDays} from '../shared/planner.mjs';

const root=process.cwd(),dataPath=path.join(root,'.test-data',`updates-${Date.now()}`);
const {version}=JSON.parse(await readFile('package.json','utf8'));
await mkdir('test-results',{recursive:true});
const app=await electron.launch({executablePath:process.env.ACADENCE_EXECUTABLE||path.join(root,'release/win-unpacked/Acadence.exe'),args:[],cwd:root,env:{...process.env,ACADENCE_DATA_DIR:dataPath}});
const errors=[];
app.on('window',page=>page.on('pageerror',error=>errors.push(error.message)));
try{
  await app.firstWindow();let page;
  for(let i=0;i<100;i++){page=app.windows().find(w=>w.url().includes('index.html')&&!w.url().includes('pet=1'));if(page)break;await new Promise(resolve=>setTimeout(resolve,100));}
  await page.waitForSelector('.app-shell');
  assert.equal(await app.evaluate(({app})=>app.getVersion()),version);
  // Intercept the network, native dialog, and installer launch, leaving real IPC and persistence intact.
  await app.evaluate(({app,dialog})=>{
    const appRequire=process.getBuiltinModule('node:module').createRequire(app.getAppPath()+'/package.json');
    const updater=appRequire('electron-updater').autoUpdater;
    global.__updateTest={checks:0,downloads:0,installs:0,dialogs:[],response:1,originalCheck:updater.checkForUpdates.bind(updater)};
    dialog.showMessageBox=async(_parent,options)=>{global.__updateTest.dialogs.push(options||_parent);return {response:global.__updateTest.response};};
    updater.checkForUpdates=async()=>{global.__updateTest.checks++;updater.emit('checking-for-update');updater.emit('update-available',{version:'9.9.9'});return {};};
    updater.downloadUpdate=async()=>{global.__updateTest.downloads++;updater.emit('download-progress',{percent:50});await new Promise(resolve=>{global.__updateTest.finishDownload=resolve;});updater.emit('update-downloaded',{version:'9.9.9'});return ['test-only-installer.exe'];};
    updater.quitAndInstall=(silent,restart)=>{global.__updateTest.installs++;global.__updateTest.installArgs=[silent,restart];};
  });
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'Check for updates',exact:true}).click();
  await page.getByText('Acadence 9.9.9 is available.',{exact:true}).waitFor();
  let calls=await app.evaluate(()=>global.__updateTest);
  assert.deepEqual(calls.dialogs[0].buttons,['Update now','Not now']);assert.equal(calls.downloads,0);assert.equal(calls.installs,0);
  await page.screenshot({path:'test-results/16-app-updates.png',fullPage:true});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('pet=1')).setSize(900,680));
  await page.screenshot({path:'test-results/17-app-updates-900.png',fullPage:true});
  assert.equal(await page.getByRole('button',{name:'Check for updates',exact:true}).isEnabled(),true);
  await page.evaluate(async deadline=>{
    const api=window.acadence;await api.action({type:'subject',name:'Biology'});const state=await api.get();await api.action({type:'settings',values:{days:state.settings.days.map(day=>({...day,slots:[[0,1440]],budget:180,breakCount:0}))}});
    let next=await api.action({type:'goal',subjectId:state.subjects[0].id,title:'Update persistence test',totalSlides:120,startSlide:1,deadline,effort:'normal'});
    await api.action({type:'start',id:next.sessions.find(session=>session.type==='study'&&session.status==='planned').id});
  },addDays(dateKey(),7));
  await app.evaluate(()=>{global.__updateTest.response=0;});
  await page.getByRole('button',{name:'Check for updates',exact:true}).click();
  await page.getByRole('progressbar',{name:'Update download progress'}).waitFor();
  assert.equal(await page.getByRole('progressbar',{name:'Update download progress'}).getAttribute('value'),'50');
  assert.equal(await page.getByRole('button',{name:'Please wait…',exact:true}).isDisabled(),true);
  await app.evaluate(()=>global.__updateTest.finishDownload());
  await page.getByText('Saving your study data and restarting…',{exact:true}).waitFor();
  await page.waitForFunction(async()=>{const state=await window.acadence.get();return state.active?.runningSince===null;});
  calls=await app.evaluate(()=>global.__updateTest);assert.equal(calls.downloads,1);assert.equal(calls.installs,1);assert.deepEqual(calls.installArgs,[true,true]);
  const saved=JSON.parse(await readFile(path.join(dataPath,'study-data.json'),'utf8'));
  assert.equal(saved.goals[0].title,'Update persistence test');assert.equal(saved.active.runningSince,null);assert.ok(saved.active.elapsedMs>=0);assert.match(saved.active.pauseReason,/updated/);
  assert.equal(errors.length,0,errors.join('\n'));
  await writeFile('test-results/updates-report.json',JSON.stringify({passed:true,version,consent:true,declineDoesNotDownload:true,progress:true,savedBeforeInstall:true,timerPaused:true,rendererErrors:errors},null,2));
  console.log('Packaged update controls passed: consent, decline, download progress, saved data, paused timer, installer handoff. Installer launch was intercepted.');
}finally{await app.close();}
