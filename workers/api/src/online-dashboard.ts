import { SESSION_IDLE_MS } from '../../../shared/ids';
import { longTab, tabSpansSql } from './visit-duration';
import { RESERVED_EVENTS_SQL } from '../../../shared/events';
import { eventTables, REALTIME_WINDOW_MINUTES, type Filter } from './queries';

const STEP = 5 * 60_000;
const dimensions = {
  source: "CASE WHEN s.session_id IS NULL THEN COALESCE(e.utm_source,e.ref_domain,'(unknown)') ELSE COALESCE(s.source,'(direct)') END",
  channel: "COALESCE(s.channel,'(unknown)')", referrer: "COALESCE(NULLIF(s.referrer,''),NULLIF(e.referrer,''),'(none)')",
  page: 'e.path', entry_page: 's.entry_page', exit_page: 's.exit_page', country: 'e.country', region: 'e.region',
  city: 'e.city', browser: 'e.browser', os: 'e.os', device: 'e.device_type',
  utm_campaign: 'COALESCE(s.campaign,e.utm_campaign)', utm_medium: 'COALESCE(s.medium,e.utm_medium)',
  utm_term: 'e.utm_term', utm_content: 'e.utm_content',
};
const dimensionNames = Object.keys(dimensions);
export const onlineFilterDimensions = new Set(dimensionNames);
const emptyStats = { uv: 0, pv: 0, sessions: 0, pv_per_visitor: 0, bounce_rate: null, bounce_rate_single: null,
  avg_duration_ms: null, visit_duration_ms: null };

