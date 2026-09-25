import {freshState} from '../shared/planner.mjs';
import {applyAction} from '../shared/actions.mjs';
let browserState;
const listeners=new Set();
function getBrowser(){if(!browserState){try{browserState=JSON.parse(localStorage.getItem('acadence-preview'))||freshState();}catch{browserState=freshState();}}return browserState;}
export const desktop=!!window.acadence;
export const api=window.acadence||{
  get:async()=>getBrowser(),
  action:async action=>{browserState=applyAction(getBrowser(),action);localStorage.setItem('acadence-preview',JSON.stringify(browserState));listeners.forEach(fn=>fn(browserState));return browserState;},
  onState:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},
  onOcr:()=>()=>{},onCue:()=>()=>{},
  ocr:async()=>{throw Error('Timetable recognition is available in the installed Windows app.');},
  backup:async()=>{const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(getBrowser(),null,2)],{type:'application/json'}));a.href=url;a.download='Acadence-backup.json';a.click();URL.revokeObjectURL(url);return true;},
  restore:async()=>{throw Error('Restore a backup from the installed app.');},
  clear:async()=>{if(confirm('Permanently clear all preview data?')){browserState=freshState();localStorage.removeItem('acadence-preview');listeners.forEach(fn=>fn(browserState));return true;}return false;},
  window:async()=>{},dataLocation:async()=> 'Browser preview. The installed app stores data in your Windows profile.'
};
