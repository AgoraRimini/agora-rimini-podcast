# Audit e ottimizzazione Agorà Rimini Podcast

10 novembre 2026, Europe/Rome.

## Riferimenti e perimetro

Commit iniziale `6e0ef47eb5a9d059991b0082a785a108bdd57958`. Il checkout iniziale era pulito. Il branch di lavoro è `perf/audit-ottimizzazione`.

L'audit comprende sorgenti del sito, generazione delle pagine, CMS e servizio musicale presenti in questo repository. La PWA è stata ispezionata sul dominio pubblico, attraverso HTML, script, manifest, service worker e prove nel browser.

I workflow associati al commit iniziale risultavano completati con successo. I workflow di pubblicazione e aggiornamento puntate sono attivati su main o con avvio esplicito. Le verifiche del branch sono state eseguite localmente. La pubblicazione richiede l'approvazione del proprietario. [Workflow Pages iniziale](https://github.com/AgoraRimini/agora-rimini-podcast/actions/runs/42634796578)

## Problemi riscontrati e interventi

| Gravità | Riscontro | Intervento |
| --- | --- | --- |
| Alta | Logo JPEG da 514.703 byte, 4000 × 3798 pixel, usato in spazi piccoli. Home con due URL distinti dello stesso file | Derivata WebP da 36.736 byte, lato massimo 576 pixel. URL condiviso tra intestazione, footer e dettaglio musicale. Sostituzione dei soli tag immagine nella build di archivio, articoli, admin e pagina download |
| Alta | Ritratti PNG da 2,61–2,79 MB caricati nelle intestazioni editoriali | Derivate WebP con trasparenza, dimensioni 1024 × 1536 e 512 × 768, srcset e sizes. Paolo passa da 2.788.358 a 418.972 o 115.802 byte |
| Media | Selezione iniziale del brano assegnava subito src e avviava il caricamento dei metadati audio | Assegnazione dello stream al primo Play. Conservati avanzamento playlist, pausa, riprova dopo errore e mutua esclusione con le puntate |
| Media | Font TTF locale da 110.296 byte | WOFF2 da 39.488 byte con fallback TTF. Verificati identità della mappa caratteri e ordine dei glifi |
| Media | Catena script.js → quotes.js → quotes-fix.js → quotes-fix.css, con due listener sul pulsante casuale | Inizializzazione delle citazioni da script defer, unico listener attivo nella nuova home, fusione degli stili correttivi nel foglio citazioni |
| Media | Script indipendenti di ultima puntata, musica e citazioni attendevano l'SDK esterno del trailer per l'esecuzione | Ordine dei defer aggiornato per inizializzare questi moduli prima dell'SDK |
| Bassa | Richiesta articles.json anche per articoli con riferimenti soltanto a puntate o canzoni | Richiesta condizionata alla presenza di riferimenti ad articoli. Uscita anticipata se mancano riferimenti |
| Bassa | Catena CSS tramite @import e scoperta tardiva della grafica hero | Preload della dipendenza styles-base.css e dell'immagine hero, mantenendo ordine e regole della cascata |
| Bassa | Copertina statica di fallback e copertina del brano caricate subito | Lazy loading delle immagini fuori dalla prima schermata |
| Bassa | Il catalogo articoli della home ignorava la cache del browser | Revalidazione HTTP con no-cache, compatibile con ETag e aggiornamenti editoriali |

La build esistente già ottimizzava le copertine degli articoli e dei brani. È stata riutilizzata, aggiungendo ritratti responsive, logo e dimensioni intrinseche alle immagini editoriali. Il fallback della home usa la miniatura già generata.

Le verifiche dei riferimenti includono HTML, script dinamici, template del CMS, generatori e CSS. Gli originali delle immagini sono input della generazione e dei metadati social. Gli URL quotes-fix.js e quotes-fix.css sono disponibili per le pagine già presenti nelle cache, mentre la nuova home carica direttamente la logica consolidata. La compatibilità delle cache ha quindi determinato la conservazione di questi due file.

