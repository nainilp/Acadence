import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,validateState} from '../shared/planner.mjs';
import {applyAction} from '../shared/actions.mjs';

test('older profiles adopt Bunsoy once without changing study records or other preferences',()=>{
  const state=freshState();delete state.settings.companionRevision;state.settings.petName='Mochi';state.settings.theme='dark';
  state.subjects.push({id:'biology',name:'Biology',color:'#a84f70'});
  const expected=structuredClone(state);expected.settings.petName='Bunsoy';expected.settings.companionRevision=1;
  assert.deepEqual(validateState(state),expected);
  const renamed=applyAction(state,{type:'settings',values:{petName:'Bunsoy Junior'}});
  assert.equal(validateState(renamed).settings.petName,'Bunsoy Junior');
  assert.equal(applyAction(renamed,{type:'settings',values:{petName:''}}).settings.petName,'Bunsoy');
});
