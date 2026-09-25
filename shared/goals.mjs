import {generatePlan,monday,dateKey,addDays} from './planner.mjs';

export function sessionTitle(state,session) {
  if(!session)return '';
  if(session.type==='break')return 'Take a break';
  const title=state.topics.find(t=>t.id===session.topicId)?.title||'Study session';
  return session.slideStart!=null?`${title} · slides ${session.slideStart}–${session.slideEnd}`:title;
}

export function allocateSlides(state,now=Date.now()) {
  const remove=new Set();
  for(const goal of state.goals||[]){
    const topic=state.topics.find(t=>t.goalId===goal.id);if(!topic)continue;
    const active=state.sessions.find(s=>s.topicId===topic.id&&s.status==='active');
    const activeCount=active?active.slideEnd-active.slideStart+1:0;
    let remaining=Math.max(0,goal.totalSlides-goal.completedSlides-activeCount),continuationCount=0;
    let sessions=state.sessions.filter(s=>s.topicId===topic.id&&s.status==='planned').sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);
    for(const s of sessions)if(s.date>goal.deadline||s.date<goal.startDate||goal.archived)remove.add(s.id);
    sessions=sessions.filter(s=>!remove.has(s.id));
    if(!active&&goal.continuationSlides>0&&sessions.length>1&&remaining>0){
      const first=sessions.shift();continuationCount=Math.min(remaining,goal.continuationSlides);
      first.slideStart=goal.startSlide+goal.completedSlides;first.slideEnd=first.slideStart+continuationCount-1;first.goalId=goal.id;
      remaining-=continuationCount;
    }
    if(sessions.length>remaining){
      const keep=new Set();
      // Preserve as many locked blocks as the number of slides allows, then spread the rest over the horizon.
      sessions.filter(s=>s.locked).slice(0,remaining).forEach(s=>keep.add(s.id));
      const candidates=sessions.filter(s=>!keep.has(s.id)),needed=remaining-keep.size;
      for(let i=0;i<needed;i++)keep.add(candidates[needed===1?0:Math.round(i*(candidates.length-1)/(needed-1))].id);
      for(const s of sessions)if(!keep.has(s.id))remove.add(s.id);
      sessions=sessions.filter(s=>keep.has(s.id));
    }
    if(remaining&&!sessions.length&&!goal.archived){state.notices.push(`${goal.title}: ${remaining} slides have no study time before ${goal.deadline}. Add availability, reduce other work, or change the goal date.`);continue;}
    const weight=sessions.reduce((a,s)=>a+s.end-s.start,0),extra=Math.max(0,remaining-sessions.length);
    const allocations=sessions.map(s=>{const raw=weight?extra*(s.end-s.start)/weight:0;return {s,count:1+Math.floor(raw),fraction:raw-Math.floor(raw)};});
    let rest=remaining-allocations.reduce((a,x)=>a+x.count,0);
    for(const item of [...allocations].sort((a,b)=>b.fraction-a.fraction)){if(rest<=0)break;item.count++;rest--;}
    let next=goal.startSlide+goal.completedSlides+activeCount+continuationCount;
    for(const item of allocations){item.s.slideStart=next;item.s.slideEnd=next+item.count-1;item.s.goalId=goal.id;next+=item.count;}
  }
  state.sessions=state.sessions.filter(s=>!remove.has(s.id));
  // A break belongs between study blocks, never on a now-empty day after excess slide blocks were removed.
  state.sessions=state.sessions.filter(s=>s.type!=='break'||s.status!=='planned'||s.locked||state.sessions.some(x=>x.type==='study'&&x.date===s.date&&['planned','active'].includes(x.status)));
  state.notices=[...new Set(state.notices)];
}

export function planGoals(state,now=Date.now()) {
  const current=monday(new Date(now)),today=dateKey(now),activeGoals=(state.goals||[]).filter(g=>!g.archived&&g.completedSlides<g.totalSlides);
  const futureWeeks=state.sessions.filter(s=>s.date>=today&&s.status==='planned').map(s=>monday(new Date(s.date+'T12:00:00')));
  const last=[current,...activeGoals.map(g=>monday(new Date(g.deadline+'T12:00:00'))),...futureWeeks].sort().at(-1);
  if(last>addDays(current,371))throw Error('Please set a goal date within the next year.');
  state.sessions=state.sessions.filter(s=>s.status!=='planned'||s.locked||s.date<today);
  const originalRotation=state.rotation,notes=[];
  for(let week=current;week<=last;week=addDays(week,7)){
    const result=generatePlan(state,week,now);notes.push(...result.notices);
    const lastStudy=state.sessions.filter(s=>s.date>=week&&s.date<addDays(week,7)&&s.type==='study'&&['planned','active'].includes(s.status)).at(-1);
    if(lastStudy)state.rotation=(state.subjects.findIndex(s=>s.id===lastStudy.subjectId)+1)%Math.max(1,state.subjects.length);
  }
  state.rotation=originalRotation;state.lastPlanWeek=current;state.notices=[...new Set(notes)];
  allocateSlides(state,now);
}
