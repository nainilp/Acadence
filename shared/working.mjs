import {at,dateKey,monday,addDays,elapsed,generatePlan,startSession,finishSession,EFFORT} from './planner.mjs';
import {planGoals,allocateSlides} from './goals.mjs';

// Rebuild all unlocked future work, retaining completed records and locked blocks.
export function replanRemaining(state,now=Date.now()) {
  planGoals(state,now);
  const notes=[...state.notices];
  let week=state.lastPlanWeek;
  const lastTopicWeek=state.topics.filter(t=>t.status!=='done'&&!t.goalId).map(t=>t.week).sort().at(-1);
  const limit=addDays(monday(new Date(now)),364);
  while(week<limit&&((state.overflow||[]).length||lastTopicWeek>week)) {
    week=addDays(week,7);
    generatePlan(state,week,now);
    // Only final overflow belongs in the notes; earlier overflow was carried.
    notes.push(...state.notices.filter(n=>!n.includes('minutes do not fit.')));
  }
  state.notices=[...new Set([...notes.filter(n=>!n.includes('minutes do not fit.')), ...state.notices])];
  allocateSlides(state,now);
  state.lastPlanWeek=monday(new Date(now));
}

function topicWork(state,session) {
  const topic=state.topics.find(t=>t.id===session.topicId);
  const scheduled=state.sessions.filter(s=>s.topicId===topic?.id&&['active','planned'].includes(s.status)).reduce((sum,s)=>sum+s.end-s.start,0);
  return {topic,minutes:topic?.remaining??Math.max(scheduled,topic?.minutes||0,scheduled?0:EFFORT[topic?.effort]||0)};
}

export function advanceWorking(state,now=Date.now()) {
  if(!state.working||state.active)return;
  if(state.working.date!==dateKey(now)){state.working=null;replanRemaining(state,now);return;}
  const minute=Math.floor((now-at(dateKey(now),0))/60000);
  const next=state.sessions.find(s=>s.date===dateKey(now)&&s.status==='planned'&&s.end>minute);
  if(!next){state.working=null;replanRemaining(state,now);state.notices.unshift('Your working session is complete. Remaining work is planned for your next available time.');return;}
  // A locked future block or a class may mean a short wait. Do not lose progress
  // or reject the finished block just because the next one cannot start yet.
  if(next.locked&&now<at(next.date,next.start)){state.working.waitingFor=next.id;return;}
  try{startSession(state,next.id,now);}catch(error){state.working.waitingFor=next.id;state.working.waitReason=error.message;return;}
  delete state.working.waitingFor;
  delete state.working.waitReason;
}

export function startWorking(state,now=Date.now()) {
  if(state.active||state.working)throw Error('You are already working. Finish the current block or stop working first.');
  if(!state.topics.some(t=>t.status!=='done'&&(!t.goalId||!state.goals.find(g=>g.id===t.goalId)?.archived)))throw Error('Add a topic or slide goal before starting work.');
  state.working={startedAt:now,date:dateKey(now),start:Math.floor((now-at(dateKey(now),0))/60000),completedBlocks:0};
  replanRemaining(state,now);
  advanceWorking(state,now);
}

export function finishBlock(state,action,now=Date.now()) {
  const session=state.sessions.find(s=>s.id===state.active?.sessionId);
  if(!session)throw Error('There is no active block.');
  const {topic,minutes}=topicWork(state,session);
  const goal=state.goals.find(g=>g.id===topic?.goalId);
  if(goal||session.type==='break')finishSession(state,action.complete!==false,30,now,action.slidesCompleted==null?undefined:Number(action.slidesCompleted));
  else {
    const remaining=action.complete===false?Number(action.extra):Math.max(0,minutes-(session.end-session.start));
    if(!Number.isFinite(remaining)||remaining<0||remaining>2400||(remaining>0&&remaining<5))throw Error('Enter remaining work between 5 and 2400 minutes.');
    finishSession(state,remaining===0,remaining||30,now);
  }
  if(state.working)state.working.completedBlocks++;
  replanRemaining(state,now);
  advanceWorking(state,now);
}

export function stopWorking(state,now=Date.now()) {
  if(state.active){
    const session=state.sessions.find(s=>s.id===state.active.sessionId);
    const {topic,minutes}=topicWork(state,session);
    const studied=elapsed(state,now)/60000;
    // Time spent is recorded, but stopping never claims an unfinished block
    // or unreported slides as completed.
    if(topic&&!topic.goalId)topic.remaining=Math.max(5,Math.ceil(minutes-Math.min(studied,session.end-session.start)));
    session.actualMinutes=Math.round(studied*10)/10;
    session.status='stopped';session.stoppedAt=now;
    session.originalEnd??=session.end;
    session.end=Math.max(session.start+1,Math.min(session.end,Math.ceil((now-at(session.date,0))/60000)));
    state.active=null;
  }
  // Unstarted flexible blocks are rescheduled rather than marked as missed.
  state.sessions=state.sessions.filter(s=>s.status!=='planned'||s.locked||s.date<dateKey(now));
  state.working=null;
  replanRemaining(state,now);
}
