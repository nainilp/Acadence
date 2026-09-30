import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const {createUpdateManager}=createRequire(import.meta.url)('../electron/updates.cjs');

function fixture({response=1,available=true,canPrompt=()=>true,prepareInstall=async()=>{}}={}){
  const updater=new EventEmitter(),calls={check:0,download:0,install:0,saved:0,dialogs:[],states:[]};
  updater.checkForUpdates=async()=>{calls.check++;updater.emit('checking-for-update');updater.emit(available?'update-available':'update-not-available',{version:'1.1.4'});return {};};
  updater.downloadUpdate=async()=>{calls.download++;updater.emit('download-progress',{percent:42.7});updater.emit('update-downloaded',{version:'1.1.4'});return ['installer.exe'];};
  updater.quitAndInstall=(silent,restart)=>{assert.equal(calls.saved,1,'Study data is saved before installation');assert.deepEqual([silent,restart],[true,true]);calls.install++;};
  const manager=createUpdateManager({updater,currentVersion:'1.1.3',canPrompt,showDialog:async options=>{calls.dialogs.push(options);return {response};},prepareInstall:async()=>{calls.saved++;await prepareInstall();},onState:s=>calls.states.push(s)});
  return {manager,updater,calls};
}

test('updater downloads and installs only after explicit consent, without prereleases or downgrades',async()=>{
  const {manager,updater,calls}=fixture();
  assert.equal(updater.autoDownload,false);assert.equal(updater.autoInstallOnAppQuit,false);assert.equal(updater.allowPrerelease,false);assert.equal(updater.allowDowngrade,false);
  await manager.check();assert.deepEqual(calls.dialogs[0].buttons,['Update now','Not now']);assert.equal(calls.dialogs[0].defaultId,1);assert.equal(calls.dialogs[0].cancelId,1);assert.equal(calls.download,0);assert.equal(calls.install,0);assert.equal(manager.get().status,'available');
});
test('Not now suppresses repeated automatic prompts for that version during this launch',async()=>{
  const {manager,calls}=fixture();await manager.check();await manager.check();await manager.promptPending();assert.equal(calls.dialogs.length,1);assert.equal(calls.download,0);
  await manager.check(true);assert.equal(calls.dialogs.length,2,'A manual check can ask again');
});
test('Update now downloads, reports progress, saves, then restarts into the installer',async()=>{
  const {manager,calls}=fixture({response:0});await manager.check();assert.equal(calls.download,1);assert.equal(calls.install,1);assert.equal(calls.saved,1);assert.ok(calls.states.some(s=>s.status==='downloading'&&s.percent===43));assert.equal(manager.get().status,'installing');
});
test('automatic prompts wait for study or fullscreen to end',async()=>{
  let idle=false;const {manager,calls}=fixture({canPrompt:()=>idle});await manager.check();assert.equal(calls.dialogs.length,0);idle=true;await manager.promptPending();assert.equal(calls.dialogs.length,1);
});
test('a manual check can prompt during a session and saves the session before updating',async()=>{
  const {manager,calls}=fixture({response:0,canPrompt:()=>false});await manager.check(true);assert.equal(calls.install,1);assert.equal(calls.saved,1);
});
test('concurrent checks and repeated clicks do not duplicate prompts or downloads',async()=>{
  const {manager,calls}=fixture({response:0});await Promise.all([manager.check(true),manager.check(true),manager.check(true)]);assert.equal(calls.check,1);assert.equal(calls.dialogs.length,1);assert.equal(calls.download,1);assert.equal(calls.install,1);
});
test('an up-to-date check reports status without interrupting the user',async()=>{
  const {manager,calls}=fixture({available:false});await manager.check(true);assert.equal(manager.get().status,'current');assert.equal(calls.dialogs.length,0);assert.equal(calls.download,0);
});
test('offline automatic checks fail quietly; manual failures explain how to retry',async()=>{
  const {manager,updater,calls}=fixture();updater.checkForUpdates=async()=>{updater.emit('error',Error('offline'));throw Error('offline');};await manager.check();assert.equal(manager.get().status,'error');assert.equal(calls.dialogs.length,0);await manager.check(true);assert.equal(calls.dialogs.length,1);assert.equal(calls.dialogs[0].type,'error');assert.equal(calls.install,0);
});
test('failed or unverified downloads never start the installer',async()=>{
  for(const reject of [false,true]){const {manager,updater,calls}=fixture({response:0});updater.downloadUpdate=async()=>{if(reject)throw Error('checksum mismatch');return [];};await manager.check(true);assert.equal(calls.install,0);assert.equal(calls.saved,0);assert.equal(manager.get().status,'error');assert.equal(calls.dialogs.at(-1).type,'error');}
});
test('a failed data save leaves the app open and never installs',async()=>{
  const {manager,calls}=fixture({response:0,prepareInstall:async()=>{throw Error('disk full');}});await manager.check(true);assert.equal(calls.install,0);assert.equal(manager.get().status,'error');assert.equal(calls.dialogs.at(-1).type,'error');
});
test('installer failures reset status so the app remains usable',async()=>{
  const {manager,updater,calls}=fixture({response:0});updater.quitAndInstall=()=>updater.emit('error',Error('installer could not start'));await manager.check(true);assert.equal(manager.get().status,'error');assert.equal(calls.dialogs.at(-1).type,'error');
});
