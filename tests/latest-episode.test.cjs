const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('latest-episode.js','utf8');
class Node extends EventTarget {
 constructor(){super();this.attrs={};this.value=0;this.textContent='';this.disabled=false;this.hidden=true;this.currentTime=0;this.duration=NaN;this.paused=true;this.ended=false;this.dataset={};}
 setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k]??null;} removeAttribute(k){delete this.attrs[k];}
 querySelector(){return this.label;} load(){this.duration=NaN;this.currentTime=0;} async play(){this.paused=false;this.dispatchEvent(new Event('play'));} pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
}
const episode=(id,title='Puntata '+id)=>({episode_id:id,title,type:'RECORDED',published_at:'2026-10-14 20:'+String(id).padStart(2,'0'),duration:60000});
const tick=()=>new Promise(r=>setImmediate(r));
async function setup(items=[episode(1)],fail=false){
 const ids=['latest-audio','latest-play','latest-seek','latest-status','latest-title','latest-link','latest-time'];
 const nodes=Object.fromEntries(ids.map(id=>[id,new Node()]));const panel=new Node();const skips=[new Node(),new Node()];skips[0].dataset.skip='-15';skips[1].dataset.skip='30';panel.querySelectorAll=()=>skips;nodes['latest-play'].label=new Node();
 const document=new EventTarget();document.hidden=false;document.querySelector=s=>s==='.hero-latest'?panel:nodes[s.slice(1)];document.querySelectorAll=()=>[nodes['latest-audio']];const window=new EventTarget();let refresh;let current=items;let failing=fail;
 vm.runInNewContext(source,{document,window,Event,AbortSignal,localStorage:{getItem(){return null},setItem(){}},setInterval(fn,ms){assert.equal(ms,60000);refresh=fn;},fetch:async url=>{if(failing&&url.startsWith('https:'))throw Error('offline');return {ok:true,json:async()=>url.startsWith('https:')?{response:{items:current}}:episode(9)};}});
 await tick();return {nodes,panel,skips,refresh,document,setItems:x=>current=x,setFail:x=>failing=x};
}
test('latest published episode selected and displayed safely',async()=>{const x=await setup([episode(1),episode(2,'<img onerror=alert(1)>')]);assert.equal(x.nodes['latest-title'].textContent,'<img onerror=alert(1)>');assert.equal(x.panel.hidden,false);assert.equal(x.nodes['latest-audio'].getAttribute('src'),null);});
test('refresh replaces idle episode without rebuild',async()=>{const x=await setup();x.setItems([episode(2)]);await x.refresh();assert.equal(x.nodes['latest-title'].textContent,'Puntata 2');});
test('new episode does not interrupt active or paused listening; applies on end',async()=>{const x=await setup();const a=x.nodes['latest-audio'];a.currentTime=12;a.paused=true;x.setItems([episode(2)]);await x.refresh();assert.equal(x.nodes['latest-title'].textContent,'Puntata 1');a.ended=true;a.dispatchEvent(new Event('ended'));assert.equal(x.nodes['latest-title'].textContent,'Puntata 2');});
test('API outage falls back to static snapshot',async()=>{const x=await setup([],true);assert.equal(x.nodes['latest-title'].textContent,'Puntata 9');});
test('transient API error preserves displayed episode',async()=>{const x=await setup();x.setFail(true);await x.refresh();assert.equal(x.nodes['latest-title'].textContent,'Puntata 1');});
test('skip clamps at start and end; seek reflects position',async()=>{const x=await setup();const a=x.nodes['latest-audio'];a.duration=60;a.currentTime=5;x.skips[0].dispatchEvent(new Event('click'));assert.equal(a.currentTime,0);a.currentTime=50;x.skips[1].dispatchEvent(new Event('click'));assert.equal(a.currentTime,60);x.nodes['latest-seek'].value=50;x.nodes['latest-seek'].dispatchEvent(new Event('input'));assert.equal(a.currentTime,30);});
test('play uses matching episode stream; trailer event pauses it',async()=>{const x=await setup();const a=x.nodes['latest-audio'];Object.defineProperty(a,'src',{set(v){this.attrs.src=v;}});x.nodes['latest-play'].dispatchEvent(new Event('click'));await tick();assert.equal(a.getAttribute('src'),'https://api.spreaker.com/v2/episodes/1/play.mp3');assert.equal(a.paused,false);x.document.dispatchEvent(new Event('agora:trailer-play'));assert.equal(a.paused,true);});
