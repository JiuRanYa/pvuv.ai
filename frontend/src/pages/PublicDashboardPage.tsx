import React, { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { api } from '../lib/api';
import type { BreakdownRow, OverviewResponse, SiteRecord, TimeseriesPoint } from '../lib/types';
import {
  countryFlag,
  countryName,
  defaultIntervalForPeriod,
  displaySourceLabel,
  PERIOD_OPTIONS,
} from '../lib/format';
import { useI18n } from '../lib/i18n';
import { Navbar } from '../components/Navbar';
import { Dropdown } from '../components/Dropdown';
import { DeviceIcon, SiteBadgeIcon, SourceIcon } from '../components/Icons';
import { StatsGraphCard, type MainMetricKey } from '../components/StatsGraphCard';
import { BreakdownCard } from '../components/BreakdownCard';
import { WorldMap } from '../components/WorldMap';
import { BottomInsightsCard, type BottomTabId } from '../components/BottomInsightsCard';

export function PublicDashboardPage({ siteId, token }: { siteId: string; token: string }) {
  const { lang, t } = useI18n();
  const [siteName, setSiteName] = useState<string>('');
  const [notFound, setNotFound] = useState(false);
  const [period, setPeriod] = useState<string>('today');
  const [interval, setIntervalState] = useState<string>('hour');
  const [activeMetric, setActiveMetric] = useState<MainMetricKey>('uv');

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [points, setPoints] = useState<TimeseriesPoint[]>([]);
  const [sources, setSources] = useState<BreakdownRow[]>([]);
  const [sourceTab, setSourceTab] = useState<string>('source');
  const [pages, setPages] = useState<BreakdownRow[]>([]);
  const [countries, setCountries] = useState<BreakdownRow[]>([]);
  const [geoTab, setGeoTab] = useState<string>('map');
  const [devices, setDevices] = useState<BreakdownRow[]>([]);
  const [bottomTab, setBottomTab] = useState<BottomTabId>('quality');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .publicMeta(siteId, token)
      .then((m) => {
        if (alive) setSiteName(m.name);
      })
      .catch(() => {
        if (alive) setNotFound(true);
      });
    return () => {
      alive = false;
    };
  }, [siteId, token]);

  useEffect(() => {
    if (notFound) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      api.publicOverview(siteId, token, period),
      api.publicTimeseries(siteId, token, activeMetric, period, interval),
      api.publicBreakdown(siteId, token, sourceTab, period, 15),
      api.publicBreakdown(siteId, token, 'page', period, 15),
      api.publicBreakdown(siteId, token, 'country', period, 200),
      api.publicBreakdown(siteId, token, 'device', period, 15),
    ])
      .then(([ov, ts, src, pg, cn, dv]) => {
        if (!alive) return;
        setOverview(ov);
        setPoints(ts.points ?? []);
        setSources(src.rows ?? []);
        setPages(pg.rows ?? []);
        setCountries(cn.rows ?? []);
        setDevices(dv.rows ?? []);
      })
      .catch(() => {
        if (alive) setNotFound(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [siteId, token, period, interval, activeMetric, sourceTab, notFound]);

  const allowedIntervals = useMemo(() => {
    if (period === 'today' || period === 'yesterday' || period === '24h') return ['hour'];
    if (period === 'this_year') return ['month', 'week', 'day'];
    return ['day', 'week'];
  }, [period]);

  const dummySite: SiteRecord = {
    site_id: siteId,
    name: siteName || siteId,
    allowed_domains: '[]',
    adguard_mode: 'off',
    adclient: null,
    timezone: 'UTC',
    created_at: 0,
    status: 'active',
    shadow_until: null,
    public_token: token,
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#fafafa] text-zinc-900">
        <Navbar isPublic />
        <main className="max-w-md mx-auto px-4 pt-16 text-center">
          <div className="plausible-card p-8">
            <h1 className="text-[18px] font-bold text-zinc-900">
              {lang === 'zh' ? '分享链接无效或已撤销' : 'Shared dashboard not found'}
            </h1>
            <p className="mt-2 text-[13.5px] text-zinc-500">
              {lang === 'zh'
                ? '请联系站点管理员获取最新的公开看板链接。'
                : 'This link may have been disabled or rotated by the site owner.'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <Navbar isPublic />

      <div className="sticky top-0 z-30 bg-[#fafafa]/95 backdrop-blur-xs">
        <div className="max-w-[1120px] mx-auto px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <SiteBadgeIcon name={siteName || 'T'} size={22} />
            <span className="text-[14.5px] font-semibold text-zinc-900 truncate">{siteName || siteId}</span>
            <span className="px-2 py-0.5 rounded bg-zinc-200/70 text-[11px] font-medium text-zinc-600">
              {lang === 'zh' ? '公开只读' : 'Public'}
            </span>
          </div>

          <Dropdown
            align="right"
            widthClass="min-w-[168px]"
            value={period}
            onSelect={(p) => {
              setPeriod(p);
              setIntervalState(defaultIntervalForPeriod(p));
            }}
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
      </div>

      <main className="max-w-[1120px] mx-auto px-4 pt-2 pb-16">
        <StatsGraphCard
          overview={overview}
          points={points}
          activeMetric={activeMetric}
          onSelectMetric={setActiveMetric}
          interval={interval}
          onSelectInterval={setIntervalState}
          allowedIntervals={allowedIntervals}
          loading={loading}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <BreakdownCard
            tabs={[
              { id: 'channel', label: t('card.channels') },
              { id: 'source', label: t('card.sources') },
            ]}
            activeTab={sourceTab}
            onTabChange={setSourceTab}
            tone="blue"
            leftColLabel={sourceTab === 'channel' ? t('col.channel') : t('col.source')}
            rightColLabel={t('col.visitors')}
            rows={sources}
            getRowKey={(r) => r.key || '(direct)'}
            getRowLabel={(r) => (sourceTab === 'source' ? displaySourceLabel(r.key, lang) : r.key || '(none)')}
            getRowValue={(r) => r.uv || r.pv || 0}
            renderIcon={(r) => (sourceTab === 'source' ? <SourceIcon source={r.key || ''} /> : null)}
          />

          <BreakdownCard
            tabs={[{ id: 'page', label: t('card.top_pages') }]}
            activeTab="page"
            onTabChange={() => {}}
            tone="orange"
            leftColLabel={t('col.page')}
            rightColLabel={t('col.visitors')}
            rows={pages}
            getRowKey={(r) => r.path || r.key || '/'}
            getRowLabel={(r) => r.path || r.key || '/'}
            getRowValue={(r) => r.uv || r.pv || 0}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <BreakdownCard
            tabs={[
              { id: 'map', label: t('card.map') },
              { id: 'country', label: t('card.countries') },
            ]}
            activeTab={geoTab}
            onTabChange={setGeoTab}
            tone="indigo"
            leftColLabel={t('col.country')}
            rightColLabel={t('col.visitors')}
            rows={countries}
            getRowKey={(r) => r.key || '(unknown)'}
            getRowLabel={(r) => countryName(r.key, lang)}
            getRowValue={(r) => r.uv || r.pv || 0}
            renderIcon={(r) => <span className="text-[14px] leading-none">{countryFlag(r.key)}</span>}
            customBody={geoTab === 'map' ? <WorldMap rows={countries} /> : undefined}
          />

          <BreakdownCard
            tabs={[{ id: 'device', label: t('card.devices') }]}
            activeTab="device"
            onTabChange={() => {}}
            tone="emerald"
            leftColLabel={t('col.device')}
            rightColLabel={t('col.visitors')}
            rows={devices}
            getRowKey={(r) => r.key || '(unknown)'}
            getRowLabel={(r) => r.key || '(unknown)'}
            getRowValue={(r) => r.uv || r.pv || 0}
            renderIcon={(r) => <DeviceIcon device={r.key || ''} />}
          />
        </div>

        <BottomInsightsCard
          site={dummySite}
          period={period}
          filters={[]}
          overview={overview}
          goals={[]}
          activeTab={bottomTab}
          onTabChange={setBottomTab}
          isPublic
          publicToken={token}
        />
      </main>
    </div>
  );
}