Sono presenti selettori storici del player Spotify e varie sovrapposizioni responsive. La rimozione estesa del CSS richiede copertura visuale delle varianti generate e degli stati interattivi. In questo intervento la cascata è stata conservata. Le risorse image-tools.js, styles-base.css, gli originali editoriali e gli script editoriali hanno riferimenti effettivi.

## Misurazioni

Sono state confrontate copie locali del commit iniziale e della build ottimizzata, eseguendo gli stessi generatori usati dalla pubblicazione. Sono stati usati Node 24.22.1, Chromium 155.0.8059.39, Lighthouse 13.6.0 e Pillow 10.2.0. Il workflow pubblico usa Pillow 12.1.1.

I dati seguenti sono mediane di tre prove valide per ogni versione e profilo. Le dodici prove sono state alternate prima/dopo ed eseguite in sequenza. Il server era SimpleHTTPRequestHandler su loopback, con cache browser svuotata e preset Lighthouse desktop o mobile. Le risorse esterne erano live.

Questi valori descrivono il laboratorio locale. Il server locale serve i file senza la compressione e la CDN della produzione. I TTFB locali rappresentano soltanto il server di prova. Le prove mobile usano il rallentamento simulato del preset. Lighthouse ha segnalato una CPU host più lenta del riferimento atteso.

| Metrica home | Desktop prima | Desktop dopo | Mobile prima | Mobile dopo |
| --- | ---: | ---: | ---: | ---: |
| Lighthouse Performance | 50 | 77 | 35 | 39 |
| FCP | 1,000 s | 1,006 s | 3,136 s | 3,020 s |
| LCP | 2,842 s | 1,893 s | 14,438 s | 6,854 s |
| CLS | 0,002981 | 0,003020 | 0,008897 | 0 |
| TBT | 606 ms | 215 ms | 2055 ms | 2173 ms |
| Risposta documento / TTFB locale | 2 ms | 6 ms | 3 ms | 2 ms |
| Byte trasferiti | 2.550.827 | 1.225.835 | 2.522.355 | 1.107.135 |
| Richieste nel log Lighthouse | 54 | 49 | 54 | 48 |

Il trasferimento della home diminuisce del 51,9% su desktop e del 56,1% su mobile. LCP diminuisce del 33,4% e del 52,5%.

Il TBT mobile aumenta del 5,8% nella mediana. Gli intervalli sono ampi, da 834 a 2940 ms prima e da 1345 a 2937 ms dopo. La riduzione del lavoro bloccante mobile rimane un problema aperto. Il punteggio mobile è ancora basso.

INP richiede una raccolta rappresentativa di interazioni reali. Sono state provate le interazioni nel browser, ma manca una misura INP sul campo. TBT e INP sono riportati come metriche distinte.

Le prime prove esplorative avevano punteggi desktop 58 → 39 e mobile 26 → 39. La variabilità ha motivato la serie alternata di tre prove. Un tentativo di ripetizione è terminato con CHROME_INTERSTITIAL_ERROR dopo la chiusura dei server temporanei. Quelle esecuzioni fallite sono escluse dalle mediane.

### Articolo e tracce browser

Sono state raccolte anche tracce della home e dell'articolo Antisemitismo o anti-critica con viewport desktop 1440 × 900 e mobile 390 × 844. Per queste tracce il mobile usa latenza 150 ms, download 200.000 byte/s, upload 93.750 byte/s e CPU rallentata 4×.

La finestra di osservazione termina undici secondi dopo DOMContentLoaded. I byte seguenti contano soltanto richieste completate nella finestra, quindi possono escludere risorse ancora in trasferimento. Si tratta di una singola coppia esplorativa.

