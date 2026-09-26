import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {dateKey,addDays} from '../shared/planner.mjs';
const root=process.cwd(),folder='test-results/clay';await mkdir(folder,{recursive:true});
const app=await electron.launch({...(process.env.ACADENCE_EXECUTABLE?{executablePath:process.env.ACADENCE_EXECUTABLE,args:[]}:{args:['.']}),cwd:root,env:{...process.env,ACADENCE_DATA_DIR:path.join(root,'.test-data',`clay-${Date.now()}`)}});
const errors=[],checks=[];app.on('window',p=>p.on('pageerror',e=>errors.push(e.message)));
try{
  await app.firstWindow();let page;
  for(let i=0;i<100;i++){page=app.windows().find(w=>w.url().includes('index.html')&&!w.url().includes('pet=1'));if(page)break;await new Promise(r=>setTimeout(r,100));}
  await page.waitForSelector('.app-shell');
  await page.evaluate(async deadline=>{const a=window.acadence;for(const name of ['Biology','Mathematics','Literature'])await a.action({type:'subject',name});let s=await a.get();await a.action({type:'settings',values:{days:s.settings.days.map(d=>({...d,slots:[[0,1440]],budget:180,breakCount:1,breakMinutes:15}))}});for(const [i,sub] of s.subjects.entries())await a.action({type:'goal',subjectId:sub.id,title:['Cell biology midterm','Calculus revision','Literary movements'][i],totalSlides:120+i*30,startSlide:1,deadline,effort:['normal','heavy','light'][i]});},addDays(dateKey(),10));
  const dismiss=page.getByRole('button',{name:'Dismiss message',exact:true});if(await dismiss.count())await dismiss.click();
  const pages=['Today','Your week','Subjects & topics','Availability','School timetable','Progress','Settings'];
  for(const theme of ['light','dark']){
    await page.evaluate(theme=>window.acadence.action({type:'settings',values:{theme}}),theme);
    for(const width of [1320,900]){
      await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('pet=1')).setSize(width,width===900?680:900),width);
      for(const [i,name] of pages.entries()){
        await page.getByRole('button',{name,exact:true}).click();
        await page.screenshot({path:`${folder}/${theme}-${width}-${i}-${name.toLowerCase().replaceAll(/[^a-z]+/g,'-')}.png`,fullPage:true});
        const sizes=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,sidebar:document.querySelector('.sidebar').getBoundingClientRect().height,sidebarScroll:document.querySelector('.sidebar').scrollHeight}));
        assert.ok(sizes.scroll<=sizes.client+1,`${name} ${theme} ${width}: horizontal overflow ${JSON.stringify(sizes)}`);
        assert.ok(sizes.sidebarScroll<=sizes.sidebar+2,`${name} ${theme} ${width}: sidebar controls clipped`);
        checks.push({theme,width,page:name,...sizes});
      }
    }
  }
  await page.getByRole('button',{name:'Subjects & topics',exact:true}).click();await page.getByRole('button',{name:'Add slide goal',exact:true}).first().click();await page.screenshot({path:`${folder}/dark-goal-dialog.png`,fullPage:true});
  await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'hidden'});
  await page.evaluate(()=>window.acadence.action({type:'settings',values:{theme:'light',reducedMotion:true}}));
  await page.getByRole('button',{name:'Subjects & topics',exact:true}).click();await page.getByRole('button',{name:'Add slide goal',exact:true}).first().click();await page.screenshot({path:`${folder}/light-goal-dialog.png`,fullPage:true});
  await page.getByLabel('Goal name').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  const focus=await page.getByLabel('Goal name').evaluate(e=>({outline:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth}));assert.equal(focus.outline,'solid');assert.equal(focus.width,'3px');
  await page.keyboard.press('Escape');
  const pet=app.windows().find(w=>w.url().includes('pet=1'));assert.equal(await pet.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.equal(await pet.locator('.dog').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.deepEqual(errors,[]);await writeFile(`${folder}/review.json`,JSON.stringify({passed:true,checks,keyboardFocus:focus,rendererErrors:errors},null,2));
  console.log(`Clay UI passed ${checks.length} page/theme/window-size checks, dialog keyboard focus, transparent companion, and reduced motion.`);
}finally{await app.close();}
