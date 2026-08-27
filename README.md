# fiveish

Trova **super offerte su hotel 5 stelle in Italia**. Solo 5 stelle, solo tariffe
davvero eccezionali: tutto il resto viene scartato prima di arrivare a schermo.

Il punto non è mostrare tanti hotel scontati. È mostrarne pochissimi, e avere
ragione.

---

## L'idea in una riga

Quasi tutti gli "sconti" degli hotel sono finti: il prezzo barrato è deciso dal
venditore, non dal mercato. fiveish non lo guarda mai. **Ricostruisce da sé quanto
costa normalmente quella struttura in quel periodo** e misura lo sconto su quello.

Con il dataset dimostrativo incluso, su 776 tariffe esaminate ne sopravvivono
circa 30: il 4%. È il comportamento voluto.

## Come decide che un'offerta è una super offerta

Per essere pubblicata, una tariffa deve superare **tutti** questi sbarramenti:

| Sbarramento | Valore predefinito | Configurabile con |
|---|---|---|
| Categoria della struttura | esattamente 5 stelle | — (non negoziabile) |
| Sconto sul prezzo di riferimento | ≥ 30% | `MIN_DISCOUNT` |
| Punteggio complessivo | ≥ 72/100 | `MIN_DEAL_SCORE` |
| Prezzo a notte | ≤ 1.200 € | `MAX_NIGHTLY_PRICE` |

Se il prezzo di riferimento è poco affidabile (poche rilevazioni storiche), le
soglie di sconto e punteggio si alzano automaticamente invece di tirare a indovinare.

### Il prezzo di riferimento

È il cuore del sistema. Viene calcolato in cascata, dal più affidabile al meno:

1. **Storico** — la mediana troncata dei prezzi che *noi* abbiamo rilevato per
   quella struttura, con arrivo nello stesso mese. La mediana troncata ignora gli
   errori di listino, che nel settore sono la norma.
2. **Profilo** — la mediana mensile nota per quella struttura.
3. **Concorrenti** — la mediana degli altri 5 stelle della stessa destinazione nello
   stesso mese, riscalata in base a quanto quella struttura è più (o meno) amata
   della media locale.

Due dettagli che fanno la differenza:

- Il giudizio avviene **prima** di salvare le rilevazioni della scansione in corso.
  Altrimenti il prezzo scontato entrerebbe nel riferimento contro cui lo stiamo
  misurando, e la frase "sotto il suo prezzo abituale" diventerebbe circolare.
- Riscansionare le stesse date **aggiorna** la rilevazione invece di aggiungerne una.
  Senza questo, ripassare dieci volte sulle stesse notti ci farebbe credere di avere
  dieci prove dove ne abbiamo una.

### Il punteggio (0-100)

Media pesata di quattro componenti, più un bonus:

| Componente | Peso | Cosa misura |
|---|---|---|
| Sconto sul prezzo reale | 45% | quanto è sotto il suo normale, a rendimenti decrescenti |
| Convenienza sulla piazza | 22% | dove si colloca fra i 5 stelle di quella zona e mese |
| Qualità della struttura | 16% | voto ospiti, pesato su quante recensioni lo sostengono |
| Condizioni della tariffa | 17% | cancellazione gratuita, colazione, pensione |
| Rarità dell'occasione | bonus fino a +8 | poche camere, minimo storico, partenza ravvicinata |

La rarità è volutamente **fuori** dalla media: è un segnale che c'è o non c'è, e
mediarlo penalizzerebbe ogni offerta che semplicemente non è in scadenza.

Ogni offerta pubblicata porta con sé i motivi in chiaro, e il dettaglio mostra come
è nato il punteggio, componente per componente.

---

## Avvio rapido

Serve Node 22 o superiore.

```bash
npm install
npm run dev
```

- interfaccia: <http://localhost:5173>
- API: <http://localhost:8787>

In produzione:

```bash
npm run build && npm start   # servizio unico su http://localhost:8787
```