| Articolo | Prima | Dopo |
| --- | ---: | ---: |
| Desktop, byte completati | 3.768.638 | 847.050 |
| Desktop, richieste iniziate | 17 | 16 |
| Desktop, LCP osservato | 5,152 s | 0,944 s |
| Mobile, byte completati | 971.051 | 543.880 |
| Mobile, richieste iniziate | 17 | 16 |
| Mobile, LCP osservato | 6,732 s | 2,788 s |

La traccia desktop iniziale completa il ritratto PNG. La traccia mobile iniziale termina prima del suo completamento. Questo limita il confronto del peso mobile dell'articolo.

La home passava da una richiesta audio anticipata a zero nella stessa finestra di osservazione. La successiva prova funzionale ha confermato lo streaming R2 dopo Play.

## Rete e cache pubbliche

Sono state verificate risposte HTTP effettive.

- GitHub Pages serve HTML, CSS, JSON e manifest delle copertine con Cache-Control max-age=600 ed ETag. HTML, CSS e JSON risultano compressi gzip.
- L'API musicale pubblica usa Cache-Control no-store e compressione Brotli. L'API Spreaker usa direttive private/no-cache/no-store.
- Il manifest PWA e sw.js rispondono con public, max-age=0, must-revalidate.
- Il link APK 2.6.1 risponde 200 alla richiesta HEAD.

Le politiche delle API sono rispettate dal client. La frequenza di aggiornamento dei cataloghi è di sessanta secondi, con controlli di visibilità già presenti. La configurazione delle intestazioni GitHub Pages dipende dall'hosting.

Il service worker pubblico usa la cache agora-pwa-v37 e una strategia network-first con fallback su errore di rete. Nel precache compaiono varianti versionate e prive di versione di player.js, real-app.js e real-app.css. Questa duplicazione comporta richieste e copie aggiuntive durante l'installazione della PWA. I sorgenti della PWA sono gestiti separatamente dal repository del sito.

## Verifiche di regressione

| Verifica | Esito e copertura |
| --- | --- |
| Test automatici | 35 passati, zero falliti. Ultima puntata, generazione RSS, permalink, CMS e musica R2 |
| Nuovi test audio | Caricamento al Play, pausa, avanzamento automatico al brano seguente e pausa avviata dalla puntata |
| Validazione archivio | 128 puntate con permalink, catalogo, sitemap, canonical, Open Graph e JSON-LD |
| Sintassi | Controllati gli script JS, i moduli Worker/generatori e gli script Python |
| Build | Eseguiti generazione card, controllo social, intestazioni autori e ottimizzazione copertine |
| Contenuti editoriali | Testi e href identici fra le build della home e dei sei articoli |
| Aspetto | Confrontate schermate desktop/mobile della home e dell'articolo. Layout e impaginazione risultano coerenti. Ricampionamento e compressione delle immagini possono produrre differenze di pixel |
| Home e hero | Caricamento live dell'ultima puntata riuscito |
| Menu e citazioni | Apertura/chiusura menu mobile, link Pensieri, casualità, dialogo e chiusura Escape riusciti |
| Audio live | Riproduzione e pausa di musica R2, puntata Spreaker e trailer riuscite nel browser |
| Archivio e articoli | Apertura archivio, collegamenti agli speciali, articolo e metadati social riusciti |
| Condivisione | Copia del collegamento dell'articolo negli appunti riuscita |
| PWA | Service worker attivato, cache presente, riapertura offline e mini-player durante la navigazione riusciti |
| Installabilità | Chromium con profilo persistente restituisce installabilityErrors vuoto |

Il primo controllo PWA ha incontrato il reload automatico dopo controllerchange. Il controllo è stato ripetuto su una pagina stabile. Un contesto browser privato aveva inoltre restituito in-incognito come vincolo di installabilità. Il controllo finale con profilo persistente è riuscito.

I test CMS verificano lettura, salvataggio, conflitti, autenticazione e preservazione dei dati attraverso servizi simulati. Le prove live hanno usato le interfacce pubbliche di lettura e riproduzione.

## File e refactoring

Modificati nella differenza finale rispetto al commit iniziale.

