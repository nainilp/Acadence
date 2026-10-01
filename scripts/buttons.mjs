import {_electron as electron,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dateKey,addDays,monday,timeLabel} from '../shared/planner.mjs';

const root=process.cwd(),dataPath=path.join(root,'.test-data',`buttons-${Date.now()}`),checks=[],errors=[];
await mkdir(dataPath,{recursive:true});await mkdir('test-results',{recursive:true});
const app=await electron.launch({...(process.env.ACADENCE_EXECUTABLE?{executablePath:process.env.ACADENCE_EXECUTABLE,args:[]}:{args:['.']}),cwd:root,env:{...process.env,ACADENCE_DATA_DIR:dataPath}});
app.on('window',w=>w.on('pageerror',e=>errors.push(e.message)));
let page,pet;
try{
  await app.firstWindow();
  for(let i=0;i<100;i++){page=app.windows().find(w=>w.url().includes('index.html')&&!w.url().includes('pet=1'));if(page)break;await new Promise(r=>setTimeout(r,100));}
  await page.waitForSelector('.app-shell');
  const now=await app.evaluate(()=>{const d=new Date();d.setHours(10,0,0,0);global.__buttonNow=d.getTime();Date.now=()=>global.__buttonNow;return global.__buttonNow;});
  const today=dateKey(now),week=monday(new Date(now));
  async function clock(value){await app.evaluate((_,value)=>{global.__buttonNow=value;},value);for(const w of app.windows())await w.evaluate(value=>{Date.now=()=>value;},value);}
  await clock(now);
  const button=(name,scope=page)=>scope.getByRole('button',{name,exact:true});
  const state=()=>page.evaluate(()=>window.acadence.get());
  async function verify(label,predicate,arg){await expect.poll(()=>page.evaluate(predicate,arg),{message:label,timeout:10000}).toBe(true);checks.push(label);}
  async function nav(name){await button(name).click();checks.push(`Navigate: ${name}`);}
  async function close(){await button('Close dialog').click();await page.locator('dialog').waitFor({state:'hidden'});checks.push('Close dialog');}
  const subject=name=>page.locator('.subject-card').filter({has:page.getByRole('heading',{name,exact:true})});

  await button('Add my first subject').click();checks.push('Empty state: add first subject');
  await button('Add subject').click();await button('Cancel').click();checks.push('Cancel subject');
  for(const name of ['Biology','Mathematics']){
    await button('Add subject').click();await page.getByLabel('Subject name').fill(name);await button('Save subject').click();
    await verify(`Create ${name}`,name=>window.acadence.get().then(s=>s.subjects.some(x=>x.name===name)),name);
  }
  await button('Edit Biology').click();await page.getByLabel('Subject name').fill('Life science');await button('Save subject').click();
  await verify('Edit subject',()=>window.acadence.get().then(s=>s.subjects[0].name==='Life science'));
  await button('Edit Life science').click();await page.getByLabel('Subject name').fill('Biology');await button('Save subject').click();
  await verify('Restore subject name',()=>window.acadence.get().then(s=>s.subjects[0].name==='Biology'));
  await button('Move Mathematics earlier').click();await verify('Reorder subjects up',()=>window.acadence.get().then(s=>s.subjects[0].name==='Mathematics'));
  await button('Move Mathematics later').click();await verify('Reorder subjects down',()=>window.acadence.get().then(s=>s.subjects[0].name==='Biology'));
  for(const title of ['Topic A','Topic B']){
    await button('Add topic',subject('Biology')).click();await page.getByLabel('Topic name').fill(title);
    await page.getByRole('button',{name:'light',exact:false}).click();await button('Save topic').click();
    await verify(`Create ${title}`,title=>window.acadence.get().then(s=>s.topics.some(t=>t.title===title)),title);
  }
  await button('Move Topic B earlier').click();await verify('Reorder topics up',()=>window.acadence.get().then(s=>s.topics[0].title==='Topic B'));
  await button('Move Topic B later').click();await verify('Reorder topics down',()=>window.acadence.get().then(s=>s.topics[0].title==='Topic A'));
  await button('Edit Topic A').click();await page.getByLabel('Topic name').fill('Topic A edited');await button('Save topic').click();
  await verify('Edit topic',()=>window.acadence.get().then(s=>s.topics.some(t=>t.title==='Topic A edited')));
  await button('Remove Topic B').click();await verify('Remove unused topic',()=>window.acadence.get().then(s=>!s.topics.some(t=>t.title==='Topic B')));
  await button('Edit Topic A edited').click();await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'hidden'});checks.push('Escape closes dialog');
  await page.getByLabel('Search topics').fill('does not match');assert.equal(await page.locator('.topic-row').count(),0);await page.getByLabel('Search topics').fill('');checks.push('Topic search');
  const picker=await page.locator('.week-picker').innerText();
  await button('Previous week').click();assert.notEqual(await page.locator('.week-picker').innerText(),picker);checks.push('Previous week');
  await button('Next week').click();assert.equal(await page.locator('.week-picker').innerText(),picker);checks.push('Next week');
  await button('Next week').click();await button('This week').click();assert.equal(await page.locator('.week-picker').innerText(),picker);checks.push('This week');
  await page.evaluate(async week=>{const s=await window.acadence.get();await window.acadence.action({type:'topic',subjectId:s.subjects[0].id,title:'Copy fixture',effort:'light',week});},addDays(week,-7));
  await button('Copy last week’s topics').click();await verify('Copy previous topics',()=>window.acadence.get().then(s=>s.topics.filter(t=>t.title==='Copy fixture').length===2));
  await button('Add slide goal',subject('Mathematics')).click();await button('Cancel').click();checks.push('Cancel goal');
  await button('Add slide goal',subject('Mathematics')).click();await page.getByLabel('Goal name').fill('Algebra slides');await page.getByLabel('Number of slides').fill('120');await button('Save goal & plan').click();
  await verify('Create slide goal',()=>window.acadence.get().then(s=>s.goals.length===1));
  await button('Edit goal').click();await page.getByLabel('Slides completed so far').fill('5');await button('Save goal & plan').click();
  await verify('Edit goal progress',()=>window.acadence.get().then(s=>s.goals[0].completedSlides===5));

  await nav('Availability');
  await page.getByLabel('Monday study budget',{exact:true}).fill('180');await page.getByLabel('Monday break count',{exact:true}).fill('0');
  await button('Apply Monday’s budget & breaks to all days').click();await button('Save changes').click();
  await verify('Apply and save daily budgets',()=>window.acadence.get().then(s=>s.settings.days.every(d=>d.budget===180&&d.breakCount===0)));
  const cell=button('Monday 08:00 available');await cell.click();assert.equal(await cell.getAttribute('aria-pressed'),'true');await cell.focus();await page.keyboard.press('Space');assert.equal(await cell.getAttribute('aria-pressed'),'false');checks.push('Availability pointer and keyboard');
  await button('Save changes').click();
  await page.getByLabel('Choose a date').fill(today);await button('Add window').click();assert.equal(await page.getByLabel('Availability starts').count(),2);checks.push('Add availability window');
  await button('Remove availability window').last().click();assert.equal(await page.getByLabel('Availability starts').count(),1);checks.push('Remove availability window');
  await page.getByLabel('Study budget (minutes)',{exact:true}).fill('200');await button('Save this date').click();
  await verify('Save date override',today=>window.acadence.get().then(s=>s.overrides[today]?.budget===200),today);
  await button('Use weekly pattern').click();await verify('Restore weekly pattern',today=>window.acadence.get().then(s=>!s.overrides[today]),today);
  await page.getByLabel('Buffer before and after classes (minutes)').fill('5');await page.getByLabel('Buffer before and after classes (minutes)').blur();
  await verify('Save class buffer',()=>window.acadence.get().then(s=>s.settings.buffer===5));
  await nav('School timetable');await page.getByLabel('Class / commitment').fill('Manual lab');await page.getByLabel('One date instead (optional)').fill(addDays(today,1));await button('Add').click();
  await verify('Add manual commitment',()=>window.acadence.get().then(s=>s.classes.some(c=>c.name==='Manual lab')));
  await button('Remove Manual lab').click();await verify('Remove commitment',()=>window.acadence.get().then(s=>!s.classes.some(c=>c.name==='Manual lab')));
  // Reuse the image produced by the offline OCR smoke test, then test its review controls.
  await page.locator('input[type=file]').setInputFiles(path.join(root,'test-results/timetable-fixture.png'));
  await page.locator('.class-edit-row').first().waitFor();checks.push('Choose timetable image');
  await page.getByText('Recognized text & period mapping',{exact:true}).click();await button('Add period mapping').click();assert.equal(await page.getByLabel('Period number').count(),1);checks.push('Add period mapping');
  await button('Parse text again').click();await page.locator('.class-edit-row').first().waitFor();checks.push('Parse text again');
  const count=await page.locator('.class-edit-row').count();await button('Add missing entry').click();assert.equal(await page.locator('.class-edit-row').count(),count+1);checks.push('Add missing timetable entry');
  await button('Remove recognized entry').last().click();assert.equal(await page.locator('.class-edit-row').count(),count);checks.push('Remove recognized entry');
  await page.getByLabel('Recognized class name').first().fill('Reviewed class');
  assert.equal(await button('Confirm and add classes').isDisabled(),true);await page.getByLabel('I checked every class, day, and time.').check();await button('Confirm and add classes').click();
  await verify('Confirm reviewed classes',()=>window.acadence.get().then(s=>s.classes.some(c=>c.name==='Reviewed class')));

  await nav('Your week');await button('Build / replan week').click();await page.locator('.calendar-event.study').first().waitFor();checks.push('Build / replan week');
  const planned=(await state()).sessions.find(s=>s.type==='study'&&s.status==='planned');
  await page.locator('.calendar-event.study').first().click();await button('Lock').click();await verify('Lock block',id=>window.acadence.get().then(s=>s.sessions.find(x=>x.id===id)?.locked),planned.id);
  await button('Unlock').click();await verify('Unlock block',id=>window.acadence.get().then(s=>!s.sessions.find(x=>x.id===id)?.locked),planned.id);
  await page.getByLabel('End',{exact:true}).fill(timeLabel(planned.start+Math.min(30,planned.end-planned.start)));await button('Save changes').click();
  await verify('Edit block time',id=>window.acadence.get().then(s=>s.sessions.find(x=>x.id===id)?.locked),planned.id);
  await page.locator('.calendar-event.study').first().click();await button('Skip session').click();await verify('Skip planned block',id=>window.acadence.get().then(s=>s.sessions.find(x=>x.id===id)?.status==='skipped'),planned.id);
  await page.getByLabel('Hours').selectOption('all');checks.push('24-hour calendar');await page.getByLabel('Hours').selectOption('day');checks.push('Daytime calendar');
  await nav('Today');await button('View full week').click();checks.push('View full week');await nav('Today');await button('See your progress').click();checks.push('See progress');
  await nav('Settings');
  for(const theme of ['dark','light']){await page.getByRole('button',{name:`${theme} mode`,exact:false}).click();await verify(`${theme} theme`,theme=>document.documentElement.dataset.theme===theme,theme);}
  for(const [label,key] of [['Reduced motion','reducedMotion'],['Reminder sounds','sound'],['Start with Windows','startup'],['Show desktop companion','petVisible'],['Keep above other windows','alwaysOnTop'],['Hide during fullscreen activities','hideFullscreen']]){
    const toggle=page.getByRole('switch',{name:label,exact:false}),old=await toggle.isChecked();await toggle.click();
    await verify(`Toggle ${label}`,({key,value})=>window.acadence.get().then(s=>s.settings[key]===value),{key,value:!old});await toggle.click();
    await verify(`Restore ${label}`,({key,value})=>window.acadence.get().then(s=>s.settings[key]===value),{key,value:old});
  }
  await page.getByLabel('Companion’s name').fill('Test buddy');await page.getByLabel('Companion’s name').blur();await verify('Rename companion',()=>window.acadence.get().then(s=>s.settings.petName==='Test buddy'));
  pet=app.windows().find(w=>w.url().includes('pet=1'));await pet.getByRole('button',{name:'Talk to your study companion'}).click();checks.push('Open companion bubble');
  await button('Close speech bubble',pet).click();checks.push('Close companion bubble');await button('Open Acadence',pet).click();checks.push('Companion opens planner');
  await button('Hide companion',pet).click();await verify('Companion hide button',()=>window.acadence.get().then(s=>!s.settings.petVisible));
  await page.getByRole('switch',{name:'Show desktop companion',exact:false}).click();await verify('Restore companion',()=>window.acadence.get().then(s=>s.settings.petVisible));

  await nav('Today');await button('Start working').click();await verify('Start working from Today',()=>window.acadence.get().then(s=>!!s.active&&!!s.working));
  await button('Pause').click();await verify('Pause from Today',()=>window.acadence.get().then(s=>s.active?.runningSince===null));await clock(now+5*60000);
  await button('Resume').click();await verify('Resume from Today',()=>window.acadence.get().then(s=>!!s.active?.runningSince));
  await button('Record partial progress').click();await page.getByLabel('If unfinished, how many more minutes?').fill('20');await button('Need more time').click();
  await verify('Need more time from Today',()=>window.acadence.get().then(s=>s.working?.completedBlocks===1));
  await pet.getByRole('button',{name:'Talk to your study companion'}).click();await button('Pause',pet).click();await verify('Pause from companion',()=>window.acadence.get().then(s=>s.active?.runningSince===null));
  await clock(now+10*60000);await button('Resume',pet).click();await verify('Resume from companion',()=>window.acadence.get().then(s=>!!s.active?.runningSince));
  await button('Done block & next',pet).click();await verify('Finish block from companion',()=>window.acadence.get().then(s=>s.working?.completedBlocks===2));
  await button('Stop working',pet).click();await verify('Stop from companion',()=>window.acadence.get().then(s=>!s.active&&!s.working));
  await clock(new Date(`${today}T23:48:00`).getTime());await button('Start working').click();await verify('Late-night Start working',()=>window.acadence.get().then(s=>!!s.active));
  assert.ok((await state()).active.targetMs<=12*60000);checks.push('Late-night timer uses remaining time');
  await button('Stop working').click();await verify('Stop from Today',()=>window.acadence.get().then(s=>!s.active&&!s.working));
  await page.evaluate(async()=>{const s=await window.acadence.get();await window.acadence.action({type:'settings',values:{days:s.settings.days.map(d=>({...d,budget:0}))}});});
  await button('Start working').click();await page.getByRole('status').filter({hasText:'study budget is used up'}).waitFor();assert.equal((await state()).active,null);checks.push('Blocked Start working explains why');
  await button('Dismiss message').click();checks.push('Dismiss feedback');

  await nav('Subjects & topics');await button('Edit goal').click();await button('Archive goal').click();await verify('Archive goal',()=>window.acadence.get().then(s=>s.goals[0].archived));
  await nav('Settings');const backup=path.join(dataPath,'button-backup.json');
  await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});dialog.showMessageBox=async()=>({response:1});},backup);
  await button('Export backup').click();await page.getByRole('status').filter({hasText:'Backup exported'}).waitFor();assert.equal(JSON.parse(await readFile(backup,'utf8')).subjects.length,2);checks.push('Export backup button');
  await button('Clear all data').click();await verify('Clear isolated test data',()=>window.acadence.get().then(s=>s.subjects.length===0));
  await button('Restore backup').click();await verify('Restore backup button',()=>window.acadence.get().then(s=>s.subjects.length===2));
  assert.deepEqual(errors,[]);
  await writeFile('test-results/buttons-report.json',JSON.stringify({passed:true,checks,rendererErrors:errors},null,2));
  console.log(`Button audit passed: ${checks.length} checks across navigation, planning, subjects, goals, availability, timetable, settings, working controls, companion, and backups.`);
}catch(error){await page?.screenshot({path:'test-results/buttons-failure.png',fullPage:true}).catch(()=>{});console.error('Completed checks:',checks.join(', '));throw error;}finally{await app.close();}
