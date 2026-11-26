export interface SsoUser {
  openid: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: 'admin' | 'visitor' | string;
}

export interface SsoMeResponse {
  authenticated: boolean;
  authRequired: boolean;
  user: SsoUser | null;
}

export interface MeResponse {
  user: string;
  timezone: string;
  ingest_host: string;
}

export interface HomeSettings {
  name: string;
  description: string;
  primary_domain: string;
  logo_light: string;
  logo_dark: string;
  favicon: string;
}

export interface SiteRecord {
  site_id: string;
  name: string;
  allowed_domains: string; // JSON string array
  adguard_mode: 'off' | 'loose' | 'balanced' | 'strict';
  adclient: string | null;
  timezone: string | null;
  created_at: number;
  status: string;
  shadow_until: number | null;
  public_token: string | null;
  has_data?: number;
}

export interface SiteSummaryItem {
  site_id: string;
  pv: number;
  uv: number;
  sessions: number;
  clean_count: number;
  suspect_count: number;
  bot_count: number;
  crawler_count: number;
  bounce_rate: number | null;
  avg_duration_ms: number | null;
  online?: number;
}

export interface SitesSummaryResponse {
  sites: SiteSummaryItem[];
  uv_approx: boolean;
}

export interface OverviewResponse {
  period: { start: string; end: string };
  pv: number;
  uv: number;
  sessions: number;
  bounce_rate: number | null;
  bounce_rate_single: number | null;
  avg_duration_ms: number | null;
  visit_duration_ms: number | null;
  clean_count: number;
  suspect_count: number;
  bot_count: number;
  crawler_count: number;
  conversions?: number;
  revenue?: number;
}

export interface RealtimeResponse {
  window_minutes: number;
  online: number;
  pageviews: number;
  minutes: number[];
}

export interface TimeseriesPoint {
  label?: string;
  bucket?: string;
  ts?: number;
  value: number | null;
  pv?: number;
  invalid?: number;
  status?: 'complete' | 'partial' | string;
  partial?: boolean;
}

export interface TimeseriesResponse {
  metric: string;
  interval: string;
  points: TimeseriesPoint[];
}

export interface BreakdownRow {
  key?: string;
  hostname?: string;
  path?: string;
  pv: number;
  uv: number;
  sessions?: number;
  pv_clean?: number;
  uv_clean?: number;
  bounces?: number;
  total_duration_ms?: number;
  revenue?: number;
}

export interface BreakdownResponse {
  dim: string;
  key?: string | null;
  rows: BreakdownRow[];
}

export interface FilterItem {
  dim: string;
  value: string;
}

export interface QualityResponse {
  totals: {
    pv?: number;
    clean?: number;
    suspect?: number;
    bot?: number;
    crawler?: number;
    clean_count?: number;
    suspect_count?: number;
    bot_count?: number;
    crawler_count?: number;
  };
  daily: Array<{
    day: string;
    pv: number;
    clean_count: number;
    suspect_count: number;
    bot_count: number;
    crawler_count: number;
  }>;
  flags: Record<string, number>;
}

export interface AlertItem {
  id: string;
  severity: 'warn' | 'high' | 'info' | string;
  title?: string;
  detail?: string;
  metric?: number;
  threshold?: number;
}

export interface AnomalyItem {
  id?: number;
  day: string;
  metric: string;
  actual: number;
  expected: number;
  z_score?: number;
  direction?: string;
}

export interface AdguardTierStat {
  block: number;
  block_rate: number;
  fp_rate: number;
}

export interface AdguardResponse {
  pv: number;
  current_mode: 'off' | 'loose' | 'balanced' | 'strict';
  verdicts: {
    clean: number;
    suspect: number;
    bot: number;
    crawler: number;
  };
  tiers: {
    loose: AdguardTierStat;
    balanced: AdguardTierStat;
    strict: AdguardTierStat;
  };
  reasons: Array<{ flag: string; n: number }>;
  sources: Array<{ source: string; sessions: number; pv: number }>;
  trend: Array<{ day: string; blocked: number }>;
}

