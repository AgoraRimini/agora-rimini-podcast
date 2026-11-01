/* Shared public catalogue with versioned, build-generated cover derivatives. */
window.AgoraMusic=(()=>{
 const origin='https://agorariminipodcast.it';
 let manifestPromise;
 function manifest(){
  if(!manifestPromise)manifestPromise=fetch(origin+'/assets/covers/manifest.json',{cache:'no-cache',signal:AbortSignal.timeout(4000)})
   .then(r=>{if(!r.ok)throw Error('Copertine non disponibili');return r.json()})
   .catch(()=>{manifestPromise=null;return {music:{}}});
  return manifestPromise;
 }
 async function optimizeTracks(tracks){
  const images=await manifest();
  return tracks.map(track=>{
   const cover=images.music?.[track.id];
   if(!cover||cover.updatedAt!==track.updatedAt)return track;
   return {...track,image:origin+cover.image,imageThumbnail:origin+cover.thumbnail};
  });
 }
 async function optimizeArticles(articles){
  const images=await manifest();
  return articles.map(article=>{
   let key;try{const url=new URL(article.image,origin);if(url.origin!==origin)return article;key=url.pathname}catch{return article}
   const cover=images.articles?.[key];return cover?{...article,image:origin+cover.image,imageThumbnail:origin+cover.thumbnail}:article;
  });
 }
 window.AgoraCoverImages={articles:optimizeArticles};
 return {
  optimizeTracks,
  async list({signal}={}){
   const r=await fetch('https://agora-editorial-api.paolo-rocchetti.workers.dev/v1/music',{cache:'no-store',signal});
   if(!r.ok)throw Error(r.status===503?'Archivio musicale in attivazione.':'Catalogo musicale non disponibile.');
   const data=await r.json();if(!Array.isArray(data.tracks))throw Error('Catalogo non valido.');
   return optimizeTracks(data.tracks.filter(t=>t.id&&t.title&&t.artist&&/^https:\/\//.test(t.audio)&&/^https:\/\//.test(t.image)));
  }
 };
})();
