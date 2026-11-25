# Progetto: Corso + Piattaforma per scrivere, pubblicare e vendere manuali

Versione 0.2 - 25 novembre 2026
Coautori: Gabriele Carboni (Weevo) e Germano Milite (Fufflix)

## Registro delle versioni

| Versione | Data | Modifiche |
|---|---|---|
| 0.1 | 25/11/2026 | Prima stesura |
| 0.2 | 25/11/2026 | Co-authorship con Germano Milite (Fufflix). Caso di studio: Gabriele Carboni sulla Parte B. Validazione esterna eliminata. Mercato dai follower di Fufflix e dei fuffaguru, offerta su due tagli (Base e Premium). Piattaforma al centro come trasposizione del Framework e prima cosa da costruire. Roadmap riscritta di conseguenza. |

## 1. Visione

Un corso e una piattaforma che accompagnano un professionista dall'idea di un manuale fino al business costruito intorno al libro. Il problema oggi non e' scrivere, ma farsi trovare e vendere. Il corso copre quindi l'intero ciclo: pubblicazione e vendita, insieme ai ricavi collaterali.

La piattaforma e' la trasposizione concreta del Framework di Gabriele Carboni: ogni fase del metodo diventa una fase del progetto-libro nel gestionale, con task, strumenti e assistenza IA. Il corso spiega il metodo, la piattaforma lo fa applicare.

Promessa: "Il tuo manuale come asset della tua professione", senza promesse di rendita passiva. Il taglio e' coerente con il pubblico di Fufflix: metodo concreto e risultati documentati al posto delle promesse dei fuffaguru.

## 2. Coautori e ruoli

| Coautore | Apporto |
|---|---|
| Gabriele Carboni (Weevo) | Framework e metodo, caso di studio sulla Parte B, piattaforma e integrazione IA (Weevo) |
| Germano Milite (Fufflix) | Pubblico e canale di acquisizione, posizionamento verso i follower di Fufflix e dei fuffaguru, co-docenza |

Da definire nell'accordo tra coautori: proprieta' del Framework e della piattaforma, ripartizione dei ricavi per livello e per canale, uso dei marchi, responsabilita' su docenza e supporto.

## 3. Target e mercato

- **Target del metodo:** professionisti, consulenti, formatori, imprenditori con una competenza e un'attivita' gia' avviata, che hanno materiale da trasformare in manuale ma non un piano per pubblico, lancio, eventi e ricavi collaterali.
- **Mercato di acquisizione:** i follower di Fufflix e quelli dei fuffaguru, cioe' persone gia' interessate a pubblicare e guadagnare con i libri, spesso esposte a promesse di rendita. Da qui due tagli di offerta (sezione 6): uno d'ingresso per chi parte da zero e uno premium per il professionista che vuole costruire un business sul libro.
- **Canale secondario B2B:** associazioni e ordini professionali che vogliono far pubblicare manuali ai propri iscritti.

## 4. Caso di studio: Gabriele Carboni sulla Parte B

La Parte B non si basa su teoria ma sul percorso dell'autore. Elementi da documentare nel corso, con dati reali:

- Libri pubblicati: dall'esordio con Hoepli ("Strategie web per i mercati esteri") ai titoli successivi ("Management Illuminato", "Oltre la giungla dei prezzi", "Esistere su richiesta", "La fine della SEO", "L'export nell'era delle IA", "Attrito Zero"), con siti dedicati per singolo libro.
- Collaborazioni editoriali: "Essentials of Modern Marketing" (Kotler Impact), "Doers & Dreamers" (Lulu 2023).
- Eventi e formazione nati dai libri: oltre cento seminari nelle Camere di Commercio, corso per Digital Export Manager con patrocinio Uniexportmanager, Export Smart Summit.
- Framework riconosciuti: Marketing Distinguo (premiato agli European Digital Mindset Award), con mazzo di carte come prodotto collaterale.

