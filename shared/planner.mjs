export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const EFFORT = { light: 40, normal: 60, heavy: 90 };
export const COLORS = ['#5274dc', '#299c84', '#b479c6', '#d7993f', '#dd7288', '#549cb8'];
export const uid = () => globalThis.crypto.randomUUID();
export function dateKey(value = new Date()) { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function addDays(date, n) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+n); return dateKey(d); }
export function monday(value = new Date()) { const d = new Date(value); return addDays(dateKey(d), -((d.getDay()+6)%7)); }
export const dayIndex = date => (new Date(`${date}T12:00:00`).getDay()+6)%7;
export const at = (date, minutes) => new Date(`${date}T00:00:00`).getTime()+minutes*60000;
export const timeLabel = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
export const minutesOf = s => { const [h,m]=s.split(':').map(Number); return h*60+m; };
export const durationLabel = m => m >= 60 ? `${Math.floor(m/60)}h${m%60 ? ` ${Math.round(m%60)}m` : ''}` : `${Math.round(m)}m`;
export function freshState() {
  return { version:1, subjects:[], topics:[], goals:[], sessions:[], classes:[], overrides:{}, rotation:0, active:null, notices:[],
    settings:{ theme:'light', petName:'Mochi', petVisible:true, alwaysOnTop:true, hideFullscreen:true, sound:false, reducedMotion:false, startup:false, buffer:0,
      days:DAYS.map((_,i)=>({ slots:i<5?[[16*60,20*60]]:[[10*60,16*60]], budget:120, breakCount:1, breakMinutes:15 })) } };
}
export function mergeIntervals(intervals) {
  const out=[];
  for(const [a,b] of intervals.filter(([a,b])=>b>a).sort((x,y)=>x[0]-y[0])) { const last=out.at(-1); if(last && a<=last[1]) last[1]=Math.max(last[1],b); else out.push([a,b]); }
  return out;
}
export function subtract(intervals, blocks) {
  let out=mergeIntervals(intervals);
  for(const [a,b] of blocks) out=out.flatMap(([s,e])=>b<=s||a>=e?[[s,e]]:[[s,Math.min(e,a)],[Math.max(s,b),e]].filter(([x,y])=>y>x));
  return out;
}
export const configFor = (state,date) => state.overrides[date] || state.settings.days[dayIndex(date)];
export function blockedFor(state,date) { return state.classes.filter(c=>c.date?c.date===date:c.day===dayIndex(date)).map(c=>[Math.max(0,c.start-state.settings.buffer),Math.min(1440,c.end+state.settings.buffer)]); }
export function availableFor(state,date) { return subtract(configFor(state,date).slots,blockedFor(state,date)); }
const budgetCost=s=>s.type!=='study'?0:['planned','active'].includes(s.status)?s.end-s.start:(s.actualMinutes||0);
export function isOverdue(s,now=Date.now()) { return s.type==='study'&&s.status==='planned'&&now>at(s.date,s.start)+10*60000; }
export function reconcile(state,now=Date.now()) {
  let changed=false;
  for(const s of state.sessions) if(isOverdue(s,now)) {s.status='missed';s.missedAt=now;changed=true;}
  return changed;
}
export function elapsed(state,now=Date.now()) { const a=state.active; return a ? a.elapsedMs+(a.runningSince?Math.max(0,now-a.runningSince):0) : 0; }
export function generatePlan(state, week, now=Date.now()) {
  reconcile(state,now);
  const end=addDays(week,7), notices=[];
  const keep=state.sessions.filter(s=>s.date<week||s.date>=end||s.status!=='planned'||s.locked);
  const relevant=state.topics.filter(t=>t.status!=='done'&&t.week<=week);
  const dates=Array.from({length:7},(_,i)=>addDays(week,i));
  let capacity=0;
  const dayData=dates.map(date=>{
    const cfg=configFor(state,date), preserved=keep.filter(s=>s.date===date), used=preserved.reduce((a,s)=>a+budgetCost(s),0);
    const lower=date===dateKey(now)?Math.ceil((now-at(date,0))/60000/5)*5:0;
    let intervals=subtract(availableFor(state,date),preserved.filter(s=>['planned','active'].includes(s.status)).map(s=>[s.start,s.end]));
    if(date<dateKey(now))intervals=[];else intervals=subtract(intervals,[[0,lower]]);
    const preservedBreaks=preserved.filter(s=>s.type==='break'&&s.status!=='skipped').length;
    const breaks=Math.max(0,cfg.breakCount-preservedBreaks);
    const free=intervals.reduce((a,[s,e])=>a+e-s,0);
    const budget=Math.max(0,Math.floor(Math.min(cfg.budget-used,free-breaks*cfg.breakMinutes)));
    capacity+=budget;
    return {date,cfg,intervals,budget,breaks,preserved};
  });
  const reserved=new Map();
  keep.filter(s=>s.type==='study'&&['planned','active'].includes(s.status)&&at(s.date,s.end)>now).forEach(s=>reserved.set(s.topicId,(reserved.get(s.topicId)||0)+s.end-s.start));
  const manualTotal=relevant.filter(t=>!t.goalId&&(t.minutes||t.remaining!=null)).reduce((a,t)=>a+Math.max(0,(t.remaining??t.minutes)-(reserved.get(t.id)||0)),0);
  const autoTotal=relevant.filter(t=>!t.goalId&&!t.minutes&&t.remaining==null).reduce((a,t)=>a+EFFORT[t.effort],0);
  const scale=autoTotal?Math.min(1,Math.max(0,capacity-manualTotal)/autoTotal):1;
  const queues=state.subjects.map(sub=>{let notBefore=0;const ordinary=relevant.filter(t=>t.subjectId===sub.id&&!t.goalId).map(t=>{
    const fixed=keep.filter(s=>s.topicId===t.id&&['planned','active'].includes(s.status)&&at(s.date,s.end)>now);
    for(const session of fixed)notBefore=Math.max(notBefore,at(session.date,session.end));
    return {topic:t,notBefore,left:Math.max(0,(t.remaining??t.minutes??Math.max(30,Math.floor(EFFORT[t.effort]*scale/5)*5))-(reserved.get(t.id)||0))};
  }).filter(x=>x.left>0);
    const goals=relevant.filter(t=>t.subjectId===sub.id&&t.goalId).map(t=>{const goal=(state.goals||[]).find(g=>g.id===t.goalId);return goal&&!goal.archived&&goal.completedSlides<goal.totalSlides?{topic:t,goal,notBefore:at(goal.startDate,0),deadline:at(addDays(goal.deadline,1),0),left:Infinity,target:goal.continuationMinutes||EFFORT[t.effort]}:null;}).filter(Boolean).sort((a,b)=>Number(!!b.goal.continuationMinutes)-Number(!!a.goal.continuationMinutes)||a.goal.deadline.localeCompare(b.goal.deadline));
    return [...goals.filter(x=>x.goal.continuationMinutes),...ordinary,...goals.filter(x=>!x.goal.continuationMinutes)];
  });
  let cursor=state.rotation%Math.max(1,queues.length);
  const planned=[];
  const next=time=>{for(let n=0;n<queues.length;n++){const i=(cursor+n)%queues.length;queues[i]=queues[i].filter(x=>!x.goal||x.deadline>time);if(queues[i][0]?.goal&&queues[i][0].notBefore>time){const ready=queues[i].findIndex(x=>x.notBefore<=time);if(ready>0)queues[i].unshift(...queues[i].splice(ready,1));}if(queues[i].length&&queues[i][0].notBefore<=time)return {i,item:queues[i][0]};}return null;};
  for(const day of dayData){
    let used=0,breaks=0,sinceBreak=0;
    const target=Math.max(30,Math.floor(day.budget/(day.breaks+1)));
    for(const [start,end] of day.intervals){
      let pos=start;
      while(pos<end&&used<day.budget){
        const candidate=next(at(day.date,pos));if(!candidate){const earliest=Math.min(...queues.filter(q=>q.length).map(q=>q[0].notBefore));const waitTo=(earliest-at(day.date,0))/60000;if(waitTo>pos&&waitTo<end){pos=waitTo;continue;}break;}
        if(breaks<day.breaks&&sinceBreak>=target){
          if(end-pos<day.cfg.breakMinutes)break;
          planned.push({id:uid(),type:'break',date:day.date,start:pos,end:pos+day.cfg.breakMinutes,status:'planned',locked:false});pos+=day.cfg.breakMinutes;breaks++;sinceBreak=0;continue;
        }
        const {i,item}=candidate;
        const space=Math.min(end-pos,day.budget-used);
        const minimum=Math.min(30,item.goal?item.target:item.left);
        if(space<minimum)break;
        let size=Math.min(item.left,item.goal?item.target:90,space);
        if(item.left>size&&item.left<60&&!item.topic.minutes)break;
        // Do not leave a tiny tail on a topic when splitting a long estimate.
        if(item.left-size>0&&item.left-size<30&&size>30)size=Math.max(30,size-(30-(item.left-size)));
        planned.push({id:uid(),type:'study',subjectId:item.topic.subjectId,topicId:item.topic.id,date:day.date,start:pos,end:pos+size,status:'planned',locked:false,attended:false,actualMinutes:0});
        pos+=size;used+=size;sinceBreak+=size;item.left-=size;
        if(item.goal){queues[i].shift();item.target=EFFORT[item.topic.effort];queues[i].push(item);}else if(item.left<=0)queues[i].shift();cursor=(i+1)%queues.length;
      }
    }
    if(used>0&&breaks<day.breaks)notices.push(`${day.date}: placed ${breaks} of ${day.breaks} requested breaks. Add availability or adjust breaks.`);
    for(const s of day.preserved.filter(s=>s.locked&&s.status==='planned')){ const conflict=validatePlacement(state,s,keep.filter(x=>x.id!==s.id));if(conflict)notices.push(`Locked session on ${s.date}: ${conflict}`); }
  }
  const overflow=queues.flatMap(q=>q.filter(x=>!x.goal).map(x=>({topicId:x.topic.id,minutes:x.left})));
  for(const item of overflow)notices.push(`${state.topics.find(t=>t.id===item.topicId)?.title}: ${item.minutes} minutes do not fit. Add time or carry this topic forward.`);
  for(const t of relevant.filter(t=>t.deadline&&!t.goalId)) { const sessions=[...keep,...planned].filter(s=>s.topicId===t.id&&['planned','active'].includes(s.status));if(sessions.some(s=>s.date>t.deadline)||overflow.some(o=>o.topicId===t.id))notices.push(`${t.title}: deadline ${t.deadline} needs attention. Rotation has been preserved.`); }
  state.sessions=[...keep,...planned].sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);
  state.notices=notices;state.lastPlanWeek=week;state.overflow=overflow;
  return {sessions:planned,notices,overflow};
}
export function validatePlacement(state,session,others=state.sessions.filter(s=>s.id!==session.id)) {
  const goal=(state.goals||[]).find(g=>g.id===state.topics.find(t=>t.id===session.topicId)?.goalId);
  if(goal&&(session.date>goal.deadline||session.date<goal.startDate))return 'Keep slide sessions between the goal’s start date and deadline.';
  if(!Number.isInteger(session.start)||!Number.isInteger(session.end)||session.start<0||session.end>1440||session.end<=session.start)return 'Choose a valid start and end time.';
  if(!availableFor(state,session.date).some(([s,e])=>session.start>=s&&session.end<=e))return 'This time is outside availability or overlaps a class.';
  if(others.some(s=>s.date===session.date&&['planned','active'].includes(s.status)&&s.start<session.end&&s.end>session.start))return 'This overlaps another session or break.';
  const total=others.filter(s=>s.date===session.date).reduce((a,s)=>a+budgetCost(s),0)+(session.type==='study'?session.end-session.start:0);
  if(total>configFor(state,session.date).budget)return 'This exceeds the daily study budget.';
  return null;
}
export function startSession(state,id,now=Date.now()) {
  reconcile(state,now);
  if(state.active)throw Error('Finish or stop the current session first.');
  const s=state.sessions.find(s=>s.id===id);
  if(!s||!['planned','missed'].includes(s.status))throw Error('This session cannot be started.');
  if(s.date!==dateKey(now))throw Error('Only today’s sessions can be started.');
  const goal=(state.goals||[]).find(g=>g.id===state.topics.find(t=>t.id===s.topicId)?.goalId);
  if(goal&&(s.status==='missed'||s.slideStart!==goal.startSlide+goal.completedSlides))throw Error('Start the earliest unfinished slide block, or replan to refresh missed slide sessions.');
  const min=Math.floor((now-at(s.date,0))/60000);
  // A late start uses the rest of its reserved slot; it must not push into the next break.
  const moved={...s,start:min,end:min>=s.start&&min<s.end?s.end:min+s.end-s.start};
  const conflict=validatePlacement(state,moved);
  if(conflict)throw Error(`${conflict} Replan today or move this session first.`);
  if(s.status==='missed')s.missedAt ||= now;
  s.originalStart??=s.start;s.start=moved.start;s.end=moved.end;s.status='active';
  state.active={sessionId:id,elapsedMs:0,runningSince:now,targetMs:Math.max(1000,at(s.date,s.end)-now)};
  if(s.type==='study'){const idx=state.subjects.findIndex(sub=>sub.id===s.subjectId);state.rotation=(idx+1)%Math.max(1,state.subjects.length);}
}
export function finishSession(state,complete,extra=30,now=Date.now(),slidesCompleted=0) {
  const active=state.active;if(!active)throw Error('There is no active session.');
  const s=state.sessions.find(s=>s.id===active.sessionId), ms=elapsed(state,now);
  s.actualMinutes=Math.round(ms/60000*10)/10;s.status='completed';s.finishedAt=now;
  s.originalEnd??=s.end;s.end=Math.max(s.start+1,Math.min(s.end,Math.ceil((now-at(s.date,0))/60000)));
  s.attended=!s.missedAt&&(complete||ms>=active.targetMs-1000);
  const topic=state.topics.find(t=>t.id===s.topicId);
  const goal=(state.goals||[]).find(g=>g.id===topic?.goalId);
  if(goal){
    const count=s.slideEnd-s.slideStart+1;
    if(!Number.isInteger(slidesCompleted)||slidesCompleted<0||slidesCompleted>count)throw Error(`Enter a completed slide count between 0 and ${count}.`);
    s.slidesCompleted=complete?count:slidesCompleted;
    goal.completedSlides=Math.min(goal.totalSlides,goal.completedSlides+s.slidesCompleted);
    goal.continuationMinutes=complete?null:extra;
    goal.continuationSlides=complete?0:count-s.slidesCompleted;
    if(goal.completedSlides>=goal.totalSlides){goal.completedAt=now;goal.continuationMinutes=null;topic.status='done';topic.completedAt=now;state.sessions=state.sessions.filter(x=>x.topicId!==topic.id||x.status!=='planned');}
    state.active=null;return;
  }
  if(topic){if(complete){topic.status='done';topic.completedAt=now;delete topic.remaining;state.sessions=state.sessions.filter(x=>x.topicId!==topic.id||x.status!=='planned');}else{topic.remaining=extra;topic.status='pending';}
    // An unfinished topic takes the next turn of its subject.
    const index=state.topics.indexOf(topic);state.topics.splice(index,1);const first=state.topics.findIndex(t=>t.subjectId===topic.subjectId&&t.status!=='done');state.topics.splice(first<0?state.topics.length:first,0,topic);
  }
  state.active=null;
  if(!complete)generatePlan(state,monday(new Date(now)),now);
  else if(topic){state.notices=state.notices.filter(n=>!n.startsWith(`${topic.title}:`));state.overflow=(state.overflow||[]).filter(o=>o.topicId!==topic.id);}
}
export function streakInfo(state,now=Date.now()) {
  const today=dateKey(now), days=[...new Set(state.sessions.filter(s=>s.type==='study'&&s.date<=today).map(s=>s.date))].sort();
  let current=0,best=0;
  const history=[];
  for(const date of days){const sessions=state.sessions.filter(s=>s.type==='study'&&s.date===date);const failed=sessions.some(s=>s.missedAt||['missed','skipped'].includes(s.status)||(s.status==='completed'&&!s.attended)||(date<today&&s.status!=='completed'));
    const success=!failed&&sessions.every(s=>s.status==='completed'&&s.attended);
    if(failed)current=0;else if(success){current++;best=Math.max(best,current);}
    history.push({date,status:failed?'missed':success?'complete':'pending'});
  }
  return {current,best,history};
}
export function validateState(s) {
  if(!s||s.version!==1||!Array.isArray(s.subjects)||!Array.isArray(s.topics)||!Array.isArray(s.sessions)||!Array.isArray(s.classes)||!s.settings||!Array.isArray(s.settings.days)||s.settings.days.length!==7||!s.overrides)throw Error('This is not a supported Acadence backup.');
  const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
  const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&dateKey(new Date(d+'T12:00:00'))===d;
  s.goals??=[];
  if(!Array.isArray(s.goals))throw Error('Slide goals are invalid.');
  for(const g of s.goals){if(!EFFORT[g.effort]||typeof g.archived!=='boolean'||(g.continuationMinutes!=null&&!finite(g.continuationMinutes,5,2400))||(g.continuationSlides!=null&&(!Number.isInteger(g.continuationSlides)||!finite(g.continuationSlides,0,100000))))throw Error('Slide goal progress is invalid.');if(s.topics.filter(t=>t.goalId===g.id&&t.subjectId===g.subjectId).length!==1)throw Error('A slide goal is missing its study topic.');}
  for(const g of s.goals)if(typeof g.id!=='string'||typeof g.title!=='string'||!s.subjects.some(sub=>sub.id===g.subjectId)||!validDate(g.startDate)||!validDate(g.deadline)||g.startDate>g.deadline||!Number.isInteger(g.totalSlides)||!finite(g.totalSlides,1,100000)||!Number.isInteger(g.completedSlides)||!finite(g.completedSlides,0,g.totalSlides)||!Number.isInteger(g.startSlide)||!finite(g.startSlide,1,100000))throw Error('A slide goal has invalid details.');
  if(!['light','dark'].includes(s.settings.theme)||typeof s.settings.petName!=='string'||!Number.isInteger(s.rotation)||s.rotation<0||!Array.isArray(s.notices))throw Error('App settings are invalid.');
  for(const key of ['petVisible','alwaysOnTop','hideFullscreen','sound','reducedMotion','startup'])if(typeof s.settings[key]!=='boolean')throw Error('App settings are invalid.');
  if(Object.keys(s.overrides).some(d=>!validDate(d)))throw Error('A date override is invalid.');
  const checkDay=d=>{if(!d||!Array.isArray(d.slots)||!finite(d.budget,0,1440)||!finite(d.breakCount,0,20)||!finite(d.breakMinutes,1,180)||d.slots.some(a=>!Array.isArray(a)||a.length!==2||!finite(a[0],0,1439)||!finite(a[1],1,1440)||a[1]<=a[0]))throw Error('Availability settings are invalid.');};
  s.settings.days.forEach(checkDay);Object.values(s.overrides).forEach(checkDay);
  if(!finite(s.settings.buffer,0,120))throw Error('Class buffer is invalid.');
  const ids=new Set();for(const row of [...s.subjects,...s.topics,...s.goals,...s.sessions,...s.classes]){if(typeof row.id!=='string'||ids.has(row.id))throw Error('Data contains missing or duplicate IDs.');ids.add(row.id);}
  for(const sub of s.subjects)if(typeof sub.name!=='string'||!/^#[0-9a-f]{6}$/i.test(sub.color))throw Error('Subject details are invalid.');
  for(const t of s.topics)if(typeof t.title!=='string'||!s.subjects.some(x=>x.id===t.subjectId)||!EFFORT[t.effort]||!validDate(t.week)||(t.deadline&&!validDate(t.deadline))||!['pending','done'].includes(t.status)||(t.minutes!=null&&!finite(t.minutes,5,2400))||(t.remaining!=null&&!finite(t.remaining,5,2400)))throw Error('Topic details are invalid.');
  for(const row of [...s.classes,...s.sessions])if(!finite(row.start,0,1439)||!finite(row.end,1,1440)||row.end<=row.start)throw Error('A schedule entry has invalid times.');
  for(const c of s.classes)if(typeof c.name!=='string'||!Number.isInteger(c.day)||c.day<0||c.day>6||(c.date&&!validDate(c.date)))throw Error('A class has invalid details.');
  for(const row of s.sessions)if(!validDate(row.date)||!['study','break'].includes(row.type)||!['planned','active','completed','missed','skipped'].includes(row.status)||(row.type==='study'&&(!s.topics.some(t=>t.id===row.topicId)||!s.subjects.some(sub=>sub.id===row.subjectId))))throw Error('A session has invalid details.');
  for(const row of s.sessions){if(row.goalId&&(!s.goals.some(g=>g.id===row.goalId)||!s.topics.some(t=>t.id===row.topicId&&t.goalId===row.goalId)||!Number.isInteger(row.slideStart)||!Number.isInteger(row.slideEnd)||row.slideStart<1||row.slideEnd<row.slideStart||(row.slidesCompleted!=null&&(!Number.isInteger(row.slidesCompleted)||!finite(row.slidesCompleted,0,row.slideEnd-row.slideStart+1)))))throw Error('A slide session has invalid progress.');}
  if(s.active&&!s.sessions.some(x=>x.id===s.active.sessionId))throw Error('The active session is missing.');
  if(s.active&&(!finite(s.active.elapsedMs,0,86400000)||!finite(s.active.targetMs,1,86400000)||(s.active.runningSince!==null&&!finite(s.active.runningSince,0,9999999999999))))throw Error('The active timer is invalid.');
  return s;
}
