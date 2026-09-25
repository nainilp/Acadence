import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTimetable} from '../shared/ocr.mjs';
test('extracts weekday, name and 24-hour range',()=>{const p=parseTimetable('Monday 09:00 - 10:30 Biology\nWednesday 13:00 - 14:00 Math');assert.equal(p.rows.length,2);assert.equal(p.rows[0].day,0);assert.equal(p.rows[0].name,'Biology');assert.equal(p.rows[1].start,780);assert.ok(p.rows.every(r=>r.needsReview));});
test('extracts multiple days and AM/PM',()=>{const p=parseTimetable('Mon Wed Fri 9:00 AM - 10:00 AM Chemistry');assert.equal(p.rows.length,3);assert.deepEqual(p.rows.map(r=>r.day),[0,2,4]);assert.equal(p.rows[0].start,540);});
test('period mapping resolves numbered periods',()=>{const p=parseTimetable('Tuesday Period 2 Biology',[],[{period:2,start:600,end:650}]);assert.equal(p.rows[0].start,600);assert.equal(p.rows[0].day,1);});
test('ambiguous images get a manual fallback',()=>{const p=parseTimetable('Unreadable handwriting');assert.equal(p.rows.length,0);assert.match(p.notes[0],/manually/);});
test('invalid time ranges never become classes',()=>{const p=parseTimetable('Monday 25:00 - 26:00 Math');assert.equal(p.rows.length,0);});
test('weekday words in separate list rows are not mistaken for column headers',()=>{const lines=['Monday 09:00 - 10:00 Biology','Tuesday 11:00 - 12:00 Mathematics','Friday 13:00 - 14:00 English'].map((text,i)=>({text,bbox:{x0:70,x1:1000,y0:i*100,y1:i*100+40},words:[{text:text.split(' ')[0],bbox:{x0:70,x1:250,y0:i*100,y1:i*100+40}}]}));const p=parseTimetable(lines.map(l=>l.text).join('\n'),[{paragraphs:[{lines}]}]);assert.equal(p.rows.length,3);assert.deepEqual(p.rows.map(r=>r.name),['Biology','Mathematics','English']);});