export async function onlineDashboard(db: D1Database, site: string, now: number, tz: string, filters: Filter[]) {
  const start = now - REALTIME_WINDOW_MINUTES * 60_000;
  const tables = await eventTables(db, start, now + 1);
  const groups = new Map(dimensionNames.map(name => [name, new Map<string, {key: string; uv: number; pv: number}>()]));
  const visitors: { visitor_id: string; source: string; path: string; last_ts: number }[] = [];
  const goals: { key: string; uv: number; pv: number; revenue: number }[] = [];
  type Stats = { [K in keyof typeof emptyStats]: number | null };
  let overview: Stats = emptyStats;
  const buckets = new Map<number, Stats>();
  if (tables.length) {
    const history = await eventTables(db, 0, now + 1);
    const columns = 'id,visitor_id,session_id,ts,event,path,country,region,city,browser,os,device_type,utm_source,ref_domain,referrer,utm_campaign,utm_medium,utm_term,utm_content,revenue_usd';
    const raw = tables.map(t => `SELECT ${columns} FROM ${t} WHERE site_id=? AND ts>=? AND ts<=? AND verdict NOT IN ('bot','crawler')`).join(' UNION ALL ');
    const dims = Object.entries(dimensions).map(([name,expr]) => `COALESCE(NULLIF(${expr},''),'(unknown)') AS ${name}`).join(',');
    const valid = filters.filter(f => dimensionNames.includes(f.dim));
    const values = valid.map(f => f.values?.length ? f.values : [f.value]);
    const where = valid.map((f, i) => `${f.dim} IN (${values[i].map(() => '?').join(',')})`).join(' AND ');
    const result = await db.prepare(`
      WITH ev AS MATERIALIZED (${raw}), ranked AS (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY visitor_id ORDER BY ts DESC, session_id DESC, path DESC, id DESC) AS rn FROM ev
      ), latest AS (
        SELECT e.visitor_id, e.ts, ${dims} FROM ranked e LEFT JOIN sessions s ON s.site_id=? AND s.session_id=e.session_id WHERE rn=1
      ), people AS MATERIALIZED (SELECT * FROM latest ${where ? 'WHERE '+where : ''}),
      activity AS MATERIALIZED (
        SELECT ev.* FROM ev JOIN people USING(visitor_id)
      ), candidates AS MATERIALIZED (
        SELECT site_id,session_id FROM sessions WHERE site_id=? AND session_id IN (SELECT session_id FROM activity) AND ${longTab}
      ), ${tabSpansSql(history)}, per_bucket AS (
        SELECT (ts / ${STEP}) * ${STEP} AS bucket,visitor_id,session_id,SUM(event='pageview') AS pv FROM activity GROUP BY bucket,visitor_id,session_id
      ), visits AS (
        SELECT * FROM per_bucket UNION ALL
        SELECT -1,visitor_id,session_id,SUM(pv) FROM per_bucket GROUP BY visitor_id,session_id
      )
      SELECT 'person' AS kind, json_object('visitor_id',visitor_id,'ts',ts,'pv',pv,${dimensionNames.map(k => `'${k}',${k}`).join(',')}) AS payload FROM people JOIN (SELECT visitor_id,SUM(pv) AS pv FROM per_bucket GROUP BY visitor_id) USING(visitor_id)
      UNION ALL SELECT 'stats',json_object('bucket',bucket,'uv',COUNT(DISTINCT v.visitor_id),'pv',SUM(v.pv),'sessions',COUNT(*),
        'pv_per_visitor',1.0*SUM(v.pv)/COUNT(DISTINCT v.visitor_id),'bounce_rate',AVG(s.is_bounce),'bounce_rate_single',AVG(s.pageviews<=1),
        'avg_duration_ms',AVG(s.duration_ms),'visit_duration_ms',AVG(CASE WHEN s.visitor_id=s.session_id AND s.last_pageview_at-s.started_at>${SESSION_IDLE_MS} THEN sp.last_ts-sp.first_ts ELSE s.last_pageview_at-s.started_at END))
        FROM visits v LEFT JOIN sessions s ON s.site_id=? AND s.session_id=v.session_id
        LEFT JOIN spans sp ON sp.session_id=v.session_id AND sp.last_ts>=? AND sp.first_ts<=? GROUP BY bucket
      UNION ALL SELECT 'goal',json_object('key',event,'uv',COUNT(DISTINCT visitor_id),'pv',COUNT(*),'revenue',COALESCE(SUM(revenue_usd),0))
        FROM activity WHERE event NOT IN (${RESERVED_EVENTS_SQL}) GROUP BY event
    `).bind(...tables.flatMap(() => [site,start,now]),site,...values.flat(),site,site,start,now).all<{kind: string; payload: string}>();
    for (const row of result.results) {
      const data = JSON.parse(row.payload);
      if (row.kind === 'stats') {
        const {bucket, ...metrics} = data;
        if (bucket === -1) overview = metrics;
        else buckets.set(bucket, metrics);
      } else if (row.kind === 'goal') goals.push(data);
      else {
        for (const [name,counts] of groups) {
          const key = data[name];
          const entry = counts.get(key) ?? {key, uv: 0, pv: 0};
          entry.uv++;
          entry.pv += data.pv;
          counts.set(key, entry);
        }
        visitors.push({visitor_id: data.visitor_id, source: data.source, path: data.page, last_ts: data.ts});
      }
    }
  }
  const series = [];
  const clock = new Intl.DateTimeFormat('en-GB', {timeZone: tz, hour: '2-digit', minute: '2-digit'});
  for (let bucket = Math.floor(start / STEP) * STEP; bucket <= now; bucket += STEP) {
    series.push({label: clock.format(bucket), status: bucket + STEP > now ? 'partial' : 'complete', metrics: buckets.get(bucket) ?? emptyStats});
  }
  const breakdown = Object.fromEntries([...groups].map(([dim,counts]) => [dim,
    [...counts.values()].sort((a,b) => b.uv-a.uv || a.key.localeCompare(b.key)).slice(0,dim === 'country' ? 250 : 100),
  ]));
  visitors.sort((a,b) => b.last_ts-a.last_ts || a.visitor_id.localeCompare(b.visitor_id));
  return {as_of: now, window_minutes: REALTIME_WINDOW_MINUTES, overview, series, breakdown,
    goals: goals.sort((a,b) => b.uv-a.uv), visitors: visitors.slice(0,60)};
}
