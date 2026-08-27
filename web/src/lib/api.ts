import type {
  DealsResponse,
  DestinationNote,
  DestinationsResponse,
  Filters,
  Health,
  ParsedQuery,
  ScanSummary,
  Stats,
  Watch,
} from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Errore ${response.status}`);
  }
  return (await response.json()) as T;
}

export function filtersToQuery(filters: Filters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '' || value === false) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  health: () => request<Health>('/api/health'),
  stats: () => request<Stats>('/api/stats'),
  destinations: () => request<DestinationsResponse>('/api/destinations'),
  deals: (filters: Filters) => request<DealsResponse>(`/api/deals${filtersToQuery(filters)}`),
  scan: () => request<ScanSummary>('/api/scan', { method: 'POST' }),
  search: (text: string) =>
    request<ParsedQuery>('/api/search', { method: 'POST', body: JSON.stringify({ text }) }),
  /** Nota sulla meta: assente per scelta quando l'AI non e configurata. */
  note: async (destinationId: string, month: string): Promise<DestinationNote | null> => {
    const response = await fetch(`/api/destinations/${destinationId}/note?month=${month}`);
    if (!response.ok) return null;
    return (await response.json()) as DestinationNote;
  },
  watches: () => request<{ watches: Watch[] }>('/api/watches'),
  addWatch: (label: string, filters: Filters) =>
    request<Watch>('/api/watches', { method: 'POST', body: JSON.stringify({ label, filters }) }),
  removeWatch: (id: string) => request<{ ok: true }>(`/api/watches/${id}`, { method: 'DELETE' }),
};
