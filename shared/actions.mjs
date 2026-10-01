import { uid, freshState, validateState, reconcile, generatePlan, startSession, finishSession, elapsed, monday, dateKey, addDays, validatePlacement, COLORS } from './planner.mjs';
import {planGoals,allocateSlides} from './goals.mjs';
import {startWorking,finishBlock,stopWorking,advanceWorking} from './working.mjs';
const text=(s,max=200)=>String(s||'').trim().slice(0,max);
const number=(n,min,max)=>{n=Number(n);if(!Number.isFinite(n)||n<min||n>max)throw Error(`Enter a number between ${min} and ${max}.`);return n;};
export function applyAction(original,action,now=Date.now()) {
  const state=structuredClone(original);state.goals??=[];reconcile(state,now);
  if(['finish','finish-block'].includes(action.type)&&action.sessionId&&action.sessionId!==state.active?.sessionId)throw Error('This block has already changed. Check your current block before saving progress.');
  switch(action.type){
    case 'subject': {
      const name=text(action.name,60);if(!name)throw Error('Give the subject a name.');
      if(action.id){const sub=state.subjects.find(s=>s.id===action.id);if(!sub)throw Error('Subject not found.');sub.name=name;sub.color=action.color||sub.color;}
      else state.subjects.push({id:uid(),name,color:COLORS[state.subjects.length%COLORS.length]});break;
    }
    case 'reorder-subject': {const i=state.subjects.findIndex(s=>s.id===action.id),j=i+action.direction;if(i>=0&&j>=0&&j<state.subjects.length)[state.subjects[i],state.subjects[j]]=[state.subjects[j],state.subjects[i]];break;}
    case 'goal': {
      if(!state.subjects.some(s=>s.id===action.subjectId))throw Error('Choose a subject first.');
      const title=text(action.title);if(!title)throw Error('Give your slide goal a name.');
      const totalSlides=number(action.totalSlides,1,100000),startSlide=number(action.startSlide||1,1,100000);
      if(!Number.isInteger(totalSlides)||!Number.isInteger(startSlide))throw Error('Slide counts must be whole numbers.');
      if(!action.deadline||action.deadline<dateKey(now)||action.deadline>addDays(dateKey(now),365))throw Error('Choose a goal date between today and one year from today.');
      if(!['light','normal','heavy'].includes(action.effort))throw Error('Choose an effort rating.');
      let goal=state.goals.find(g=>g.id===action.id);
      if(action.id&&!goal)throw Error('Goal not found.');
      if(goal&&state.sessions.some(s=>s.goalId===goal.id&&s.status==='active'))throw Error('Check in on the active slide session before editing its goal.');
      if(goal&&totalSlides<goal.completedSlides)throw Error('The goal must include the slides you have already completed.');
      if(goal&&goal.completedSlides>0&&startSlide!==goal.startSlide)throw Error('Keep the starting slide unchanged after progress has been recorded.');
      const completedSlides=number(action.completedSlides??goal?.completedSlides??0,0,totalSlides);
      if(!Number.isInteger(completedSlides))throw Error('Slide counts must be whole numbers.');
      const values={title,subjectId:action.subjectId,totalSlides,startSlide,completedSlides,deadline:action.deadline,startDate:action.startDate||goal?.startDate||dateKey(now),effort:action.effort,archived:false,continuationMinutes:null,continuationSlides:0};
      if(goal)Object.assign(goal,values);else{goal={id:uid(),...values};state.goals.push(goal);}
      if(completedSlides===totalSlides)goal.completedAt??=now;else delete goal.completedAt;
      let topic=state.topics.find(t=>t.goalId===goal.id);
      const topicValues={subjectId:goal.subjectId,title:goal.title,goalId:goal.id,effort:goal.effort,minutes:null,week:monday(new Date(goal.startDate+'T12:00:00')),deadline:goal.deadline,status:goal.completedSlides>=goal.totalSlides?'done':'pending'};
      if(topic)Object.assign(topic,topicValues);else{topic={id:uid(),...topicValues};state.topics.push(topic);}
      if(completedSlides===totalSlides)topic.completedAt??=now;else delete topic.completedAt;
      break;
    }
    case 'archive-goal': {
      const goal=state.goals.find(g=>g.id===action.id);if(!goal)throw Error('Goal not found.');
      const topic=state.topics.find(t=>t.goalId===goal.id);
      if(state.sessions.some(s=>s.topicId===topic?.id&&s.status==='active'))throw Error('Check in on the active slide session before archiving its goal.');
      goal.archived=true;if(topic)topic.status='done';state.sessions=state.sessions.filter(s=>s.topicId!==topic?.id||s.status!=='planned');break;
    }
    case 'topic': {
      if(!state.subjects.some(s=>s.id===action.subjectId))throw Error('Choose a subject first.');
      const title=text(action.title);if(!title)throw Error('Give the topic a name.');
      if(!['light','normal','heavy'].includes(action.effort))throw Error('Choose an effort rating.');
      const values={subjectId:action.subjectId,title,effort:action.effort,minutes:action.minutes?number(action.minutes,5,2400):null,deadline:action.deadline||null,week:action.week||monday(new Date(now))};
      if(action.id){const t=state.topics.find(t=>t.id===action.id);if(!t)throw Error('Topic not found.');Object.assign(t,values);}
      else state.topics.push({id:uid(),...values,status:'pending'});break;
    }
    case 'remove-topic': {if(state.sessions.some(s=>s.topicId===action.id&&s.status!=='planned'))throw Error('This topic has study history. Keep it to preserve your records.');state.topics=state.topics.filter(t=>t.id!==action.id);state.sessions=state.sessions.filter(s=>s.topicId!==action.id);break;}
    case 'reorder-topic': {const t=state.topics.find(t=>t.id===action.id),same=state.topics.filter(x=>x.subjectId===t?.subjectId&&x.status!=='done');const i=same.findIndex(x=>x.id===action.id),other=same[i+action.direction];if(other){const a=state.topics.indexOf(t),b=state.topics.indexOf(other);[state.topics[a],state.topics[b]]=[state.topics[b],state.topics[a]];}break;}
    case 'copy-topics': {const source=state.topics.filter(t=>t.week===action.from&&!t.goalId);for(const t of source)state.topics.push({...t,id:uid(),week:action.week,status:'pending',remaining:undefined,completedAt:undefined});break;}
    case 'settings': {const allowed=['theme','petName','petVisible','alwaysOnTop','hideFullscreen','sound','reducedMotion','startup','buffer','days'];for(const key of allowed)if(action.values[key]!==undefined)state.settings[key]=action.values[key];state.settings.petName=text(state.settings.petName,30)||'Bunsoy';break;}
    case 'override': {if(!/^\d{4}-\d{2}-\d{2}$/.test(action.date))throw Error('Choose a date.');if(action.value)state.overrides[action.date]=action.value;else delete state.overrides[action.date];break;}
    case 'classes': {for(const c of action.rows){const row={id:c.id||uid(),name:text(c.name,100)||'Class',start:number(c.start,0,1439),end:number(c.end,1,1440),day:number(c.day,0,6),date:c.date||null};if(row.end<=row.start)throw Error('Class end must be after its start.');const i=state.classes.findIndex(x=>x.id===row.id);if(i>=0)state.classes[i]=row;else state.classes.push(row);}break;}
    case 'remove-class': state.classes=state.classes.filter(c=>c.id!==action.id);break;
    case 'plan': if(state.goals.some(g=>!g.archived&&g.completedSlides<g.totalSlides))planGoals(state,now);else generatePlan(state,action.week||monday(new Date(now)),now);break;
    case 'move': {const s=state.sessions.find(s=>s.id===action.id);if(!s||s.status!=='planned')throw Error('Only upcoming sessions can be changed. Missed records are kept.');const next={...s,date:action.date||s.date,start:Number(action.start??s.start),end:Number(action.end??s.end),locked:action.locked??true};if(new Date(`${next.date}T00:00:00`).getTime()+next.start*60000<now)throw Error('Choose a future time.');const error=validatePlacement(state,next);if(error)throw Error(error);Object.assign(s,next);break;}
    case 'lock': {const s=state.sessions.find(s=>s.id===action.id);if(s?.status==='planned')s.locked=!s.locked;break;}
    case 'start': startSession(state,action.id,now);break;
    case 'start-working': startWorking(state,now);break;
    case 'finish-block': finishBlock(state,action,now);break;
    case 'stop-working': stopWorking(state,now);break;
    case 'pause': if(state.active){state.active.elapsedMs=elapsed(state,now);state.active.runningSince=null;state.active.pauseReason=action.reason||'Paused';}break;
    case 'resume': {if(!state.active)break;if(state.active.elapsedMs>=state.active.targetMs)throw Error('Session time is complete. Check in to finish or request more time.');const s=state.sessions.find(s=>s.id===state.active.sessionId);if(s.date!==dateKey(now))throw Error('This session is from a previous day. Finish it or stop and replan.');const min=Math.floor((now-new Date(`${s.date}T00:00:00`).getTime())/60000),remaining=Math.max(1,Math.ceil((state.active.targetMs-state.active.elapsedMs)/60000));const err=validatePlacement(state,{...s,start:min,end:min+remaining});if(err)throw Error(`${err} Stop and replan to find another time.`);state.active.runningSince=now;state.active.pauseReason=null;break;}
    case 'finish': if(state.working)finishBlock(state,action,now);else finishSession(state,!!action.complete,number(action.extra||30,5,2400),now,action.slidesCompleted==null?undefined:Number(action.slidesCompleted));break;
    case 'stop': stopWorking(state,now);break;
    case 'skip': {const s=state.sessions.find(s=>s.id===action.id);if(s&&['planned','missed'].includes(s.status)){s.status='skipped';if(s.type==='study')s.missedAt||=now;}break;}
    case 'tick': advanceWorking(state,now);break;
    case 'reset': return freshState();
    default: throw Error('Unknown action.');
  }
  if(['start-working','finish-block','stop-working','stop'].includes(action.type)||(action.type==='finish'&&original.working))return validateState(state);
  const affectsPlan=['topic','remove-topic','reorder-topic','reorder-subject','copy-topics','classes','remove-class','override','stop'].includes(action.type)||(action.type==='finish'&&!action.complete)||(action.type==='settings'&&(action.values.days!==undefined||action.values.buffer!==undefined));
  const finishedGoal=action.type==='finish'&&original.topics.find(t=>t.id===original.sessions.find(s=>s.id===original.active?.sessionId)?.topicId)?.goalId;
  validateState(state);
  const hasGoals=state.goals.some(g=>!g.archived&&g.completedSlides<g.totalSlides);
  if(['goal','archive-goal'].includes(action.type)||finishedGoal||(hasGoals&&affectsPlan))planGoals(state,now);
  else if(affectsPlan&&state.lastPlanWeek){
    const current=monday(new Date(now)),previousWeek=state.lastPlanWeek;
    const weeks=new Set(state.sessions.filter(s=>s.date>=dateKey(now)&&['planned','active'].includes(s.status)).map(s=>monday(new Date(s.date+'T12:00:00'))));
    if(previousWeek>=current)weeks.add(previousWeek);
    if(state.sessions.some(s=>s.date>=current&&s.date<=dateKey(now)))weeks.add(current);
    state.sessions=state.sessions.filter(s=>s.status!=='planned'||s.locked||!weeks.has(monday(new Date(s.date+'T12:00:00'))));
    const notes=[];for(const week of [...weeks].sort()){generatePlan(state,week,now);notes.push(...state.notices);}
    state.notices=[...new Set(notes)];state.lastPlanWeek=previousWeek;
  }
  if(hasGoals&&action.type==='skip')planGoals(state,now);
  if(hasGoals&&['move','lock'].includes(action.type))allocateSlides(state,now);
  return validateState(state);
}