Prima ricerca da riga di comando, senza avviare il server:

```bash
npm run scan              # tutte le destinazioni
npm run scan -- roma      # solo Roma
```

## Prezzi veri

Di serie gira il provider `sample`: **hotel reali, prezzi simulati**. Serve a
provare il motore senza chiavi API, e l'interfaccia lo dichiara apertamente.

Per le tariffe live, copia `.env.example` in `.env` e configura Amadeus:

```bash
PROVIDER=amadeus
AMADEUS_CLIENT_ID=...
AMADEUS_CLIENT_SECRET=...
AMADEUS_ENV=test          # oppure production
```

Le credenziali gratuite si ottengono su
[developers.amadeus.com](https://developers.amadeus.com) creando un'app
Self-Service. L'ambiente `test` è gratuito ma copre un sottoinsieme di strutture
con dati non sempre aggiornati; per il live va promossa l'app a produzione.

Il filtro 5 stelle viene applicato **alla fonte** (`ratings=5`), e ricontrollato
comunque prima di pubblicare.

> Con un provider reale, lo storico parte vuoto: le prime scansioni si appoggiano
> ai concorrenti, con affidabilità bassa e soglie più severe. Dopo qualche giorno
> di scansioni il riferimento diventa storico e le stime si stringono. È il prezzo
> da pagare per non fidarsi dei prezzi barrati.

### Aggiungere un'altra fonte

Si implementa `PriceProvider` (`server/src/types.ts`) e la si registra in
`server/src/providers/index.ts`. Il resto del sistema non cambia.

## Avvisi

Salva i filtri correnti come avviso dall'interfaccia. A ogni scansione, le offerte
nuove che li rispettano vengono segnalate una volta sola.

Con `ALERT_WEBHOOK_URL` configurato, l'avviso viene inviato in `POST` come
`{ "text": "..." }` — formato compatibile con Slack, Mattermost, n8n, Zapier o un
endpoint proprio. Senza webhook, finisce nel log del server.

## Scansioni automatiche

`SCAN_INTERVAL_MINUTES` (predefinito 180) regola la cadenza; `0` la disattiva.
Ogni passata interroga tutte le destinazioni su più finestre di date — weekend,
pause infrasettimanali, settimane piene — distribuite sull'orizzonte di ricerca.

## API

| Metodo | Percorso | Cosa fa |
|---|---|---|
| `GET` | `/api/health` | stato del provider, soglie attive, ultima scansione |
| `GET` | `/api/deals` | offerte selezionate, con filtri in query string |
| `GET` | `/api/deals/:id` | dettaglio di una singola offerta |
| `GET` | `/api/stats` | numeri d'insieme (risparmio, sconto medio, per regione) |
| `GET` | `/api/destinations` | destinazioni, regioni e categorie coperte |
| `POST` | `/api/scan` | avvia subito una scansione |
| `GET` `POST` `DELETE` | `/api/watches` | gestione degli avvisi salvati |

Filtri accettati da `/api/deals`: `destinationId`, `region`, `kind`, `maxNightly`,
`minScore`, `minNights`, `maxNights`, `from`, `to`, `refundableOnly`, `sort`
(`score` · `prezzo` · `sconto` · `checkin`), `limit`.

## Struttura

```
server/src
├── providers/     fonti di prezzo (sample, amadeus)
├── deals/         prezzo di riferimento, punteggio, filtri
├── scan/          orchestrazione delle scansioni e finestre di date
├── store/         persistenza su file, storico prezzi
├── alerts/        recapito degli avvisi
└── routes/        API HTTP
web/src           interfaccia React
```

## Test

```bash
npm test          # 51 test sul motore, sullo storico e sull'API
npm run typecheck
```

## Nota

I prezzi degli hotel cambiano di continuo e le tariffe migliori durano poco:
verifica sempre disponibilità e condizioni sul sito della struttura prima di
prenotare. fiveish seleziona e spiega, non prenota.
