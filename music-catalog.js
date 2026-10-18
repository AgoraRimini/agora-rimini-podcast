/* Shared read-only client. Public components decide their own presentation. */
window.AgoraMusic={
 async list({signal}={}){
  const r=await fetch('https://agora-editorial-api.paolo-rocchetti.workers.dev/v1/music',{cache:'no-store',signal});
  if(!r.ok)throw Error(r.status===503?'Archivio musicale in attivazione.':'Catalogo musicale non disponibile.');
  const data=await r.json();if(!Array.isArray(data.tracks))throw Error('Catalogo non valido.');
  return data.tracks.filter(t=>t.id&&t.title&&t.artist&&/^https:\/\//.test(t.audio)&&/^https:\/\//.test(t.image));
 }
};
