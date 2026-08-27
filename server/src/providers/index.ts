import { config } from '../config.js';
import type { PriceProvider } from '../types.js';
import { AmadeusProvider } from './amadeus.js';
import { SampleProvider } from './sample.js';

/**
 * Aggiungere una fonte di prezzi significa implementare `PriceProvider` e
 * registrarla qui: il resto del sistema non cambia.
 */
export function createProvider(name = config.provider): PriceProvider {
  switch (name) {
    case 'amadeus':
      return new AmadeusProvider();
    case 'sample':
      return new SampleProvider();
    default:
      throw new Error(
        `Provider "${name}" sconosciuto. Valori ammessi: sample, amadeus (variabile PROVIDER).`,
      );
  }
}

export { AmadeusProvider, SampleProvider };
