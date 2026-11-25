import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  ListFilter,
  MoreVertical,
  RefreshCw,
  Share2,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { api, buildEmbedSnippet, withBase } from '../lib/api';
import type {
  BreakdownRow,
  FilterItem,
  MeResponse,
  OverviewResponse,
  RealtimeResponse,
  SiteRecord,
  TimeseriesPoint,
} from '../lib/types';
import {
  countryFlag,
  countryName,
  defaultIntervalForPeriod,
  displayChannelLabel,
  displaySourceLabel,
  PERIOD_OPTIONS,
} from '../lib/format';
import { useI18n } from '../lib/i18n';
import { useRouter } from '../lib/router';
import { Navbar } from '../components/Navbar';
import { Dropdown } from '../components/Dropdown';
import { Modal } from '../components/Modal';
import { BrowserIcon, ChannelIcon, DeviceIcon, SiteBadgeIcon, SourceIcon } from '../components/Icons';
import { StatsGraphCard, type MainMetricKey } from '../components/StatsGraphCard';
import { BreakdownCard } from '../components/BreakdownCard';
import { WorldMap } from '../components/WorldMap';
import { BottomInsightsCard, type BottomTabId } from '../components/BottomInsightsCard';

export function SiteDashboardPage({ siteId }: { siteId: string }) {
  const { lang, t } = useI18n();
  const { navigate } = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [period, setPeriod] = useState<string>('today');
  const [interval, setIntervalState] = useState<string>('hour');
  const [activeMetric, setActiveMetric] = useState<MainMetricKey>('uv');
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [scrolled, setScrolled] = useState(false);

  // Core overview + timeseries + realtime
  const [realtime, setRealtime] = useState<RealtimeResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [points, setPoints] = useState<TimeseriesPoint[]>([]);
  const [loadingMain, setLoadingMain] = useState(true);
  const [dismissOnboarding, setDismissOnboarding] = useState(false);

  // Breakdown card active tabs & datasets
  const [sourceTab, setSourceTab] = useState<string>('source');
  const [sourceRows, setSourceRows] = useState<BreakdownRow[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);

  const [pageTab, setPageTab] = useState<string>('page');
  const [pageRows, setPageRows] = useState<BreakdownRow[]>([]);
  const [pageLoading, setPageLoading] = useState(false);

  const [geoTab, setGeoTab] = useState<string>('map');
  const [geoRows, setGeoRows] = useState<BreakdownRow[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const [deviceTab, setDeviceTab] = useState<string>('browser');
  const [deviceRows, setDeviceRows] = useState<BreakdownRow[]>([]);
  const [deviceLoading, setDeviceLoading] = useState(false);

  const [goalRows, setGoalRows] = useState<BreakdownRow[]>([]);
  const [bottomTab, setBottomTab] = useState<BottomTabId>('goals');

  // Top-100 details cache per card
  const [detailRows, setDetailRows] = useState<Record<string, BreakdownRow[]>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  // Modals: Embed, Share, Filter Builder
  const [embedOpen, setEmbedOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDim, setFilterDim] = useState('page');
  const [filterVal, setFilterVal] = useState('');
  const [copied, setCopied] = useState(false);

  const currentSite = useMemo(
    () => sites.find((s) => s.site_id === siteId) ?? null,
    [sites, siteId],
  );

  // Sticky shadow on scroll (Plausible exact transition)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 44);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loadSitesAndMe = useCallback(async () => {
    const [m, s] = await Promise.all([api.me(), api.sites()]);
    setMe(m);
    setSites(s.sites ?? []);
  }, []);

  useEffect(() => {
    void loadSitesAndMe();
  }, [loadSitesAndMe]);

  // Adjust default interval when period changes
  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    setIntervalState(defaultIntervalForPeriod(p));
  };

  const allowedIntervals = useMemo(() => {
    if (period === 'today' || period === 'yesterday' || period === '24h') return ['hour'];
    if (period === '7d') return ['day', 'hour'];
    if (period === 'this_year') return ['month', 'week', 'day'];
    return ['day', 'week'];
  }, [period]);

  const filtersKey = JSON.stringify(filters);

  // Fetch Realtime (poll every 30s)
  useEffect(() => {
    let alive = true;
    const poll = () => {
      api
        .realtime(siteId)
        .then((r) => {
          if (alive) setRealtime(r);
        })
        .catch(() => {});
    };
    poll();
    const timer = window.setInterval(poll, 30_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [siteId]);

  // Fetch Overview + Timeseries + Goals
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let current = true;
    api.overview(siteId, period, filters).then(data => { if (current) setOverview(data); })
      .catch(() => { if (current) setOverview(null); });
    api.breakdown(siteId, 'goal', period, 20, filters).then(data => { if (current) setGoalRows(data.rows); })
      .catch(() => { if (current) setGoalRows([]); });
    return () => { current = false; };
  }, [siteId, period, filtersKey, refresh]);
  useEffect(() => {
    let current = true;
    setLoadingMain(true);
    api.timeseries(siteId, activeMetric, period, interval, filters)
      .then(data => { if (current) setPoints(data.points); })
      .catch(() => { if (current) setPoints([]); })
      .finally(() => { if (current) setLoadingMain(false); });
    return () => { current = false; };
  }, [siteId, period, activeMetric, interval, filtersKey, refresh]);

  // Fetch Sources Card
  useEffect(() => {
    let alive = true;
    setSourceLoading(true);
    api
      .breakdown(siteId, sourceTab, period, 15, filters)
      .then((res) => {
        if (alive) setSourceRows(res.rows ?? []);
      })
      .catch(() => {
        if (alive) setSourceRows([]);
      })
      .finally(() => {
        if (alive) setSourceLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [siteId, sourceTab, period, filtersKey]);

  // Fetch Pages Card
  useEffect(() => {
    let alive = true;
    setPageLoading(true);
    api
      .breakdown(siteId, pageTab, period, 15, filters)
      .then((res) => {
        if (alive) setPageRows(res.rows ?? []);
      })
      .catch(() => {
        if (alive) setPageRows([]);
      })
      .finally(() => {
        if (alive) setPageLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [siteId, pageTab, period, filtersKey]);

  // Fetch Locations Card (MAP uses country dim with limit 200 so choropleth has full coverage)
  useEffect(() => {
    let alive = true;
    setGeoLoading(true);
    const dim = geoTab === 'map' ? 'country' : geoTab;
    const lim = geoTab === 'map' ? 200 : 15;
    api
      .breakdown(siteId, dim, period, lim, filters)
      .then((res) => {
        if (alive) setGeoRows(res.rows ?? []);
      })
      .catch(() => {
        if (alive) setGeoRows([]);
      })
      .finally(() => {
        if (alive) setGeoLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [siteId, geoTab, period, filtersKey]);

  // Fetch Devices Card
  useEffect(() => {
    let alive = true;
    setDeviceLoading(true);
    api
      .breakdown(siteId, deviceTab, period, 15, filters)
      .then((res) => {
        if (alive) setDeviceRows(res.rows ?? []);
      })
      .catch(() => {
        if (alive) setDeviceRows([]);
      })
      .finally(() => {
        if (alive) setDeviceLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [siteId, deviceTab, period, filtersKey]);

  const loadDetails = async (cardKey: string, dim: string) => {
    setDetailLoading((p) => ({ ...p, [cardKey]: true }));
    try {
      const res = await api.breakdown(siteId, dim, period, 100, filters);
      setDetailRows((p) => ({ ...p, [cardKey]: res.rows ?? [] }));
    } finally {
      setDetailLoading((p) => ({ ...p, [cardKey]: false }));
    }
  };

  const addFilter = (dim: string, value: string) => {
    if (!value) return;
    setFilters((prev) => {
      if (prev.some((f) => f.dim === dim && f.value === value)) return prev;
      return [...prev.filter((f) => f.dim !== dim), { dim, value }];
    });
  };

  const removeFilter = (dim: string, value: string) => {
    setFilters((prev) => prev.filter((f) => !(f.dim === dim && f.value === value)));
  };

  const handleToggleShare = async (enable: boolean) => {
    setShareBusy(true);
    try {
      await api.share(siteId, enable);
      await loadSitesAndMe();
    } finally {
      setShareBusy(false);
    }
  };

  const handleExportJson = () => {
    const payload = {
      site: currentSite?.name ?? siteId,
      period,
      filters,
      overview,
      timeseries: points,
      sources: sourceRows,
      pages: pageRows,
      locations: geoRows,
      devices: deviceRows,
      goals: goalRows,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tally-${siteId}-${period}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  const jumpToBottomTab = (tab: BottomTabId) => {
    setBottomTab(tab);
    document.getElementById('bottom-insights')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showOnboarding =
    !dismissOnboarding &&
    currentSite &&
    !currentSite.has_data &&
    overview !== null &&
    overview.pv === 0 &&
    filters.length === 0;

  const publicShareUrl = currentSite?.public_token
    ? `${window.location.origin}${withBase(`/share/${currentSite.site_id}/${currentSite.public_token}`)}`
    : '';

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <Navbar />

      {/* Plausible Exact Sticky Site Toolbar */}
      <div
        className={`sticky top-0 z-30 transition-all ${
          scrolled
            ? 'bg-white/95 backdrop-blur-xs border-b border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
            : 'bg-[#fafafa]'
        }`}
      >
        <div className="max-w-[1120px] mx-auto px-4 h-12 flex items-center justify-between gap-3">
          {/* Left: Site Switcher + Live Visitors Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Dropdown
              align="left"
              widthClass="min-w-[220px]"
              value={siteId}
              onSelect={(v) => {
                if (v === '__all__') navigate('/sites');
                else navigate(`/sites/${v}`);
              }}
              options={[
                ...sites.map((s) => ({
                  value: s.site_id,
                  label: s.name,
                  icon: <SiteBadgeIcon siteId={s.site_id} name={s.name} size={18} />,
                })),
                {
                  value: '__all__',
                  label: lang === 'zh' ? '所有站点' : 'All sites',
                  dividerBefore: true,
                },
              ]}
              trigger={() => (
                <button
                  type="button"
                  className="h-8 px-1.5 -ml-1.5 rounded-md inline-flex items-center gap-2 text-[14.5px] font-semibold text-zinc-900 hover:bg-zinc-200/60 transition-colors cursor-pointer min-w-0"
                >
                  <SiteBadgeIcon siteId={siteId} name={currentSite?.name || 'T'} size={22} />
                  <span className="truncate max-w-[22vw] sm:max-w-[240px]">
                    {currentSite?.name || siteId}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                </button>
              )}
            />

            <button
              type="button"
              onClick={() => handlePeriodChange('today')}
              className="h-8 px-2 rounded-md inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-[#10b981] rt-dot shrink-0" />
              <span className="tabular-nums">
                {realtime?.online ?? '–'} <span className="max-sm:sr-only">{t('kpi.current_visitors')}</span>
              </span>
            </button>
          </div>

          {/* Right: Filter, Date Picker, Overflow Menu (100% custom popovers) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              aria-label={t('toolbar.filter')}
              onClick={() => setFilterOpen(true)}
              className={`h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[13.5px] font-medium transition-colors cursor-pointer ${
                filters.length > 0
                  ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80'
                  : 'text-zinc-700 hover:bg-zinc-200/60'
              }`}
            >
              <ListFilter className="w-4 h-4 text-zinc-500" />
              <span className="hidden sm:inline">{t('toolbar.filter')}</span>
              {filters.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[11px] font-semibold tabular-nums">
                  {filters.length}
                </span>
              )}
            </button>

            <Dropdown
              align="right"
              widthClass="min-w-[168px]"
              value={period}
              onSelect={handlePeriodChange}
              options={PERIOD_OPTIONS.map((p) => ({ value: p, label: t(`period.${p}`) }))}
              trigger={() => (
                <button
                  type="button"
                  className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[13.5px] font-medium text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span>{t(`period.${period}`)}</span>
                </button>
              )}
            />

            <Dropdown
              align="right"
              widthClass="min-w-[196px]"
              options={[
                { value: 'embed', label: t('toolbar.embed'), icon: <Code2 className="w-3.5 h-3.5 text-zinc-400" /> },
                { value: 'share', label: t('toolbar.share'), icon: <Share2 className="w-3.5 h-3.5 text-zinc-400" /> },
                { value: 'visitors', label: t('toolbar.visitors'), icon: <Users className="w-3.5 h-3.5 text-zinc-400" /> },
                { value: 'quality', label: t('tab.quality'), icon: <Shield className="w-3.5 h-3.5 text-zinc-400" />, dividerBefore: true },
                { value: 'adguard', label: t('tab.adguard'), icon: <Shield className="w-3.5 h-3.5 text-zinc-400" /> },
                { value: 'export', label: t('toolbar.export'), icon: <Download className="w-3.5 h-3.5 text-zinc-400" />, dividerBefore: true },
              ]}
              onSelect={(v) => {
                if (v === 'embed') {
                  setCopied(false);
                  setEmbedOpen(true);
                } else if (v === 'share') {
                  setCopied(false);
                  setShareOpen(true);
                } else if (v === 'visitors') {
                  navigate(`/sites/${siteId}/visitors`);
                } else if (v === 'quality') {
                  jumpToBottomTab('quality');
                } else if (v === 'adguard') {
                  jumpToBottomTab('adguard');
                } else if (v === 'export') {
                  handleExportJson();
                }
              }}
              trigger={() => (
                <button
                  type="button"
                  aria-label="More actions"
                  className="h-8 w-8 rounded-md inline-flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}
            />
          </div>
        </div>
      </div>

      {/* Main Container (Plausible exact max-w-[1120px] px-4) */}
      <main className="max-w-[1120px] mx-auto px-4 pt-2 pb-16">
        {/* Active Filter Chips */}
        {filters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {filters.map((f) => (
              <span
                key={`${f.dim}:${f.value}`}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-white shadow-xs ring-1 ring-zinc-200 text-[12.5px] text-zinc-700"
              >
                <span className="text-zinc-400 font-medium">
                  {t(`col.${f.dim}`) !== `col.${f.dim}` ? t(`col.${f.dim}`) : f.dim}:
                </span>
                <span className="font-medium text-zinc-900">
                  {f.dim === 'country'
                    ? `${countryFlag(f.value)} ${countryName(f.value, lang)}`
                    : f.dim === 'channel'
                      ? displayChannelLabel(f.value, lang)
                      : f.dim === 'source'
                        ? displaySourceLabel(f.value, lang)
                        : f.value}
                </span>
                <button
                  type="button"
                  onClick={() => removeFilter(f.dim, f.value)}
                  className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setFilters([])}
              className="h-7 px-2 text-[12px] font-medium text-zinc-500 hover:text-zinc-800 cursor-pointer"
            >
              {t('toolbar.clear_filters')}
            </button>
          </div>
        )}

        {showOnboarding && currentSite ? (
          <section className="plausible-card p-8 max-w-2xl mx-auto mt-6">
            <div className="flex items-center gap-2 text-indigo-600 text-[12px] font-semibold uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-indigo-500 rt-dot" />
              <span>{t('sites.no_data')}</span>
            </div>
            <h2 className="mt-2 text-[19px] font-bold text-zinc-900">{t('onboarding.title')}</h2>
            <p className="mt-1 text-[13.5px] text-zinc-500 leading-relaxed">{t('onboarding.desc')}</p>

            <div className="relative mt-5">
              <pre className="p-4 rounded-md bg-zinc-900 text-zinc-100 text-[12px] font-mono overflow-x-auto leading-relaxed">
                {buildEmbedSnippet(currentSite, me?.ingest_host)}
              </pre>
              <button
                type="button"
                onClick={() => void copyText(buildEmbedSnippet(currentSite, me?.ingest_host))}
                className="absolute top-2.5 right-2.5 h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-[11.5px] font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('toolbar.copied') : t('toolbar.copy')}</span>
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDismissOnboarding(true)}
                className="text-[13px] text-zinc-500 hover:text-zinc-800 cursor-pointer"
              >
                {lang === 'zh' ? '先预览空白面板 →' : 'View empty dashboard →'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void loadSitesAndMe();
                  setRefresh(n => n + 1);
                }}
                className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('onboarding.check')}</span>
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* 1. Unified Main Stats + SVG Graph Card */}
            <StatsGraphCard
              overview={overview}
              points={points}
              activeMetric={activeMetric}
              onSelectMetric={setActiveMetric}
              interval={interval}
              onSelectInterval={setIntervalState}
              allowedIntervals={allowedIntervals}
              loading={loadingMain}
            />

            {/* 2. Breakdown Row 1: Sources (Blue) & Top Pages (Orange) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <BreakdownCard
                tabs={[
                  { id: 'channel', label: t('card.channels') },
                  { id: 'source', label: t('card.sources') },
                  {
                    id: 'utm_campaign',
                    label: t('card.campaigns'),
                    subOptions: [
                      { id: 'utm_campaign', label: 'UTM Campaigns' },
                      { id: 'utm_medium', label: 'UTM Mediums' },
                      { id: 'utm_term', label: 'UTM Terms' },
                      { id: 'utm_content', label: 'UTM Contents' },
                    ],
                  },
                ]}
                activeTab={sourceTab}
                onTabChange={setSourceTab}
                tone="blue"
                leftColLabel={
                  sourceTab === 'channel'
                    ? t('col.channel')
                    : sourceTab.startsWith('utm_')
                      ? t('col.campaign')
                      : t('col.source')
                }
                rightColLabel={t('col.visitors')}
                rows={sourceRows}
                loading={sourceLoading}
                getRowKey={(r) => r.key || '(direct)'}
                getRowLabel={(r) =>
                  sourceTab === 'channel'
                    ? displayChannelLabel(r.key, lang)
                    : sourceTab === 'source'
                      ? displaySourceLabel(r.key, lang)
                      : r.key || '(none)'
                }
                getRowValue={(r) => r.uv || r.pv || 0}
                renderIcon={(r) =>
                  sourceTab === 'channel' ? (
                    <ChannelIcon channel={r.key || ''} />
                  ) : sourceTab === 'source' ? (
                    <SourceIcon source={r.key || ''} />
                  ) : null
                }
                onRowClick={(r) => {
                  if (sourceTab === 'channel' || sourceTab === 'source' || sourceTab.startsWith('utm_')) {
                    addFilter(sourceTab, r.key || '(direct)');
                  }
                }}
                onOpenDetails={() => void loadDetails('source', sourceTab)}
                detailRows={detailRows.source}
                detailLoading={detailLoading.source}
              />

              <BreakdownCard
                tabs={[
                  { id: 'page', label: t('card.top_pages') },
                  { id: 'entry_page', label: t('card.entry_pages') },
                  { id: 'exit_page', label: t('card.exit_pages') },
                ]}
                activeTab={pageTab}
                onTabChange={setPageTab}
                tone="orange"
                leftColLabel={t('col.page')}
                rightColLabel={t('col.visitors')}
                rows={pageRows}
                loading={pageLoading}
                getRowKey={(r) => r.path || r.key || '/'}
                getRowLabel={(r) => r.path || r.key || '/'}
                getRowValue={(r) => r.uv || r.sessions || r.pv || 0}
                onRowClick={(r) => {
                  const p = r.path || r.key;
                  if (p && p !== '(unknown)') addFilter('page', p);
                }}
                onOpenDetails={() => void loadDetails('page', pageTab)}
                detailRows={detailRows.page}
                detailLoading={detailLoading.page}
              />
            </div>

            {/* 3. Breakdown Row 2: Locations Map/Countries (Indigo) & Devices/Browsers (Emerald) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <BreakdownCard
                tabs={[
                  { id: 'map', label: t('card.map') },
                  { id: 'country', label: t('card.countries') },
                  { id: 'region', label: t('card.regions') },
                  { id: 'city', label: t('card.cities') },
                ]}
                activeTab={geoTab}
                onTabChange={setGeoTab}
                tone="indigo"
                leftColLabel={
                  geoTab === 'region'
                    ? t('col.region')
                    : geoTab === 'city'
                      ? t('col.city')
                      : t('col.country')
                }
                rightColLabel={t('col.visitors')}
                rows={geoRows}
                loading={geoLoading}
                getRowKey={(r) => r.key || '(unknown)'}
                getRowLabel={(r) =>
                  geoTab === 'country' || geoTab === 'map'
                    ? countryName(r.key, lang)
                    : r.key || '(unknown)'
                }
                getRowValue={(r) => r.uv || r.pv || 0}
                renderIcon={(r) =>
                  geoTab === 'country' || geoTab === 'map' ? (
                    <span className="text-[14px] leading-none shrink-0">{countryFlag(r.key)}</span>
                  ) : null
                }
                onRowClick={(r) => {
                  const dim = geoTab === 'map' ? 'country' : geoTab;
                  if (r.key) addFilter(dim, r.key);
                }}
                customBody={
                  geoTab === 'map' ? (
                    <WorldMap
                      rows={geoRows}
                      onSelectCountry={(code) => addFilter('country', code)}
                    />
                  ) : undefined
                }
                onOpenDetails={() => void loadDetails('geo', geoTab === 'map' ? 'country' : geoTab)}
                detailRows={detailRows.geo}
                detailLoading={detailLoading.geo}
              />

              <BreakdownCard
                tabs={[
                  { id: 'browser', label: t('card.browsers') },
                  { id: 'os', label: t('card.os') },
                  { id: 'device', label: t('card.devices') },
                ]}
                activeTab={deviceTab}
                onTabChange={setDeviceTab}
                tone="emerald"
                leftColLabel={
                  deviceTab === 'os'
                    ? t('col.os')
                    : deviceTab === 'device'
                      ? t('col.device')
                      : t('col.browser')
                }
                rightColLabel={t('col.visitors')}
                rows={deviceRows}
                loading={deviceLoading}
                getRowKey={(r) => r.key || '(unknown)'}
                getRowLabel={(r) => r.key || '(unknown)'}
                getRowValue={(r) => r.uv || r.pv || 0}
                renderIcon={(r) =>
                  deviceTab === 'browser' ? (
                    <BrowserIcon browser={r.key || ''} />
                  ) : deviceTab === 'device' ? (
                    <DeviceIcon device={r.key || ''} />
                  ) : null
                }
                onRowClick={(r) => {
                  if (r.key) addFilter(deviceTab, r.key);
                }}
                onOpenDetails={() => void loadDetails('device', deviceTab)}
                detailRows={detailRows.device}
                detailLoading={detailLoading.device}
              />
            </div>

            {/* 4. Full-Width Bottom Insights Card (Goals, Funnels, Quality, AdGuard, Vitals, Suspicious, AI) */}
            {currentSite && (
              <BottomInsightsCard
                site={currentSite}
                period={period}
                filters={filters}
                overview={overview}
                goals={goalRows}
                activeTab={bottomTab}
                onTabChange={setBottomTab}
                onSiteUpdated={() => void loadSitesAndMe()}
              />
            )}
          </>
        )}
      </main>

      {/* Filter Builder Modal */}
      <Modal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title={t('toolbar.filter')}
        maxWidth="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (filterVal.trim()) {
              addFilter(filterDim, filterVal.trim());
              setFilterVal('');
              setFilterOpen(false);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">
              {lang === 'zh' ? '筛选维度' : 'Dimension'}
            </label>
            <Dropdown
              align="left"
              widthClass="w-full min-w-[240px]"
              value={filterDim}
              onSelect={setFilterDim}
              options={[
                { value: 'channel', label: t('col.channel') },
                { value: 'source', label: t('col.source') },
                { value: 'page', label: t('col.page') },
                { value: 'country', label: t('col.country') },
                { value: 'browser', label: t('col.browser') },
                { value: 'os', label: t('col.os') },
                { value: 'device', label: t('col.device') },
                { value: 'utm_campaign', label: 'UTM Campaign' },
              ]}
              trigger={() => (
                <button
                  type="button"
                  className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white flex items-center justify-between text-[13.5px] text-zinc-800 cursor-pointer"
                >
                  <span>{filterDim}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              )}
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">
              {lang === 'zh' ? '匹配值' : 'Value'}
            </label>
            <input
              autoFocus
              value={filterVal}
              onChange={(e) => setFilterVal(e.target.value)}
              placeholder={filterDim === 'page' ? '/pricing' : filterDim === 'country' ? 'US' : 'google'}
              className="w-full h-9 px-3 rounded-md border border-zinc-300 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="h-9 px-3.5 rounded-md text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 cursor-pointer"
            >
              {t('toolbar.cancel')}
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] font-medium cursor-pointer"
            >
              {t('toolbar.filter')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Embed Code Modal */}
      <Modal
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        title={t('toolbar.embed')}
        subtitle={t('add_site.done_desc')}
      >
        {currentSite && (
          <div className="space-y-4">
            <div className="relative">
              <pre className="p-3.5 rounded-md bg-zinc-900 text-zinc-100 text-[12px] font-mono overflow-x-auto leading-relaxed">
                {buildEmbedSnippet(currentSite, me?.ingest_host)}
              </pre>
              <button
                type="button"
                onClick={() => void copyText(buildEmbedSnippet(currentSite, me?.ingest_host))}
                className="absolute top-2.5 right-2.5 h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-[11.5px] font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('toolbar.copied') : t('toolbar.copy')}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Public Share Link Modal */}
      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={t('share.title')}
        subtitle={t('share.desc')}
      >
        {currentSite && (
          <div className="space-y-4">
            {currentSite.public_token ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={publicShareUrl}
                    className="flex-1 h-9 px-3 rounded-md border border-zinc-300 bg-zinc-50 text-[12.5px] font-mono text-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => void copyText(publicShareUrl)}
                    className="h-9 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[12.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? t('toolbar.copied') : t('toolbar.copy')}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={shareBusy}
                    onClick={() => void handleToggleShare(true)}
                    className="h-8 px-3 rounded-md border border-zinc-300 text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    {t('share.rotate')}
                  </button>
                  <button
                    type="button"
                    disabled={shareBusy}
                    onClick={() => void handleToggleShare(false)}
                    className="h-8 px-3 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12.5px] font-medium cursor-pointer"
                  >
                    {t('share.disable')}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={shareBusy}
                  onClick={() => void handleToggleShare(true)}
                  className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] font-medium cursor-pointer"
                >
                  {t('share.enable')}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
