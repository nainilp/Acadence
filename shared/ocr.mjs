import { uid, DAYS } from './planner.mjs';
const dayPattern=/\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/ig;
const rangePattern=/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–—to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/ig;
function parseTime(s, meridiem){const m=s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);if(!m)return null;let h=+m[1],min=+(m[2]||0),ap=(m[3]||meridiem||'').toLowerCase();if(ap){if(h<1||h>12)return null;h=h%12+(ap==='pm'?12:0);}if(h>23||min>59)return null;return h*60+min;}
export function parseTimetable(text,blocks=[],periods=[]) {
  const rows=[],notes=[];let currentDays=[];
  for(const line of text.split(/\r?\n/)){
    const days=[...line.matchAll(dayPattern)].map(m=>DAYS.findIndex(d=>d.toLowerCase().startsWith(m[1].toLowerCase().slice(0,3))));
    if(days.length)currentDays=days;
    const ranges=[...line.matchAll(rangePattern)];
    const period=line.match(/\b(?:period|p)\s*(\d+)\b/i);const mapping=period&&periods.find(p=>String(p.period)===period[1]);
    if(!ranges.length&&!mapping)continue;
    for(const match of ranges.length?ranges:[null]){
      const meridiem=match?.[2].match(/(am|pm)/i)?.[1];
      const start=match?parseTime(match[1],meridiem):mapping.start,end=match?parseTime(match[2]):mapping.end;
      let name=line.replace(dayPattern,'').replace(rangePattern,'').replace(/\b(?:period|p)\s*\d+\b/ig,'').replace(/[|,;]+/g,' ').trim()||'Class';
      if(start==null||end==null||end<=start){notes.push(`Check the time in “${line.trim()}”.`);continue;}
      for(const day of currentDays.length?currentDays:[0])rows.push({id:uid(),name,day,start,end,needsReview:true});
    }
  }
  // Column calendars: assign words to weekday headers by x position and row times by y.
  const words=blocks.flatMap(b=>b.paragraphs||[]).flatMap(p=>p.lines||[]).flatMap(l=>l.words||[]);
  const candidates=words.filter(w=>new RegExp(`^(${DAYS.map(d=>d+'|'+d.slice(0,3)).join('|')})$`,'i').test(w.text)).map(w=>({...w,day:DAYS.findIndex(d=>d.slice(0,3).toLowerCase()===w.text.slice(0,3).toLowerCase()),cx:(w.bbox.x0+w.bbox.x1)/2,cy:(w.bbox.y0+w.bbox.y1)/2}));
  // Weekdays in a vertical list are not calendar column headings.
  const headerGroups=candidates.map(c=>candidates.filter(w=>Math.abs(w.cy-c.cy)<=Math.max(12,(c.bbox.y1-c.bbox.y0)/2))).sort((a,b)=>b.length-a.length);
  const headers=(headerGroups[0]||[]).sort((a,b)=>a.cx-b.cx).filter((h,i,all)=>!i||h.cx-all[i-1].cx>40);
  if(headers.length>=2){
    const lines=blocks.flatMap(b=>b.paragraphs||[]).flatMap(p=>p.lines||[]);
    const timeRows=lines.map(l=>{const m=[...l.text.matchAll(rangePattern)][0];return m?{line:l,start:parseTime(m[1],m[2].match(/(am|pm)/i)?.[1]),end:parseTime(m[2]),cy:(l.bbox.y0+l.bbox.y1)/2}:null;}).filter(r=>r&&r.start!=null&&r.end>r.start);
    const grid=[];
    for(const row of timeRows){for(let i=0;i<headers.length;i++){const h=headers[i],left=i?(headers[i-1].cx+h.cx)/2:h.bbox.x0-30,right=i+1<headers.length?(h.cx+headers[i+1].cx)/2:Infinity;
      const name=words.filter(w=>{const x=(w.bbox.x0+w.bbox.x1)/2,y=(w.bbox.y0+w.bbox.y1)/2;return x>=left&&x<right&&Math.abs(y-row.cy)<Math.max(18,(row.line.bbox.y1-row.line.bbox.y0)*1.5)&&!headers.includes(w);}).map(w=>w.text).join(' ').replace(rangePattern,'').trim();
      if(name&&!/^(break|lunch|free|—|-)$/i.test(name))grid.push({id:uid(),name,day:h.day,start:row.start,end:row.end,needsReview:true});
    }}
    if(grid.length){rows.splice(0,rows.length,...grid);notes.push('Calendar columns were detected. Review every class and time before saving.');}
  }
  if(!rows.length)notes.push('No complete class times were found. Add classes manually, or enter period times and try parsing again.');
  return {rows,notes};
}
