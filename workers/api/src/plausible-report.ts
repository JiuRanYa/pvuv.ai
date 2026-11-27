import { SESSION_IDLE_MS } from '../../../shared/ids';
import { RESERVED_EVENTS_SQL } from '../../../shared/events';
import { addDays, dayStr, localMidnightUtc, localYMD, tzOffsetMs, weekdayMon0 } from '../../../shared/tz';
import { type Period, type Filter, eventTables, ApiError } from './queries';

export interface ReportBucket {
  start: number;
  end: number;
  label: string;
}

export function reportBuckets(period: Period, interval: string): ReportBucket[] {
  if (interval === 'total') return [{ start: period.startTs, end: period.endTs, label: '' }];
  const { startTs, endTs, tz } = period;
  const buckets: ReportBucket[] = [];
  if (interval === 'hour' || interval === 'minute') {
    const step = interval === 'hour' ? 3_600_000 : 60_000;
    const offset = tzOffsetMs(startTs, tz);
    const first = Math.floor((startTs + offset) / step) * step - offset;
    const clock = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const multiDay = period.start !== period.end;
    for (let ts = first; ts < endTs; ts += step) {
      if (buckets.length >= 2000) throw new ApiError(400, 'range too large for this interval');
      const d = localYMD(ts, tz);
      const clockLabel = clock.format(ts);
      const label = multiDay ? dayStr(d.y,d.m0,d.d).slice(5) + ' ' + clockLabel : clockLabel;
      buckets.push({start: Math.max(ts, startTs), end: Math.min(ts + step, endTs), label});
    }
    return buckets;
  }
  const firstDay = localYMD(startTs, tz);
  const groups = new Map<string, ReportBucket>();
  for (let delta = 0; delta < 800; delta++) {
    const d = addDays(firstDay.y, firstDay.m0, firstDay.d, delta);
    const start = localMidnightUtc(tz,d.y,d.m0,d.d);
    if (start >= endTs) break;
    const next = addDays(d.y,d.m0,d.d,1);
    const end = Math.min(endTs, localMidnightUtc(tz,next.y,next.m0,next.d));
    const day = dayStr(d.y,d.m0,d.d);
    const monday = addDays(d.y,d.m0,d.d,-weekdayMon0(d.y,d.m0,d.d));
    const key = interval === 'month' ? day.slice(0,7) : interval === 'week' ? dayStr(monday.y,monday.m0,monday.d) : day;
    const group = groups.get(key);
    if (group) group.end = end;
    else groups.set(key, { start: Math.max(startTs,start), end, label: interval === 'month' ? key : key.slice(5) });
  }
  return [...groups.values()];
}

const engagement = "('page_leave','page_pulse','engagement')";
const sessionDimensions: Record<string,string> = {
  source: "COALESCE(source,'(direct)')", channel: "COALESCE(channel,'(unknown)')", referrer: "COALESCE(referrer,'(direct)')",
  country: "COALESCE(country,'(unknown)')",
  device: "COALESCE(device_type,'(unknown)')", utm_campaign: "COALESCE(campaign,'(unknown)')", utm_medium: "COALESCE(medium,'(unknown)')",
};
const eventDimensions: Record<string,string> = {
  page: 'e.path', browser: "COALESCE(e.browser,'(unknown)')", os: "COALESCE(e.os,'(unknown)')",
  region: "COALESCE(e.region,'(unknown)')", city: "COALESCE(e.city,'(unknown)')",
  utm_source: "COALESCE(e.utm_source,'(unknown)')", utm_term: "COALESCE(e.utm_term,'(unknown)')", utm_content: "COALESCE(e.utm_content,'(unknown)')",
  ft_source: 'e.ft_source', ft_medium: 'e.ft_medium', ft_campaign: 'e.ft_campaign',
};
const conversion = `e.event NOT IN (${RESERVED_EVENTS_SQL},'engagement')`;
const visitPageDimensions = {entry_page: 'entry', exit_page: 'exit'};
const groupedDimensions: Record<string, string> = {
  ...eventDimensions,
  source: "COALESCE(c.source,'(direct)')", channel: "COALESCE(c.channel,'(unknown)')",
  referrer: "COALESCE(NULLIF(c.referrer,''),'(none)')",
  utm_campaign: 'c.campaign', utm_medium: 'c.medium',
  country: "COALESCE(c.country,'(unknown)')", device: "COALESCE(c.device_type,'(unknown)')",
  entry_page: 'v.entry', exit_page: 'v.exit', goal: 'e.event',
};

