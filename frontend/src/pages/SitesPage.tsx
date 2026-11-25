import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Globe,
  Plus,
  Shield,
  Trophy,
} from 'lucide-react';
import { api, buildEmbedSnippet, parseDomains } from '../lib/api';
import type { MeResponse, RankingSite, SiteRecord, SiteSummaryItem } from '../lib/types';
import { fmtCompact, fmtPct, PERIOD_OPTIONS } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { Link, useRouter } from '../lib/router';
import { Navbar } from '../components/Navbar';
import { Dropdown } from '../components/Dropdown';
import { Modal } from '../components/Modal';
import { SiteBadgeIcon } from '../components/Icons';

const COMMON_TIMEZONES = [
  'UTC',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
];

export function SitesPage() {
  const { lang, t } = useI18n();
  const { navigate } = useRouter();

  const [period, setPeriod] = useState<string>('7d');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [summaryMap, setSummaryMap] = useState<Map<string, SiteSummaryItem>>(new Map());
  const [ranking, setRanking] = useState<RankingSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add site modal state
  const [addOpen, setAddOpen] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [domainsRaw, setDomainsRaw] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [adguardMode, setAdguardMode] = useState<'off' | 'loose' | 'balanced' | 'strict'>('off');
  const [adclient, setAdclient] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createdSite, setCreatedSite] = useState<SiteRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // Quick snippet modal for existing site
  const [snippetSite, setSnippetSite] = useState<SiteRecord | null>(null);

  const loadData = async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, sitesRes, sumRes, rankRes] = await Promise.all([
        api.me(),
        api.sites(),
        api.sitesSummary(p).catch(() => ({ sites: [], uv_approx: false })),
        api.ranking(p).catch(() => ({ period: { start: '', end: '' }, sites: [] })),
      ]);
      setMe(meRes);
      setTimezone((prev) => (prev === 'UTC' && meRes.timezone ? meRes.timezone : prev));
      setSites(sitesRes.sites ?? []);
      const m = new Map<string, SiteSummaryItem>();
      for (const s of sumRes.sites ?? []) m.set(s.site_id, s);
      setSummaryMap(m);
      setRanking(rankRes.sites ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(period);
  }, [period]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErr(null);
    const name = siteName.trim();
    const domains = domainsRaw
      .split(/[,\s]+/)
      .map((s) => s.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase())
      .filter(Boolean);
    if (!name || domains.length === 0) {
      setCreateErr(lang === 'zh' ? '请填写站点名称和至少一个允许的域名。' : 'Please enter a site name and at least one domain.');
      return;
    }
    setCreating(true);
    try {
      const created = await api.createSite({
        name,
        domains,
        timezone,
        adguard_mode: adguardMode,
        adclient: adclient.trim() || undefined,
      });
      setCreatedSite(created);
      void loadData(period);
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : 'Failed to create site');
    } finally {
      setCreating(false);
    }
  };

  const resetModal = () => {
    setAddOpen(false);
    setCreatedSite(null);
    setSiteName('');
    setDomainsRaw('');
    setAdclient('');
    setCreateErr(null);
    setCopied(false);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const tzOptions = useMemo(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const set = new Set<string>([me?.timezone || 'UTC', local, ...COMMON_TIMEZONES].filter(Boolean));
    return [...set];
  }, [me?.timezone]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <Navbar />

      <main className="max-w-[1120px] mx-auto px-4 pb-16">
        {/* Plausible Sites Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-6">
          <h1 className="text-[22px] font-bold tracking-tight text-zinc-900">{t('sites.title')}</h1>

          <div className="flex items-center gap-2">
            <Dropdown
              align="right"
              widthClass="min-w-[168px]"
              value={period}
              onSelect={setPeriod}
              options={PERIOD_OPTIONS.map((p) => ({ value: p, label: t(`period.${p}`) }))}
              trigger={() => (
                <button
                  type="button"
                  className="h-9 px-3 rounded-md inline-flex items-center gap-1.5 text-[13.5px] font-medium text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span>{t(`period.${period}`)}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              )}
            />

            <button
              type="button"
              onClick={() => {
                setCreatedSite(null);
                setAddOpen(true);
              }}
              className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13.5px] font-medium shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('sites.add').replace(/^\+\s*/, '')}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-[13.5px] text-rose-700">
            {error}
          </div>
        )}

        {/* Sites Grid */}
        {loading && sites.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="plausible-card p-5 h-[132px] animate-pulse">
                <div className="h-5 w-36 bg-zinc-100 rounded" />
                <div className="h-3.5 w-24 bg-zinc-100 rounded mt-3" />
                <div className="h-5 w-28 bg-zinc-100 rounded mt-6" />
              </div>
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className="plausible-card px-6 py-16 text-center max-w-xl mx-auto mt-6">
            <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h2 className="mt-4 text-[17px] font-semibold text-zinc-900">{t('sites.empty_title')}</h2>
            <p className="mt-1.5 text-[13.5px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
              {t('sites.empty_desc')}
            </p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-6 h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13.5px] font-medium shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('sites.add').replace(/^\+\s*/, '')}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sites.map((site) => {
              const domains = parseDomains(site.allowed_domains);
              const sum = summaryMap.get(site.site_id);
              const uv = sum?.uv ?? 0;
              const pv = sum?.pv ?? 0;
              const invalid = (sum?.bot_count ?? 0) + (sum?.suspect_count ?? 0);
              const invalidRate = pv > 0 ? invalid / pv : 0;

              return (
                <div
                  key={site.site_id}
                  onClick={() => navigate(`/sites/${site.site_id}`)}
                  className="plausible-card p-5 cursor-pointer group hover:shadow-md transition-all flex flex-col justify-between min-h-[138px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SiteBadgeIcon siteId={site.site_id} name={site.name} size={24} />
                      <div className="min-w-0">
                        <div className="text-[15.5px] font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors truncate">
                          {site.name}
                        </div>
                        <div className="text-[12px] text-zinc-400 truncate mt-0.5">
                          {domains.join(', ') || site.site_id}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      title={t('toolbar.embed')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCopied(false);
                        setSnippetSite(site);
                      }}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
                    >
                      <Code2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-6 flex items-end justify-between gap-2">
                    <div>
                      {pv > 0 || site.has_data ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[17px] font-bold text-zinc-900 tabular-nums">
                            {fmtCompact(uv)}
                          </span>
                          <span className="text-[12.5px] text-zinc-500">
                            {t('sites.visitors_last')} · {fmtCompact(pv)} PV
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                          {t('sites.no_data')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {invalid > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-medium tabular-nums">
                          {fmtPct(invalidRate, 0)} {t('sites.invalid')}
                        </span>
                      )}
                      {site.adguard_mode !== 'off' && (
                        <span
                          title={`AdGuard: ${site.adguard_mode}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium"
                        >
                          <Shield className="w-3 h-3" />
                          <span>{t(`adguard.${site.adguard_mode}`)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cross-site Clean Traffic Ranking (when >= 2 active sites have traffic) */}
        {ranking.length >= 2 && ranking.some((r) => r.pv > 0) && (
          <section className="plausible-card p-5 mt-8">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-indigo-500" />
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.03em] text-zinc-900">
                  {t('sites.ranking_title')}
                </h2>
              </div>
              <span className="text-[12px] text-zinc-400 hidden sm:inline">{t('sites.ranking_desc')}</span>
            </div>

            <div className="mt-2 space-y-1">
              {(() => {
                const maxScore = Math.max(...ranking.map((r) => r.score || r.clean_pv || 0), 1);
                return ranking.map((r, idx) => {
                  const val = r.score || r.clean_pv || 0;
                  const pct = Math.max((val / maxScore) * 100, val > 0 ? 2 : 0);
                  return (
                    <Link
                      key={r.site_id}
                      to={`/sites/${r.site_id}`}
                      className="relative h-8 flex items-center justify-between px-2 rounded-sm hover:bg-zinc-100/50"
                    >
                      <div
                        style={{ width: `${pct}%` }}
                        className="absolute inset-y-0 left-0 bg-indigo-50 rounded-sm"
                      />
                      <span className="relative z-10 flex items-center gap-2 text-[13.5px] text-zinc-800 truncate">
                        <span className="w-5 text-[12px] font-semibold text-zinc-400 tabular-nums">
                          #{idx + 1}
                        </span>
                        <span className="font-medium truncate">{r.name}</span>
                      </span>
                      <span className="relative z-10 text-[13px] font-medium text-zinc-800 tabular-nums">
                        {fmtCompact(val)} {t('sites.clean')} PV
                      </span>
                    </Link>
                  );
                });
              })()}
            </div>
          </section>
        )}
      </main>

      {/* Add Site Modal */}
      <Modal
        open={addOpen}
        onClose={resetModal}
        title={createdSite ? t('add_site.done_title') : t('add_site.title')}
        subtitle={createdSite ? t('add_site.done_desc') : undefined}
      >
        {createdSite ? (
          <div className="space-y-4">
            <div className="relative">
              <pre className="p-3.5 rounded-md bg-zinc-900 text-zinc-100 text-[12px] font-mono overflow-x-auto leading-relaxed">
                {buildEmbedSnippet(createdSite, me?.ingest_host)}
              </pre>
              <button
                type="button"
                onClick={() => void copyText(buildEmbedSnippet(createdSite, me?.ingest_host))}
                className="absolute top-2.5 right-2.5 h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-[11.5px] font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('toolbar.copied') : t('toolbar.copy')}</span>
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetModal}
                className="h-9 px-3.5 rounded-md text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                {t('toolbar.close')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = createdSite.site_id;
                  resetModal();
                  navigate(`/sites/${id}`);
                }}
                className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] font-medium cursor-pointer"
              >
                {t('add_site.open_dashboard')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">
                {t('add_site.name')}
              </label>
              <input
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder={t('add_site.name_ph')}
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">
                {t('add_site.domains')}
              </label>
              <input
                required
                value={domainsRaw}
                onChange={(e) => setDomainsRaw(e.target.value)}
                placeholder={t('add_site.domains_ph')}
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
              <p className="text-[11.5px] text-zinc-400 mt-1">{t('add_site.domains_hint')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">
                  {t('add_site.timezone')}
                </label>
                <Dropdown
                  align="left"
                  widthClass="w-full min-w-[210px] max-h-56 overflow-y-auto"
                  value={timezone}
                  onSelect={setTimezone}
                  options={tzOptions.map((tz) => ({ value: tz, label: tz }))}
                  trigger={() => (
                    <button
                      type="button"
                      className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white flex items-center justify-between text-[13px] text-zinc-800 cursor-pointer"
                    >
                      <span className="truncate">{timezone}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </button>
                  )}
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">
                  {t('add_site.adguard')}
                </label>
                <Dropdown
                  align="left"
                  widthClass="w-full min-w-[180px]"
                  value={adguardMode}
                  onSelect={(v) => setAdguardMode(v as 'off' | 'loose' | 'balanced' | 'strict')}
                  options={(['off', 'loose', 'balanced', 'strict'] as const).map((m) => ({
                    value: m,
                    label: t(`adguard.${m}`),
                  }))}
                  trigger={() => (
                    <button
                      type="button"
                      className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white flex items-center justify-between text-[13px] text-zinc-800 cursor-pointer"
                    >
                      <span>{t(`adguard.${adguardMode}`)}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </button>
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">
                {t('add_site.adclient')}
              </label>
              <input
                value={adclient}
                onChange={(e) => setAdclient(e.target.value)}
                placeholder="ca-pub-1234567890123456"
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-[13.5px] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>

            {createErr && <p className="text-[12.5px] text-rose-600">{createErr}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetModal}
                className="h-9 px-3.5 rounded-md text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                {t('toolbar.cancel')}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-60 text-white text-[13px] font-medium cursor-pointer"
              >
                {creating ? '…' : t('add_site.create')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Quick Embed Snippet Modal */}
      <Modal
        open={Boolean(snippetSite)}
        onClose={() => setSnippetSite(null)}
        title={snippetSite ? `${snippetSite.name} — ${t('toolbar.embed')}` : t('toolbar.embed')}
        subtitle={t('add_site.done_desc')}
      >
        {snippetSite && (
          <div className="space-y-4">
            <div className="relative">
              <pre className="p-3.5 rounded-md bg-zinc-900 text-zinc-100 text-[12px] font-mono overflow-x-auto leading-relaxed">
                {buildEmbedSnippet(snippetSite, me?.ingest_host)}
              </pre>
              <button
                type="button"
                onClick={() => void copyText(buildEmbedSnippet(snippetSite, me?.ingest_host))}
                className="absolute top-2.5 right-2.5 h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-[11.5px] font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('toolbar.copied') : t('toolbar.copy')}</span>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSnippetSite(null)}
                className="h-8 px-3.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[13px] font-medium cursor-pointer"
              >
                {t('toolbar.close')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
