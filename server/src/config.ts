import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
/** Radice del repo, sia in dev (src/) che dopo la build (dist/). */
export const rootDir = resolve(here, '../..');

// Carica .env senza dipendenze esterne: bastano righe CHIAVE=valore.
loadDotEnv(resolve(rootDir, '.env'));

function loadDotEnv(path: string): void {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function num(key: string, fallback: number): number {
  const parsed = Number(process.env[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'si', 'on'].includes(value.toLowerCase());
}

export const config = {
  port: num('PORT', 8787),
  host: process.env.HOST ?? '0.0.0.0',
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  provider: (process.env.PROVIDER ?? 'sample').toLowerCase(),
  amadeus: {
    clientId: process.env.AMADEUS_CLIENT_ID ?? '',
    clientSecret: process.env.AMADEUS_CLIENT_SECRET ?? '',
    env: (process.env.AMADEUS_ENV ?? 'test').toLowerCase() === 'production' ? 'production' : 'test',
  },

  /** Soglie del motore: sono la definizione operativa di "super offerta". */
  deals: {
    minScore: num('MIN_DEAL_SCORE', 72),
    minDiscount: num('MIN_DISCOUNT', 0.3),
    maxNightlyPrice: num('MAX_NIGHTLY_PRICE', 1200),
    /** Sotto questo numero di osservazioni il prezzo di riferimento e' poco affidabile. */
    minSamplesForHighConfidence: num('MIN_SAMPLES_HIGH_CONFIDENCE', 8),
  },

  scan: {
    intervalMinutes: num('SCAN_INTERVAL_MINUTES', 180),
    onBoot: bool('SCAN_ON_BOOT', true),
    /** Quante finestre di date provare per ogni destinazione. */
    windowsPerDestination: num('SCAN_WINDOWS', 6),
    /** Quanto in la' guardare, in giorni. */
    horizonDays: num('SCAN_HORIZON_DAYS', 120),
    /** Chiamate al provider in parallelo. */
    concurrency: num('SCAN_CONCURRENCY', 4),
  },

  alerts: {
    webhookUrl: process.env.ALERT_WEBHOOK_URL ?? '',
  },

  /**
   * Funzioni assistite da Gemini. Sono tutte accessorie: senza chiave l'app
   * funziona identica, solo con la ricerca a filtri invece che a frase libera.
   * Il giudizio sulle offerte non passa mai di qui.
   */
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    timeoutMs: num('GEMINI_TIMEOUT_MS', 8000),
  },

  dataDir: process.env.DATA_DIR ?? resolve(rootDir, 'data'),
  webDist: resolve(rootDir, 'web/dist'),
} as const;

export type Config = typeof config;
