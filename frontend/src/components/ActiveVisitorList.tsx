import { SourceIcon } from './Icons';
import type { OnlineDashboardResponse } from '../lib/types';
import { displaySourceLabel, fmtRelativeTime } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { Link } from '../lib/router';

export function ActiveVisitorList({ siteId, visitors, online }: {siteId: string; visitors: OnlineDashboardResponse['visitors']; online: number}) {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  return (
    <section id="active-visitors" className="plausible-card p-4 mt-5 min-w-0">
      <h2 className="mb-3 font-semibold">{zh ? '最近活跃的访客' : 'Recently active visitors'} <span className="text-sm font-normal text-zinc-500">{visitors.length} / {online}</span></h2>
      {!online && <p className="text-sm text-zinc-500">{zh ? '当前没有在线访客' : 'No active visitors'}</p>}
      {visitors.map(r => <Link key={r.visitor_id} to={`/sites/${siteId}/visitors/${encodeURIComponent(r.visitor_id)}?online=1`} className="block border-t border-zinc-100 py-2 text-sm hover:bg-zinc-50">
        <div className="flex items-center gap-2"><SourceIcon source={r.source}/><span className="truncate">{displaySourceLabel(r.source, lang)}</span><span className="ml-auto shrink-0 text-xs text-zinc-500">{fmtRelativeTime(r.last_ts,lang)}</span></div>
        <div className="mt-1 truncate text-xs text-zinc-600">{r.path ?? '—'} · {r.visitor_id.slice(0,12)}</div>
      </Link>)}
    </section>
  );
}
