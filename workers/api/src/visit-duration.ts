import { SESSION_IDLE_MS } from '../../../shared/ids';

// Match the partial index in 0022. A shorter span cannot contain an idle gap.
export const longTab = `visitor_id=session_id AND last_pageview_at-started_at>${SESSION_IDLE_MS}`;

// candidates(site_id,session_id) is supplied by each report. Use complete pageview
// histories for those tabs so a report boundary never creates an artificial visit.
export function tabSpansSql(tables: string[]) {
  const pages = tables.map(table => `SELECT e.session_id,e.ts FROM candidates c
    CROSS JOIN ${table} e INDEXED BY idx_ev${table.slice(7)}_session ON e.session_id=c.session_id AND e.site_id=c.site_id
    WHERE e.event='pageview'`).join(' UNION ALL ');
  return `page_times AS (SELECT session_id,ts,COUNT(*) AS pv FROM (${pages}) GROUP BY session_id,ts),
    gaps AS (SELECT *,ts-LAG(ts) OVER(PARTITION BY session_id ORDER BY ts) AS gap FROM page_times),
    numbered AS (SELECT *,SUM(CASE WHEN gap IS NULL OR gap>${SESSION_IDLE_MS} THEN 1 ELSE 0 END)
      OVER(PARTITION BY session_id ORDER BY ts) AS visit FROM gaps),
    spans AS (SELECT session_id,MIN(ts) AS first_ts,MAX(ts) AS last_ts,SUM(pv) AS pageviews FROM numbered GROUP BY session_id,visit)`;
}
