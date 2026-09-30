import React,{useState} from 'react';
import {dateKey,addDays,EFFORT,durationLabel} from '../shared/planner.mjs';

export function GoalList({state,subjectId,setModal,act,filter=''}){
  const goals=(state.goals||[]).filter(g=>(!subjectId||g.subjectId===subjectId)&&!g.archived&&g.title.toLowerCase().includes(filter.toLowerCase()));
  return <div className="goal-list">{goals.map(g=>{
    const blocks=state.sessions.filter(s=>s.goalId===g.id&&['planned','active'].includes(s.status));
    return <article className="goal-card" key={g.id}>
      <div className="goal-heading"><div><span className="eyebrow">SLIDE GOAL · DUE {g.deadline}</span><h3>{g.title}</h3></div>{setModal&&<button className="button small secondary" onClick={()=>setModal({type:'goal',item:g,subjectId:g.subjectId})}>Edit goal</button>}</div>
      <div className="goal-progress"><strong>{g.completedSlides}<span> / {g.totalSlides} slides</span></strong><span>{Math.round(g.completedSlides/g.totalSlides*100)}%</span></div>
      <progress aria-label={`${g.title} slide progress`} max={g.totalSlides} value={g.completedSlides}/>
      <p>{g.completedSlides===g.totalSlides?'Goal complete. Every slide accounted for.':blocks.length?`${blocks.length} study blocks · next: slides ${blocks[0].slideStart}–${blocks[0].slideEnd}`:'No time scheduled. Check availability and planning notes.'}</p>
    </article>;
  })}</div>;
}

export function GoalModal({item,subjectId,act,onClose,Modal,Field,Button}){
  const [title,setTitle]=useState(item?.title||''),[totalSlides,setTotal]=useState(item?.totalSlides||60),[completedSlides,setCompleted]=useState(item?.completedSlides||0),[startSlide,setStart]=useState(item?.startSlide||1),[deadline,setDeadline]=useState(item?.deadline||addDays(dateKey(),7)),[effort,setEffort]=useState(item?.effort||'normal');
  return <Modal title={item?'Edit slide goal':'Set a slide goal'} onClose={onClose}><form onSubmit={async e=>{e.preventDefault();if(await act({type:'goal',id:item?.id,subjectId,title,totalSlides:Number(totalSlides),completedSlides:Number(completedSlides),startSlide:Number(startSlide),deadline,effort},'Slide goal saved. Remaining slides are divided equally across your study blocks.'))onClose();}}>
    <Field label="Goal name"><input autoFocus required maxLength={200} placeholder="e.g. Finish cell biology slides" value={title} onChange={e=>setTitle(e.target.value)}/></Field>
    <div className="form-grid"><Field label="Number of slides"><input required type="number" min={Math.max(1,item?.completedSlides||0)} max={100000} step={1} value={totalSlides} onChange={e=>setTotal(e.target.value)}/></Field><Field label="First slide number"><input required disabled={item?.completedSlides>0} type="number" min={1} max={100000} step={1} value={startSlide} onChange={e=>setStart(e.target.value)}/></Field></div>
    <Field label="Slides completed so far" hint="Total finished toward this goal, including slides studied outside the app."><input required type="number" min={0} max={Number(totalSlides)} step={1} value={completedSlides} onChange={e=>setCompleted(e.target.value)}/></Field>
    <Field label="Finish by"><input required type="date" min={dateKey()} max={addDays(dateKey(),365)} value={deadline} onChange={e=>setDeadline(e.target.value)}/></Field>
    <Field label="Effort per study block"><select value={effort} onChange={e=>setEffort(e.target.value)}>{Object.entries(EFFORT).map(([key,min])=><option key={key} value={key}>{key[0].toUpperCase()+key.slice(1)} · {durationLabel(min)}</option>)}</select></Field>
    <p className="small muted">Remaining slides are divided equally across your study blocks through this date. Whole-slide counts may differ by one. Record how many slides you finish at check-in, and the remaining blocks adjust automatically. Classes, breaks, and daily budgets still apply.</p>
    <div className="modal-actions">{item&&<Button type="button" variant="danger-text" onClick={async()=>{if(await act({type:'archive-goal',id:item.id},'Goal archived. Your study history is saved.'))onClose();}}>Archive goal</Button>}<Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save goal & plan</Button></div>
  </form></Modal>;
}
