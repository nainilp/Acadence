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
  const [title,setTitle]=useState(item?.title||''),[totalSlides,setTotal]=useState(item?.totalSlides||60),[startSlide,setStart]=useState(item?.startSlide||1),[deadline,setDeadline]=useState(item?.deadline||addDays(dateKey(),7)),[effort,setEffort]=useState(item?.effort||'normal');
  return <Modal title={item?'Edit slide goal':'Set a slide goal'} onClose={onClose}><form onSubmit={async e=>{e.preventDefault();if(await act({type:'goal',id:item?.id,subjectId,title,totalSlides:Number(totalSlides),startSlide:Number(startSlide),deadline,effort},'Slide goal saved. Your plan now includes the remaining slides.'))onClose();}}>
    <Field label="Goal name"><input autoFocus required maxLength={200} placeholder="e.g. Finish cell biology slides" value={title} onChange={e=>setTitle(e.target.value)}/></Field>
    <div className="form-grid"><Field label="Number of slides"><input required type="number" min={Math.max(1,item?.completedSlides||0)} max={100000} step={1} value={totalSlides} onChange={e=>setTotal(e.target.value)}/></Field><Field label="First slide number"><input required disabled={item?.completedSlides>0} type="number" min={1} max={100000} step={1} value={startSlide} onChange={e=>setStart(e.target.value)}/></Field></div>
    <Field label="Finish by"><input required type="date" min={dateKey()} max={addDays(dateKey(),365)} value={deadline} onChange={e=>setDeadline(e.target.value)}/></Field>
    <Field label="Effort per study block"><select value={effort} onChange={e=>setEffort(e.target.value)}>{Object.entries(EFFORT).map(([key,min])=><option key={key} value={key}>{key[0].toUpperCase()+key.slice(1)} · {durationLabel(min)}</option>)}</select></Field>
    <p className="small muted">Slides are divided across your available study time through this date, in subject rotation. The plan respects classes, breaks, and daily budgets. Check each block’s slide count to make sure the pace feels realistic.</p>
    <div className="modal-actions">{item&&<Button type="button" variant="danger-text" onClick={async()=>{if(await act({type:'archive-goal',id:item.id},'Goal archived. Your study history is saved.'))onClose();}}>Archive goal</Button>}<Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save goal & plan</Button></div>
  </form></Modal>;
}
