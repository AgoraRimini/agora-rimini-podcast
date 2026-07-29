const quotes = [
{author:"George Orwell",year:"1948",text:"Il teleschermo riceveva e trasmetteva simultaneamente. Qualunque suono emesso sarebbe stato colto. Si poteva persino supporre che osservasse tutti in continuazione; si doveva vivere con l’idea che qualsiasi suono venisse sentito e che qualsiasi movimento sarebbe stato attentamente osservato."},
{author:"George Orwell",year:"1948",text:"Tutto svaniva nella nebbia. Il passato veniva cancellato, la cancellazione dimenticata, e la menzogna diventava verità."},
{author:"Gustave Le Bon",year:"1890",text:"Il primo pericolo di questa educazione è di basarsi su un errore psicologico fondamentale: credere che l’imparare a memoria dei manuali sviluppi l’intelligenza. Quindi si cerca d’imparare il più possibile; e, dalla scuola elementare all’università, il giovanetto non fa che riempirsi del contenuto dei libri, senza esercitare mai il suo giudizio e la sua iniziativa. L’istruzione, per lui, consiste nel recitare e obbedire."},
{author:"Gustave Le Bon",year:"1890",text:"Un popolo è un organismo creato dal passato. E, come tutti gli organismi, non può modificarsi che per lente accumulazioni ereditarie. La vera guida dei popoli sono le sue tradizioni; e, come ho ripetuto tante volte, non ne cambiano facilmente che le forme esteriori. Senza tradizione, vale a dire senza anima nazionale, non è possibile nessuna civiltà."},
{author:"Thomas Jefferson",year:"1743–1826",text:"Non si può credere nulla di quel che si legge in un giornale. Nei limiti della verità la stampa è nobile istituzione, amica della scienza e della libertà civile. La comunicazione di massa, insomma, non è né un bene né un male; è solo una forza, e come ogni forza può servire al bene e al male. Usati in certo modo, stampa, radio e cinema sono indispensabili alla sopravvivenza della democrazia. Usati in modo opposto, divengono le armi più possenti dell’arsenale dittatoriale."},
{author:"Thomas Jefferson",year:"1743–1826",text:"Se una nazione pretende d’essere ignorante e libera, essa pretende ciò che mai è stato e mai sarà. Un popolo non può essere al sicuro senza il sapere. Là dove la stampa è libera, e ciascuno sa leggere, tutto è al sicuro."},
{author:"Aldous Huxley",year:"1952",text:"Uno Stato totalitario davvero efficiente sarebbe quello in cui l’onnipotente potere esecutivo dei capi politici e il loro corpo manageriale controllano una popolazione di schiavi che non devono essere costretti a esserlo con la forza perché amano la loro schiavitù. Far sì che la amino è il compito assegnato, negli attuali Stati totalitari, ai ministri della propaganda, ai direttori dei giornali e agli insegnanti."},
{author:"Aldous Huxley",year:"1952",text:"Importante è la verità, ma ancor più importante, da un punto di vista pratico, è il silenzio sulla verità. Semplicemente non menzionando certi argomenti. Calando una ‘cortina di ferro’ tra le masse e quei fatti o argomenti che i capi politici considerano indesiderabili. I più importanti ‘Progetti Manhattan’ del futuro saranno ampie ricerche sponsorizzate dal governo su ciò che i politici e gli scienziati a loro affiancati chiameranno ‘il problema della felicità’: in altre parole, il problema di far amare alle persone la propria schiavitù."},
{author:"Aldous Huxley",year:"1952",text:"Nelle democrazie d’Occidente c’è la censura economica e i mezzi di comunicazione di massa sono controllati dall’élite al potere. Gli antichi sostenitori dell’alfabetismo universale e della stampa libera prospettavano solo due possibilità: la propaganda è vera o è falsa. Non previdero quel che di fatto è accaduto, nelle nostre democrazie capitaliste occidentali: il sorgere di una grossa industria della comunicazione di massa che non dà al pubblico né il vero né il falso, ma semmai l’irreale, ciò che, più o meno, non significa nulla."},
{author:"Aldous Huxley",year:"1950",text:"Nemmeno nella Roma imperiale c’era qualcosa che somigliasse alla inarrestabile distrazione che oggi offrono giornali e riviste, radio, televisione e cinema. Questo flusso inarrestabile di distrazioni, usato deliberatamente, per impedire alla gente di badare troppo alla realtà della situazione sociale e politica. Quando i membri di una società passano gran parte del loro tempo non all’erta, ma altrove, nel mondo dello sport e dei teleromanzi, della mitologia e della fantasia metafisica, allora resistere all’assedio di chi vuole manipolare e controllare la società sarà ben difficile."},
{author:"Aldous Huxley",year:"1950",text:"Il principio primo da cui Hitler partì era un giudizio di valore: le masse sono estremamente spregevoli, incapaci di pensiero astratto, disinteressate a ogni evento che stia oltre l’esperienza immediata. Il loro comportamento è determinato non dalla conoscenza e dalla ragione, ma da sentimenti e da impulsi inconsci. Insomma l’uomo nella folla si conduce come se avesse ingerito una forte dose d’una potente sostanza inebriante. È vittima di quel che io chiamo ‘avvelenamento da gregge’."},
{author:"Aldous Huxley",year:"1952",text:"La propaganda per l’azione dettata da impulsi inferiori all’interesse ricorre a prove false, mutilate, incomplete, evita il rigore della logica, cerca di influenzare le sue vittime ripetendo frasi vuote, attaccando furiosamente un capro espiatorio, indigeno o straniero, accomunando scaltramente le peggiori passioni con gli ideali più alti, sì che la crudeltà possa commettersi nel nome di Dio, e la più antica Realpolitik possa trattarsi come questione di principio religioso e di dovere patriottico."},
{author:"Aldous Huxley",year:"1952",text:"Viviamo in un sistema etico assai poco realistico, e quindi assai pericoloso. Il complesso sociale, a cui si attribuisce un valore più grande che alle parti componenti, non è un organismo, nel senso che ha il termine se riferito a un alveare o a un termitaio. È soltanto una organizzazione, un pezzo dell’apparato sociale. L’organizzazione non è né conscia né viva. Essa ha valore strumentale, derivato. È un bene solamente nella misura in cui promuove il bene degli individui che fan parte del collettivo. Mettere l’organizzazione davanti alla persona significa subordinare il fine al mezzo. E cosa succede quando il fine si subordina al mezzo, lo dimostrarono chiaramente Hitler e Stalin."},
{author:"Aldous Huxley",year:"1952",text:"Questa élite impiega direttamente la forza lavorativa di milioni di cittadini nelle sue fabbriche, nei suoi uffici. Essendo proprietaria dei mezzi della comunicazione di massa, influenza pensieri, sentimenti e azioni di tutti, in pratica. Parodiando una frase di Churchill potremmo dire che mai è accaduto che tanti uomini si lasciassero manipolare da un così ristretto gruppo. Noi vediamo dunque che la tecnologia moderna ha portato alla concentrazione del potere economico e politico, e alla formazione di una società controllata — spietatamente negli Stati totalitari, in modo pulito e nascosto nelle democrazie — dalla grande impresa e dal gran governo."},
{author:"Aldous Huxley",year:"1952",text:"La maggior parte della popolazione non è molto intelligente, teme le responsabilità e non desidera niente di meglio che sentirsi dire cosa fare. A patto che i governanti non interferiscano con i loro comfort materiali e le credenze a loro care, è perfettamente felice di lasciarsi governare."},
{author:"Aldous Huxley",year:"1952",text:"Quando la libertà politica ed economica diminuisce, la libertà sessuale tende, per compensazione, ad aumentare. E il dittatore, a meno che non abbia bisogno di carne da macello e di famiglie con cui colonizzare territori, farà bene a incoraggiarla. In concomitanza con la libertà di sognare a occhi aperti sotto l’effetto di droga, film e radio, tale libertà aiuterà a conciliare i suoi sudditi con la schiavitù a cui sono destinati."},
{author:"Aldous Huxley",year:"1952",text:"La libertà, come tutti sappiamo, non fiorisce in un paese che sta sempre sul piede di guerra, o che si prepara a combattere. Una crisi permanente giustifica il controllo su tutto e su tutti, da parte del governo centrale. E proprio una crisi permanente noi dobbiamo attenderci in questo mondo, dove l’eccesso di popolazione provoca uno stato di cose tali per cui quasi diventa inevitabile la dittatura sotto auspici comunisti."},
{author:"Aldous Huxley",year:"1956",text:"Nonostante i nuovi farmaci meravigliosi, nonostante le cure migliori, anzi, in certi casi, proprio per via di queste, la salute fisica della popolazione media non migliorerà, anzi andrà peggiorando. E, parallelamente al declino dello stato di salute medio, potrebbe verificarsi un declino dell’intelligenza media."},
{author:"Adolf Hitler",year:"1938",text:"La propaganda efficace deve limitarsi a poche semplici necessità, e quindi esprimerle in poche formule stereotipate. Queste formule stereotipate vanno ripetute continuamente, perché solo la ripetizione costante riuscirà alla fine a imprimere un concetto nella memoria della folla."},
{author:"Erich Fromm",year:"1900–1980",text:"La nostra società occidentale contemporanea, nonostante il progresso materiale, intellettuale e politico, è sempre meno capace di condurre alla sanità mentale, e tende a minare invece la sicurezza interiore, la felicità, la ragione, la capacità d’amore nell’individuo; tende a trasformarlo in un automa che paga il suo insuccesso di uomo con una sempre più grave infermità mentale, con la disperazione che si cela sotto la frenetica corsa al lavoro e al cosiddetto piacere. Le vittime veramente disperate dell’infermità mentale si trovano proprio fra gli individui che paiono normalissimi."},
{author:"Erich Fromm",year:"1900–1980",text:"Questi milioni di individui abnormemente normali, che vivono senza difficoltà in una società a cui, se fossero pienamente uomini, non dovrebbero adattarsi, ancora carezzano ‘l’illusione della individualità’ ma di fatto sono stati in larga misura disindividualizzati. Il loro conformismo dà luogo a qualcosa che somiglia all’uniformità. Ma uniformità e libertà sono incompatibili."},
{author:"Richard Feynman",year:"1918–1988",text:"La scienza è credere all’ignoranza degli esperti."},
{author:"G. K. Chesterton",year:"1905",text:"Fuochi verranno attizzati per testimoniare che due più due fa quattro. Spade saranno sguainate per dimostrare che le foglie sono verdi in estate."}
];

