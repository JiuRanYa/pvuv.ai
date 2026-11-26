import { isValidTimezone, localYMD, dayStr } from '../../../shared/tz';
import { ApiError, parsePeriod } from '../../api/src/queries';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://analyticsdata.googleapis.com/v1beta';
export const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export interface Ga4Property {
  site_id: string;
  property_id: string;
  time_zone: string;
  stream_id?: string;
}

interface Config extends Ga4Property {
  client_email: string;
  private_key: string;
}

export function ga4Property(raw?: string): Ga4Property | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Ga4Property;
    return typeof c.site_id === 'string' && /^[A-Za-z0-9]{4,16}$/.test(c.site_id)
      && typeof c.property_id === 'string' && /^\d+$/.test(c.property_id)
      && (!c.stream_id || /^\d+$/.test(c.stream_id))
      && typeof c.time_zone === 'string' && isValidTimezone(c.time_zone) ? c : null;
  } catch {
    return null;
  }
}

export function ga4Config(raw?: string): Config | null {
  const property = ga4Property(raw);
  if (!property) return null;
  const c = property as Config;
  return typeof c.client_email === 'string' && c.private_key?.startsWith('-----BEGIN PRIVATE KEY-----') ? c : null;
}

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let tokenCache: { config: Config; token: string; validUntil: number } | undefined;