export function hasReportDimension(dim: string) {
  return Object.hasOwn(groupedDimensions, dim);
}
const visitMetrics = new Set(['visits','sessions','bounce_rate','bounce_rate_percent','bounce_rate_single','visit_duration','visit_duration_ms','views_per_visit']);
const engagementMetrics = new Set(['avg_duration_ms','time_on_page','scroll_depth']);
const clauses = (filters: Filter[], dimension: Record<string,string>, values: unknown[]) =>
  filters.filter(f=>Object.hasOwn(dimension,f.dim)).map(f=>{
    const options = f.values?.length ? f.values : [f.value];
    // JSON keeps the number of D1 bindings fixed even for many filter values.
    values.push(JSON.stringify(options));
    return `${dimension[f.dim]} IN (SELECT value FROM json_each(?))`;
  });

export interface ReportRow {
  slot: number;
  visits: number;
  visitors: number;
  pageviews: number;
  events: number;
  bounce_rate: number | null;
  single_page_rate: number | null;
  visit_duration: number | null;
  views_per_visit: number | null;
  time_on_page: number | null;
  scroll_depth: number | null;
  clean: number;
  suspect: number;
  bot: number;
  crawler: number;
  avg_duration_ms: number | null;
  conversions: number;
  revenue: number;
  converted_visitors: number;
  eligible_visitors: number;
  revenue_events: number;
  total_revenue: number | null;
}