- index.html, script.js, quotes.js, quotes.css, styles.css e music-player.js.
- article-content.js, article-header.css e app-download.css.
- articoli/antisemitismo-o-anti-critica/index.html.
- articoli/euroguerra-e-kit-delle-72-ore/index.html.
- articoli/il-mondo-non-e-una-tifoseria/index.html.
- articoli/il-potere-di-mantenere-il-potere/index.html.
- articoli/la-distopia-europea/index.html.
- articoli/ultra-stupidita/index.html.
- scarica-app/index.html.
- scripts/build-article-headers.py e scripts/optimize-covers.py.
- worker/src/index.js, per il riferimento alla versione aggiornata dello script dei correlati.
- package.json, per includere i nuovi test nel normale comando test.

Aggiunti assets/logo-small.webp, assets/fonts/BarlowCondensed-ExtraBold.woff2, tests/music-player.test.cjs e questo report.

Il risultato finale conserva tutti i file preesistenti. La nuova home evita il caricamento delle due risorse correttive legacy delle citazioni.

Il refactoring riutilizza il generatore di derivate esistente, consolida l'inizializzazione delle citazioni e mantiene le interfacce pubbliche dei moduli.

## Questioni aperte prima della pubblicazione

1. Il TBT mobile rimane elevato e la sua mediana peggiora lievemente. Gli iframe Spreaker, l'SDK trailer, i font remoti e il rendering delle sezioni richiedono ulteriore analisi per interventi compatibili con l'esperienza esistente.
2. I risultati Lighthouse sono locali e variabili. Una verifica sul dominio pubblico dopo l'eventuale pubblicazione deve confrontare CDN, compressione e dispositivi reali.
3. L'installazione effettiva dell'APK e l'ascolto in background su un telefono Android fisico richiedono una prova su dispositivo. È stata verificata l'installabilità web di Chromium.
4. Il service worker e gli script PWA esaminati non espongono handler push/notificationclick o una sottoscrizione web push. L'invio e la ricezione delle notifiche, compresa un'eventuale gestione nativa Android, richiedono una verifica dedicata.
5. La duplicazione delle risorse nel precache PWA riguarda il progetto che pubblica app.agorariminipodcast.it.
6. Il generatore copertine esistente modifica gli input nella directory di build. Le verifiche e le ripetizioni complete sono state eseguite su copie pulite. Una modifica per rendere atomici e idempotenti tutti gli artefatti della generazione costituisce un ulteriore intervento.
7. La compressione delle nuove immagini usa qualità WebP 92 per il logo e 90 per i ritratti. La verifica visuale è riuscita per le schermate confrontate. Il proprietario può controllare le derivate ad alta densità prima della pubblicazione.

## Evidenze e riproduzione

Nella cartella locale audit-2026-11-10/evidenze, accanto al checkout, sono disponibili dodici report Lighthouse JSON, mediane.json, tracce browser prima/dopo, log dei test, prove funzionali e confronti visuali. Sono inclusi gli script delle prove browser.

Per i test completi occorrono Node e jsdom 26.1.0, già utilizzato dai test editoriali. AGORA_TEST_DEPS deve indicare la cartella di installazione temporanea di jsdom.

```sh
npm test
node --test tests/*.cjs tests/*.mjs worker/tests/*.mjs
node scripts/validate-episodes.mjs
python3 scripts/generate-og.py
python3 scripts/validate-social-previews.py
python3 scripts/build-article-headers.py
python3 scripts/optimize-covers.py
```

I generatori vanno eseguiti su una copia di build pulita, con Pillow disponibile. Per Lighthouse occorrono un server locale per ciascuna copia e Chromium. La serie usa --only-categories=performance, --output=json e, per desktop, --preset=desktop. La cache del browser viene ripulita da Lighthouse fra le esecuzioni.

[Branch di revisione](https://github.com/AgoraRimini/agora-rimini-podcast/tree/perf/audit-ottimizzazione)
