import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,at,validateState,elapsed,addDays,streakInfo} from '../shared/planner.mjs';
import {applyAction} from '../shared/actions.mjs';

const date='2026-09-30',now=at(date,600),week='2026-09-28';
function fixture(minutes=40){
  const state=freshState();
  state.settings.days.forEach(d=>Object.assign(d,{slots:[[960,1200]],budget:240,breakCount:0}));
  state.subjects=[{id:'bio',name:'Biology',color:'#a84f70'},{id:'math',name:'Mathematics',color:'#637c87'}];
  state.topics=state.subjects.map((s,i)=>({id:'topic'+i,subjectId:s.id,title:s.name+' revision',week,effort:'light',minutes,status:'pending'}));
  return state;
}
const active=s=>s.sessions.find(x=>x.id===s.active?.sessionId);

test('one click plans and starts work now without changing recurring availability',()=>{
  const original=fixture(),s=applyAction(original,{type:'start-working'},now);
  assert.equal(active(s).start,600);assert.equal(active(s).subjectId,'bio');assert.ok(s.working);
  assert.deepEqual(s.settings.days,original.settings.days);assert.deepEqual(s.overrides,{});
  assert.equal(original.active,null);assert.equal(s.sessions.filter(x=>x.status==='active').length,1);
});
test('done block automatically starts the next subject and ending all work clears working mode',()=>{
  let s=applyAction(fixture(),{type:'start-working'},now);
  s=applyAction(s,{type:'finish-block',complete:true},now+5*60000);
  assert.equal(s.topics.find(t=>t.id==='topic0').status,'done');assert.equal(active(s).subjectId,'math');assert.equal(s.working.completedBlocks,1);
  s=applyAction(s,{type:'finish-block',complete:true},now+10*60000);
  assert.equal(s.active,null);assert.equal(s.working,null);assert.ok(s.topics.every(t=>t.status==='done'));
});
test('completing one split block does not mark the whole topic complete',()=>{
  let s=applyAction(fixture(200),{type:'start-working'},now);const first=active(s),size=first.end-first.start;
  s=applyAction(s,{type:'finish-block',complete:true},now+size*60000);
  const topic=s.topics.find(t=>t.id===first.topicId);
  assert.equal(topic.status,'pending');assert.equal(topic.remaining,200-size);assert.equal(active(s).subjectId,'math');
});
test('stop saves time, retains unfinished work, and replans all future blocks',()=>{
  let s=applyAction(fixture(200),{type:'start-working'},now);const id=active(s).id,settings=structuredClone(s.settings);
  s=applyAction(s,{type:'stop-working'},now+12*60000);
  assert.equal(s.active,null);assert.equal(s.working,null);assert.equal(s.topics[0].remaining,188);
  assert.equal(s.sessions.find(x=>x.id===id).actualMinutes,12);assert.equal(s.sessions.find(x=>x.id===id).status,'stopped');
  assert.ok(s.sessions.some(x=>x.topicId==='topic0'&&x.status==='planned'));assert.deepEqual(s.settings,settings);
  assert.ok(!s.sessions.some(x=>x.missedAt));assert.equal(validateState(s),s);
  const restarted=applyAction(s,{type:'start-working'},now+15*60000);assert.ok(restarted.active);
});
test('paused time is excluded from stopped work',()=>{
  let s=applyAction(fixture(),{type:'start-working'},now);
  s=applyAction(s,{type:'pause'},now+5*60000);assert.equal(elapsed(s,now+30*60000),5*60000);
  s=applyAction(s,{type:'stop-working'},now+30*60000);
  assert.equal(s.topics[0].remaining,35);assert.equal(s.sessions.find(x=>x.status==='stopped').actualMinutes,5);
});
test('guided pending blocks do not become missed while the user works longer',()=>{
  let s=applyAction(fixture(),{type:'start-working'},now);
  s=applyAction(s,{type:'tick'},now+100*60000);
  assert.ok(!s.sessions.some(x=>x.status==='missed'));
  s=applyAction(s,{type:'stop-working'},now+100*60000);assert.ok(!s.sessions.some(x=>x.status==='missed'));
});
test('classes and locked future blocks stay protected; waiting can be stopped',()=>{
  let s=fixture();s.classes=[{id:'class',name:'Lab',day:2,start:590,end:660}];
  s=applyAction(s,{type:'start-working'},now);assert.equal(s.active,null);assert.ok(s.working.waitingFor);
  assert.ok(s.sessions.filter(x=>x.date===date&&x.status==='planned').every(x=>x.start>=660));
  s=applyAction(s,{type:'tick'},at(date,660));assert.ok(s.active);
  s=applyAction(s,{type:'stop-working'},at(date,665));
  const locked=s.sessions.find(x=>x.date===date&&x.status==='planned');locked.locked=true;
  const copy=structuredClone(locked);
  s=applyAction(s,{type:'start-working'},at(date,670));
  assert.deepEqual(s.sessions.find(x=>x.id===locked.id),copy);
  s=applyAction(s,{type:'stop-working'},at(date,675));assert.equal(s.working,null);
});
test('slide blocks record exact progress and advance from either finish action',()=>{
  let s=fixture();s.topics=[];
  s=applyAction(s,{type:'goal',subjectId:'bio',title:'Cell slides',totalSlides:100,startSlide:1,deadline:'2026-10-05',effort:'light'},now);
  s=applyAction(s,{type:'goal',subjectId:'math',title:'Algebra slides',totalSlides:100,startSlide:1,deadline:'2026-10-05',effort:'light'},now);
  s=applyAction(s,{type:'start-working'},now);const first=active(s);
  s=applyAction(s,{type:'finish',complete:false,slidesCompleted:2},now+3*60000);
  assert.equal(s.goals[0].completedSlides,2);assert.equal(active(s).subjectId,'math');
  const second=active(s);s=applyAction(s,{type:'finish-block',complete:true},now+6*60000);
  assert.equal(s.goals[1].completedSlides,second.slideEnd-second.slideStart+1);
  assert.equal(active(s).slideStart,3);
  const progress=s.goals.map(g=>g.completedSlides);s=applyAction(s,{type:'stop-working'},now+7*60000);
  assert.deepEqual(s.goals.map(g=>g.completedSlides),progress);assert.ok(s.sessions.find(x=>x.id===first.id));
});
test('invalid progress and duplicate starts leave the original working state intact',()=>{
  const s=applyAction(fixture(),{type:'start-working'},now),copy=structuredClone(s);
  assert.throws(()=>applyAction(s,{type:'start-working'},now),/already working/);
  assert.throws(()=>applyAction(s,{type:'finish-block',complete:false,extra:-1},now),/remaining work/);
  assert.deepEqual(s,copy);
});

