import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, ExternalLink, X } from 'lucide-react';
import { BreakdownCard, type BarTone } from '../components/BreakdownCard';
import { Dropdown } from '../components/Dropdown';
import { Navbar } from '../components/Navbar';
import { StatsGraphCard, type MainMetricKey } from '../components/StatsGraphCard';
import { api, HttpError } from '../lib/api';
import { PERIOD_OPTIONS } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { Link } from '../lib/router';
import type { FilterItem, Ga4Metrics, Ga4Report } from '../lib/types';

const cards: Array<{ tone: BarTone; tabs: Array<[string, string, string]> }> = [
  { tone: 'blue', tabs: [
    ['sessionDefaultChannelGroup', '渠道', 'Channels'], ['sessionSource', '来源', 'Sources'],
    ['sessionMedium', '媒介', 'Mediums'], ['sessionCampaignName', '广告系列', 'Campaigns'],
  ] },
  { tone: 'orange', tabs: [['pagePath', '页面', 'Pages'], ['landingPage', '着陆页', 'Landing Pages']] },
  { tone: 'indigo', tabs: [['country', '国家', 'Countries'], ['region', '地区', 'Regions'], ['city', '城市', 'Cities']] },
  { tone: 'emerald', tabs: [['browser', '浏览器', 'Browsers'], ['operatingSystem', '操作系统', 'Operating Systems'], ['deviceCategory', '设备', 'Devices']] },
  { tone: 'red', tabs: [['eventName', '关键事件', 'Key Events']] },
];

const chartMetrics: Array<keyof Ga4Metrics> = ['uv', 'sessions', 'pv', 'pv_per_session', 'bounce_rate',
  'engagement_rate', 'avg_duration_ms', 'visit_duration_ms'];

export function Ga4DashboardPage({ siteId }: { siteId: string }) {
  const { lang, t } = useI18n();
  const zh = lang === 'zh';
  const [period, setPeriod] = useState<string>('today');
  const [dimensions, setDimensions] = useState(() => cards.map(card => card.tabs[0][0]));
  const [metric, setMetric] = useState<keyof Ga4Metrics>('uv');
  const [filter, setFilter] = useState<FilterItem>();
  const [report, setReport] = useState<Ga4Report>();
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setReport(undefined);
    setError(undefined);
    api.ga4(siteId, period, dimensions, filter).then(data => {
      if (active) setReport(data);
    }).catch((err: unknown) => {
      if (!active) return;
      const failed = err instanceof HttpError && err.status === 404;
      setError(failed
        ? (zh ? '此站点尚未连接 GA4 报表。' : 'GA4 reporting is not connected for this site.')
        : (zh ? 'GA4 报表加载失败。' : 'Unable to load the GA4 report.'));
    });
    return () => { active = false; };
  }, [siteId, period, dimensions, filter, revision, zh]);

  const selectMetric = (next: MainMetricKey) => {
    if (chartMetrics.includes(next as keyof Ga4Metrics)) setMetric(next as keyof Ga4Metrics);
  };
  const metricPoints = report?.series.map(point => ({ label: point.label, status: point.status, value: point.metrics[metric] })) ?? [];
  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <Navbar />
      <main className="max-w-[1120px] mx-auto px-4 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 mb-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to={`/sites/${siteId}?source=tally`} className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:underline">
              <ArrowLeft size={16}/>{zh ? '自建统计' : 'Self-hosted analytics'}
            </Link>
            <h1 className="text-lg font-bold">{zh ? 'Google Analytics 4 报表' : 'Google Analytics 4 reports'}</h1>
            {report && <span className="text-xs text-zinc-600">{report.timezone}</span>}
          </div>
          <Dropdown
            align="right" value={period} onSelect={setPeriod}
            options={PERIOD_OPTIONS.filter(p => p !== '24h').map(p => ({value: p, label: t(`period.${p}`)}))}
            trigger={() => <button type="button" className="h-8 px-2 inline-flex items-center gap-2 rounded-md hover:bg-zinc-100"><Calendar size={16}/>{t(`period.${period}`)}</button>}
          />
        </div>
        {filter && <button type="button" onClick={() => setFilter(undefined)} className="mb-3 max-w-full inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-sm text-indigo-800">
          <span className="truncate">{filter.value}</span><X size={14} aria-label={zh ? '移除筛选' : 'Remove filter'}/>
        </button>}
        {error ? <div role="alert" className="plausible-card p-5">
          <p>{error}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-indigo-700">
            <button type="button" onClick={() => setRevision(n => n + 1)}>{zh ? '重试' : 'Retry'}</button>
            <a href="https://analytics.google.com/analytics/web/" className="inline-flex items-center gap-1"><ExternalLink size={14}/>{zh ? '打开 Google Analytics' : 'Open Google Analytics'}</a>
          </div>
        </div> : <>
          {report?.limited && <p role="status" className="mb-3 text-sm text-amber-800">
            {zh ? 'Google 对部分细分数据应用了阈值或汇总。' : 'Google applied thresholding or grouped some dimension values.'}
          </p>}
          <StatsGraphCard ga4 overview={report?.overview ?? null} points={metricPoints} activeMetric={metric}
            onSelectMetric={selectMetric} interval={report?.interval ?? 'day'} allowedIntervals={[]} onSelectInterval={() => {}} loading={!report}/>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            {cards.map(({tone, tabs}, i) => {
              const rows = report?.rows[dimensions[i]] ?? [];
              return <BreakdownCard key={dimensions[i]} tone={tone} activeTab={dimensions[i]}
                tabs={tabs.map(([id, chinese, english]) => ({ id, label: zh ? chinese : english }))}
                onTabChange={dim => {
                  setDimensions(prev => prev.map((value,index) => index === i ? dim : value));
                  if (i === 0 && dim !== 'sessionSource' && filter?.dim === 'sessionDefaultChannelGroup') setFilter(undefined);
                }}
                leftColLabel={zh ? '名称' : 'Name'}
                rightColLabel={i === 4 ? (zh ? '关键事件次数' : 'Key events') : (zh ? '总用户数' : 'Total users')}
                rows={rows} detailRows={rows} loading={!report}
                getRowKey={row => row.key ?? ''} getRowLabel={row => row.key ?? ''} getRowValue={row => row.uv}
                onRowClick={i === 4 ? undefined : row => {
                  if (!row.key) return;
                  setFilter({dim: dimensions[i], value: row.key});
                  if (dimensions[i] === 'sessionDefaultChannelGroup') setDimensions(prev => ['sessionSource', ...prev.slice(1)]);
                }}/>
            })}
          </div>
        </>}
      </main>
    </div>
  );
}