const escapeHtml = value => value.replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const shortText = (text, limit=190) => text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
let currentQuote = 0;
let activeAuthor = 'Tutti';

const styleLink = document.createElement('link');
styleLink.rel = 'stylesheet';
styleLink.href = 'quotes.css';
document.head.appendChild(styleLink);

const section = document.createElement('section');
section.id = 'pensieri';
section.className = 'section thought-section';
section.innerHTML = `
  <div class="thought-heading">
    <div><p class="kicker">Accendi il neurone, inizia a ragionare</p><h2>Parole scritte ieri.<br>Attuali anche domani.</h2></div>
    <p>Citazioni selezionate dai nostri libri e ricomposte nell’identità visiva di Agorà. Nessun algoritmo decide cosa devi pensare.</p>
  </div>
  <div class="quote-stage" aria-live="polite">
    <article class="quote-poster"><blockquote class="quote-text"></blockquote><footer class="quote-signature"><strong></strong><span></span></footer></article>
    <aside class="quote-info"><div><span class="quote-counter"></span><p class="quote-author-label">Autore</p><h3 class="quote-author"></h3><p class="quote-year"></p></div><div class="quote-actions"><button class="quote-action quote-action-primary" id="quote-random">Sorprendimi <span>✦</span></button><button class="quote-action" id="quote-open">Leggi a tutto schermo <span>↗</span></button></div></aside>
  </div>
  <div class="quote-browser"><div class="quote-filters" role="group" aria-label="Filtra le citazioni per autore"></div><div class="quote-grid"></div></div>
  <div class="quote-modal" hidden role="dialog" aria-modal="true" aria-label="Citazione a tutto schermo"><div class="quote-modal-card"><article class="quote-modal-poster"><blockquote></blockquote><footer></footer></article><aside class="quote-modal-copy"><div><p class="quote-author-label">Parole scritte ieri</p><h3></h3><p class="quote-year"></p></div><div class="quote-modal-controls"><button data-dir="-1">← Precedente</button><button data-dir="1">Successiva →</button><button class="quote-modal-close">Chiudi</button></div></aside></div></div>`;