Da raccogliere per ogni libro: copie, contatti generati, eventi, ricavi collaterali (consulenze, corsi, speaking). Sono i numeri che sostituiscono le promesse di guadagno.

## 5. Struttura del corso

### Parte A - Dal manoscritto al libro pubblicato
1. Idea, tema e validazione di mercato
2. Struttura didattica del manuale (indice, capitoli, esercizi, casi)
3. Scrittura, con uso corretto dell'IA (dichiarazione dei contenuti generati dall'IA richiesta da KDP)
4. Aspetti legali e fiscali: ISBN, IVA, diritti
5. Impaginazione, copertina, formati ebook e cartaceo
6. Pubblicazione su Amazon KDP: metadati, categorie, keyword
7. Prezzi e royalty
8. Distribuzione oltre Amazon e audiolibro

### Parte B - Dal libro pubblicato al business (caso di studio: Gabriele Carboni)
9. Posizionamento dell'autore e dell'opera
10. Costruzione del pubblico: newsletter, LinkedIn, lead magnet, lista d'attesa
11. Lancio, recensioni, stampa
12. Eventi di presentazione (presenza e online), ordini aziendali, associazioni
13. Progetti collaterali: formazione, consulenza, workshop, licenze, edizioni aggiornate, speaking
14. Misurazione: vendite, contatti, ricavi per canale

Le due parti corrono in parallelo: il pubblico si costruisce mentre si scrive. Ogni lezione corrisponde a una fase o a un task della piattaforma.

## 6. Offerta e prezzi

| Livello | Per chi | Contenuto | Fascia indicativa |
|---|---|---|---|
| Base | Follower che partono da zero | Corso completo (Parte A + B) in video, piattaforma in modalita' guidata (progetto-libro, checklist, template), assistenza IA con limiti d'uso | 197-497 EUR |
| Premium | Professionisti con attivita' avviata | Base + piattaforma completa (pubblico, eventi, ricavi, metriche), assistenza IA estesa, coorte live con i coautori, revisione del progetto | 1.200-2.000 EUR |
| B2B | Associazioni, ordini, aziende | Licenze della piattaforma e del corso per gli iscritti | su preventivo |

Prezzi da fissare con Germano Milite in base al pubblico di Fufflix. Da decidere: abbonamento alla piattaforma dopo il primo anno (ricavo ricorrente) e possibile corso breve su Udemy come canale aggiuntivo.

## 7. Piattaforma: il Framework reso operativo

La piattaforma si costruisce per prima. Il suo modello dati e' il Framework: le fasi del metodo, i loro task e i loro strumenti.

### 7.1 Componenti
| Componente | Funzione | Opzioni |
|---|---|---|
| Gestionale progetto-libro | Cuore della piattaforma: fasi del Framework, task, pubblico, eventi, ricavi | Sviluppo Weevo |
| LMS | Lezioni, quiz, coorti, certificati, collegati alle fasi | Modulo integrato, oppure Frappe LMS / Moodle / LMS in hosting |
| Produzione libro | Dal manoscritto a PDF ed ePub | Quarto + Typst, Pandoc; import da Word per chi non scrive in Markdown |
| Assistenza IA | Agenti che guidano lo studente fase per fase | Claude via API, skill e subagent sviluppati con Claude Code |

### 7.2 Entita' del gestionale
- Autore (profilo, competenze, canali, obiettivi)
- Libro (titolo, promessa, target, stato, versioni, ISBN)
- Fasi del Framework (idea, scrittura, produzione, pubblicazione, lancio, eventi, monetizzazione)
- Task e checklist per fase, collegati alle lezioni del corso
- Pubblico (lista contatti, lead magnet, iscritti newsletter)
- Eventi (data, luogo, partner, esito)
- Prodotti collaterali (workshop, consulenze, corsi) con ricavi
- Metriche (copie, royalty, contatti, ricavi)
- Piano (Base o Premium) e licenza B2B, per abilitare le funzioni per livello