async function getAccessToken(config: Config, fetcher: typeof fetch): Promise<string> {
  if (tokenCache && tokenCache.config.client_email === config.client_email
    && tokenCache.config.private_key === config.private_key && tokenCache.validUntil > Date.now()) {
    return tokenCache.token;
  }

  const pem = config.private_key.replace(/-----[^-]+-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const encoder = new TextEncoder();
  const encode = (value: object) => b64url(encoder.encode(JSON.stringify(value)));
  const iat = Math.floor(Date.now() / 1000);
  const assertion = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({
    iss: config.client_email, scope: GA4_SCOPE, aud: TOKEN_URL, iat, exp: iat + 600,
  });
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(assertion));
  const response = await fetcher(TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assertion + '.' + b64url(new Uint8Array(signature)) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new ApiError(502, 'GA4 could not authorize the reporting account');
  const body = await response.json() as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new ApiError(502, 'GA4 did not issue a reporting token');
  tokenCache = { config, token: body.access_token, validUntil: Date.now() + ((body.expires_in ?? 3600) - 60) * 1000 };
  return body.access_token;
}

type ReportRow = { dimensionValues?: { value: string }[]; metricValues: { value: string }[] };
type Report = { rows?: ReportRow[]; metadata?: { timeZone?: string; subjectToThresholding?: boolean; dataLossFromOtherRow?: boolean } };
const headlineMetrics = [
  'totalUsers', 'sessions', 'screenPageViews', 'screenPageViewsPerSession', 'bounceRate', 'engagementRate',
  'userEngagementDuration', 'averageSessionDuration',
];
const groups = [
  ['sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium', 'sessionCampaignName'],
  ['pagePath', 'landingPage'],
  ['country', 'region', 'city'],
  ['browser', 'operatingSystem', 'deviceCategory'],
  ['eventName'],
];
const dims = new Set(groups.flat());
const exact = (fieldName: string, value: string) => ({
  filter: { fieldName, stringFilter: { matchType: 'EXACT', caseSensitive: true, value } },
});
function metrics(row?: ReportRow) {
  const [users = 0, sessions = 0, views = 0, viewsPerSession = 0, bounce = 0, engagement = 0, engagedSeconds = 0, sessionSeconds = 0] =
    row?.metricValues.map(v => Number(v.value)) ?? [];
  return {
    uv: users, sessions, pv: views, pv_per_session: sessions ? viewsPerSession : null,
    bounce_rate: sessions ? bounce : null, engagement_rate: sessions ? engagement : null,
    avg_duration_ms: sessions ? (engagedSeconds * 1000) / sessions : null,
    visit_duration_ms: sessions ? sessionSeconds * 1000 : null,
  };
}

export async function ga4Report(config: Config, params: URLSearchParams, fetcher: typeof fetch = fetch) {
  return runGa4Report(config, params, await getAccessToken(config, fetcher), fetcher);
}

export async function runGa4Report(config: Ga4Property, params: URLSearchParams, token: string, fetcher: typeof fetch = fetch) {
  const requestedPeriod = params.get('period') ?? 'today';
  if (!/^(today|yesterday|7d|28d|30d|90d|this_week|last_week|this_month|last_month|this_year)$/.test(requestedPeriod)) {
    throw new ApiError(400, 'GA4 requires a supported calendar period');
  }
  const period = parsePeriod(requestedPeriod, config.time_zone);
  const timeDim = period.start === period.end ? 'dateHour' : 'date';
  const dateRanges = [{ startDate: period.start, endDate: period.end }];
  const requested = (params.get('dimensions') || '').split(',');
  const selected = groups.map((tabs, i) => tabs.includes(requested[i]) ? requested[i] : tabs[0]);
  const filterDim = params.get('filter_dim') ?? '';
  const filterValue = params.get('filter_value') ?? '';
  const filters = [
    ...(config.stream_id ? [exact('streamId', config.stream_id)] : []),
    ...(dims.has(filterDim) && filterValue ? [exact(filterDim, filterValue.slice(0, 300))] : []),
  ];
  const common = { dateRanges, ...(filters.length ? { dimensionFilter: { andGroup: { expressions: filters } } } : {}) };
  const headline = { ...common, metrics: headlineMetrics.map(name => ({ name })) };
  const trend = { ...headline, dimensions: [{ name: timeDim }], orderBys: [{ dimension: { dimensionName: timeDim } }], limit: 366 };
  const breakdown = selected.map(name => {
    const metricName = name === 'eventName' ? 'keyEvents' : 'totalUsers';
    return {
      ...common, dimensions: [{ name }], metrics: [{ name: metricName }], limit: 50,
      orderBys: [{ metric: { metricName }, desc: true }],
    };
  });
  const property = `properties/${config.property_id}`;
  const batch = async (requests: object[]): Promise<Report[]> => {
    const response = await fetcher(`${API}/${property}:batchRunReports`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ requests }), signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new ApiError(502, `GA4 could not read this property (${response.status})`);
    const result = await response.json() as { reports?: Report[] };
    if (result.reports?.length !== requests.length) throw new ApiError(502, 'GA4 returned an incomplete report');
    return result.reports;
  };

  const [core, details] = await Promise.all([batch([headline, trend, ...breakdown.slice(0, 3)]), batch(breakdown.slice(3))]);
  const reports = [...core, ...details];
  const actualTimezone = reports[0].metadata?.timeZone;
  if (actualTimezone && actualTimezone !== config.time_zone
    && new Intl.DateTimeFormat('en', { timeZone: actualTimezone }).resolvedOptions().timeZone
      !== new Intl.DateTimeFormat('en', { timeZone: config.time_zone }).resolvedOptions().timeZone) {
    throw new ApiError(502, 'The configured timezone differs from the GA4 property timezone');
  }
  const trendRows = new Map(reports[1].rows?.map(row => [row.dimensionValues?.[0].value, row]) ?? []);
  const buckets: string[] = [];
  if (timeDim === 'dateHour') {
    const day = period.start.replaceAll('-', '');
    for (let hour = 0; hour < 24; hour++) buckets.push(day + String(hour).padStart(2, '0'));
  } else {
    for (let day = Date.parse(period.start); day <= Date.parse(period.end); day += 86_400_000) {
      buckets.push(new Date(day).toISOString().slice(0, 10).replaceAll('-', ''));
    }
  }
  const localToday = localYMD(period.now, config.time_zone);
  const today = dayStr(localToday.y, localToday.m0, localToday.d).replaceAll('-', '');
  const hour = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: config.time_zone }).format(period.now);
  const current = timeDim === 'dateHour' ? today + hour : today;
  return {
    timezone: config.time_zone, interval: timeDim === 'dateHour' ? 'hour' : 'day',
    overview: metrics(reports[0].rows?.[0]),
    limited: reports.some(r => r.metadata?.subjectToThresholding || r.metadata?.dataLossFromOtherRow),
    series: buckets.map(key => {
      const label = timeDim === 'dateHour' ? key.slice(8) + ':00' : key.slice(4, 6) + '-' + key.slice(6, 8);
      const status = key < current ? 'complete' : key === current ? 'partial' : 'future';
      return { label, status, metrics: metrics(trendRows.get(key)) };
    }),
    rows: Object.fromEntries(selected.map((dim, i) => [
      dim, (reports[i + 2].rows ?? []).map(row => ({ key: row.dimensionValues?.[0].value ?? '', uv: Number(row.metricValues[0].value), pv: 0 })),
    ])),
  };
}
