import React,{useEffect,useState} from 'react';
import {Download} from 'lucide-react';
import {api} from './api';

export default function Updates({Button}){
  const [update,setUpdate]=useState(null);
  useEffect(()=>{
    let mounted=true;
    api.updateStatus().then(value=>{if(mounted)setUpdate(value);}).catch(()=>{if(mounted)setUpdate({status:'error',message:'Update information is unavailable. Try checking again.'});});
    const unsubscribe=api.onUpdate(value=>{if(mounted)setUpdate(value);});
    return()=>{mounted=false;unsubscribe();};
  },[]);
  const busy=!update||['checking','downloading','installing'].includes(update.status);
  async function check(){setUpdate(current=>({...current,status:'checking',message:'Checking GitHub for updates…'}));try{setUpdate(await api.checkUpdates());}catch{setUpdate({status:'error',message:'Could not check for updates. Check your connection and try again.'});}}
  return <section className="card settings-card">
    <h3><Download size={20}/>App updates</h3>
    <p className="muted small" role="status">{update?.message||'Loading update information…'}</p>
    {update?.status==='downloading'&&<progress aria-label="Update download progress" max={100} value={update.percent}/>}
    <div className="button-row"><Button variant="secondary" icon={Download} disabled={busy||update?.status==='unsupported'} onClick={check}>{busy?'Please wait…':'Check for updates'}</Button></div>
    <p className="small muted">New releases are checked on launch and while the app is open. You choose when to download and install.</p>
  </section>;
}