### 7.3 Integrazione con Claude
- Skills (file SKILL.md): procedure del Framework riutilizzabili, es. controllo indice, scheda KDP, checklist di lancio, piano eventi.
- Subagent: compiti con contesto separato, es. analisi concorrenti, revisione capitolo, piano editoriale.
- Server MCP: collegamento a gestionale, LMS, CRM e file del libro.
- Claude Code e' lo strumento del team per costruire la piattaforma e generare materiali. Gli studenti usano l'interfaccia web, che richiama gli agenti.

### 7.4 Pipeline di produzione
Manoscritto (Markdown o Word) -> Pandoc/Quarto -> PDF (Typst) ed ePub -> caricamento manuale su KDP -> registrazione dello stato nel gestionale.

## 8. Aspetti da rispettare

- KDP: dichiarare i contenuti generati dall'IA; verificare sempre le linee guida ufficiali.
- ISBN e IVA: impattano le royalty degli ebook; spiegarlo con esempi aggiornati.
- Royalty ebook su amazon.it: verificare le fasce di prezzo vigenti prima di pubblicare esempi.
- Pubblicita': nessuna promessa di guadagno; descrivere solo il metodo e i risultati documentati del caso di studio.
- Privacy/GDPR per liste contatti e dati degli studenti, in particolare nel gestionale e negli agenti IA (dati inviati ai modelli, conservazione, nomina dei responsabili del trattamento).
- Licenze open source (es. AGPL per alcuni LMS) da valutare prima di integrarle nella piattaforma.
- Accordo tra coautori su proprieta' intellettuale, marchi e ricavi.

## 9. Roadmap

| Fase | Attivita' | Esito |
|---|---|---|
| 0 | Formalizzazione del Framework in fasi, task e strumenti; accordo tra coautori; modello dati | Specifica della piattaforma |
| 1 | Sviluppo del gestionale progetto-libro e delle prime skill IA | Piattaforma minima funzionante |
| 2 | Corso registrato e caricato in piattaforma, collegato alle fasi; raccolta dati del caso di studio | Prodotto completo |
| 3 | Lancio Base e Premium verso il pubblico di Fufflix; prima coorte Premium | Primi ricavi, feedback |
| 4 | Pipeline di produzione integrata, MCP, metriche avanzate | Versione 1.0 |
| 5 | Canale B2B con associazioni e ordini, abbonamento piattaforma | Ricavi ricorrenti |

## 10. Rischi

- Pubblico dei fuffaguru abituato a promesse di rendita: il messaggio deve essere netto fin dalla pagina di vendita, sostenuto dai numeri del caso di studio.
- Distanza tra mercato (follower) e target (professionisti): il livello Base deve funzionare anche per chi non ha ancora un'attivita' avviata.
- Tempi di sviluppo della piattaforma che ritardano il lancio: perimetro minimo della Fase 1 da fissare e rispettare.
- Costi variabili dell'assistenza IA per studente: limiti d'uso per livello e monitoraggio dei consumi.
- Cambi di regole e royalty KDP: aggiornamenti periodici ai materiali e ai controlli della piattaforma.

## 11. Metriche di successo

- Iscritti per livello e tasso di conversione dal pubblico di Fufflix
- Tasso di completamento delle fasi in piattaforma
- Manuali effettivamente pubblicati dagli studenti
- Contatti raccolti e ricavi collaterali per studente
- Costo dell'assistenza IA per studente, ricavi per livello di offerta, NPS

## 12. Prossimi passi

1. Definire nome e promessa del corso con Germano Milite.
2. Formalizzare il Framework in fasi, task e strumenti (base del modello dati).
3. Stendere l'accordo tra coautori.
4. Disegnare il modello dati del gestionale e il perimetro della piattaforma minima.
5. Scrivere le prime tre skill IA collegate alle fasi del Framework.
6. Raccogliere i dati del caso di studio (copie, contatti, eventi, ricavi collaterali per libro).
