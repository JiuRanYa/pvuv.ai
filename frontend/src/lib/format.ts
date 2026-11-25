import type { Lang } from './i18n';

/** Plausible-style compact numeric formatter: 499k, 2.2M, 19.7k, 977 */
export function fmtCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${trimZero((n / 1_000_000_000).toFixed(1))}B`;
  if (abs >= 1_000_000) return `${trimZero((n / 1_000_000).toFixed(1))}M`;
  if (abs >= 100_000) return `${Math.round(n / 1_000)}k`;
  if (abs >= 1_000) return `${trimZero((n / 1_000).toFixed(1))}k`;
  return Math.round(n).toLocaleString();
}

function trimZero(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

export function fmtNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString();
}

export function fmtDecimal(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '0';
  if (n === 0) return '0';
  return n.toFixed(digits);
}

/** 0.542 -> "54%" (or "54.2%" if decimals=1) */
export function fmtPct(ratio: number | null | undefined, decimals = 0): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/** Plausible-style visit duration: "5m 50s", "42s", "1h 12m" */
export function fmtDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms <= 0) return '0s';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return remSec > 0 ? `${min}m ${remSec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin > 0 ? `${hr}h ${remMin}m` : `${hr}h`;
}

export function fmtRelativeTime(ts: number | null | undefined, lang: Lang = 'en'): string {
  if (!ts) return '—';
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return lang === 'zh' ? '刚刚' : 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return lang === 'zh' ? `${min} 分钟前` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return lang === 'zh' ? `${hr} 小时前` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return lang === 'zh' ? `${day} 天前` : `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function fmtBucketLabel(raw: string | undefined, interval: string, lang: Lang = 'en'): string {
  const bucket = (raw || '').trim();
  if (!bucket) return '';
  if (interval === 'minute') {
    const m = bucket.match(/(\d{2}:\d{2})/);
    return m ? m[1] : bucket;
  }
  if (interval === 'hour') {
    const m = bucket.match(/(\d{2}):00/);
    if (m) return `${m[1]}:00`;
    const m2 = bucket.match(/T(\d{2})/);
    if (m2) return `${m2[1]}:00`;
    if (/^\d{2}$/.test(bucket)) return `${bucket}:00`;
    return bucket;
  }
  // Handle "MM-DD" format returned by backend daily timeseries (e.g. "10-28", "11-01")
  const mmdd = bucket.match(/^(\d{2})-(\d{2})$/);
  if (mmdd) {
    const month = parseInt(mmdd[1], 10);
    const day = parseInt(mmdd[2], 10);
    const d = new Date(Date.UTC(2026, month - 1, day));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
    }
  }
  // Handle "YYYY-MM" monthly labels
  const yyyymm = bucket.match(/^(\d{4})-(\d{2})$/);
  if (yyyymm) {
    const d = new Date(Date.UTC(parseInt(yyyymm[1], 10), parseInt(yyyymm[2], 10) - 1, 1));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
  }
  const iso = bucket.slice(0, 10);
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return bucket;
  if (interval === 'month') {
    return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '🌐';
  const up = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(up)) return '🌐';
  return String.fromCodePoint(0x1f1e6 + up.charCodeAt(0) - 65, 0x1f1e6 + up.charCodeAt(1) - 65);
}

const displayNameCache: Partial<Record<Lang, Intl.DisplayNames>> = {};

export function countryName(code: string | null | undefined, lang: Lang = 'en'): string {
  if (!code || code === '(unknown)') return lang === 'zh' ? '未知地区' : 'Unknown';
  const up = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(up)) return code;
  try {
    if (!displayNameCache[lang]) {
      displayNameCache[lang] = new Intl.DisplayNames([lang === 'zh' ? 'zh-Hans' : 'en'], { type: 'region' });
    }
    return displayNameCache[lang]!.of(up) || up;
  } catch {
    return up;
  }
}

export function displaySourceLabel(raw: string | null | undefined, lang: Lang = 'en'): string {
  if (!raw || raw === '(direct)' || raw === '(none)') return lang === 'zh' ? '直接访问' : 'Direct / None';
  if (raw === '(unknown)') return lang === 'zh' ? '未知' : 'Unknown';
  const map: Record<string, string> = {
    google: 'Google',
    'google.com': 'Google',
    bing: 'Bing',
    'bing.com': 'Bing',
    duckduckgo: 'DuckDuckGo',
    'duckduckgo.com': 'DuckDuckGo',
    baidu: 'Baidu',
    'baidu.com': 'Baidu',
    yahoo: 'Yahoo',
    'yahoo.com': 'Yahoo',
    yandex: 'Yandex',
    'yandex.com': 'Yandex',
    github: 'GitHub',
    'github.com': 'GitHub',
    twitter: 'Twitter / X',
    't.co': 'Twitter / X',
    'x.com': 'Twitter / X',
    youtube: 'YouTube',
    'youtube.com': 'YouTube',
    reddit: 'Reddit',
    'reddit.com': 'Reddit',
    linkedin: 'LinkedIn',
    'linkedin.com': 'LinkedIn',
    facebook: 'Facebook',
    'facebook.com': 'Facebook',
    chatgpt: 'ChatGPT',
    'chatgpt.com': 'ChatGPT',
    perplexity: 'Perplexity',
    'perplexity.ai': 'Perplexity',
    claude: 'Claude',
    'claude.ai': 'Claude',
    gemini: 'Gemini',
    'gemini.google.com': 'Gemini',
    copilot: 'Copilot',
    'copilot.microsoft.com': 'Copilot',
    deepseek: 'DeepSeek',
    'deepseek.com': 'DeepSeek',
    kimi: 'Kimi',
    'kimi.com': 'Kimi',
    grok: 'Grok',
    'grok.com': 'Grok',
    brave: 'Brave',
    'brave.com': 'Brave',
    'producthunt.com': 'Product Hunt',
    'news.ycombinator.com': 'Hacker News',
    'zhihu.com': 'Zhihu',
  };
  const lower = raw.toLowerCase();
  return map[lower] ?? raw;
}

export function displayChannelLabel(raw: string | null | undefined, lang: Lang = 'en'): string {
  const key = (raw || '').toLowerCase();
  const labels: Record<string, { en: string; zh: string }> = {
    organic_search: { en: 'Organic Search (SEO)', zh: '自然搜索 (SEO)' },
    ai: { en: 'AI Search (GEO)', zh: 'AI 搜索 (GEO)' },
    direct: { en: 'Direct / None', zh: '直接访问' },
    paid_search: { en: 'Paid Search (SEM)', zh: '付费搜索 (SEM)' },
    organic_social: { en: 'Organic Social', zh: '社交媒体' },
    paid_social: { en: 'Paid Social', zh: '付费社媒' },
    referral: { en: 'Referral', zh: '外部引荐' },
    video: { en: 'Video', zh: '视频平台' },
    email: { en: 'Email', zh: '邮件营销' },
  };
  const found = labels[key];
  if (found) return lang === 'zh' ? found.zh : found.en;
  return raw || (lang === 'zh' ? '未知渠道' : 'Unknown');
}

export const BOT_FLAG_META: Record<string, { labelEn: string; labelZh: string }> = {
  WEBDRIVER: { labelEn: 'WebDriver / automation', labelZh: '自动化浏览器 (WebDriver)' },
  AUTOMATION_RESIDUE: { labelEn: 'Automation runtime residue', labelZh: '自动化框架残留特征' },
  UA_CH_MISMATCH: { labelEn: 'User-Agent / Client-Hints mismatch', labelZh: 'UA 与 Client-Hints 不一致' },
  DATACENTER_ASN: { labelEn: 'Datacenter / cloud ASN', labelZh: '机房 / 云服务商 IP' },
  SEC_FETCH_MISSING: { labelEn: 'Missing Sec-Fetch headers', labelZh: '缺失 Sec-Fetch 请求头' },
  TZ_IP_MISMATCH: { labelEn: 'Timezone / IP mismatch', labelZh: '时区与 IP 归属地不符' },
  ZERO_INTERACTION_NO_LEAVE: { labelEn: 'Zero interaction & no leave event', labelZh: '零交互且无离开事件' },
  SOFTWARE_WEBGL: { labelEn: 'Software WebGL renderer', labelZh: '软件渲染 WebGL（无 GPU）' },
  MECHANICAL_TIMING: { labelEn: 'Mechanical timing pattern', labelZh: '机械规律访问节奏' },
  BLOCKLIST_CLUSTER: { labelEn: 'Blocklisted IP cluster', labelZh: '命中恶意 IP 聚类黑名单' },
  HONEYPOT: { labelEn: 'Honeypot trap triggered', labelZh: '触发蜜罐陷阱' },
  SCREEN_DEVICE_MISMATCH: { labelEn: 'Screen / device mismatch', labelZh: '屏幕分辨率与设备类型不符' },
  MOBILE_NO_MOTION: { labelEn: 'Mobile without motion sensors', labelZh: '移动端缺少陀螺仪/运动信号' },
  MOTION_STATIC: { labelEn: 'Static synthetic sensor data', labelZh: '静止或伪造传感器数据' },
  SEARCH_REF_DATACENTER: { labelEn: 'Search referrer from datacenter', labelZh: '机房 IP 伪装搜索来源' },
  FORGED_SEARCH_REFERRER: { labelEn: 'Forged search referrer', labelZh: '伪造搜索引擎 Referrer' },
  HEADLESS_UA: { labelEn: 'Headless browser UA', labelZh: '无头浏览器 UA' },
  HEADLESS_WINDOW: { labelEn: 'Headless window geometry', labelZh: '无头窗口尺寸异常' },
  UA_PLATFORM_MISMATCH: { labelEn: 'UA / platform mismatch', labelZh: 'UA 与操作系统平台冲突' },
  SYNTHETIC_ENV: { labelEn: 'Synthetic browser environment', labelZh: '合成浏览器运行环境' },
  HTTP1_MODERN_BROWSER: { labelEn: 'HTTP/1.1 from modern browser UA', labelZh: '现代浏览器 UA 走 HTTP/1.1' },
  MOUSE_MECHANICAL: { labelEn: 'Mechanical pointer trajectory', labelZh: '机械化鼠标轨迹' },
  SESSION_DRIFT: { labelEn: 'Session fingerprint drift', labelZh: '会话指纹漂移' },
  UNIDENTIFIED_DESKTOP: { labelEn: 'Unidentified desktop environment', labelZh: '未识别桌面环境' },
};

export function labelBotFlag(flag: string, lang: Lang = 'en'): string {
  const m = BOT_FLAG_META[flag] ?? BOT_FLAG_META[flag.toUpperCase()];
  if (!m) return flag.replace(/_/g, ' ');
  return lang === 'zh' ? m.labelZh : m.labelEn;
}

export const PERIOD_OPTIONS = [
  'today',
  'yesterday',
  '24h',
  '7d',
  '28d',
  '30d',
  '90d',
  'this_week', 'last_week', 'this_month', 'last_month', 'this_year',
] as const;

export type PeriodOption = (typeof PERIOD_OPTIONS)[number];

export function defaultIntervalForPeriod(period: string): string {
  if (period === 'today' || period === 'yesterday' || period === '24h') return 'hour';
  if (period === 'this_year') return 'month';
  return 'day';
}

export function fmtUsd(n: number | null | undefined): string {
  if (!n || !Number.isFinite(n)) return '—';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
