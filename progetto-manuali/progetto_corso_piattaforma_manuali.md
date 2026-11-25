# Progetto: Corso + Piattaforma per scrivere, pubblicare e vendere manuali

Versione 0.1 - 25 novembre 2026 - Titolare: Gabriele Carboni (Weevo)

## 1. Visione

Un corso e una piattaforma che accompagnano un professionista dall'idea di un manuale fino al business costruito intorno al libro. Il problema oggi non e' scrivere, ma farsi trovare e vendere. Il corso copre quindi l'intero ciclo: pubblicazione e vendita, insieme ai ricavi collaterali.

Promessa: "Il tuo manuale come asset della tua professione", senza promesse di rendita passiva.

## 2. Target

- Professionisti, consulenti, formatori, imprenditori con una competenza e un'attivita' gia' avviata.
- Hanno materiale da trasformare in manuale ma non hanno un piano per pubblico, lancio, eventi e ricavi collaterali.
- Bisogno secondario: associazioni e ordini professionali che vogliono far pubblicare manuali ai propri iscritti (canale B2B).

## 3. Posizionamento e concorrenza

- Concorrenti osservati: Book Academy (Silver 497 EUR, Gold 997 EUR, Platinum 1.297 EUR), corsi Udemy generalisti, corsi "guru" a 4.000-5.500 EUR (Vadala' KDP Mastery, La Fabbrica dei Best Seller).
- Gap: i corsi puntano su niche, low content, audiolibri, pubblicita' Amazon e rendita. Pochi trattano manuali professionali, autorevolezza dell'autore, eventi e monetizzazione collaterale.
- Differenziazione: ciclo completo + metodo per professionisti + piattaforma con gestionale del progetto-libro + assistenza IA (Claude Code).
- Da fare: verifica diretta di prezzi e programmi dei concorrenti (i dati raccolti provengono da pagine pubbliche e recensioni di terzi).

## 4. Struttura del corso

### Parte A - Dal manoscritto al libro pubblicato
1. Idea, tema e validazione di mercato
2. Struttura didattica del manuale (indice, capitoli, esercizi, casi)
3. Scrittura, con uso corretto dell'IA (dichiarazione dei contenuti generati dall'IA richiesta da KDP)
4. Aspetti legali e fiscali: ISBN, IVA, diritti
5. Impaginazione, copertina, formati ebook e cartaceo
6. Pubblicazione su Amazon KDP: metadati, categorie, keyword
7. Prezzi e royalty
8. Distribuzione oltre Amazon e audiolibro

### Parte B - Dal libro pubblicato al business
9. Posizionamento dell'autore e dell'opera
10. Costruzione del pubblico: newsletter, LinkedIn, lead magnet, lista d'attesa
11. Lancio, recensioni, stampa
12. Eventi di presentazione (presenza e online), ordini aziendali, associazioni
13. Progetti collaterali: formazione, consulenza, workshop, licenze, edizioni aggiornate, speaking
14. Misurazione: vendite, contatti, ricavi per canale

Le due parti corrono in parallelo: il pubblico si costruisce mentre si scrive.

## 5. Offerta e prezzi (ipotesi da validare)

| Livello | Contenuto | Fascia indicativa |
|---|---|---|
| Base | Parte A in video + checklist | 197-297 EUR |
| Completo | Parte A + B, template, accesso alla piattaforma | 497-797 EUR |
| Premium | Completo + coorte live, revisione del progetto, supporto personale | 1.200-1.800 EUR |
| B2B | Licenze per associazioni e aziende | su preventivo |

Possibile corso breve su Udemy come canale di acquisizione.

## 6. Piattaforma ibrida LMS + gestionale

### 6.1 Livelli
| Livello | Funzione | Opzioni |
|---|---|---|
| LMS | Corsi, quiz, coorti, certificati | Frappe LMS, Moodle, LMS in hosting |
| Produzione libro | Manoscritto Markdown, build PDF ed ePub | Quarto + Typst, Pandoc |
| Gestionale | Progetto-libro con fasi, pubblico, eventi, ricavi | Da sviluppare |

### 6.2 Entita' del gestionale
- Autore (profilo, competenze, canali, obiettivi)
- Libro (titolo, promessa, target, stato, versioni, ISBN)
- Fasi (idea, scrittura, produzione, pubblicazione, lancio, eventi, monetizzazione)
- Task e checklist per fase
- Pubblico (lista contatti, lead magnet, iscritti newsletter)
- Eventi (data, luogo, partner, esito)
- Prodotti collaterali (workshop, consulenze, corsi) con ricavi
- Metriche (copie, royalty, contatti, ricavi)

### 6.3 Integrazione con Claude Code
- Skills (file SKILL.md): procedure riutilizzabili, es. controllo indice, scheda KDP, checklist di lancio, piano eventi.
- Subagent: compiti con contesto separato, es. analisi concorrenti, revisione capitolo, piano editoriale.
- Server MCP: collegamento a gestionale, LMS, CRM e file del libro.
- Claude Code e' uno strumento da sviluppatori: lo usa il team per costruire e per generare materiali. Gli studenti usano un'interfaccia web che richiama gli agenti.

### 6.4 Pipeline di produzione
Markdown -> Pandoc/Quarto -> PDF (Typst) ed ePub -> caricamento manuale su KDP -> registrazione dello stato nel gestionale.

## 7. Aspetti da rispettare

- KDP: dichiarare i contenuti generati dall'IA; verificare sempre le linee guida ufficiali.
- ISBN e IVA: impattano le royalty degli ebook; spiegarlo con esempi aggiornati.
- Royalty ebook su amazon.it: verificare le fasce di prezzo vigenti prima di pubblicare esempi.
- Pubblicita': nessuna promessa di guadagno; descrivere solo il metodo.
- Privacy/GDPR per liste contatti e dati degli studenti.
- Licenze open source (es. AGPL per alcuni LMS) da valutare prima dello sviluppo.

## 8. Roadmap

| Fase | Attivita' | Esito |
|---|---|---|
| 0 | Validazione: 10-15 interviste a professionisti, analisi diretta dei concorrenti | Decisione go/no-go |
| 1 | Programma dettagliato, materiali, template | Corso pronto per il pilota |
| 2 | Pilota con 5-10 professionisti su LMS in hosting | Feedback, modelli reali |
| 3 | Gestionale minimo + skill Claude Code dai modelli raccolti | Prototipo |
| 4 | Piattaforma ibrida integrata, MCP | Versione 1.0 |
| 5 | Lancio pubblico, canale B2B con associazioni | Ricavi ricorrenti |

## 9. Rischi

- Mercato italiano non quantificato: validare con il pilota.
- Sviluppo della piattaforma prima di avere requisiti reali: costruirla dopo il pilota.
- Concorrenti con budget pubblicitari alti: puntare su nicchia professionale e B2B.
- Cambi di regole e royalty KDP: aggiornamenti periodici ai materiali.

## 10. Metriche di successo

- Iscritti al pilota e tasso di completamento
- Manuali effettivamente pubblicati dagli studenti
- Contatti raccolti e ricavi collaterali per studente
- Costo di acquisizione, ricavi per livello di offerta, NPS

## 11. Prossimi passi

1. Definire nome e promessa del corso.
2. Preparare le interviste di validazione.
3. Scrivere il programma lezione per lezione.
4. Scegliere LMS di partenza.
5. Disegnare il modello dati del gestionale e le prime tre skill.
