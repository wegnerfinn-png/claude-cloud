const {chromium}=require('playwright');const fs=require('fs');
const TL=JSON.parse(fs.readFileSync('ok/timeline.json'));
const mode=process.argv[2]; // "preview" or "full"
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.addInitScript(tl=>{window.TL=tl},TL);
await p.goto('file://'+process.cwd()+'/ok/anim.html');await p.evaluate(()=>window.ready);
if(mode==='preview'){const ts=process.argv.slice(3).map(Number);
 for(const t of ts){await p.evaluate(t=>renderAt(t),t);await p.screenshot({path:`ok/pv_${t}.jpg`,type:'jpeg',quality:70})}}
else{fs.mkdirSync('ok/frames',{recursive:true});const fps=30,n=Math.ceil(TL.end*fps);
 for(let f=0;f<n;f++){await p.evaluate(t=>renderAt(t),f/fps);await p.screenshot({path:`ok/frames/${String(f).padStart(5,'0')}.jpg`,type:'jpeg',quality:88});if(f%150==0)console.log(f,'/',n)}}
console.log('errors',JSON.stringify(errs));await b.close()})();
