import type {
  AdguardResponse,
  AdminListResponse,
  AiReportResponse,
  AlertItem,
  AnomalyItem,
  ApiTokenItem,
  BreakdownResponse,
  CtitResponse,
  DiagnosticCheck,
  EdgeResponse,
  FilterItem,
  FunnelQueryResponse,
  FunnelStep,
  HomeSettings,
  MeResponse,
  OverviewResponse,
  OnlineDashboardResponse,
  QualityResponse,
  RankingSite,
  RealtimeResponse,
  SavedFunnel,
  SiteRecord,
  SitesSummaryResponse,
  SsoMeResponse,
  StorageReport,
  TimeseriesResponse,
  TrafficVisitorRow,
  VisitorListRow,
  VisitorProfileResponse,
  VitalsResponse,
} from './types';

declare global {
  interface Window {
    __TALLY_BASE__?: string;
  }
}

export function getBasePath(): string {
  const raw = (typeof window !== 'undefined' && window.__TALLY_BASE__) || '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function withBase(path: string): string {
  const bp = getBasePath();
  if (!path.startsWith('/')) return bp ? `${bp}/${path}` : `/${path}`;
  return `${bp}${path}`;
}

export class HttpError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit & { skipAuthRedirect?: boolean }): Promise<T> {
  const url = withBase(path);
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body && typeof init.body === 'string' ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401 && !init?.skipAuthRedirect) {
    const loginPath = withBase('/login');
    if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
      window.location.href = loginPath;
    }
    throw new HttpError(401, 'Authentication required');
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null) || `Request failed (${res.status})`;
    throw new HttpError(res.status, msg, data);
  }

  return data as T;
}

