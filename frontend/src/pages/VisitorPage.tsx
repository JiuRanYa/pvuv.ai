import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Search } from 'lucide-react';
import { api } from '../lib/api';
import type { VisitorListRow, VisitorProfileResponse } from '../lib/types';
import {
  countryFlag,
  countryName,
  displaySourceLabel,
  fmtDuration,
  fmtRelativeTime,
  PERIOD_OPTIONS,
} from '../lib/format';
import { useI18n } from '../lib/i18n';
import { Link, useRouter } from '../lib/router';
import { Navbar } from '../components/Navbar';
import { Dropdown } from '../components/Dropdown';

export function VisitorPage({ siteId, vid }: { siteId: string; vid?: string }) {
  const { lang, t } = useI18n();
  const { navigate, search } = useRouter();
  const params = new URLSearchParams(search);
  const fromOnline = params.get('online') === '1';
  const listPath = `/sites/${siteId}/visitors`;
  const period = PERIOD_OPTIONS.find(p => p === params.get('period')) ?? (fromOnline ? '24h' : '7d');
  const setPeriod = (p: string) => navigate(`${listPath}${vid ? '/' + encodeURIComponent(vid) : ''}?period=${p}${fromOnline ? '&online=1' : ''}`);
  const [verdict, setVerdict] = useState<string>('');
  const [pathFilter, setPathFilter] = useState('');
  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [profile, setProfile] = useState<VisitorProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    if (vid) {
      api
        .visitorProfile(siteId, vid, period)
        .then((res) => {
          if (alive) setProfile(res);
        })
        .catch(() => {
          if (alive) { setProfile(null); setFailed(true); }
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    } else {
      api
        .visitors(siteId, period, {
          verdict: verdict || undefined,
          path: pathFilter.trim() || undefined,
          limit: 60,
        })
        .then((res) => {
          if (alive) setRows(res.rows ?? []);
        })
        .catch(() => {
          if (alive) { setRows([]); setFailed(true); }
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }
    return () => {
      alive = false;
    };
  }, [siteId, vid, period, verdict, pathFilter]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <Navbar />

      <main className="max-w-[1120px] mx-auto px-4 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-5">
          <div className="flex items-center gap-3">
            <Link
              to={vid ? (fromOnline ? `/sites/${siteId}?online=1` : `${listPath}?period=${period}`) : `/sites/${siteId}`}
              className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{vid && fromOnline ? (lang === 'zh' ? '返回在线访客' : 'Current visitors') : vid ? (lang === 'zh' ? '返回访客列表' : 'All visitors') : (lang === 'zh' ? '返回站点面板' : 'Dashboard')}</span>
            </Link>
            <h1 className="text-[19px] font-bold tracking-tight text-zinc-900">
              {vid ? `Visitor ${vid.slice(0, 16)}…` : t('toolbar.visitors')}
            </h1>
          </div>

          <Dropdown
            align="right"
            widthClass="min-w-[168px]"
            value={period}
            onSelect={setPeriod}
            options={PERIOD_OPTIONS.map((p) => ({ value: p, label: t(`period.${p}`) }))}
            trigger={() => (
              <button
                type="button"
                className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[13.5px] font-medium text-zinc-700 hover:bg-zinc-200/60 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span>{t(`period.${period}`)}</span>
              </button>
            )}
          />
        </div>

        {failed ? <p role="alert" className="plausible-card p-5">{lang === 'zh' ? '访客数据加载失败，请刷新重试。' : 'Could not load visitors. Refresh to retry.'}</p> : vid ? (
          <div className="space-y-5">
            {loading ? (
              <div className="plausible-card p-8 text-center text-[13px] text-zinc-400">Loading…</div>
            ) : !profile ? (
              <div className="plausible-card p-8 text-center text-[13px] text-zinc-400">{t('empty.no_data')}</div>
            ) : (
              <>
                <section className="plausible-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-zinc-500">Visitor ID</div>
                    <div className="mt-1 font-mono text-[12.5px] text-zinc-900 break-all">{vid}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-zinc-500">Sessions</div>
                    <div className="mt-1 text-[18px] font-bold tabular-nums">{profile.sessions.length === 50 ? '50+' : profile.sessions.length}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-zinc-500">Events</div>
                    <div className="mt-1 text-[18px] font-bold tabular-nums">{profile.events.length === 300 ? '300+' : profile.events.length}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-zinc-500">Verdict</div>
                    <div className="mt-1 text-[14px] font-semibold uppercase text-zinc-900">
                      {String(profile.events[0]?.verdict ?? profile.sessions[0]?.verdict ?? '—')}
                    </div>
                  </div>
                </section>

                <section className="plausible-card p-5">
                  <h2 className="font-semibold">{lang === 'zh' ? '会话来源' : 'Session sources'}</h2>
                  {profile.sessions.map(s => <div key={String(s.session_id)} className="mt-2 border-t border-zinc-100 pt-2 text-sm">
                    <strong>{displaySourceLabel(typeof s.source === 'string' ? s.source : '(direct)', lang)}</strong>
                    <span className="ml-2 text-zinc-500">{new Date(Number(s.started_at)).toLocaleString()}</span>
                    <div className="break-all">{String(s.entry_page ?? '—')}</div>
                  </div>)}
                  {!profile.sessions.length && <p className="py-2 text-sm text-zinc-500">{t('empty.no_data')}</p>}
                </section>
                <section className="plausible-card p-5">
                  <h2 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-900 border-b border-zinc-200 pb-3">
                    {lang === 'zh' ? '事件时间轴' : 'Event Timeline'}
                  </h2>
                  {profile.events.length === 0 ? (
                    <div className="py-10 text-center text-[13px] text-zinc-400">{t('empty.no_data')}</div>
                  ) : (
                    <div className="divide-y divide-zinc-100 mt-1">
                      {profile.events.map((ev, i) => (
                        <div key={i} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-semibold uppercase">
                              {String(ev.event ?? 'event')}
                            </span>
                            <span className="text-zinc-800 truncate">{String(ev.path ?? '/')}</span>
                            {Number(ev.duration_ms) > 0 && (
                              <span className="text-[12px] text-zinc-400 tabular-nums">
                                ({fmtDuration(Number(ev.duration_ms))})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[12px] text-zinc-500 tabular-nums">
                            {ev.verdict ? <span>{String(ev.verdict)}</span> : null}
                            <span>{ev.ts ? new Date(Number(ev.ts)).toLocaleString() : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        ) : (
          <section className="plausible-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200">
              <div className="inline-flex flex-wrap rounded-md bg-zinc-100 p-0.5">
                {[
                  { id: '', label: lang === 'zh' ? '全部' : 'All' },
                  { id: 'clean', label: t('quality.clean') },
                  { id: 'suspect', label: t('quality.suspect') },
                  { id: 'bot', label: t('quality.bot') },
                  { id: 'crawler', label: t('quality.crawler') },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVerdict(opt.id)}
                    className={`h-7 px-3 rounded text-[12px] font-medium cursor-pointer ${
                      verdict === opt.id ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={pathFilter}
                  onChange={(e) => setPathFilter(e.target.value)}
                  placeholder={lang === 'zh' ? '按页面路径筛选…' : 'Filter by path…'}
                  className="h-8 pl-8 pr-3 rounded-md border border-zinc-300 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-[13px] text-zinc-400">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-zinc-400">{t('empty.no_data')}</div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[12px] font-medium text-zinc-500">
                      <th className="py-2 pr-3">Visitor ID</th>
                      <th className="py-2 px-3">{t('col.source')}</th>
                      <th className="py-2 px-3">Verdict</th>
                      <th className="py-2 px-3">Country</th>
                      <th className="py-2 px-3">Device</th>
                      <th className="py-2 px-3 text-right">PV</th>
                      <th className="py-2 pl-3 text-right">Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-[13px]">
                    {rows.map((r) => (
                      <tr
                        key={r.visitor_id}
                        onClick={() => navigate(`${listPath}/${encodeURIComponent(r.visitor_id)}?period=${period}`)}
                        className="hover:bg-zinc-50 cursor-pointer"
                      >
                        <td className="py-2.5 pr-3 font-mono text-[12px] text-indigo-600">
                          {r.visitor_id.slice(0, 16)}…
                        </td>
                        <td className="py-2.5 px-3 text-zinc-700">{displaySourceLabel(r.source, lang)}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                              r.verdict === 'bot'
                                ? 'bg-rose-50 text-rose-700'
                                : r.verdict === 'suspect'
                                  ? 'bg-amber-50 text-amber-700'
                                  : r.verdict === 'crawler'
                                    ? 'bg-sky-50 text-sky-700'
                                    : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {r.verdict}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-700">
                          {r.country ? `${countryFlag(r.country)} ${countryName(r.country, lang)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600">{r.device_type || '—'}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-zinc-800 font-medium">{r.pv}</td>
                        <td className="py-2.5 pl-3 text-right text-zinc-500 text-[12px]">
                          {fmtRelativeTime(r.last_ts, lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
