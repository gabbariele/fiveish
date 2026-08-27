import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { Gemini, GeminiUnavailable } from '../src/ai/gemini.js';
import { destinationNote } from '../src/ai/notes.js';
import { tempStore } from './helpers.js';

const { store, cleanup } = tempStore();
after(cleanup);

function stubGemini(answer: string | Error): { client: Gemini; calls: () => number } {
  let calls = 0;
  const client = new Gemini('chiave-finta', 'modello-finto');
  client.generate = async () => {
    calls += 1;
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { client, calls: () => calls };
}

describe('note sulle destinazioni', () => {
  it('non produce nulla senza chiave configurata', async () => {
    const note = await destinationNote('roma', '11', store, new Gemini('', 'modello-finto'));
    assert.equal(note, null, 'meglio niente che un segnaposto');
  });

  it('scrive la nota una volta sola e poi la rilegge dalla cache', async () => {
    const { client, calls } = stubGemini('  A novembre Roma si svuota.\n\n Le giornate sono miti.  ');
    const prima = await destinationNote('roma', '11', store, client);
    assert.ok(prima);
    assert.equal(prima.cached, false);
    assert.equal(prima.text, 'A novembre Roma si svuota. Le giornate sono miti.');

    const seconda = await destinationNote('roma', '11', store, client);
    assert.ok(seconda);
    assert.equal(seconda.cached, true);
    assert.equal(calls(), 1, 'la seconda richiesta non deve chiamare il modello');
  });

  it('tiene note distinte per mesi diversi', async () => {
    const { client } = stubGemini('Ad agosto fa caldo e la citta e vuota.');
    const agosto = await destinationNote('roma', '08', store, client);
    assert.ok(agosto);
    assert.notEqual(agosto.text, store.getNote('roma', '11'));
  });

  it('rifiuta destinazioni e mesi che non esistono', async () => {
    const { client } = stubGemini('non dovrebbe servire');
    assert.equal(await destinationNote('atlantide', '11', store, client), null);
    assert.equal(await destinationNote('roma', '13', store, client), null);
  });

  it('resta in silenzio se il modello non risponde', async () => {
    const { client } = stubGemini(new GeminiUnavailable('quota esaurita'));
    assert.equal(await destinationNote('venezia', '03', store, client), null);
  });
});