export function serializeFilters(filters: FilterItem[]): string {
  if (!filters.length) return '';
  return JSON.stringify(filters);
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function buildEmbedSnippet(
  site: Pick<SiteRecord, 'site_id' | 'adguard_mode' | 'adclient'>,
  ingestHost?: string,
): string {
  const host = (ingestHost || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const bp = getBasePath();
  const sdkOrigin = host ? `https://${host}` : `${origin}${bp}`;
  const attrs = [
    `defer`,
    `src="${origin}${bp}/f.js"`,
    `data-site="${site.site_id}"`,
    `data-api="${sdkOrigin}"`,
  ];
  if (site.adguard_mode && site.adguard_mode !== 'off') {
    attrs.push(`data-adguard="${site.adguard_mode}"`);
  }
  if (site.adclient) {
    attrs.push(`data-adclient="${site.adclient}"`);
  }
  return `<script ${attrs.join(' ')}></script>`;
}

export function parseDomains(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  }
}

export const api = {
  // Identity & instance
  home: () => apiFetch<HomeSettings>('/api/home', { skipAuthRedirect: true }),
  providers: () => apiFetch<{ providers: string[]; mode?: string }>('/api/auth/providers', { skipAuthRedirect: true }),
  me: () => apiFetch<MeResponse>('/api/me'),
  logout: () => apiFetch<{ ok: boolean }>('/api/logout', { method: 'POST' }),

  // Sites
  sites: () => apiFetch<{ sites: SiteRecord[] }>('/api/sites'),
  createSite: (body: {
    name: string;
    domains: string[];
    adguard_mode?: string;
    adclient?: string;
    timezone?: string;
  }) => apiFetch<SiteRecord>('/api/sites', { method: 'POST', body: JSON.stringify(body) }),
  sitesSummary: (period: string) => apiFetch<SitesSummaryResponse>(`/api/sites/summary${qs({ period })}`),
  ranking: (period: string) => apiFetch<{ period: { start: string; end: string }; sites: RankingSite[] }>(`/api/ranking${qs({ period })}`),

  // Per-site analytics
  realtime: (siteId: string) => apiFetch<RealtimeResponse>(`/api/sites/${siteId}/realtime?summary=1`),
  onlineDashboard: (siteId: string, filters: FilterItem[]) =>
    apiFetch<OnlineDashboardResponse>(`/api/sites/${siteId}/online_dashboard${qs({ filters: serializeFilters(filters) })}`),
  overview: (siteId: string, period: string, filters: FilterItem[] = []) =>
    apiFetch<OverviewResponse>(`/api/sites/${siteId}/overview${qs({ period, filters: serializeFilters(filters) })}`),
  timeseries: (siteId: string, metric: string, period: string, interval: string, filters: FilterItem[] = []) =>
    apiFetch<TimeseriesResponse>(
      `/api/sites/${siteId}/timeseries${qs({ metric, period, interval, filters: serializeFilters(filters) })}`,
    ),
  breakdown: (siteId: string, dim: string, period: string, limit = 20, filters: FilterItem[] = [], key?: string) =>
    apiFetch<BreakdownResponse>(
      `/api/sites/${siteId}/breakdown${qs({ dim, period, limit, key, filters: serializeFilters(filters) })}`,
    ),
  quality: (siteId: string, period: string, filters: FilterItem[] = []) =>
    apiFetch<QualityResponse>(`/api/sites/${siteId}/quality${qs({ period, filters: serializeFilters(filters) })}`),
  alerts: (siteId: string, period: string, filters: FilterItem[] = []) =>
    apiFetch<{ alerts: AlertItem[] }>(`/api/sites/${siteId}/alerts${qs({ period, filters: serializeFilters(filters) })}`),
  anomalies: (siteId: string) => apiFetch<{ anomalies: AnomalyItem[] }>(`/api/sites/${siteId}/anomalies`),
  adguard: (siteId: string, period: string) => apiFetch<AdguardResponse>(`/api/sites/${siteId}/adguard${qs({ period })}`),
  setAdguard: (siteId: string, mode: string, adclient?: string) =>
    apiFetch<{ ok: boolean; adguard_mode: string }>(`/api/sites/${siteId}/adguard`, {
      method: 'POST',
      body: JSON.stringify({ mode, ...(adclient !== undefined ? { adclient } : {}) }),
    }),
  enforceShadow: (siteId: string) => apiFetch<{ ok: boolean }>(`/api/sites/${siteId}/enforce`, { method: 'POST' }),
  vitals: (siteId: string, period: string, filters: FilterItem[] = []) =>
    apiFetch<VitalsResponse>(`/api/sites/${siteId}/vitals${qs({ period, filters: serializeFilters(filters) })}`),
  ctit: (siteId: string, period: string) => apiFetch<CtitResponse>(`/api/sites/${siteId}/ctit${qs({ period })}`),
  edge: (siteId: string, period: string) => apiFetch<EdgeResponse>(`/api/sites/${siteId}/edge${qs({ period })}`),
  traffic: (
    siteId: string,
    period: string,
    opts: { verdict?: string; min_score?: number; limit?: number } = {},
    filters: FilterItem[] = [],
  ) =>
    apiFetch<{ rows: TrafficVisitorRow[] }>(
      `/api/sites/${siteId}/traffic${qs({ period, ...opts, filters: serializeFilters(filters) })}`,
    ),
  visitors: (siteId: string, period: string, opts: { path?: string; verdict?: string; limit?: number } = {}) =>
    apiFetch<{ path: string | null; rows: VisitorListRow[] }>(`/api/sites/${siteId}/visitors${qs({ period, ...opts })}`),
  visitorProfile: (siteId: string, vid: string, period: string) =>
    apiFetch<VisitorProfileResponse>(`/api/sites/${siteId}/visitors/${encodeURIComponent(vid)}/profile${qs({ period })}`),

  // Funnels
  funnels: (siteId: string) => apiFetch<{ funnels: SavedFunnel[] }>(`/api/sites/${siteId}/funnels`),
  saveFunnel: (siteId: string, body: { funnel_id?: string; name: string; steps: FunnelStep[] }) =>
    apiFetch<SavedFunnel>(`/api/sites/${siteId}/funnels`, { method: 'POST', body: JSON.stringify(body) }),
  deleteFunnel: (siteId: string, funnelId: string) =>
    apiFetch<{ ok: boolean }>(`/api/sites/${siteId}/funnels/${encodeURIComponent(funnelId)}`, { method: 'DELETE' }),
  queryFunnel: (siteId: string, period: string, steps: FunnelStep[], filters: FilterItem[] = [], breakdown?: string) =>
    apiFetch<FunnelQueryResponse>(
      `/api/sites/${siteId}/funnel${qs({
        period,
        steps: JSON.stringify(steps),
        filters: serializeFilters(filters),
        breakdown,
      })}`,
    ),

  // Sharing & AI Reports
  share: (siteId: string, enable: boolean) =>
    apiFetch<{ enabled: boolean; token?: string; url?: string }>(`/api/sites/${siteId}/share`, {
      method: 'POST',
      body: JSON.stringify({ enable }),
    }),
  aiReport: (siteId: string) => apiFetch<AiReportResponse>(`/api/sites/${siteId}/ai_report`),
  generateAiReport: (siteId: string, period: string) =>
    apiFetch<{ content: string; period: string; created_at: number }>(`/api/sites/${siteId}/ai_report${qs({ period })}`, {
      method: 'POST',
    }),

  // Public shared endpoints
  publicMeta: (siteId: string, token: string) =>
    apiFetch<{ name: string; timezone: string }>(`/api/public/${siteId}/${token}/meta`, { skipAuthRedirect: true }),
  publicOverview: (siteId: string, token: string, period: string) =>
    apiFetch<OverviewResponse>(`/api/public/${siteId}/${token}/overview${qs({ period })}`, { skipAuthRedirect: true }),
  publicTimeseries: (siteId: string, token: string, metric: string, period: string, interval: string) =>
    apiFetch<TimeseriesResponse>(`/api/public/${siteId}/${token}/timeseries${qs({ metric, period, interval })}`, {
      skipAuthRedirect: true,
    }),
  publicBreakdown: (siteId: string, token: string, dim: string, period: string, limit = 20, channel?: string) =>
    apiFetch<BreakdownResponse>(`/api/public/${siteId}/${token}/breakdown${qs({ dim, period, limit, channel })}`, {
      skipAuthRedirect: true,
    }),
  publicQuality: (siteId: string, token: string, period: string) =>
    apiFetch<QualityResponse>(`/api/public/${siteId}/${token}/quality${qs({ period })}`, { skipAuthRedirect: true }),
  publicVitals: (siteId: string, token: string, period: string) =>
    apiFetch<VitalsResponse>(`/api/public/${siteId}/${token}/vitals${qs({ period })}`, { skipAuthRedirect: true }),

  // Settings & Admin
  saveBranding: (body: Partial<HomeSettings>) => apiFetch<{ ok: boolean }>('/api/settings', { method: 'POST', body: JSON.stringify(body) }),
  saveTimezone: (timezone: string) => apiFetch<{ ok: boolean; timezone: string }>('/api/settings/timezone', { method: 'POST', body: JSON.stringify({ timezone }) }),
  tokens: () => apiFetch<{ tokens: ApiTokenItem[] }>('/api/tokens'),
  createToken: (name: string, site_id?: string | null) =>
    apiFetch<ApiTokenItem & { token: string }>('/api/tokens', { method: 'POST', body: JSON.stringify({ name, site_id: site_id || undefined }) }),
  revokeToken: (id: string) => apiFetch<{ ok: boolean }>(`/api/tokens${qs({ id })}`, { method: 'DELETE' }),
  aiSettings: () => apiFetch<{ provider: string; base_url: string; model: string; lang: string; key_set: boolean }>('/api/settings/ai'),
  saveAiSettings: (body: Record<string, string>) => apiFetch<{ ok: boolean }>('/api/settings/ai', { method: 'POST', body: JSON.stringify(body) }),
  botdir: () => apiFetch<{ imported: boolean; count?: number; updated_at?: number; categories?: Record<string, number> }>('/api/settings/botdir'),
  uploadBotdir: (rawJson: string) => apiFetch<unknown>('/api/settings/botdir', { method: 'POST', body: rawJson }),
  deleteBotdir: () => apiFetch<{ ok: boolean }>('/api/settings/botdir', { method: 'DELETE' }),
  cfedge: () => apiFetch<{ token_set: boolean; status: unknown }>('/api/settings/cfedge'),
  saveCfedge: (token: string) => apiFetch<{ ok: boolean; zones?: number; sites?: Array<{ site_id: string; name: string; zone: string | null }> }>('/api/settings/cfedge', { method: 'POST', body: JSON.stringify({ token }) }),
  deleteCfedge: () => apiFetch<{ ok: boolean }>('/api/settings/cfedge', { method: 'DELETE' }),
  storage: () => apiFetch<StorageReport>('/api/storage'),
  purgeStorage: () => apiFetch<{ ok: boolean; [k: string]: unknown }>('/api/storage/purge', { method: 'POST' }),

  // Diagnostics
  diagnostics: () => apiFetch<{ checks: DiagnosticCheck[] }>('/api/diagnostics'),
  selftestSite: (host: string) => apiFetch<{ site_id: string; host: string }>('/api/diagnostics/selftest-site', { method: 'POST', body: JSON.stringify({ host }) }),
  probeEvent: (site: string, vid: string) => apiFetch<{ found: boolean; [k: string]: unknown }>(`/api/diagnostics/probe${qs({ site, vid })}`),
};