test('breaks survive repeated early check-ins and continue to the next study block',()=>{
  const original=fixture(200);original.settings.days.forEach(d=>{d.breakCount=1;});
  let s=applyAction(original,{type:'start-working'},now);
  s=applyAction(s,{type:'finish-block',complete:true},now+5*60000);
  s=applyAction(s,{type:'finish-block',complete:true},now+10*60000);
  assert.equal(active(s).type,'break');
  s=applyAction(s,{type:'finish-block',complete:true},now+15*60000);
  assert.equal(active(s).type,'study');
});
test('overflow is carried across weeks without duplicate topic work',()=>{
  const original=fixture(2400);original.settings.days.forEach(d=>{d.budget=60;});
  const s=applyAction(original,{type:'start-working'},now);
  for(const topic of s.topics)assert.equal(s.sessions.filter(x=>x.topicId===topic.id&&['active','planned'].includes(x.status)).reduce((sum,x)=>sum+x.end-x.start,0),2400);
  assert.ok(s.sessions.some(x=>x.date>addDays(week,7)));
  assert.ok(!s.notices.some(n=>n.includes('minutes do not fit.')));
});
test('stopping does not break a streak on the next day and stale completion cannot finish another block',()=>{
  let s=applyAction(fixture(),{type:'start-working'},now);const first=active(s).id;
  s=applyAction(s,{type:'finish-block',sessionId:first,complete:true},now+5*60000);
  assert.throws(()=>applyAction(s,{type:'finish-block',sessionId:first,complete:true},now+6*60000),/already changed/);
  s=applyAction(s,{type:'stop-working'},now+10*60000);
  // The future scheduled work must still be done to earn a day; a stopped
  // record itself does not reset previously earned days.
  s.sessions=s.sessions.filter(x=>x.status!=='planned');
  assert.equal(streakInfo(s,at(addDays(date,1),600)).current,1);
});