document.querySelector('#articoli')?.before(section);
const nav = document.querySelector('.main-nav');
const articlesLink = nav?.querySelector('a[href="#articoli"]');
if (nav && !nav.querySelector('a[href="#pensieri"]')) {
  const link = document.createElement('a'); link.href='#pensieri'; link.textContent='Pensieri'; nav.insertBefore(link, articlesLink);
}

const els = {
 text:section.querySelector('.quote-text'), signature:section.querySelector('.quote-signature strong'), signatureYear:section.querySelector('.quote-signature span'), counter:section.querySelector('.quote-counter'), author:section.querySelector('.quote-author'), year:section.querySelector('.quote-year'), grid:section.querySelector('.quote-grid'), filters:section.querySelector('.quote-filters'), modal:section.querySelector('.quote-modal')
};

function showQuote(index){
 currentQuote=(index+quotes.length)%quotes.length; const q=quotes[currentQuote];
 els.text.textContent=q.text; els.signature.textContent=q.author; els.signatureYear.textContent=q.year;
 els.counter.textContent=`IDEA ${String(currentQuote+1).padStart(2,'0')} / ${quotes.length}`; els.author.textContent=q.author; els.year.textContent=q.year;
}
function renderGrid(){
 const list=activeAuthor==='Tutti'?quotes:quotes.filter(q=>q.author===activeAuthor);
 els.grid.innerHTML=list.map(q=>{const i=quotes.indexOf(q);return `<button class="quote-thumb" data-index="${i}" aria-label="Apri citazione di ${escapeHtml(q.author)}"><blockquote>${escapeHtml(shortText(q.text))}</blockquote><footer>${escapeHtml(q.author)}</footer></button>`}).join('');
 els.grid.querySelectorAll('.quote-thumb').forEach(btn=>btn.addEventListener('click',()=>{showQuote(Number(btn.dataset.index));section.querySelector('.quote-stage').scrollIntoView({behavior:'smooth',block:'center'})}));
}
function renderFilters(){
 const authors=['Tutti',...new Set(quotes.map(q=>q.author))];
 els.filters.innerHTML=authors.map(a=>`<button class="quote-filter ${a===activeAuthor?'is-active':''}" data-author="${escapeHtml(a)}">${escapeHtml(a)}</button>`).join('');
 els.filters.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{activeAuthor=btn.dataset.author;renderFilters();renderGrid()}));
}
function openModal(){const q=quotes[currentQuote];els.modal.querySelector('blockquote').textContent=q.text;els.modal.querySelector('.quote-modal-poster footer').textContent=q.author;els.modal.querySelector('h3').textContent=q.author;els.modal.querySelector('.quote-year').textContent=q.year;els.modal.hidden=false;document.body.classList.add('modal-open')}
function closeModal(){els.modal.hidden=true;document.body.classList.remove('modal-open')}
section.querySelector('#quote-random').addEventListener('click',()=>{let i;do{i=Math.floor(Math.random()*quotes.length)}while(i===currentQuote);showQuote(i)});
section.querySelector('#quote-open').addEventListener('click',openModal);
els.modal.querySelector('.quote-modal-close').addEventListener('click',closeModal);
els.modal.querySelectorAll('[data-dir]').forEach(btn=>btn.addEventListener('click',()=>{showQuote(currentQuote+Number(btn.dataset.dir));openModal()}));
els.modal.addEventListener('click',e=>{if(e.target===els.modal)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!els.modal.hidden)closeModal()});
showQuote(1);renderFilters();renderGrid();
