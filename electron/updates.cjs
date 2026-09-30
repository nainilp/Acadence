// The updater runs in the main process; renderers never receive remote URLs or installers.
function createUpdateManager({updater,showDialog,onState=()=>{},prepareInstall=async()=>{},onInstallFailure=()=>{},canPrompt=()=>true,currentVersion}) {
  let state={status:'idle',currentVersion,version:null,percent:0,message:'Checks GitHub for new releases.'};
  let available=null,declined=null,checking=null,prompting=null;
  const get=()=>({...state});
  const set=values=>{state={...state,...values};onState(get());};
  const fail=()=>{onInstallFailure();set({status:'error',message:'Could not complete the update. Check your connection and try again.'});};
  updater.autoDownload=false;
  updater.autoInstallOnAppQuit=false;
  updater.allowPrerelease=false;
  updater.allowDowngrade=false;
  updater.disableWebInstaller=true;
  updater.on('checking-for-update',()=>set({status:'checking',message:'Checking GitHub for updates…'}));
  updater.on('update-available',info=>{available=info;set({status:'available',version:info.version,message:`Acadence ${info.version} is available.`});});
  updater.on('update-not-available',()=>{available=null;set({status:'current',version:null,message:'You’re using the latest version.'});});
  updater.on('download-progress',progress=>set({status:'downloading',percent:Math.max(0,Math.min(100,Math.round(progress.percent))),message:'Downloading your update…'}));
  updater.on('update-downloaded',()=>set({status:'ready',percent:100,message:'Your update is ready to install.'}));
  updater.on('error',fail);
  async function reportFailure(){await showDialog({type:'error',title:'Update could not finish',message:'Acadence could not complete the update.',detail:'Your study data is still saved. Check your internet connection and try again from Settings.',buttons:['OK']});}
  function promptPending(manual=false){
    if(prompting)return prompting;
    if(!available||!['available','ready'].includes(state.status)||(!manual&&(declined===available.version||!canPrompt())))return Promise.resolve(get());
    prompting=(async()=>{
      try{
        const {response}=await showDialog({type:'info',title:'Update available',message:`Acadence ${available.version} is available.`,detail:'Update now to download and install the new version. Acadence will save your study data and restart.',buttons:['Update now','Not now'],defaultId:1,cancelId:1,noLink:true});
        if(response!==0){declined=available.version;return get();}
        if(state.status!=='ready'){
          set({status:'downloading',percent:0,message:'Downloading your update…'});
          await updater.downloadUpdate();
          if(state.status!=='ready')throw Error('The download was not verified.');
        }
        set({status:'installing',message:'Saving your study data and restarting…'});
        await prepareInstall();
        updater.quitAndInstall(true,true);
        if(state.status==='error')await reportFailure();
      }catch{fail();await reportFailure();}
      return get();
    })().finally(()=>{prompting=null;});
    return prompting;
  }
  function check(manual=false){
    if(checking)return checking;
    if(prompting||['downloading','installing'].includes(state.status))return Promise.resolve(get());
    // A downloaded installer stays ready if saving failed; do not download it again on retry.
    if(available&&state.status==='ready')return promptPending(manual);
    checking=(async()=>{
      try{
        await updater.checkForUpdates();
        await promptPending(manual);
      }catch{fail();if(manual)await reportFailure();}
      return get();
    })().finally(()=>{checking=null;});
    return checking;
  }
  return {get,check,promptPending};
}
module.exports={createUpdateManager};