export interface VitalsMetric {
  p75: number | null;
  count: number;
  rating: 'good' | 'needs-improvement' | 'poor' | null;
}

export interface VitalsResponse {
  metrics: Record<string, VitalsMetric>;
  samples: number;
  pages: Array<{
    hostname: string;
    path: string;
    n: number;
    lcp_p75: number;
    rating: string | null;
  }>;
}

export interface CtitResponse {
  n: number;
  fast_share: number | null;
  median_ms: number | null;
  buckets: Array<{ label: string; n: number }>;
  flag: string | null;
}

export interface EdgeResponse {
  available: boolean;
  zone: string | null;
  totals: {
    requests: number;
    html_requests: number;
    pv: number;
    gap: number;
    gap_share: number;
  };
  days: Array<{ day: string; requests: number; html_requests?: number; pv: number }>;
  agents: Array<{ user_agent: string; requests: number }>;
}

export interface TrafficVisitorRow {
  visitor_id: string;
  country: string | null;
  asn_org?: string | null;
  device_type?: string | null;
  browser?: string | null;
  pv: number;
  sessions?: number;
  bot_score: number;
  bot_flags: number;
  verdict: string;
  last_ts: number;
  first_ts?: number;
  entry_path?: string | null;
}

export interface FunnelStep {
  type: 'page' | 'event';
  value: string;
}

export interface SavedFunnel {
  funnel_id: string;
  name: string;
  steps: FunnelStep[];
  created_at: number;
  updated_at: number;
}

export interface FunnelResultStep {
  step: number;
  type: 'page' | 'event';
  value: string;
  visitors: number;
  dropoff?: number;
  median_ms?: number | null;
}

export interface FunnelQueryResponse {
  steps: FunnelResultStep[];
  segments?: Array<{
    key: string;
    steps: number[];
    cr: number;
  }>;
}

export interface AiReportResponse {
  report: {
    period: string;
    content: string;
    created_at: number;
  } | null;
  configured: boolean;
}

export interface RankingSite {
  site_id: string;
  name: string;
  domains?: string[];
  pv: number;
  clean_pv: number;
  invalid_pv: number;
  sessions: number;
  score: number;
  internal_pv?: number;
  external_pv?: number;
}

export interface VisitorListRow {
  visitor_id: string;
  source: string;
  country: string | null;
  device_type: string | null;
  browser?: string | null;
  pv: number;
  sessions?: number;
  verdict: string;
  bot_score?: number;
  last_ts: number;
}

export type DashboardMetrics = Pick<OverviewResponse, 'uv' | 'pv' | 'sessions' | 'bounce_rate' | 'bounce_rate_single' | 'avg_duration_ms' | 'visit_duration_ms'> & { pv_per_visitor: number };

export interface OnlineDashboardResponse {
  window_minutes: number;
  as_of: number;
  overview: DashboardMetrics;
  series: Array<{ label: string; status: string; metrics: DashboardMetrics }>;
  breakdown: Record<string, BreakdownRow[]>;
  goals: BreakdownRow[];
  visitors: OnlineVisitorsResponse['visitors'];
}

export interface OnlineVisitorsResponse {
  window_minutes: number;
  online: number;
  sources: Array<{ source: string; visitors: number }>;
  visitors: Array<{ visitor_id: string; source: string; path: string | null; last_ts: number }>;
}

export interface VisitorProfileResponse {
  profile: Record<string, unknown> | null;
  sessions: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  context?: Record<string, unknown>;
}

export interface DiagnosticCheck {
  key: string;
  label: string;
  status: 'ok' | 'warn' | 'fail';
  detail?: string;
}

export interface ApiTokenItem {
  token_id: string;
  name: string;
  prefix: string;
  site_id: string | null;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

export interface AdminListResponse {
  admins: Array<{ email: string; added_by?: string | null; created_at?: number }>;
  currentUserEmail?: string;
  envSeeded?: string[];
}

export interface StorageReport {
  partitions?: Array<{ name: string; rows: number }>;
  totals?: Record<string, number>;
  retention?: Record<string, number>;
  [k: string]: unknown;
}
