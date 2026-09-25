import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const app=await electron.launch({...(process.env.ACADENCE_EXECUTABLE?{executablePath:process.env.ACADENCE_EXECUTABLE,args:[]}:{args:['.']}),cwd:process.cwd(),env:{...process.env,ACADENCE_DATA_DIR:path.join(process.cwd(),'.test-data',`fullscreen-${Date.now()}`),ACADENCE_TEST_FULLSCREEN:'1'}});
try{
 await app.firstWindow();await new Promise(r=>setTimeout(r,2500));
 await app.evaluate(({BrowserWindow})=>{const main=BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('pet=1'));main.show();main.focus();main.setFullScreen(true);});
 let hidden=false;for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,500));hidden=await app.evaluate(({BrowserWindow})=>!BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('pet=1')).isVisible());if(hidden)break;}
 if(!hidden){console.log('Detector:',execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(process.cwd(),'electron/fullscreen.ps1'),'-Once'],{windowsHide:true}).toString());console.log(await app.evaluate(({BrowserWindow,screen})=>({windows:BrowserWindow.getAllWindows().map(w=>({url:w.webContents.getURL(),bounds:w.getBounds(),full:w.isFullScreen(),focused:w.isFocused()})),displays:screen.getAllDisplays()})));}
 assert.ok(hidden,'Companion hides during fullscreen');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('pet=1')).setFullScreen(false));
 let restored=false;for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,500));restored=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('pet=1')).isVisible());if(restored)break;}
 assert.ok(restored,'Companion returns after fullscreen');
 await writeFile('test-results/fullscreen-report.json',JSON.stringify({passed:true,hidden,restored},null,2));console.log('Native fullscreen detection passed.');
}finally{await app.close();}
