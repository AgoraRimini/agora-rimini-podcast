# Gestione musicale condivisa — attivazione

Codice predisposto sul ramo `feat/music-upload-r2`. Nessuna modifica al sito pubblico fino alla verifica dell'hosting e all'approvazione della sezione musicale.

## Cloudflare

1. Nell'account che ospita `agora-editorial-api`, attivare R2 Standard e creare il bucket **agora-audio**. Lasciare disabilitati accesso pubblico r2.dev e dominio personalizzato: il Worker serve solo i brani pubblicati e supporta richieste Range per avanzamento/riavvolgimento.
2. Collegare il bucket al Worker con il binding **MUSIC_BUCKET**. Il file `worker/wrangler.jsonc` contiene la dichiarazione.
3. Conservare le variabili e i segreti esistenti `EDITOR_USERNAME`, `EDITOR_PASSWORD`, `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, `ALLOWED_ORIGIN`. Aggiungere `MUSIC_ALLOWED_ORIGINS` dal file Wrangler; non inserire password nel repository.
4. Dopo merge/revisione del codice, dal percorso `worker`: `npx wrangler deploy`. Il workflow GitHub Pages pubblica solo il sito statico: non aggiorna il Worker. Il bucket va creato prima di questo deploy.
5. Verificare `/v1/music`: prima dei caricamenti deve rispondere con `{"tracks":[]}`. Un 503 significa binding assente. Le API articoli devono continuare a funzionare.
6. Aprire `/admin/music.html`, accedere con le credenziali della redazione, caricare MP3 + copertina, verificare la bozza e poi pubblicarla. I file restano in R2, mai nel repository.

## Formati e comportamento

- MP3 massimo 30 MB; copertina JPG/PNG/WEBP massimo 5 MB; durata ricavata dal file nel browser.
- Nuovi brani sempre in bozza. Il pulsante Pubblica li rende disponibili nel catalogo; Ritira rimuove la disponibilità senza eliminare i file.
- Nessuna funzione offline né dipendenza da account Spotify/altre piattaforme.
- Catalogo pubblico: `GET /v1/music`. Audio/copertina: `GET` e `HEAD /v1/music/audio/<id>` e `/cover/<id>`.
- R2 rimane privato; l'API verifica lo stato del brano prima di ogni lettura. Nessuna cache persistente evita che i brani ritirati restino pubblicamente disponibili dalla cache applicativa (quanto già scaricato da un visitatore non può essere richiamato).
- `music-catalog.js` è il client comune per sito, PWA e futura app. Le due interfacce pubbliche e l'integrazione con il player saranno attivate dopo scelta grafica. Nella PWA si riuserà l'unico elemento audio permanente del player Pulse.
- Il catalogo ordina per data di uscita; la data non pianifica automaticamente la pubblicazione.

## Test

`node --test worker/tests/music.test.mjs`

I test usano un bucket simulato; sono necessari anche collaudo R2 reale, caricamento di un brano vero, ascolto e verifica visiva su telefono/desktop. Non dichiarare il servizio attivo prima di tali verifiche.
