import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { SourceIcon } from '../components/Icons';
import { api } from '../lib/api';
import type { OnlineVisitorsResponse } from '../lib/types';
import { displaySourceLabel, fmtRelativeTime } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { Link } from '../lib/router';

export function OnlineVisitorsPage({ siteId }: { siteId: string }) {
  const { lang, t } = useI18n();
  const zh = lang === 'zh';
  const [data, setData] = useState<OnlineVisitorsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let timer: number;
    async function refresh() {
      try {
        const result = await api.onlineVisitors(siteId);
        if (active) { setData(result); setFailed(false); }
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) timer = window.setTimeout(refresh, 30_000);
      }
    }
    void refresh();
    return () => { active = false; window.clearTimeout(timer); };
  }, [siteId]);
  return <div className="min-h-screen bg-[#fafafa] text-zinc-900">
    <Navbar />
    <main className="max-w-[1120px] mx-auto px-4 pb-16">
      <Link to={`/sites/${siteId}`} className="inline-flex items-center gap-1 text-sm text-zinc-600"><ArrowLeft size={16}/>{zh ? '返回站点面板' : 'Dashboard'}</Link>
      <h1 className="mt-4 text-xl font-bold">{zh ? '在线访客' : 'Current visitors'} {data?.online ?? '–'}</h1>
      {data && <p className="mt-1 text-sm text-zinc-500">{zh ? `最近 ${data.window_minutes} 分钟，按访客最近一次活跃会话归属来源。` : `Last ${data.window_minutes} minutes, grouped by each visitor’s latest active session.`}</p>}
      {failed && <p role="alert" className="mt-3 text-sm text-amber-700">{zh ? '刷新失败，稍后自动重试。' : 'Refresh failed. Retrying shortly.'}</p>}
      {!data ? !failed && <p className="mt-4">{zh ? '加载中…' : 'Loading…'}</p> :
        <div className="mt-5 grid items-start gap-5 md:grid-cols-[2fr_3fr]">
          <section className="plausible-card p-4 min-w-0">
            <h2 className="mb-3 font-semibold">{t('col.source')}</h2>
            {data.sources.map(r => <div key={r.source} className="flex items-center gap-2 border-t border-zinc-100 py-2 text-sm">
              <SourceIcon source={r.source}/><span className="break-all">{displaySourceLabel(r.source, lang)}</span><strong className="ml-auto tabular-nums">{r.visitors}</strong>
            </div>)}
            {!data.online && <p className="text-sm text-zinc-500">{zh ? '当前没有在线访客' : 'No active visitors'}</p>}
          </section>
          <section className="plausible-card p-4 min-w-0">
            <h2 className="mb-3 font-semibold">{zh ? '最近活跃的访客' : 'Recently active visitors'} <span className="text-sm font-normal text-zinc-500">{data.visitors.length} / {data.online}</span></h2>
            {data.visitors.map(r => <Link key={r.visitor_id} to={`/sites/${siteId}/visitors/${encodeURIComponent(r.visitor_id)}?online=1`} className="block border-t border-zinc-100 py-2 text-sm hover:bg-zinc-50">
              <div className="flex items-center gap-2"><SourceIcon source={r.source}/><span className="truncate">{displaySourceLabel(r.source, lang)}</span><span className="ml-auto shrink-0 text-xs text-zinc-500">{fmtRelativeTime(r.last_ts,lang)}</span></div>
              <div className="mt-1 truncate text-xs text-zinc-600">{r.path ?? '—'} · {r.visitor_id.slice(0,12)}</div>
            </Link>)}
          </section>
        </div>}
    </main>
  </div>;
}