// Keep reconstructing visits from ordinary events before filtering for a page
// or a goal. A hidden event still determines the visit's duration and bounce.
export async function reportInput(db: D1Database, siteId: string, period: Period, filters: Filter[], reconstruct = true) {
  const stop = Math.min(period.endTs, period.now + 1);
  if (stop <= period.startTs) return null;
  const vv: unknown[] = [];
  const visitFilters = clauses(filters,visitPageDimensions,vv);
  reconstruct ||= visitFilters.length > 0;
  const tables = await eventTables(db, reconstruct ? 0 : period.startTs, stop);
  if (!tables.length) return null;
  const sv: unknown[] = [], ev: unknown[] = [];
  const sessionFilters = clauses(filters, sessionDimensions, sv);
  const eventFilters = clauses(filters, eventDimensions, ev);
  const pvRequired = filters.some(f => Object.hasOwn(eventDimensions,f.dim));
  const goals = filters.filter(f => f.dim === 'goal');
  const goalBinds: unknown[] = [];
  const goalFilters = clauses(goals, {goal: 'e.event'}, goalBinds);
  const base = tables.map(table => `
    SELECT t.id,t.site_id,t.visitor_id,t.session_id,t.ts,t.event,t.path,t.hostname,t.duration_ms,t.scroll_depth,
           t.verdict,t.props,t.browser,t.os,t.region,t.city,t.utm_source,t.utm_term,t.utm_content,
           t.ft_source,t.ft_medium,t.ft_campaign,t.revenue_usd,t.revenue,t.currency
    FROM candidates c CROSS JOIN ${table} t INDEXED BY idx_ev${table.slice(7)}_session
       ON t.session_id=c.session_id AND t.site_id=c.site_id
    WHERE t.ts<=? ${reconstruct ? '' : 'AND t.ts>=?'}`).join(' UNION ALL ');
  const sql = `
    candidates AS MATERIALIZED (
      SELECT * FROM sessions WHERE site_id=? AND started_at<? AND last_active_at>=?
        ${sessionFilters.length ? ' AND '+sessionFilters.join(' AND ') : ''}
    ), raw AS MATERIALIZED (${base})
    ${reconstruct ? `, normal AS (
      SELECT *,LAG(ts) OVER(PARTITION BY session_id ORDER BY ts,id) AS previous
      FROM raw WHERE event NOT IN ${engagement} AND event<>'identify' AND verdict NOT IN ('bot','crawler')
    ), numbered AS MATERIALIZED (
      SELECT *,SUM(CASE WHEN visitor_id=session_id AND previous IS NOT NULL AND ts-previous>${SESSION_IDLE_MS} THEN 1 ELSE 0 END)
        OVER(PARTITION BY session_id ORDER BY ts,id ROWS UNBOUNDED PRECEDING) AS visit_no
      FROM normal
    ), assembled AS (
      SELECT session_id,visit_no,MIN(ts) AS first,MAX(ts) AS last,
        SUM(event='pageview') AS pv,
        MAX(CASE WHEN event<>'pageview' THEN
          CASE WHEN json_valid(props) THEN COALESCE(json_extract(props,'$.interactive'),1) <> 0 ELSE 1 END ELSE 0 END) AS interactive,
        SUBSTR(MIN(printf('%016d%016d',ts,id)||path) FILTER (WHERE event='pageview'),33) AS entry,
        SUBSTR(MAX(printf('%016d%016d',ts,id)||path) FILTER (WHERE event='pageview'),33) AS exit
      FROM numbered e GROUP BY session_id,visit_no
    ), visits AS MATERIALIZED (
      SELECT * FROM assembled ${visitFilters.length ? 'WHERE '+visitFilters.join(' AND ') : ''}
    )` : ''}, eligible AS MATERIALIZED (
      SELECT e.* FROM ${reconstruct ? 'numbered' : 'raw'} e WHERE e.ts>=? AND e.ts<?
        ${reconstruct ? '' : `AND e.event NOT IN ${engagement} AND e.event<>'identify' AND e.verdict NOT IN ('bot','crawler')`}
        ${eventFilters.length ? ' AND '+eventFilters.join(' AND ') : ''}
        ${visitFilters.length ? ' AND EXISTS(SELECT 1 FROM visits v WHERE v.session_id=e.session_id AND v.visit_no=e.visit_no)' : ''}
    ), matching AS MATERIALIZED (
      SELECT e.* FROM eligible e ${goalFilters.length ? 'WHERE '+conversion+' AND '+goalFilters.join(' AND ') : ''}
    )`;
  return {sql, args: [siteId,stop,period.startTs,...sv,...tables.flatMap(()=>reconstruct ? [period.now] : [period.now,period.startTs]),
    ...vv,period.startTs,stop,...ev,...goalBinds],
    matchingVisit: pvRequired || goals.length > 0, hasGoal: goals.length > 0};
}

