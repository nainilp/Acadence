const { createWorker } = require('tesseract.js');
const model = require('@tesseract.js-data/eng');
const path = require('node:path');
const unpack = p => p.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
let busy=false;
exports.read = async function(buffer,logger=()=>{}) {
  if(busy)throw Error('A timetable is already being read. Please wait.');
  busy=true;let worker,timer;
  try {
    worker=await createWorker('eng',1,{langPath:unpack(model.langPath),workerPath:unpack(path.join(path.dirname(require.resolve('tesseract.js/package.json')),'src/worker-script/node/index.js')),gzip:true,cacheMethod:'none',logger});
    await worker.setParameters({tessedit_pageseg_mode:'3'});
    const {data}=await Promise.race([worker.recognize(buffer,{}, {text:true,blocks:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('This image is taking too long to read. Try a clearer crop or enter the classes manually.')),90000);})]);
    return {text:data.text,blocks:data.blocks||[],confidence:data.confidence};
  } finally {clearTimeout(timer);if(worker)await worker.terminate();busy=false;}
};
