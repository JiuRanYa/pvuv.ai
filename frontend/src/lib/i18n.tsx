import React, { createContext, useContext, useState } from 'react';

export type Lang = 'en' | 'zh';

const STORAGE_KEY = 'pvuv.lang';

const MESSAGES: Record<Lang, Record<string, string>> = {
  en: {
    // Nav
    'nav.sites': 'Sites',
    'nav.health': 'Self-check',
    'nav.settings': 'Settings',
    'nav.signout': 'Sign out',
    'nav.signin': 'Sign in',
    'nav.admin': 'Admin',

    // Periods
    'period.today': 'Today',
    'period.yesterday': 'Yesterday',
    'period.24h': 'Last 24 hours',
    'period.7d': 'Last 7 days',
    'period.28d': 'Last 28 days',
    'period.30d': 'Last 30 days',
    'period.90d': 'Last 90 days',
    'period.this_week': 'This week',
    'period.last_week': 'Last week',
    'period.last_month': 'Last month',
    'period.this_year': 'This year',
    'period.this_month': 'This month',
    'period.12m': 'Last 12 months',

    // Intervals
    'interval.minute': 'Minutes',
    'interval.hour': 'Hours',
    'interval.day': 'Days',
    'interval.week': 'Weeks',
    'interval.month': 'Months',

    // KPI strip (Plausible exact)
    'kpi.uv': 'Unique Visitors',
    'kpi.sessions': 'Total Visits',
    'kpi.pv': 'Total Pageviews',
    'kpi.views_per_visit': 'Pages per Visitor',
    'kpi.single_bounce': 'Single-page bounce rate',
    'kpi.engaged_time': 'Engaged time',
    'kpi.bounce': 'Bounce Rate',
    'kpi.duration': 'Visit Duration',
    'kpi.current_visitors': 'current visitors',

    // Toolbar & Actions
    'toolbar.filter': 'Filter',
    'toolbar.clear_filters': 'Clear all',
    'toolbar.embed': 'Embed code',
    'toolbar.share': 'Public share link',
    'toolbar.visitors': 'Visitor lookup',
    'toolbar.export': 'Export JSON',
    'toolbar.copy': 'Copy',
    'toolbar.copied': 'Copied',
    'toolbar.close': 'Close',
    'toolbar.save': 'Save',
    'toolbar.cancel': 'Cancel',
    'toolbar.delete': 'Delete',
    'toolbar.refresh': 'Refresh',
    'toolbar.details': 'Details',

    // Breakdown Cards (Plausible exact)
    'card.channels': 'Channels',
    'card.sources': 'Sources',
    'card.campaigns': 'Campaigns',
    'card.top_pages': 'Top Pages',
    'card.entry_pages': 'Entry Pages',
    'card.exit_pages': 'Exit Pages',
    'card.map': 'Map',
    'card.countries': 'Countries',
    'card.regions': 'Regions',
    'card.cities': 'Cities',
    'card.browsers': 'Browsers',
    'card.os': 'Operating Systems',
    'card.devices': 'Devices',
    'card.size': 'Screen Size',

    // Bottom Full-Width Card Tabs
    'tab.goals': 'Goals',
    'tab.funnels': 'Funnels',
    'tab.quality': 'Traffic Quality',
    'tab.adguard': 'Ad Protection',
    'tab.vitals': 'Web Vitals',
    'tab.suspicious': 'Suspicious',
    'tab.ai': 'AI Report',

    // Column Headers
    'col.source': 'Source',
    'col.referrer': 'Referring URL',
    'source.no_referrer': 'No referring URL',
    'col.channel': 'Channel',
    'col.campaign': 'Campaign',
    'col.page': 'Page',
    'col.country': 'Country',
    'col.region': 'Region',
    'col.city': 'City',
    'col.browser': 'Browser',
    'col.os': 'Operating System',
    'col.device': 'Device',
    'col.size': 'Screen Size',
    'col.visitors': 'Visitors',
    'col.goal': 'Goal',
    'col.uniques': 'Uniques',
    'col.total': 'Total',
    'col.cr': 'CR',
    'col.revenue': 'Revenue',

    // Sites Page
    'sites.title': 'My Sites',
    'sites.add': '+ Add site',
    'sites.empty_title': 'No sites yet',
    'sites.empty_desc': 'Add your first website to get an embed snippet and start measuring clean traffic and invalid-click protection.',
    'sites.no_data': 'Awaiting data',
    'sites.visitors_last': 'visitors',
    'sites.clean': 'clean',
    'sites.invalid': 'invalid',
    'sites.ranking_title': 'Cross-site Clean Traffic Ranking',
    'sites.ranking_desc': 'Ranked by verified external clean pageviews (bot & internal self-referrals excluded).',

    // Add Site Modal
    'add_site.title': 'Add a new site',
    'add_site.name': 'Site name',
    'add_site.name_ph': 'e.g. Example Blog',
    'add_site.domains': 'Allowed domains',
    'add_site.domains_ph': 'example.com, www.example.com',
    'add_site.domains_hint': 'Comma-separated hostnames permitted to send events.',
    'add_site.timezone': 'Reporting timezone',
    'add_site.adguard': 'Ad protection mode',
    'add_site.adclient': 'AdSense publisher ID (optional)',
    'add_site.create': 'Add site',
    'add_site.done_title': 'Install the tracking snippet',
    'add_site.done_desc': 'Paste this tag inside the <head> of your site. Tally starts recording immediately without cookies.',
    'add_site.open_dashboard': 'Open dashboard',

    // Quality / AdGuard / Vitals / AI / Funnels / Health / Settings
    'empty.no_data': 'No data yet for this period',
    'onboarding.title': 'Waiting for your first pageview',
    'onboarding.desc': 'Add this snippet inside <head> on your site. This view updates automatically once events arrive.',
    'onboarding.check': 'Check again',
    'share.title': 'Public shared dashboard',
    'share.desc': 'Anyone with this secret link can view aggregate metrics (no visitor-level PII is ever exposed).',
    'share.enable': 'Enable public link',
    'share.disable': 'Disable & revoke link',
    'share.rotate': 'Rotate link',

    'quality.clean': 'Clean',
    'quality.suspect': 'Suspect',
    'quality.bot': 'Bot',
    'quality.crawler': 'Crawler',
    'quality.signals': 'Top Detection Signals',
    'quality.alerts': 'Active Health Alerts',
    'quality.no_alerts': 'No traffic anomalies detected in this period.',

    'adguard.mode': 'Protection Mode',
    'adguard.off': 'Off',
    'adguard.loose': 'Loose',
    'adguard.balanced': 'Balanced',
    'adguard.strict': 'Strict',
    'adguard.shadow_active': 'Shadow observation active',
    'adguard.enforce_now': 'Enforce now',
    'adguard.tiers': 'Simulated Block Rate by Tier',
    'adguard.top_sources': 'Top Invalid Traffic Sources',

    'vitals.no_data': 'No Core Web Vitals samples yet for this period.',
    'vitals.slowest': 'Slowest Pages (LCP p75)',
    'vitals.ctit': 'Click-to-Conversion Timing',

    'ai.generate': 'Generate AI Report',
    'ai.generating': 'Generating report…',
    'ai.not_configured': 'Configure an OpenAI or Anthropic provider in Settings to generate AI insights.',
    'ai.open_settings': 'Open AI Settings',

    'health.title': 'Deployment Self-Check',
    'health.desc': 'Verify database, KV storage, SDK loader, and end-to-end live event ingestion.',
    'health.run_live': 'Run live beacon test',
    'health.running': 'Testing…',

    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.tokens': 'API Tokens',
    'settings.admins': 'SSO Admins',
    'settings.ai': 'AI Reports',
    'settings.crawlers': 'Crawler Directory',
    'settings.cfedge': 'Cloudflare Edge',
    'settings.storage': 'Storage & Cron',

    'login.title': 'Sign in to Tally',
    'login.feishu_desc': 'Sign in with your organization Feishu SSO session to access the analytics console.',
    'login.continue': 'Continue with Feishu SSO',
    'login.retry': 'Retry session check',
  },
  zh: {
    // Nav
    'nav.sites': '站点列表',
    'nav.health': '部署自检',
    'nav.settings': '系统设置',
    'nav.signout': '退出登录',
    'nav.signin': '登录',
    'nav.admin': '管理员',

    // Periods
    'period.today': '今天',
    'period.yesterday': '昨天',
    'period.24h': '最近 24 小时',
    'period.7d': '最近 7 天',
    'period.28d': '最近 28 天',
    'period.30d': '最近 30 天',
    'period.90d': '最近 90 天',
    'period.this_week': '本周',
    'period.last_week': '上周',
    'period.last_month': '上月',
    'period.this_year': '今年',
    'period.this_month': '本月',
    'period.12m': '最近 12 个月',

    // Intervals
    'interval.minute': '按分钟',
    'interval.hour': '按小时',
    'interval.day': '按天',
    'interval.week': '按周',
    'interval.month': '按月',

    // KPI strip
    'kpi.uv': '独立访客',
    'kpi.sessions': '总访问次数',
    'kpi.pv': '总浏览量',
    'kpi.views_per_visit': '人均浏览页数',
    'kpi.single_bounce': '单页跳出率',
    'kpi.engaged_time': '互动时长',
    'kpi.bounce': '跳出率',
    'kpi.duration': '访问时长',
    'kpi.current_visitors': '当前在线访客',

    // Toolbar & Actions
    'toolbar.filter': '筛选',
    'toolbar.clear_filters': '清空筛选',
    'toolbar.embed': '嵌入代码',
    'toolbar.share': '公开分享链接',
    'toolbar.visitors': '访客回放',
    'toolbar.export': '导出 JSON',
    'toolbar.copy': '复制',
    'toolbar.copied': '已复制',
    'toolbar.close': '关闭',
    'toolbar.save': '保存',
    'toolbar.cancel': '取消',
    'toolbar.delete': '删除',
    'toolbar.refresh': '刷新',
    'toolbar.details': '查看全部',

    // Breakdown Cards
    'card.channels': '渠道',
    'card.sources': '来源',
    'card.campaigns': '广告活动',
    'card.top_pages': '热门页面',
    'card.entry_pages': '入口页',
    'card.exit_pages': '退出页',
    'card.map': '地图',
    'card.countries': '国家/地区',
    'card.regions': '省/州',
    'card.cities': '城市',
    'card.browsers': '浏览器',
    'card.os': '操作系统',
    'card.devices': '设备',
    'card.size': '屏幕尺寸',

    // Bottom Full-Width Card Tabs
    'tab.goals': '目标转化',
    'tab.funnels': '转化漏斗',
    'tab.quality': '流量质量',
    'tab.adguard': '广告防护',
    'tab.vitals': 'Web Vitals',
    'tab.suspicious': '异常流量',
    'tab.ai': 'AI 分析报告',

    // Column Headers
    'col.source': '来源',
    'col.referrer': '引荐网址',
    'source.no_referrer': '无引荐网址',
    'col.channel': '渠道',
    'col.campaign': '活动',
    'col.page': '页面',
    'col.country': '国家/地区',
    'col.region': '省/州',
    'col.city': '城市',
    'col.browser': '浏览器',
    'col.os': '操作系统',
    'col.device': '设备',
    'col.size': '屏幕尺寸',
    'col.visitors': '访客数',
    'col.goal': '目标事件',
    'col.uniques': '独立访客',
    'col.total': '触发次数',
    'col.cr': '转化率',
    'col.revenue': '收入',

    // Sites Page
    'sites.title': '我的站点',
    'sites.add': '+ 添加站点',
    'sites.empty_title': '还没有添加站点',
    'sites.empty_desc': '添加你的第一个网站，获取极简埋点脚本，实时统计流量并拦截无效点击与恶意爬虫。',
    'sites.no_data': '等待数据上报',
    'sites.visitors_last': '位访客',
    'sites.clean': '正常',
    'sites.invalid': '异常',
    'sites.ranking_title': '跨站点纯净流量排行',
    'sites.ranking_desc': '按过滤后的外部纯净浏览量排序（自动剔除机器人与站群互导流量）。',

    // Add Site Modal
    'add_site.title': '添加新站点',
    'add_site.name': '站点名称',
    'add_site.name_ph': '例如：主站官网',
    'add_site.domains': '允许上报的域名',
    'add_site.domains_ph': 'example.com, www.example.com',
    'add_site.domains_hint': '多个域名请用逗号分隔，用于校验事件来源。',
    'add_site.timezone': '统计时区',
    'add_site.adguard': '广告防护等级',
    'add_site.adclient': 'AdSense 发布商 ID（可选）',
    'add_site.create': '创建站点',
    'add_site.done_title': '安装统计脚本',
    'add_site.done_desc': '将以下脚本粘贴到页面 <head> 标签内，无需 Cookie 即可立即开始采集。',
    'add_site.open_dashboard': '进入数据面板',

    // Quality / AdGuard / Vitals / AI / Funnels / Health / Settings
    'empty.no_data': '该时间段暂无数据',
    'onboarding.title': '等待首次页面访问上报',
    'onboarding.desc': '请将下方脚本安装到网站的 <head> 中，收到第一条事件后此面板会自动展示统计图表。',
    'onboarding.check': '重新检测',
    'share.title': '公开分享看板',
    'share.desc': '拥有此链接的任何人均可查看汇总指标（绝不暴露单个访客明细）。',
    'share.enable': '开启公开分享链接',
    'share.disable': '关闭并撤销链接',
    'share.rotate': '重置链接',

    'quality.clean': '纯净流量',
    'quality.suspect': '可疑流量',
    'quality.bot': '恶意机器人',
    'quality.crawler': '合规爬虫',
    'quality.signals': '高频风控信号',
    'quality.alerts': '流量异常告警',
    'quality.no_alerts': '当前时间段内未检测到异常流量告警。',

    'adguard.mode': '防护等级',
    'adguard.off': '关闭',
    'adguard.loose': '宽松',
    'adguard.balanced': '均衡',
    'adguard.strict': '严格',
    'adguard.shadow_active': '当前处于影子观察期',
    'adguard.enforce_now': '立即切换为强制拦截',
    'adguard.tiers': '各防护等级拦截率预估',
    'adguard.top_sources': '异常流量主要来源',

    'vitals.no_data': '当前时间段暂无 Core Web Vitals 采样数据。',
    'vitals.slowest': '加载最慢页面（LCP p75）',
    'vitals.ctit': '点击至转化耗时分布',

    'ai.generate': '生成 AI 诊断报告',
    'ai.generating': '正在生成报告…',
    'ai.not_configured': '请先在系统设置中配置 OpenAI 或 Anthropic 模型接口。',
    'ai.open_settings': '前往 AI 设置',

    'health.title': '部署健康自检',
    'health.desc': '检查数据库、KV 存储、埋点脚本与端到端实时事件上报链路。',
    'health.run_live': '运行实时上报测试',
    'health.running': '检测中…',

    'settings.title': '系统设置',
    'settings.general': '常规与品牌',
    'settings.tokens': 'API 令牌',
    'settings.admins': '飞书 SSO 管理员',
    'settings.ai': 'AI 分析配置',
    'settings.crawlers': '爬虫目录',
    'settings.cfedge': 'Cloudflare 边缘日志',
    'settings.storage': '存储与定时任务',

    'login.title': '登录 Tally',
    'login.feishu_desc': '请通过企业飞书 SSO 登录以访问数据分析控制台。',
    'login.continue': '使用飞书 SSO 登录',
    'login.retry': '重新检测登录状态',
  },
};

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    /* ignore */
  }
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
}

interface I18nCtx {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (key: string) => string;
}

const Context = createContext<I18nCtx>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const t = (key: string): string => MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key;

  return <Context.Provider value={{ lang, setLang, t }}>{children}</Context.Provider>;
}

export function useI18n() {
  return useContext(Context);
}