/** Shared aggregates for the headline and the chart. */
export async function reportMetrics(
  db: D1Database, siteId: string, period: Period, buckets: ReportBucket[], filters: Filter[], metric?: string,
): Promise<ReportRow[]> {
  if (!buckets.length) return [];
  const wantVisits = !metric || visitMetrics.has(metric);
  const wantEngagement = !metric || engagementMetrics.has(metric);
  const wantEvents = !metric || metric === 'views_per_visit' || (!wantVisits && !wantEngagement);
  const wantInvalid = !metric || metric === 'bot_count' || metric === 'crawler_count';
  const input = await reportInput(db, siteId, period, filters, wantVisits);
  if (!input) return [];
  const paths = filters.find(f => f.dim === 'page');
  const pageValues = paths ? paths.values?.length ? paths.values : [paths.value] : null;
  const result = await db.prepare(`
    WITH bins AS MATERIALIZED (
      SELECT CAST(key AS INTEGER) AS slot,json_extract(value,'$.start') AS a,json_extract(value,'$.end') AS z
      FROM json_each(?)
    ), ${input.sql}
    ${wantVisits ? `, active AS (
      SELECT b.slot,v.* FROM bins b JOIN visits v ON v.first<b.z AND v.last>=b.a
      WHERE ${input.matchingVisit ? 'EXISTS(SELECT 1 FROM matching m WHERE m.session_id=v.session_id AND m.visit_no=v.visit_no AND m.ts>=b.a AND m.ts<b.z)' : '1'}
    ), visit_stats AS (
      SELECT slot,COUNT(*) AS visits,AVG(last-first)/1000.0 AS visit_duration,
        AVG(CASE WHEN ? IS NULL OR entry IN (SELECT value FROM json_each(?)) THEN pv<2 AND interactive=0 END) AS bounce_rate,
        AVG(pv<=1) AS single_page_rate
      FROM active GROUP BY slot
    )` : ''}
    ${wantEngagement ? `, engagement_per_visit AS (
      SELECT b.slot,r.session_id,SUM(r.duration_ms) AS dwell,MAX(r.scroll_depth) AS depth
      FROM bins b JOIN raw r ON r.ts>=b.a AND r.ts<b.z
      WHERE r.event IN ${engagement} AND r.verdict NOT IN ('bot','crawler') AND (r.duration_ms IS NOT NULL OR r.scroll_depth IS NOT NULL)
        AND (? IS NULL OR r.path IN (SELECT value FROM json_each(?)))
      GROUP BY b.slot,r.session_id
    ), engagement_stats AS (
      SELECT slot,ROUND(AVG(dwell)) AS avg_duration_ms,ROUND(AVG(depth)) AS scroll_depth
      FROM engagement_per_visit GROUP BY slot
    )` : ''}
    ${wantEvents ? `, event_stats AS (
      SELECT b.slot,COUNT(DISTINCT e.visitor_id) AS visitors,SUM(e.event='pageview') AS pageviews,COUNT(*) AS events,
        SUM(${conversion}) AS conversions, SUM(e.revenue_usd) AS revenue,
        COUNT(DISTINCT CASE WHEN ${conversion} THEN e.visitor_id END) AS converted_visitors,
        COUNT(e.revenue_usd) AS revenue_events, SUM(e.revenue_usd) AS total_revenue,
        SUM(e.event='pageview' AND verdict='clean') AS clean,SUM(e.event='pageview' AND verdict='suspect') AS suspect
      FROM bins b JOIN matching e ON e.ts>=b.a AND e.ts<b.z
      GROUP BY b.slot
    )` : ''}
    ${!metric && input.hasGoal ? `, eligible_stats AS (
      SELECT b.slot,COUNT(DISTINCT e.visitor_id) AS eligible_visitors
      FROM bins b JOIN eligible e ON e.ts>=b.a AND e.ts<b.z GROUP BY b.slot
    )` : ''}
    ${wantInvalid ? `, invalid_stats AS (
      SELECT b.slot,SUM(r.verdict='bot') AS bot,SUM(r.verdict='crawler') AS crawler
      FROM bins b JOIN raw r ON r.ts>=b.a AND r.ts<b.z
      WHERE r.event='pageview' AND r.verdict IN ('bot','crawler') GROUP BY b.slot
    )` : ''}
    SELECT b.slot
      ${wantVisits ? ',v.*' : ''}
      ${wantEvents ? ',e.*' : ''}
      ${wantVisits && wantEvents ? ',ROUND(1.0 * COALESCE(e.pageviews,0) / v.visits,2) AS views_per_visit' : ''}
      ${wantEngagement ? ',g.avg_duration_ms,CASE WHEN ? THEN ROUND(g.avg_duration_ms/1000.0) END AS time_on_page,CASE WHEN ? THEN g.scroll_depth END AS scroll_depth' : ''}
      ${wantInvalid ? ',i.bot,i.crawler' : ''}
      ${!metric && input.hasGoal ? ',d.eligible_visitors' : ''}
    FROM bins b
      ${wantVisits ? 'LEFT JOIN visit_stats v USING(slot)' : ''}
      ${wantEvents ? 'LEFT JOIN event_stats e USING(slot)' : ''}
      ${wantEngagement ? 'LEFT JOIN engagement_stats g USING(slot)' : ''}
      ${wantInvalid ? 'LEFT JOIN invalid_stats i USING(slot)' : ''}
      ${!metric && input.hasGoal ? 'LEFT JOIN eligible_stats d USING(slot)' : ''}
    ORDER BY b.slot
  `).bind(JSON.stringify(buckets),...input.args,
    ...(wantVisits ? [pageValues ? 1 : null,JSON.stringify(pageValues ?? [])] : []),
    ...(wantEngagement ? [pageValues ? 1 : null,JSON.stringify(pageValues ?? []),pageValues ? 1 : 0,pageValues ? 1 : 0] : []))
    .all<ReportRow>();
  return result.results;
}

