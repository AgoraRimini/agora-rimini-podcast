# Modifica degli articoli pubblicati

La funzione è pronta sul ramo `feat/edit-published-articles`. L'API Cloudflare deve essere aggiornata prima della pubblicazione dell'interfaccia: GitHub Pages da solo non aggiorna il Worker.

## Attivazione
Da un computer con Node e accesso all'account Cloudflare del Worker:
1. Aprire un checkout aggiornato del repository e selezionare `feat/edit-published-articles`.
2. Eseguire `cd worker` e `npx wrangler deploy`. Se necessario effettuare prima `npx wrangler login`.
3. Conservare segreti e binding esistenti. Il token GitHub già usato dal Worker deve consentire lettura/scrittura Contents: il salvataggio usa Git Database API nello stesso repository.
4. Dopo il deploy del Worker, integrare il ramo in `main`: il workflow Pages pubblicherà l'interfaccia.
5. Accedere al CMS e verificare su un articolo di prova: Edita, modifica, salva, riapri. Verificare copertina mantenuta/sostituita/rimossa e collegamenti.

## Comportamento
- Edita recupera anche gli articoli precedenti all'introduzione della funzione.
- Sono modificabili titolo, sottotitolo, autore, categoria, data, testo, frase evidenziata, immagine, puntata e contenuti correlati.
- Cambiare titolo conserva l'URL esistente.
- Salva modifiche aggiorna pagina, indice, copertina e sitemap in un unico commit; una revisione obsoleta non sovrascrive aggiornamenti successivi.
- Le vecchie immagini restano disponibili per evitare di rompere altri riferimenti.
- Le credenziali editoriali rimangono necessarie per lettura e scrittura.

## Verifica
Il workflow `Verifica modifica articoli` controlla sintassi, recupero di HTML storico, flusso Edita/Salva nel DOM, copertine, contenuti correlati, revisioni concorrenti, autorizzazioni e regressioni del servizio musicale.
La prova automatica usa GitHub e DOM simulati: non sostituisce il controllo del Worker dopo il deploy. Nessun articolo reale viene modificato dai test.
