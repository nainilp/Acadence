import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {dateKey,addDays} from '../shared/planner.mjs';

const root=process.cwd(),dataPath=path.join(root,'.test-data',`working-${Date.now()}`),errors=[];
await mkdir('test-results',{recursive:true});
const app=await electron.launch({args:['.'],cwd:root,env:{...process.env,ACADENCE_DATA_DIR:dataPath}});
app.on('window',page=>page.on('pageerror',e=>errors.push(e.message)));
try{
  await app.firstWindow();
  let page;
  for(let i=0;i<100;i++){page=app.windows().find(w=>w.url().includes('index.html')&&!w.url().includes('pet=1'));if(page)break;await new Promise(r=>setTimeout(r,100));}
  assert.ok(page,'Main planner window is present');await page.waitForSelector('.app-shell');
  await page.evaluate(async({deadline})=>{
    const api=window.acadence;
    await api.action({type:'subject',name:'Biology'});await api.action({type:'subject',name:'Mathematics'});
    const s=await api.get();await api.action({type:'settings',values:{days:s.settings.days.map(d=>({...d,slots:[[0,1440]],budget:240,breakCount:0}))}});
    for(const [i,sub] of s.subjects.entries())await api.action({type:'goal',subjectId:sub.id,title:i?'Algebra revision':'Cell biology',totalSlides:300,startSlide:1,deadline,effort:'light'});
  },{deadline:addDays(dateKey(),7)});
  await page.getByRole('button',{name:'Start working',exact:true}).click();
  await page.getByRole('button',{name:'Done block & next',exact:true}).waitFor();
  let state=await page.evaluate(()=>window.acadence.get());const first=state.sessions.find(s=>s.id===state.active.sessionId);
  assert.ok(state.working);assert.equal(first.subjectId,state.subjects[0].id);
  assert.ok(await page.getByLabel('Next work blocks').isVisible());
  await page.screenshot({path:'test-results/working-desktop.png',fullPage:true});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('pet=1')).setSize(900,680));
  await page.screenshot({path:'test-results/working-compact.png',fullPage:true});
  const pet=app.windows().find(w=>w.url().includes('pet=1'));await pet.getByRole('button',{name:'Talk to your study companion'}).click();
  await pet.getByRole('button',{name:'Done block & next',exact:true}).click();
  await page.waitForFunction(()=>window.acadence.get().then(s=>s.working?.completedBlocks===1));
  state=await page.evaluate(()=>window.acadence.get());assert.equal(state.goals[0].completedSlides,first.slideEnd-first.slideStart+1);
  assert.equal(state.sessions.find(s=>s.id===state.active.sessionId).subjectId,state.subjects[1].id);
  await page.getByRole('button',{name:'Record partial progress',exact:true}).click();
  await page.getByLabel('Slides completed this block').fill('2');
  await page.getByRole('button',{name:'Save progress',exact:true}).click();await page.locator('dialog').waitFor({state:'hidden'});
  state=await page.evaluate(()=>window.acadence.get());assert.equal(state.goals[1].completedSlides,2);assert.equal(state.working.completedBlocks,2);
  assert.equal(state.sessions.find(s=>s.id===state.active.sessionId).subjectId,state.subjects[0].id);
  await pet.screenshot({path:'test-results/working-companion.png',omitBackground:true});
  await pet.getByRole('button',{name:'Stop working',exact:true}).click();
  await page.getByRole('button',{name:'Start working',exact:true}).waitFor();
  state=await page.evaluate(()=>window.acadence.get());assert.equal(state.active,null);assert.equal(state.working,null);
  assert.ok(state.sessions.some(s=>s.status==='stopped'));assert.ok(state.sessions.some(s=>s.status==='planned'));
  assert.equal(state.goals[1].completedSlides,2);
  await pet.getByRole('button',{name:'Start working',exact:true}).click();
  await page.getByRole('button',{name:'Done block & next',exact:true}).waitFor();
  state=await page.evaluate(()=>window.acadence.get());assert.ok(state.active);
  await page.getByRole('button',{name:'Stop working',exact:true}).click();
  assert.equal(errors.length,0,errors.join('\n'));
  await writeFile('test-results/working-report.json',JSON.stringify({passed:true,startFromApp:true,advanceFromPet:true,partialFromApp:true,stopFromPet:true,restartFromPet:true,rendererErrors:errors},null,2));
  console.log('Working flow passed: app and companion start, advance, partial progress, stop/replan, restart.');
}finally{await app.close();}