export function reportPercent(numerator: number, denominator: number | null | undefined) {
  return denominator ? Math.round(1000 * numerator / denominator) / 10 : null;
}

type Revenue = {amount: number; currency: string};

export function reportRevenue(amount: number | null, sales: number, currency: string | null) {
  const total: Revenue | null = amount == null || !currency ? null : {amount, currency};
  return {total_revenue: total, average_revenue: total && sales
    ? {...total, amount: Math.round(100 * total.amount / sales) / 100} : null};
}

/** Dimension rows use the same activity and filters as the headline. */
export async function reportBreakdown(
  db: D1Database, siteId: string, dim: string, period: Period, limit: number, filters: Filter[],
) {
  const isPages = dim === 'page';
  const isEntryExit = dim === 'entry_page' || dim === 'exit_page';
  const isExit = dim === 'exit_page';
  const includeVisits = isPages || isEntryExit || ['source','channel','referrer','utm_campaign','utm_medium','country','device'].includes(dim);
  const input = await reportInput(db, siteId, period, filters, includeVisits);
  if (!input) return [];
  const key = groupedDimensions[dim];
  const visitKey = isPages ? 'v.entry' : key;
  const visitMatch = input.matchingVisit
    ? 'AND EXISTS (SELECT 1 FROM matching m WHERE m.session_id=v.session_id AND m.visit_no=v.visit_no)' : '';
  const result = await db.prepare(`
    WITH ${input.sql},
    base AS (
      SELECT ${key} AS key,e.* FROM eligible e JOIN candidates c USING(session_id)
      ${isEntryExit ? 'JOIN visits v USING(session_id,visit_no)' : ''}
      ${dim === 'goal' ? 'WHERE '+conversion : ''}
    ), denominator AS (
      SELECT COUNT(DISTINCT visitor_id) AS n FROM eligible
    ), group_denominator AS (
      SELECT key,COUNT(DISTINCT visitor_id) AS n FROM base GROUP BY key
    ), events_by_key AS (
      SELECT b.key,COUNT(DISTINCT b.visitor_id) AS uv,
        ${dim === 'goal' ? 'COUNT(*)' : "SUM(b.event='pageview')"} AS pv, COUNT(*) AS events,
        SUM(b.verdict NOT IN ('bot','crawler') AND ${dim === 'goal' ? '1' : "b.event='pageview'"}) AS pv_clean,
        COUNT(DISTINCT b.visitor_id) AS uv_clean,
        COUNT(b.revenue) AS sales,SUM(b.revenue) AS total,
        CASE WHEN COUNT(DISTINCT CASE WHEN b.revenue IS NOT NULL THEN UPPER(COALESCE(b.currency,'USD')) END)=1
          THEN MAX(CASE WHEN b.revenue IS NOT NULL THEN UPPER(COALESCE(b.currency,'USD')) END) END AS currency,
        COALESCE(SUM(b.revenue_usd),0) AS revenue
      FROM base b
      ${input.hasGoal ? 'JOIN matching m ON m.id=b.id AND m.ts=b.ts AND m.session_id=b.session_id' : ''}
      WHERE b.key IS NOT NULL AND b.key<>''
      GROUP BY b.key
    )
    ${includeVisits ? `, visits_by_key AS (
      SELECT ${visitKey} AS key,COUNT(*) AS visits,COUNT(DISTINCT c.visitor_id) AS uv,
        SUM(v.pv<2 AND v.interactive=0) AS bounces,
        ROUND(AVG(v.last-v.first)/1000.0) AS visit_duration
      FROM visits v JOIN candidates c USING(session_id)
      WHERE v.first<? AND v.last>=? ${visitMatch}
      GROUP BY ${visitKey}
    )` : ''}
    ${isExit ? `, exit_pageviews AS (
      SELECT path AS key,COUNT(*) AS views FROM eligible WHERE event='pageview' GROUP BY path
    )` : ''}
    ${isPages ? `, measured_sessions AS (
      SELECT r.path AS key,r.session_id,SUM(r.duration_ms) AS dwell,MAX(r.scroll_depth) AS depth
      FROM raw r WHERE r.ts>=? AND r.ts<? AND r.event IN ${engagement}
        AND r.verdict NOT IN ('bot','crawler') AND (r.duration_ms IS NOT NULL OR r.scroll_depth IS NOT NULL)
      GROUP BY r.path,r.session_id
    ), measured_pages AS (
      SELECT key,SUM(dwell) AS total_duration_ms,ROUND(AVG(dwell)/1000.0) AS time_on_page,
        ROUND(AVG(depth)) AS scroll_depth FROM measured_sessions GROUP BY key
    )` : ''}
    SELECT e.*, d.n AS denominator,g.n AS group_denominator
      ${includeVisits ? ',v.visits,v.bounces,v.visit_duration,v.uv AS visit_uv' : ''}
      ${isExit ? ',x.views AS exit_pageviews' : ''}
      ${isPages ? ',p.total_duration_ms,p.time_on_page,p.scroll_depth' : ''}
    FROM events_by_key e CROSS JOIN denominator d
      JOIN group_denominator g USING(key)
      ${includeVisits ? 'LEFT JOIN visits_by_key v USING(key)' : ''}
      ${isExit ? 'LEFT JOIN exit_pageviews x USING(key)' : ''}
      ${isPages ? 'LEFT JOIN measured_pages p USING(key)' : ''}
    ORDER BY ${isEntryExit ? 'v.uv' : 'e.uv'} DESC, e.pv DESC,e.key LIMIT ?
  `).bind(...input.args,...(includeVisits ? [Math.min(period.endTs,period.now+1),period.startTs] : []),
    ...(isPages ? [period.startTs,Math.min(period.endTs,period.now+1)] : []),limit).all<{
      key: string; uv: number; pv: number; events: number; pv_clean: number; uv_clean: number;
      sales: number; total: number | null; currency: string | null; revenue: number;
      denominator: number; group_denominator: number; visits?: number; bounces?: number;
      visit_uv?: number; visit_duration?: number; total_duration_ms?: number;
      time_on_page?: number; scroll_depth?: number; exit_pageviews?: number;
    }>();
  return result.results.map(r => {
    const uv = isEntryExit ? r.visit_uv ?? 0 : r.uv;
    return {
      key: r.key, ...(isPages ? {path:r.key} : {}), uv, pv: r.pv, events: r.events,
      pv_clean: r.pv_clean, uv_clean: r.uv_clean, sessions: r.visits ?? null, bounces: r.bounces ?? null,
      bounce_rate_percent: r.visits ? Math.round(100 * (r.bounces ?? 0) / r.visits) : null,
      views_per_visit: r.visits ? Math.round(100 * r.pv / r.visits) / 100 : null,
      visit_duration: r.visit_duration ?? null, percentage: reportPercent(uv,r.denominator),
      ...(isExit ? {exit_rate:reportPercent(r.visits ?? 0,r.exit_pageviews)} : {}),
      ...(isPages ? {total_duration_ms:r.total_duration_ms ?? null, time_on_page:r.time_on_page ?? null, scroll_depth:r.scroll_depth ?? null} : {}),
      ...(dim === 'goal' || input.hasGoal ? {
        conversion_rate: reportPercent(r.uv,r.denominator),
        group_conversion_rate: reportPercent(r.uv, dim === 'goal' ? r.denominator : r.group_denominator),
        revenue: r.revenue, ...reportRevenue(r.total,r.sales,r.currency),
      } : {}),
    };
  });
}
