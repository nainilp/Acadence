import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {monday,dateKey} from '../shared/planner.mjs';
const root=process.cwd(),dataPath=path.join(root,'.test-data',`lifecycle-${Date.now()}`),backup=path.join(dataPath,'exported-backup.json');
await mkdir(dataPath,{recursive:true});
const options={...(process.env.ACADENCE_EXECUTABLE?{executablePath:process.env.ACADENCE_EXECUTABLE,args:[]}:{args:['.']}),cwd:root,env:{...process.env,ACADENCE_DATA_DIR:dataPath}};
async function open(){const app=await electron.launch(options);await app.firstWindow();let page;for(let i=0;i<100;i++){page=app.windows().find(w=>w.url().includes('index.html')&&!w.url().includes('pet=1'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForSelector('.app-shell');return {app,page};}
let {app,page}=await open();
try{
  await page.evaluate(async week=>{const api=window.acadence;for(const name of ['Biology','Mathematics','English'])await api.action({type:'subject',name});let s=await api.get();await api.action({type:'settings',values:{days:s.settings.days.map(d=>({...d,slots:[[0,1440]],budget:240,breakCount:0}))}});for(const sub of s.subjects)for(let j=0;j<2;j++)await api.action({type:'topic',subjectId:sub.id,title:`${sub.name} topic ${j+1}`,effort:'light',minutes:40,week});await api.action({type:'plan',week});s=await api.get();await api.action({type:'start',id:s.sessions.find(x=>x.type==='study'&&x.status==='planned').id});},monday());
  await new Promise(r=>setTimeout(r,1200));
  let s=await page.evaluate(()=>window.acadence.action({type:'pause'}));assert.ok(s.active.elapsedMs>=1000);assert.equal(s.active.runningSince,null);
  const pet=app.windows().find(w=>w.url().includes('pet=1'));await pet.getByRole('button',{name:'Talk to your study companion'}).click();await pet.screenshot({path:'test-results/09-active-companion.png',omitBackground:true});
  await page.evaluate(()=>window.acadence.action({type:'resume'}));
  await app.close();({app,page}=await open());
  s=await page.evaluate(()=>window.acadence.get());assert.equal(s.active.runningSince,null);assert.ok(s.active.elapsedMs>=1000,'Elapsed time persists when quitting');
  s=await page.evaluate(()=>window.acadence.action({type:'finish',complete:false,extra:30}));
  const future=s.sessions.filter(x=>x.status==='planned'&&x.type==='study');assert.equal(future[0].subjectId,s.subjects[1].id);assert.equal(future[1].subjectId,s.subjects[2].id);assert.equal(future[2].topicId,s.topics.find(t=>t.remaining===30).id);
  await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});dialog.showMessageBox=async()=>({response:1});},backup);
  assert.equal(await page.evaluate(()=>window.acadence.backup()),true);
  const before=JSON.parse(await readFile(backup,'utf8'));assert.equal(before.subjects.length,3);
  assert.equal(await page.evaluate(()=>window.acadence.clear()),true);
  s=await page.evaluate(()=>window.acadence.get());assert.equal(s.topics.length,0);assert.equal(s.sessions.length,0);assert.equal(s.subjects.length,0);
  assert.equal(await page.evaluate(()=>window.acadence.restore()),true);
  s=await page.evaluate(()=>window.acadence.get());assert.equal(s.subjects.length,3);assert.equal(s.topics.length,6);
  await writeFile('test-results/lifecycle-report.json',JSON.stringify({passed:true,timerPauseResume:true,quitRecovery:true,incompleteRotation:true,backupRestore:true,clearData:true},null,2));
  console.log('Lifecycle passed: timer, pause/resume, quit recovery, unfinished rotation, backup, clear all data, and restore.');
}finally{await app.close();}
