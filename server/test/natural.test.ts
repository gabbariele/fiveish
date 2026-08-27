import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseNatural } from '../src/search/natural.js';

const NOW = new Date('2026-05-01T00:00:00.000Z');
const parse = (text: string) => parseNatural(text, NOW).filters;

describe('interprete deterministico', () => {
  it('capisce il tetto di prezzo in tutte le forme comuni', () => {
    assert.equal(parse('qualcosa sotto i 400 euro').maxNightly, 400);
    assert.equal(parse('massimo 250 a notte').maxNightly, 250);
    assert.equal(parse('meno di 600').maxNightly, 600);
    assert.equal(parse('300 euro a notte').maxNightly, 300);
    assert.equal(parse('entro 180').maxNightly, 180);
  });

  it('ignora i numeri che non sono prezzi plausibili', () => {
    assert.equal(parse('sotto i 5 euro').maxNightly, undefined);
    assert.equal(parse('per 2 persone').maxNightly, undefined);
  });

  it('riconosce le mete anche con il nome che usa la gente', () => {
    assert.equal(parse('un weekend a Positano').destinationId, 'costiera-amalfitana');
    assert.equal(parse('tre notti sul lago di Como').destinationId, 'lago-di-como');
    assert.equal(parse('vorrei andare a Porto Cervo').destinationId, 'costa-smeralda');
    assert.equal(parse('qualcosa a Cortina').destinationId, 'cortina');
    assert.equal(parse('Roma a novembre').destinationId, 'roma');
  });

  it('ripiega sulla regione quando non trova la citta', () => {
    const filters = parse('qualcosa in Umbria');
    assert.equal(filters.region, 'Umbria');
    assert.equal(filters.destinationId, undefined);
  });

  it('non restringe una regione a una sola delle sue mete', () => {
    // "in Toscana" deve valere Firenze, Forte dei Marmi, Chianti e Val d'Orcia
    // insieme, non solo una di loro.
    for (const [frase, regione] of [
      ['qualcosa in Toscana', 'Toscana'],
      ['una masseria in Puglia', 'Puglia'],
      ['un albergo in Sicilia', 'Sicilia'],
      ['mare in Sardegna', 'Sardegna'],
    ] as const) {
      const filters = parse(frase);
      assert.equal(filters.region, regione, frase);
      assert.equal(filters.destinationId, undefined, frase);
    }
  });

  it('capisce il tipo di vacanza', () => {
    assert.equal(parse('voglio il mare').kind, 'mare');
    assert.equal(parse('settimana bianca con la neve').kind, 'montagna');
    assert.equal(parse('un relais in campagna').kind, 'borgo');
  });

  it('trasforma il mese in una finestra di date futura', () => {
    const novembre = parse('a novembre');
    assert.equal(novembre.from, '2026-11-01');
    assert.equal(novembre.to, '2026-11-30');

    // Febbraio e' gia' passato rispetto a maggio 2026: si intende l'anno dopo.
    const febbraio = parse('a febbraio');
    assert.equal(febbraio.from, '2027-02-01');
    assert.equal(febbraio.to, '2027-02-28');
  });

  it('distingue weekend e settimana', () => {
    assert.equal(parse('un weekend a Firenze').maxNights, 3);
    assert.equal(parse('una settimana in Puglia').minNights, 5);
  });

  it('coglie condizioni e livello di selezione', () => {
    assert.equal(parse('solo con cancellazione gratuita').refundableOnly, true);
    assert.equal(parse('solo offerte pazzesche').minScore, 85);
    assert.equal(parse('dalle piu economiche').sort, 'prezzo');
  });

  it('mette insieme piu criteri dalla stessa frase', () => {
    const filters = parse(
      'un weekend romantico sul lago di Garda a settembre sotto i 350 euro con cancellazione gratuita',
    );
    assert.equal(filters.region, undefined, 'nessuna regione inventata da "cancellazione"');
    assert.deepEqual(filters, {
      maxNightly: 350,
      destinationId: 'lago-di-garda',
      kind: 'lago',
      from: '2026-09-01',
      to: '2026-09-30',
      maxNights: 3,
      refundableOnly: true,
    });
  });

  it('non inventa filtri quando la frase non dice nulla', () => {
    const { filters, matched } = parseNatural('vorrei partire', NOW);
    assert.deepEqual(filters, {});
    assert.deepEqual(matched, []);
  });

  it('confronta i nomi come parole intere, non come sottostringhe', () => {
    // "cancellazione" contiene "lazio": non deve diventare una destinazione.
    const cancellazione = parse('solo con cancellazione gratuita');
    assert.equal(cancellazione.region, undefined);
    assert.equal(cancellazione.refundableOnly, true);

    // Stesso pericolo con le parole comuni dentro cui si nascondono i luoghi.
    assert.equal(parse('cerco lo sconto maggiore').destinationId, undefined);
    assert.equal(parse('un posto comodo').destinationId, undefined);
    assert.equal(parse('uno sconto forte').destinationId, undefined);

    // Ma i nomi veri devono continuare a funzionare.
    assert.equal(parse('sul lago Maggiore').destinationId, 'lago-maggiore');
    assert.equal(parse('a Como').destinationId, 'lago-di-como');
    assert.equal(parse('a Forte dei Marmi').destinationId, 'forte-dei-marmi');
  });

  it('non si fa ingannare da accenti e maiuscole', () => {
    assert.equal(parse('CITTÀ D ARTE').kind, 'citta');
    assert.equal(parse("Val d'Orcia").destinationId, 'val-dorcia');
  });
});
