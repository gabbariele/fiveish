import { config } from '../config.js';

const HOST = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiCandidate {
  content?: { parts?: Array<{ text?: string }> };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
}

export interface GenerateOptions {
  /** Istruzione di sistema: definisce il ruolo, non il contenuto. */
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Schema JSON: forza il modello a rispondere in forma strutturata. */
  schema?: Record<string, unknown>;
  /** Oltre questo tempo si rinuncia: nessuna funzione dipende da Gemini. */
  timeoutMs?: number;
}

export class GeminiUnavailable extends Error {}

/**
 * Client minimo per l'API Gemini. Nessun SDK: una sola chiamata REST, cosi'
 * il progetto non si porta dietro una dipendenza per tre funzioni accessorie.
 *
 * Regola di fondo: Gemini qui non decide mai se un'offerta e' conveniente.
 * Quello e' un calcolo, e un calcolo deve restare riproducibile. Il modello
 * serve solo dove il codice non arriva: capire una frase scritta a mano,
 * riassumere un testo, scrivere due righe di contesto.
 */
export class Gemini {
  constructor(
    private readonly apiKey = config.gemini.apiKey,
    private readonly model = config.gemini.model,
  ) {}

  get configured(): boolean {
    return this.apiKey.length > 0;
  }

  async isReady(): Promise<{ ready: boolean; reason?: string }> {
    if (!this.configured) {
      return { ready: false, reason: 'GEMINI_API_KEY non impostata: le funzioni AI restano spente' };
    }
    return { ready: true };
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    if (!this.configured) throw new GeminiUnavailable('GEMINI_API_KEY non impostata');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? config.gemini.timeoutMs);

    try {
      const response = await fetch(`${HOST}/models/${this.model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxOutputTokens ?? 800,
            ...(options.schema
              ? { responseMimeType: 'application/json', responseSchema: options.schema }
              : {}),
          },
        }),
      });

      if (!response.ok) {
        throw new GeminiUnavailable(`Gemini HTTP ${response.status}: ${await response.text()}`);
      }

      const json = (await response.json()) as GeminiResponse;
      if (json.promptFeedback?.blockReason) {
        throw new GeminiUnavailable(`richiesta bloccata: ${json.promptFeedback.blockReason}`);
      }
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      if (!text.trim()) throw new GeminiUnavailable('risposta vuota');
      return text;
    } catch (error) {
      if (error instanceof GeminiUnavailable) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GeminiUnavailable(`nessuna risposta entro ${options.timeoutMs ?? config.gemini.timeoutMs} ms`);
      }
      throw new GeminiUnavailable(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Come `generate`, ma con l'uscita gia' letta come JSON. */
  async generateJson<T>(prompt: string, schema: Record<string, unknown>, options: GenerateOptions = {}): Promise<T> {
    const raw = await this.generate(prompt, { ...options, schema });
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new GeminiUnavailable(`risposta non leggibile come JSON: ${raw.slice(0, 200)}`);
    }
  }
}

export const gemini = new Gemini();
