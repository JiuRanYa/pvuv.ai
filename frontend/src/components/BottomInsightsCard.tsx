import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';
import type {
  AdguardResponse,
  AiReportResponse,
  AlertItem,
  BreakdownRow,
  CtitResponse,
  FilterItem,
  FunnelQueryResponse,
  FunnelStep,
  OverviewResponse,
  QualityResponse,
  SavedFunnel,
  SiteRecord,
  TrafficVisitorRow,
  VitalsResponse,
} from '../lib/types';
import {
  countryFlag,
  countryName,
  fmtCompact,
  fmtDuration,
  fmtNumber,
  fmtPct,
  fmtRelativeTime,
  fmtUsd,
  labelBotFlag,
} from '../lib/format';
import { useI18n } from '../lib/i18n';
import { Link } from '../lib/router';

export type BottomTabId =
  | 'goals'
  | 'funnels'
  | 'quality'
  | 'adguard'
  | 'vitals'
  | 'suspicious'
  | 'ai';

export function BottomInsightsCard({
  site,
  period,
  filters,
  overview,
  goals,
  activeTab,
  onTabChange,
  onSiteUpdated,
  isPublic = false,
  publicToken,
}: {
  site: SiteRecord;
  period: string;
  filters: FilterItem[];
  overview: OverviewResponse | null;
  goals: BreakdownRow[];
  activeTab: BottomTabId;
  onTabChange: (tab: BottomTabId) => void;
  onSiteUpdated?: () => void;
  isPublic?: boolean;
  publicToken?: string;
}) {
  const { lang, t } = useI18n();

  // Lazily loaded per-tab states
  const [qualityData, setQualityData] = useState<QualityResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [adguardData, setAdguardData] = useState<AdguardResponse | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [vitalsData, setVitalsData] = useState<VitalsResponse | null>(null);
  const [ctitData, setCtitData] = useState<CtitResponse | null>(null);
  const [suspiciousRows, setSuspiciousRows] = useState<TrafficVisitorRow[]>([]);
  const [verdictFilter, setVerdictFilter] = useState<string>('');
  const [aiData, setAiData] = useState<AiReportResponse | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Funnels
  const [funnels, setFunnels] = useState<SavedFunnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [funnelResult, setFunnelResult] = useState<FunnelQueryResponse | null>(null);
  const [creatingFunnel, setCreatingFunnel] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [newFunnelSteps, setNewFunnelSteps] = useState<FunnelStep[]>([
    { type: 'page', value: '/' },
    { type: 'event', value: 'signup' },
  ]);
  const [funnelErr, setFunnelErr] = useState<string | null>(null);

  const [loadingTab, setLoadingTab] = useState(false);
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let alive = true;
    setLoadingTab(true);

    const run = async () => {
      try {
        if (activeTab === 'quality') {
          if (isPublic && publicToken) {
            const q = await api.publicQuality(site.site_id, publicToken, period);
            if (alive) setQualityData(q);
          } else {
            const [q, al] = await Promise.all([
              api.quality(site.site_id, period, filters),
              api.alerts(site.site_id, period, filters).catch(() => ({ alerts: [] })),
            ]);
            if (alive) {
              setQualityData(q);
              setAlerts(al.alerts ?? []);
            }
          }
        } else if (activeTab === 'adguard' && !isPublic) {
          const ag = await api.adguard(site.site_id, period);
          if (alive) setAdguardData(ag);
        } else if (activeTab === 'vitals') {
          if (isPublic && publicToken) {
            const v = await api.publicVitals(site.site_id, publicToken, period);
            if (alive) setVitalsData(v);
          } else {
            const [v, ct] = await Promise.all([
              api.vitals(site.site_id, period, filters),
              api.ctit(site.site_id, period).catch(() => null),
            ]);
            if (alive) {
              setVitalsData(v);
              setCtitData(ct);
            }
          }
        } else if (activeTab === 'suspicious' && !isPublic) {
          const res = await api.traffic(
            site.site_id,
            period,
            { verdict: verdictFilter || undefined, min_score: verdictFilter ? undefined : 1, limit: 50 },
            filters,
          );
          if (alive) setSuspiciousRows(res.rows ?? []);
        } else if (activeTab === 'ai' && !isPublic) {
          const res = await api.aiReport(site.site_id);
          if (alive) setAiData(res);
        } else if (activeTab === 'funnels' && !isPublic) {
          const res = await api.funnels(site.site_id);
          if (!alive) return;
          const list = res.funnels ?? [];
          setFunnels(list);
          const pick = list.find((f) => f.funnel_id === selectedFunnelId) ?? list[0] ?? null;
          setSelectedFunnelId(pick?.funnel_id ?? null);
          if (pick) {
            const qRes = await api.queryFunnel(site.site_id, period, pick.steps, filters);
            if (alive) setFunnelResult(qRes);
          } else {
            setFunnelResult(null);
          }
        }
      } catch {
        /* graceful fallback */
      } finally {
        if (alive) setLoadingTab(false);
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [activeTab, site.site_id, period, filtersKey, verdictFilter, isPublic, publicToken]);

  const handleSelectFunnel = async (f: SavedFunnel) => {
    setSelectedFunnelId(f.funnel_id);
    setLoadingTab(true);
    try {
      const qRes = await api.queryFunnel(site.site_id, period, f.steps, filters);
      setFunnelResult(qRes);
    } finally {
      setLoadingTab(false);
    }
  };

  const handleSaveFunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    setFunnelErr(null);
    const cleaned = newFunnelSteps.map((s) => ({ type: s.type, value: s.value.trim() })).filter((s) => s.value);
    if (cleaned.length < 2) {
      setFunnelErr(lang === 'zh' ? '请至少填写 2 个有效步骤' : 'Please provide at least 2 valid steps.');
      return;
    }
    try {
      const saved = await api.saveFunnel(site.site_id, {
        name: newFunnelName.trim() || 'Conversion Funnel',
        steps: cleaned,
      });
      setCreatingFunnel(false);
      setNewFunnelName('');
      const list = await api.funnels(site.site_id);
      setFunnels(list.funnels ?? []);
      setSelectedFunnelId(saved.funnel_id);
      const qRes = await api.queryFunnel(site.site_id, period, saved.steps, filters);
      setFunnelResult(qRes);
    } catch (err) {
      setFunnelErr(err instanceof Error ? err.message : 'Failed to save funnel');
    }
  };

  const handleDeleteFunnel = async (funnelId: string) => {
    await api.deleteFunnel(site.site_id, funnelId);
    const list = await api.funnels(site.site_id);
    const next = list.funnels ?? [];
    setFunnels(next);
    if (next[0]) {
      void handleSelectFunnel(next[0]);
    } else {
      setSelectedFunnelId(null);
      setFunnelResult(null);
    }
  };

  const handleModeChange = async (mode: 'off' | 'loose' | 'balanced' | 'strict') => {
    setSavingMode(true);
    try {
      await api.setAdguard(site.site_id, mode);
      const ag = await api.adguard(site.site_id, period);
      setAdguardData(ag);
      onSiteUpdated?.();
    } finally {
      setSavingMode(false);
    }
  };

  const handleEnforceShadow = async () => {
    setSavingMode(true);
    try {
      await api.enforceShadow(site.site_id);
      onSiteUpdated?.();
    } finally {
      setSavingMode(false);
    }
  };

  const handleGenerateAi = async () => {
    setAiGenerating(true);
    setAiError(null);
    try {
      const res = await api.generateAiReport(site.site_id, period);
      setAiData({ configured: true, report: res });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const tabs: Array<{ id: BottomTabId; label: string }> = isPublic
    ? [
        { id: 'goals', label: t('tab.goals') },
        { id: 'quality', label: t('tab.quality') },
        { id: 'vitals', label: t('tab.vitals') },
      ]
    : [
        { id: 'goals', label: t('tab.goals') },
        { id: 'funnels', label: t('tab.funnels') },
        { id: 'quality', label: t('tab.quality') },
        { id: 'adguard', label: t('tab.adguard') },
        { id: 'vitals', label: t('tab.vitals') },
        { id: 'suspicious', label: t('tab.suspicious') },
        { id: 'ai', label: t('tab.ai') },
      ];

  const totalUv = overview?.uv || 0;
  const maxGoalUv = goals.reduce((m, g) => Math.max(m, g.uv || g.pv || 0), 0);
  const hasRevenue = goals.some((g) => (g.revenue ?? 0) > 0);
  const shadowActive = Boolean(site.shadow_until && site.shadow_until > Date.now());

  return (
    <section id="bottom-insights" className="plausible-card p-5 mt-5">
      {/* Header bar — exact Plausible Goals full-width card tabs */}
      <div className="h-[34px] flex items-center justify-between border-b border-zinc-200">
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`pb-[13px] -mb-px text-[12px] font-semibold uppercase tracking-[0.03em] border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'text-zinc-900 border-zinc-900'
                    : 'text-zinc-500 border-transparent hover:text-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Body */}
      <div className={`pt-3 transition-opacity ${loadingTab ? 'opacity-65' : 'opacity-100'}`}>
        {/* 1. GOALS (1:1 Plausible red-50 bar style) */}
        {activeTab === 'goals' && (
          <div>
            <div className="grid grid-cols-[1fr_80px_80px_72px] sm:grid-cols-[1fr_92px_92px_78px] gap-2 pb-1.5 text-[12px] font-medium text-zinc-500">
              <span>{t('col.goal')}</span>
              <span className="text-right">{t('col.uniques')}</span>
              <span className="text-right">{t('col.total')}</span>
              <span className="text-right">{hasRevenue ? t('col.revenue') : t('col.cr')}</span>
            </div>

            {goals.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-zinc-400">
                {t('empty.no_data')}
                <div className="mt-1 text-[12px] text-zinc-400">
                  {lang === 'zh'
                    ? '使用 window.pvuv("signup", { revenue: 49 }) 即可上报自定义目标事件。'
                    : 'Track custom conversions with window.pvuv("signup", { revenue: 49 }).'}
                </div>
              </div>
            ) : (
              <div className="space-y-1 mt-0.5">
                {goals.map((g) => {
                  const uniques = g.uv || 0;
                  const total = g.pv || 0;
                  const cr = totalUv > 0 ? uniques / totalUv : 0;
                  const pct = maxGoalUv > 0 ? Math.max((uniques / maxGoalUv) * 100, 1.5) : 0;
                  return (
                    <div
                      key={g.key}
                      className="grid grid-cols-[1fr_80px_80px_72px] sm:grid-cols-[1fr_92px_92px_78px] gap-2 items-center h-8"
                    >
                      <div className="relative h-8 flex items-center px-2 rounded-sm overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="absolute inset-y-0 left-0 bg-red-50 rounded-sm"
                        />
                        <span className="relative z-10 text-[13.5px] text-zinc-800 truncate">{g.key}</span>
                      </div>
                      <span className="text-right text-[13.5px] font-medium text-zinc-800 tabular-nums">
                        {fmtCompact(uniques)}
                      </span>
                      <span className="text-right text-[13.5px] text-zinc-600 tabular-nums">
                        {fmtCompact(total)}
                      </span>
                      <span className="text-right text-[13.5px] font-medium text-zinc-800 tabular-nums">
                        {hasRevenue ? fmtUsd(g.revenue) : fmtPct(cr, 1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. FUNNELS */}
        {activeTab === 'funnels' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {funnels.map((f) => (
                  <div key={f.funnel_id} className="inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => void handleSelectFunnel(f)}
                      className={`h-7 px-3 rounded-l-md text-[12.5px] font-medium transition-colors cursor-pointer ${
                        selectedFunnelId === f.funnel_id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80'
                      }`}
                    >
                      {f.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteFunnel(f.funnel_id)}
                      title={t('toolbar.delete')}
                      className={`h-7 px-1.5 rounded-r-md transition-colors cursor-pointer ${
                        selectedFunnelId === f.funnel_id
                          ? 'bg-indigo-700 text-indigo-100 hover:text-white'
                          : 'bg-zinc-100 text-zinc-400 hover:text-rose-600'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCreatingFunnel((v) => !v)}
                className="h-7 px-3 rounded-md bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 text-[12.5px] font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '新建漏斗' : 'New funnel'}</span>
              </button>
            </div>

            {creatingFunnel && (
              <form onSubmit={handleSaveFunnel} className="p-4 rounded-md bg-zinc-50 border border-zinc-200/80 space-y-3">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                    {lang === 'zh' ? '漏斗名称' : 'Funnel name'}
                  </label>
                  <input
                    value={newFunnelName}
                    onChange={(e) => setNewFunnelName(e.target.value)}
                    placeholder={lang === 'zh' ? '例如：注册转化路径' : 'e.g. Signup flow'}
                    className="w-full max-w-sm h-8 px-2.5 rounded-md border border-zinc-300 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  {newFunnelSteps.map((st, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-[12px] text-zinc-400 tabular-nums">{idx + 1}.</span>
                      <div className="inline-flex rounded-md border border-zinc-300 bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setNewFunnelSteps((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, type: 'page' } : x)),
                            )
                          }
                          className={`px-2.5 h-8 text-[12px] font-medium cursor-pointer ${
                            st.type === 'page' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
                          }`}
                        >
                          Page
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setNewFunnelSteps((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, type: 'event' } : x)),
                            )
                          }
                          className={`px-2.5 h-8 text-[12px] font-medium cursor-pointer ${
                            st.type === 'event' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
                          }`}
                        >
                          Event
                        </button>
                      </div>
                      <input
                        value={st.value}
                        onChange={(e) =>
                          setNewFunnelSteps((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)),
                          )
                        }
                        placeholder={st.type === 'page' ? '/pricing' : 'signup'}
                        className="flex-1 max-w-sm h-8 px-2.5 rounded-md border border-zinc-300 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                      />
                      {newFunnelSteps.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setNewFunnelSteps((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-zinc-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {funnelErr && <p className="text-[12px] text-rose-600">{funnelErr}</p>}
                <div className="flex items-center gap-2 pt-1">
                  {newFunnelSteps.length < 8 && (
                    <button
                      type="button"
                      onClick={() => setNewFunnelSteps((prev) => [...prev, { type: 'page', value: '' }])}
                      className="h-8 px-3 rounded-md border border-zinc-300 bg-white text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    >
                      + {lang === 'zh' ? '添加步骤' : 'Add step'}
                    </button>
                  )}
                  <button
                    type="submit"
                    className="h-8 px-3.5 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[12.5px] font-medium cursor-pointer"
                  >
                    {t('toolbar.save')}
                  </button>
                </div>
              </form>
            )}

            {funnelResult && funnelResult.steps?.length > 0 ? (
              <div className="space-y-2 pt-1">
                {funnelResult.steps.map((st, idx) => {
                  const first = funnelResult.steps[0]?.visitors || 1;
                  const pct = Math.max((st.visitors / first) * 100, st.visitors > 0 ? 2 : 0);
                  return (
                    <div key={idx} className="grid grid-cols-[1fr_90px_88px] gap-3 items-center">
                      <div className="relative h-9 flex items-center px-3 rounded-sm bg-zinc-50 overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="absolute inset-y-0 left-0 bg-indigo-100/80" />
                        <span className="relative z-10 text-[12px] font-semibold text-indigo-700 mr-2">
                          {idx + 1}.
                        </span>
                        <span className="relative z-10 text-[13px] text-zinc-800 truncate">
                          <span className="text-[11px] uppercase text-zinc-400 mr-1.5">{st.type}</span>
                          {st.value}
                        </span>
                      </div>
                      <span className="text-right text-[13.5px] font-semibold text-zinc-900 tabular-nums">
                        {fmtNumber(st.visitors)}
                      </span>
                      <span className="text-right text-[12.5px] font-medium text-zinc-600 tabular-nums">
                        {idx === 0 ? '100%' : fmtPct(st.conv_from_first, 1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              !creatingFunnel && (
                <div className="py-10 text-center text-[13px] text-zinc-400">
                  {lang === 'zh' ? '点击「新建漏斗」配置页面或事件转化路径。' : 'Create a funnel to measure step-by-step drop-off.'}
                </div>
              )
            )}
          </div>
        )}

        {/* 3. TRAFFIC QUALITY */}
        {activeTab === 'quality' && qualityData && (
          <div className="space-y-5">
            {(() => {
              const tot = qualityData.totals ?? {};
              const clean = tot.clean ?? tot.clean_count ?? 0;
              const suspect = tot.suspect ?? tot.suspect_count ?? 0;
              const bot = tot.bot ?? tot.bot_count ?? 0;
              const crawler = tot.crawler ?? tot.crawler_count ?? 0;
              const pv = tot.pv ?? clean + suspect + bot + crawler;
              const items = [
                { key: 'clean', label: t('quality.clean'), count: clean, dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
                { key: 'suspect', label: t('quality.suspect'), count: suspect, dot: 'bg-amber-400', bar: 'bg-amber-400' },
                { key: 'bot', label: t('quality.bot'), count: bot, dot: 'bg-rose-500', bar: 'bg-rose-500' },
                { key: 'crawler', label: t('quality.crawler'), count: crawler, dot: 'bg-sky-500', bar: 'bg-sky-500' },
              ];
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {items.map((it) => (
                      <div key={it.key} className="rounded-md bg-zinc-50/90 px-3.5 py-3">
                        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-zinc-500">
                          <span className={`w-2 h-2 rounded-full ${it.dot}`} />
                          <span>{it.label}</span>
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-[19px] font-bold text-zinc-900 tabular-nums">
                            {fmtCompact(it.count)}
                          </span>
                          <span className="text-[12px] text-zinc-500 tabular-nums">
                            {pv > 0 ? fmtPct(it.count / pv, 1) : '0%'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Proportional verdict bar */}
                  {pv > 0 && (
                    <div className="h-2.5 w-full rounded-full bg-zinc-100 overflow-hidden flex">
                      {items.map((it) =>
                        it.count > 0 ? (
                          <div
                            key={it.key}
                            style={{ width: `${(it.count / pv) * 100}%` }}
                            className={`${it.bar} h-full`}
                            title={`${it.label}: ${fmtNumber(it.count)}`}
                          />
                        ) : null,
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* Fired signals */}
              <div>
                <h4 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500 mb-2.5">
                  {t('quality.signals')}
                </h4>
                {(() => {
                  const entries = Object.entries(qualityData.flags || {})
                    .filter(([, n]) => n > 0)
                    .sort((a, b) => b[1] - a[1]);
                  const maxF = entries[0]?.[1] || 1;
                  if (!entries.length) {
                    return <p className="text-[13px] text-zinc-400">{t('empty.no_data')}</p>;
                  }
                  return (
                    <div className="space-y-1">
                      {entries.slice(0, 8).map(([flag, count]) => (
                        <div key={flag} className="relative h-8 flex items-center justify-between px-2 rounded-sm">
                          <div
                            style={{ width: `${Math.max((count / maxF) * 100, 2)}%` }}
                            className="absolute inset-y-0 left-0 bg-amber-50 rounded-sm"
                          />
                          <span className="relative z-10 text-[13px] text-zinc-800">{labelBotFlag(flag, lang)}</span>
                          <span className="relative z-10 text-[13px] font-medium text-zinc-800 tabular-nums">
                            {fmtCompact(count)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Active alerts */}
              <div>
                <h4 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500 mb-2.5">
                  {t('quality.alerts')}
                </h4>
                {alerts.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-50/70 px-3.5 py-3 text-[13px] text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('quality.no_alerts')}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((al, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 rounded-md bg-amber-50/80 border border-amber-200/60 px-3 py-2.5 text-[13px] text-amber-900"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium">{al.title || al.code}</div>
                          {al.detail && <div className="text-[12px] text-amber-800/80 mt-0.5">{al.detail}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. AD PROTECTION */}
        {activeTab === 'adguard' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span className="text-[13px] font-semibold text-zinc-800">{t('adguard.mode')}:</span>
                <div className="inline-flex rounded-md bg-zinc-100 p-0.5">
                  {(['off', 'loose', 'balanced', 'strict'] as const).map((m) => {
                    const active = (adguardData?.current_mode ?? site.adguard_mode) === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={savingMode}
                        onClick={() => void handleModeChange(m)}
                        className={`h-7 px-3 rounded text-[12.5px] font-medium transition-colors cursor-pointer ${
                          active
                            ? 'bg-white text-zinc-900 shadow-xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        {t(`adguard.${m}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {shadowActive && (
                <div className="flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-1.5 text-[12.5px] text-indigo-800">
                  <span>{t('adguard.shadow_active')}</span>
                  <button
                    type="button"
                    disabled={savingMode}
                    onClick={() => void handleEnforceShadow()}
                    className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[11.5px] font-medium hover:bg-indigo-700 cursor-pointer"
                  >
                    {t('adguard.enforce_now')}
                  </button>
                </div>
              )}
            </div>

            {adguardData && (
              <>
                <div>
                  <h4 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500 mb-2.5">
                    {t('adguard.tiers')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(['loose', 'balanced', 'strict'] as const).map((tierKey) => {
                      const st = adguardData.tiers[tierKey];
                      const active = adguardData.current_mode === tierKey;
                      return (
                        <div
                          key={tierKey}
                          className={`rounded-md p-3.5 border transition-colors ${
                            active ? 'border-indigo-300 bg-indigo-50/40' : 'border-zinc-200/80 bg-zinc-50/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-semibold uppercase text-zinc-700">
                              {t(`adguard.${tierKey}`)}
                            </span>
                            {active && (
                              <span className="text-[10.5px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 text-[19px] font-bold text-zinc-900 tabular-nums">
                            {fmtPct(st.block_rate, 1)}
                          </div>
                          <div className="mt-0.5 text-[12px] text-zinc-500 tabular-nums">
                            {fmtCompact(st.block)} blocked · FP est. {fmtPct(st.fp_rate, 1)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {adguardData.sources.length > 0 && (
                  <div>
                    <h4 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                      {t('adguard.top_sources')}
                    </h4>
                    <div className="space-y-1">
                      {adguardData.sources.map((s) => {
                        const maxPv = adguardData.sources[0]?.pv || 1;
                        return (
                          <div key={s.source} className="relative h-8 flex items-center justify-between px-2 rounded-sm">
                            <div
                              style={{ width: `${Math.max((s.pv / maxPv) * 100, 2)}%` }}
                              className="absolute inset-y-0 left-0 bg-red-50 rounded-sm"
                            />
                            <span className="relative z-10 text-[13px] text-zinc-800">{s.source}</span>
                            <span className="relative z-10 text-[13px] font-medium text-zinc-800 tabular-nums">
                              {fmtCompact(s.pv)} PV
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 5. WEB VITALS */}
        {activeTab === 'vitals' && (
          <div className="space-y-5">
            {!vitalsData || vitalsData.samples === 0 ? (
              <div className="py-10 text-center text-[13px] text-zinc-400">{t('vitals.no_data')}</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(
                    [
                      { key: 'lcp_ms', label: 'LCP', fmt: (v: number) => `${(v / 1000).toFixed(2)}s` },
                      { key: 'cls', label: 'CLS', fmt: (v: number) => v.toFixed(3) },
                      { key: 'inp_ms', label: 'INP', fmt: (v: number) => `${Math.round(v)}ms` },
                      { key: 'fcp_ms', label: 'FCP', fmt: (v: number) => `${(v / 1000).toFixed(2)}s` },
                      { key: 'ttfb_ms', label: 'TTFB', fmt: (v: number) => `${Math.round(v)}ms` },
                    ] as const
                  ).map((m) => {
                    const stat = vitalsData.metrics[m.key];
                    const badgeColor =
                      stat?.rating === 'good'
                        ? 'bg-emerald-50 text-emerald-700'
                        : stat?.rating === 'needs-improvement'
                          ? 'bg-amber-50 text-amber-700'
                          : stat?.rating === 'poor'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-zinc-100 text-zinc-500';
                    return (
                      <div key={m.key} className="rounded-md bg-zinc-50/90 px-3.5 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11.5px] font-semibold uppercase text-zinc-500">{m.label}</span>
                          {stat?.rating && (
                            <span className={`text-[10.5px] font-medium px-1.5 py-0.5 rounded ${badgeColor}`}>
                              {stat.rating === 'needs-improvement' ? 'Fair' : stat.rating}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 text-[19px] font-bold text-zinc-900 tabular-nums">
                          {stat?.p75 != null ? m.fmt(stat.p75) : '—'}
                        </div>
                        <div className="text-[11px] text-zinc-400 tabular-nums mt-0.5">
                          p75 · {fmtCompact(stat?.count ?? 0)} samples
                        </div>
                      </div>
                    );
                  })}
                </div>

                {vitalsData.pages.length > 0 && (
                  <div>
                    <h4 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                      {t('vitals.slowest')}
                    </h4>
                    <div className="space-y-1">
                      {vitalsData.pages.map((p, idx) => (
                        <div
                          key={`${p.hostname}${p.path}-${idx}`}
                          className="flex items-center justify-between h-8 px-2 rounded-sm hover:bg-zinc-50 text-[13px]"
                        >
                          <span className="text-zinc-800 truncate">{p.path}</span>
                          <span className="font-medium tabular-nums text-zinc-700">
                            {(p.lcp_p75 / 1000).toFixed(2)}s{' '}
                            <span className="text-zinc-400 font-normal">({p.n})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {ctitData && ctitData.n > 0 && (
              <div className="pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
                    {t('vitals.ctit')}
                  </h4>
                  <span className="text-[12px] text-zinc-500 tabular-nums">
                    Median: {fmtDuration(ctitData.median_ms)} · n={ctitData.n}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {ctitData.buckets.map((b) => (
                    <div key={b.label} className="rounded bg-zinc-50 px-2.5 py-2 text-center">
                      <div className="text-[11px] text-zinc-500">{b.label}</div>
                      <div className="text-[14px] font-semibold text-zinc-900 tabular-nums mt-0.5">{b.n}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. SUSPICIOUS VISITORS */}
        {activeTab === 'suspicious' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-md bg-zinc-100 p-0.5">
                {[
                  { id: '', label: lang === 'zh' ? '全部异常' : 'All flagged' },
                  { id: 'bot', label: t('quality.bot') },
                  { id: 'suspect', label: t('quality.suspect') },
                  { id: 'crawler', label: t('quality.crawler') },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVerdictFilter(opt.id)}
                    className={`h-7 px-3 rounded text-[12px] font-medium transition-colors cursor-pointer ${
                      verdictFilter === opt.id ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Link
                to={`/sites/${site.site_id}/visitors`}
                className="text-[12.5px] font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
              >
                <span>{t('toolbar.visitors')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {suspiciousRows.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-zinc-400">{t('empty.no_data')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[11.5px] font-medium text-zinc-500">
                      <th className="py-2 pr-3">Visitor</th>
                      <th className="py-2 px-3">Verdict</th>
                      <th className="py-2 px-3 text-right">Score</th>
                      <th className="py-2 px-3">Location</th>
                      <th className="py-2 px-3 text-right">PV</th>
                      <th className="py-2 pl-3 text-right">Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-[13px]">
                    {suspiciousRows.map((r) => (
                      <tr key={r.visitor_id} className="hover:bg-zinc-50">
                        <td className="py-2 pr-3 font-mono text-[12px]">
                          <Link
                            to={`/sites/${site.site_id}/visitors/${encodeURIComponent(r.visitor_id)}`}
                            className="text-indigo-600 hover:underline"
                          >
                            {r.visitor_id.slice(0, 14)}…
                          </Link>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
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
                        <td className="py-2 px-3 text-right font-semibold tabular-nums text-zinc-800">
                          {r.bot_score}
                        </td>
                        <td className="py-2 px-3 text-zinc-700">
                          {r.country ? `${countryFlag(r.country)} ${countryName(r.country, lang)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-zinc-700">{r.pv}</td>
                        <td className="py-2 pl-3 text-right text-zinc-500 text-[12px]">
                          {fmtRelativeTime(r.last_ts, lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 7. AI REPORT */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[13px] text-zinc-500">
                {aiData?.report
                  ? `${lang === 'zh' ? '最新报告周期' : 'Latest report'}: ${aiData.report.period} · ${fmtRelativeTime(aiData.report.created_at, lang)}`
                  : t('ai.not_configured')}
              </div>
              {aiData?.configured ? (
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={() => void handleGenerateAi()}
                  className="h-8 px-3.5 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-60 text-white text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {aiGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{aiGenerating ? t('ai.generating') : t('ai.generate')}</span>
                </button>
              ) : (
                <Link
                  to="/settings"
                  className="h-8 px-3.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[13px] font-medium inline-flex items-center"
                >
                  {t('ai.open_settings')}
                </Link>
              )}
            </div>

            {aiError && (
              <div className="rounded-md bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-[13px] text-rose-700">
                {aiError}
              </div>
            )}

            {aiData?.report?.content && (
              <div className="rounded-md bg-zinc-50/80 border border-zinc-200/70 p-4 text-[13.5px] leading-relaxed text-zinc-800 whitespace-pre-wrap">
                {aiData.report.content}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
