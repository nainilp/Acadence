import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {dateKey,addDays} from '../shared/planner.mjs';
const root=process.cwd(),dataPath=path.join(root,'.test-data',`goals-${Date.now()}`);
function verifySlides(state){for(const goal of state.goals){const blocks=state.sessions.filter(s=>s.goalId===goal.id&&s.status==='planned'),counts=blocks.map(s=>s.slideEnd-s.slideStart+1);assert.ok(Math.max(...counts)-Math.min(...counts)<=1);assert.equal(counts.reduce((a,b)=>a+b,0),goal.totalSlides-goal.completedSlides);}}
await mkdir('test-results',{recursive:true});
const app=await electron.launch({...(process.env.ACADENCE_EXECUTABLE?{executablePath:process.env.ACADENCE_EXECUTABLE,args:[]}:{args:['.']}),cwd:root,env:{...process.env,ACADENCE_DATA_DIR:dataPath}}),errors=[];
app.on('window',w=>w.on('pageerror',e=>errors.push(e.message)));
try{
  await app.firstWindow();let page;
  for(let i=0;i<100;i++){page=app.windows().find(w=>w.url().includes('index.html')&&!w.url().includes('pet=1'));if(page)break;await new Promise(r=>setTimeout(r,100));}
  await page.waitForSelector('.app-shell');
  await page.evaluate(async()=>{const api=window.acadence;await api.action({type:'subject',name:'Biology'});await api.action({type:'subject',name:'Mathematics'});const s=await api.get();await api.action({type:'settings',values:{days:s.settings.days.map(d=>({...d,slots:[[0,1440]],budget:120,breakCount:0}))}});});
  await page.getByRole('button',{name:'Subjects & topics',exact:true}).click();
  for(let i=0;i<2;i++){
    await page.locator('.subject-card').nth(i).getByRole('button',{name:'Add slide goal',exact:true}).click();
    await page.getByLabel('Goal name').fill(i===0?'Cell biology midterm':'Calculus revision');
    await page.getByLabel('Number of slides').fill('240');
    await page.getByLabel('Finish by').fill(addDays(dateKey(),13));
    if(i===0){
      await page.screenshot({path:'test-results/14-slide-goal-dialog.png',fullPage:true});
      await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('pet=1')).setSize(900,680));
      await page.screenshot({path:'test-results/15-slide-goal-dialog-900.png',fullPage:true});
      assert.equal(await page.getByRole('button',{name:'Save goal & plan',exact:true}).isVisible(),true);
      await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('pet=1')).setSize(1320,900));
    }
    await page.getByRole('button',{name:'Save goal & plan',exact:true}).click();
    await page.locator('dialog').waitFor({state:'hidden'});
  }
  let s=await page.evaluate(()=>window.acadence.get());assert.equal(s.goals.length,2);assert.equal(await page.locator('.goal-card').count(),2);verifySlides(s);
  assert.equal(await page.locator('.topic-row').count(),0,'Synthetic slide topics are not duplicated in ordinary topic lists');
  await page.screenshot({path:'test-results/10-slide-goals.png',fullPage:true});
  await page.getByRole('button',{name:'Your week',exact:true}).click();assert.match(await page.locator('.calendar-event.study').first().innerText(),/slides/);
  await page.screenshot({path:'test-results/11-slide-calendar.png',fullPage:true});
  const first=s.sessions.find(x=>x.type==='study'&&x.status==='planned');
  s=await page.evaluate(id=>window.acadence.action({type:'start',id}),first.id);
  await page.getByRole('button',{name:'Today',exact:true}).click();await page.getByRole('button',{name:'Check in',exact:true}).click();
  await page.getByLabel('Slides completed this block').fill('1.5');
  await page.getByRole('button',{name:'Save progress',exact:true}).click();
  assert.equal(await page.locator('dialog[open]').count(),1,'Fractional counts are rejected before saving');
  await page.getByLabel('Slides completed this block').fill('2');
  await page.screenshot({path:'test-results/12-slide-check-in.png',fullPage:true});
  await page.getByRole('button',{name:'Save progress',exact:true}).click();await page.locator('dialog').waitFor({state:'hidden'});
  s=await page.evaluate(()=>window.acadence.get());assert.equal(s.goals[0].completedSlides,2);assert.equal(s.sessions.find(x=>x.goalId===s.goals[0].id&&x.status==='planned').slideStart,3);verifySlides(s);
  const next=s.sessions.find(x=>x.type==='study'&&x.status==='planned');assert.equal(next.subjectId,s.subjects[1].id);
  await page.evaluate(id=>window.acadence.action({type:'start',id}),next.id);
  const pet=app.windows().find(w=>w.url().includes('pet=1'));await pet.getByRole('button',{name:'Talk to your study companion'}).click();
  const ahead=next.slideEnd-next.slideStart+4;
  await pet.getByLabel('Slides completed this block').fill(String(ahead));await pet.screenshot({path:'test-results/13-slide-companion.png',omitBackground:true});
  await pet.getByRole('button',{name:'Save progress',exact:true}).click();
  await pet.getByLabel('Slides completed this block').waitFor({state:'hidden'});
  s=await page.evaluate(()=>window.acadence.get());assert.equal(s.goals[1].completedSlides,ahead);verifySlides(s);
  await page.getByRole('button',{name:'Progress',exact:true}).click();assert.equal(await page.locator('.goal-card').count(),2);
  await page.locator('.goal-card').first().getByRole('button',{name:'Edit goal',exact:true}).click();
  await page.getByLabel('Slides completed so far').fill('20');
  await page.getByRole('button',{name:'Save goal & plan',exact:true}).click();await page.locator('dialog').waitFor({state:'hidden'});
  s=await page.evaluate(()=>window.acadence.get());assert.equal(s.goals[0].completedSlides,20);assert.equal(s.sessions.find(x=>x.goalId===s.goals[0].id&&x.status==='planned').slideStart,21);verifySlides(s);
  const backup=path.join(dataPath,'goals-backup.json');
  await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});dialog.showMessageBox=async()=>({response:1});},backup);
  await page.evaluate(()=>window.acadence.backup());await page.evaluate(()=>window.acadence.clear());await page.evaluate(()=>window.acadence.restore());
  s=await page.evaluate(()=>window.acadence.get());assert.deepEqual(s.goals.map(g=>g.completedSlides),[20,ahead]);verifySlides(s);assert.equal(errors.length,0,errors.join('\n'));
  await writeFile('test-results/goals-report.json',JSON.stringify({passed:true,goalCreation:true,equalSlideCounts:true,calendarRanges:true,partialCompletion:true,aheadOfTarget:true,companionCheckIn:true,outsideProgress:true,backupRestore:true,rendererErrors:errors},null,2));
  console.log('Slide goals passed: equal counts, ranges, partial and ahead progress, companion check-in, outside progress, backup/restore.');
}finally{await app.close();}
