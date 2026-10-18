// Shared, host-independent catalogue for the website, PWA and future native app.
const PREFIX='/v1/music';
const MAX_AUDIO=30*1024*1024, MAX_COVER=5*1024*1024;
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function origins(env){return new Set([env.ALLOWED_ORIGIN,...String(env.MUSIC_ALLOWED_ORIGINS||'').split(',')].filter(Boolean))}
function headers(origin='*'){return {'Access-Control-Allow-Origin':origin,'Access-Control-Expose-Headers':'Content-Length, Content-Range, Accept-Ranges, ETag',Vary:'Origin','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}}
const json=(body,status=200,origin='*')=>new Response(JSON.stringify(body),{status,headers:{...headers(origin),'Content-Type':'application/json; charset=utf-8'}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
async function authorized(data,env){
 if(!env.EDITOR_USERNAME||!env.EDITOR_PASSWORD||typeof data.username!=='string'||typeof data.password!=='string')return false;
 const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const a=await hash(JSON.stringify([data.username,data.password])),b=await hash(JSON.stringify([env.EDITOR_USERNAME,env.EDITOR_PASSWORD]));let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
const key=id=>`tracks/${id}.json`;
async function read(bucket,id){const obj=await bucket.get(key(id));if(!obj)return null;return {track:await obj.json(),revision:obj.etag}}
function fields(input){
 const title=String(input.title||'').trim(),artist=String(input.artist||'').trim(),description=String(input.description||'').trim(),date=String(input.date||'');
 const duration=Number(input.duration);
 if(!title||title.length>180||!artist||artist.length>120||description.length>4000)throw fail('Inserisci titolo e autore; descrizione massima 4000 caratteri.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw fail('Data non valida.');
 if(!Number.isFinite(duration)||duration<=0||duration>7200)throw fail('Durata audio non valida.');
 return {title,artist,description,date,duration};
}
function publicTrack(t,url){const base=url.origin;return {id:t.id,type:'song',title:t.title,artist:t.artist,description:t.description,date:t.date,duration:t.duration,durationLabel:`${Math.floor(t.duration/60)}:${String(Math.floor(t.duration%60)).padStart(2,'0')}`,audio:`${base}${PREFIX}/audio/${t.id}`,image:`${base}${PREFIX}/cover/${t.id}`,published:t.date,updatedAt:t.updatedAt}}
async function catalogue(bucket){let cursor;const tracks=[];do{const list=await bucket.list({prefix:'tracks/',limit:100,cursor});for(let i=0;i<list.objects.length;i+=10){const chunk=await Promise.all(list.objects.slice(i,i+10).map(async o=>read(bucket,o.key.slice(7,-5))));tracks.push(...chunk.filter(Boolean))}cursor=list.truncated?list.cursor:undefined}while(cursor);return tracks.sort((a,b)=>b.track.date.localeCompare(a.track.date)||b.track.createdAt.localeCompare(a.track.createdAt))}
function byteRange(value,size){if(!value)return null;const m=/^bytes=(\d*)-(\d*)$/.exec(value);if(!m||(!m[1]&&!m[2]))throw fail('Intervallo non valido.',416);let start,end;if(!m[1]){const n=Number(m[2]);if(!Number.isSafeInteger(n)||n<=0)throw fail('Intervallo non valido.',416);start=Math.max(0,size-n);end=size-1}else{start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),size-1):size-1}if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)throw fail('Intervallo non valido.',416);return {offset:start,length:end-start+1}}
async function media(request,bucket,id,type,origin){
 const entry=await read(bucket,id);if(!entry||entry.track.status!=='published')return json({error:'Brano non disponibile.'},404,origin);
 const objectKey=type==='audio'?entry.track.audioKey:entry.track.coverKey,head=await bucket.head(objectKey);if(!head)return json({error:'File non disponibile.'},404,origin);
 const h=new Headers(headers(origin));head.writeHttpMetadata(h);h.set('ETag',head.httpEtag);h.set('Accept-Ranges','bytes');h.set('Content-Length',head.size);
 if(request.headers.get('If-None-Match')===head.httpEtag)return new Response(null,{status:304,headers:h});
 let range=null;try{const ifRange=request.headers.get('If-Range');if(!ifRange||ifRange===head.httpEtag)range=byteRange(request.headers.get('Range'),head.size)}catch{h.set('Content-Range',`bytes */${head.size}`);h.delete('Content-Length');return new Response(null,{status:416,headers:h})}
 if(range){h.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${head.size}`);h.set('Content-Length',range.length)}
 if(request.method==='HEAD')return new Response(null,{status:range?206:200,headers:h});
 const obj=await bucket.get(objectKey,range?{range}:undefined);return new Response(obj?.body||null,{status:obj?(range?206:200):404,headers:h});
}
async function upload(form,bucket,url){
 const audio=form.get('audio'),cover=form.get('cover');
 if(!audio||typeof audio.arrayBuffer!=='function'||!audio.size||audio.size>MAX_AUDIO||!/^audio\/(mpeg|mp3)$/.test(audio.type))throw fail('Seleziona un MP3, massimo 30 MB.');
 if(!cover||typeof cover.arrayBuffer!=='function'||!cover.size||cover.size>MAX_COVER||!/^image\/(jpeg|png|webp)$/.test(cover.type))throw fail('Seleziona una copertina JPG, PNG o WEBP, massimo 5 MB.');
 const meta=fields(Object.fromEntries(['title','artist','description','date','duration'].map(k=>[k,form.get(k)])));
 const start=new Uint8Array(await audio.slice(0,12).arrayBuffer());if(!(start[0]===73&&start[1]===68&&start[2]===51)&&!(start[0]===255&&(start[1]&224)===224))throw fail('Il file non sembra un MP3 valido.');
 const bytes=new Uint8Array(await cover.slice(0,12).arrayBuffer());const mime=cover.type;
 const matches=mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:mime==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71: new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';if(!matches)throw fail('Formato della copertina non valido.');
 const id=crypto.randomUUID(),ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[mime],audioKey=`audio/${id}.mp3`,coverKey=`covers/${id}.${ext}`,now=new Date().toISOString();
 const track={id,...meta,status:'draft',audioKey,coverKey,createdAt:now,updatedAt:now};
 try{await bucket.put(audioKey,audio.stream(),{httpMetadata:{contentType:'audio/mpeg'}});await bucket.put(coverKey,cover.stream(),{httpMetadata:{contentType:mime}});const saved=await bucket.put(key(id),JSON.stringify(track),{httpMetadata:{contentType:'application/json'}});return {...publicTrack(track,url),status:'draft',revision:saved.etag}}catch(e){await Promise.allSettled([bucket.delete(audioKey),bucket.delete(coverKey),bucket.delete(key(id))]);throw e}
}
export async function musicRoute(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin'),trusted=!origin||origins(env).has(origin),cors=origin&&trusted?origin:'*';
 if(request.method==='OPTIONS'){if(origin&&!trusted)return json({error:'Origine non autorizzata.'},403);return new Response(null,{status:204,headers:{...headers(cors),'Access-Control-Allow-Methods':'GET, HEAD, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Range, If-Range, If-None-Match'}})}
 if(!env.MUSIC_BUCKET)return json({error:'Archivio musicale non ancora attivato.'},503,cors);
 try{
  if(url.pathname===PREFIX&&request.method==='GET'){const entries=await catalogue(env.MUSIC_BUCKET);return json({tracks:entries.filter(e=>e.track.status==='published').map(e=>publicTrack(e.track,url))},200,cors)}
  const match=url.pathname.match(/^\/v1\/music\/(audio|cover)\/([^/]+)$/);if(match&&['GET','HEAD'].includes(request.method)&&idPattern.test(match[2]))return await media(request,env.MUSIC_BUCKET,match[2],match[1],cors);
  if(request.method!=='POST')return json({error:'Indirizzo non trovato.'},404,cors);
  if(!origin||!trusted)return json({error:'Origine non autorizzata.'},403,cors);
  // Limit buffering before parsing multipart bodies in the 128 MB Worker runtime.
  const length=Number(request.headers.get('Content-Length'));if(length>MAX_AUDIO+MAX_COVER+65536)return json({error:'Caricamento troppo grande.'},413,cors);
  const multipart=request.headers.get('Content-Type')?.startsWith('multipart/form-data');
  const limit=multipart?MAX_AUDIO+MAX_COVER+65536:65536;let received=0;
  const limited=request.body?.pipeThrough(new TransformStream({transform(chunk,controller){received+=chunk.byteLength;if(received>limit)throw fail('Caricamento troppo grande.',413);controller.enqueue(chunk)}}));
  const body=new Response(limited,{headers:request.headers});
  const input=multipart?await body.formData():await body.json();const auth=multipart?{username:input.get('username'),password:input.get('password')}:input;
  if(!await authorized(auth,env))return json({error:'Credenziali non riconosciute.'},401,cors);
  if(url.pathname===`${PREFIX}/list`&&!multipart){const entries=await catalogue(env.MUSIC_BUCKET);return json({tracks:entries.map(e=>({...publicTrack(e.track,url),status:e.track.status,revision:e.revision}))},200,cors)}
  if(url.pathname===`${PREFIX}/upload`&&multipart)return json({track:await upload(input,env.MUSIC_BUCKET,url)},201,cors);
  if(url.pathname===`${PREFIX}/update`&&!multipart){
   if(!idPattern.test(input.id))throw fail('Brano non valido.');const old=await read(env.MUSIC_BUCKET,input.id);if(!old)throw fail('Brano non trovato.',404);
   if(!['draft','published'].includes(input.status))throw fail('Stato non valido.');if(input.revision!==old.revision)throw fail('Il brano è stato aggiornato: ricarica l’elenco.',409);
   const next={...old.track,...fields(input),status:input.status,updatedAt:new Date().toISOString()};
   const saved=await env.MUSIC_BUCKET.put(key(input.id),JSON.stringify(next),{onlyIf:{etagMatches:old.revision},httpMetadata:{contentType:'application/json'}});if(!saved)throw fail('Aggiornamento contemporaneo: ricarica l’elenco.',409);
   return json({track:{...publicTrack(next,url),status:next.status,revision:saved.etag}},200,cors);
  }
  return json({error:'Indirizzo non trovato.'},404,cors);
 }catch(e){return json({error:e.status?e.message:'Operazione non completata. Riprova.'},e.status||500,cors)}
}
