const qs = new URLSearchParams(location.search);
const site = qs.get('site'), key = qs.get('k');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const t = (s) => window.PVI18N ? window.PVI18N.t(s) : s;
const te = (s) => esc(t(s));
const fmt = (n) => n == null ? '–' : Number(n).toLocaleString('en-US');
const dur = (ms) => ms == null ? '–' : ms >= 60000 ? `${Math.floor(ms/60000)}m ${Math.round(ms%60000/1000)}s` : `${Math.round(ms/1000)}s`;
const pct = (v) => v == null ? '–' : (v * 100).toFixed(1) + '%';

const CHANNEL_LABEL = {
  direct: 'Direct', organic_search: 'Organic search', paid_search: 'Paid search',
  organic_social: 'Organic social', paid_social: 'Paid social', email: 'Email',
  ai: 'AI assistants', video: 'Video', referral: 'Referral', '(unknown)': '(unknown)',
};
const VITAL_META = { lcp_ms: 'LCP', inp_ms: 'INP*', cls: 'CLS', fcp_ms: 'FCP', ttfb_ms: 'TTFB' };
const RATING_COLOR = { good: 'var(--good)', needs_improvement: 'var(--warn)', poor: 'var(--bad)' };
const fmtVital = (k, v) => v == null ? '–' : k === 'cls' ? Number(v).toFixed(3) : v >= 1000 ? (v / 1000).toFixed(2) + 's' : Math.round(v) + 'ms';

function fail() {
  document.getElementById('main').hidden = true;
  document.getElementById('err').hidden = false;
}
if (!site || !key) fail();

const get = async (p, extra = '') => {
  const r = await fetch(`/api/public/${encodeURIComponent(site)}/${encodeURIComponent(key)}/${p}?period=${document.getElementById('period').value}${extra}`);
  if (!r.ok) throw new Error('public api ' + r.status);
  return r.json();
};

let redrawChart;
let previousChartWidth = 0;
new ResizeObserver(([entry]) => {
  const width = Math.round(entry.contentRect.width);
  if (width === previousChartWidth) return;
  previousChartWidth = width;
  if (width && entry.target.querySelector('svg')) redrawChart?.();
}).observe(document.getElementById('chart'));

function lineChart(points) {
  redrawChart = () => lineChart(points);
  const el = document.getElementById('chart');
  const drawn = points.filter((p) => p.status !== 'future');
  if (!drawn.length || !drawn.some((p) => p.value)) { el.innerHTML = `<p class="muted">${te('no data yet')}</p>`; return; }
  const W = Math.max(240, el.clientWidth || document.documentElement.clientWidth);
  const H = matchMedia('(max-width: 720px)').matches ? Math.round(Math.max(300, Math.min(360, W * .9))) : 190;
  const P = 40;
  const max = Math.max(...drawn.map((p) => p.value ?? 0), 1);
  const xs = (i) => P + (i * (W - P - 12)) / Math.max(points.length - 1, 1);
  const ys = (v) => H - 26 - ((v ?? 0) * (H - 44)) / max;
  const solid = points.map((p, i) => p.status === 'future' ? '' : `${xs(i).toFixed(1)},${ys(p.value).toFixed(1)}`).filter(Boolean).join(' ');
  const step = Math.ceil(points.length / Math.max(2, Math.min(8, Math.floor((W - P) / 82))));
  const labels = points.filter((_, i) => i % step === 0);
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block">
    <polyline points="${solid}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    ${points.map((p, i) => p.status === 'future' ? '' : `<circle cx="${xs(i).toFixed(1)}" cy="${ys(p.value).toFixed(1)}" r="2.4" fill="var(--accent)"><title>${esc(p.label)}: ${fmt(p.value)}</title></circle>`).join('')}
    ${labels.map((p) => `<text x="${xs(points.indexOf(p)).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(p.label)}</text>`).join('')}
    <text x="${P - 6}" y="${(ys(max) + 4).toFixed(1)}" text-anchor="end">${fmt(max)}</text>
  </svg>`;
}

function barTable(elId, headers, rows) {
  const el = document.getElementById(elId);
  if (!rows.length) { el.innerHTML = `<p class="muted">${te('no data yet')}</p>`; return; }
  el.innerHTML = `<table><tr>${headers.map((h, i) => `<th${i ? ' class="num"' : ''}>${te(h)}</th>`).join('')}</tr>`
    + rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`).join('') + '</table>';
}

async function load() {
  try {
    const [o, ts, pages, channels] = await Promise.all([
      get('overview'), get('timeseries', '&metric=uv&interval=day'),
      get('breakdown', '&dim=page&limit=10'), get('breakdown', '&dim=channel&limit=10'),
    ]);
    const cleanShare = o.pv ? ((o.clean_count + o.suspect_count) / o.pv * 100).toFixed(1) + '%' : '–';
    const card = (k, v, h, help) => `<div class="card"${help ? ` title="${esc(t(help))}"` : ''}><div class="v">${v}</div><div class="k">${te(k)}</div><div class="h">${h ? te(h) : ''}</div></div>`;
    document.getElementById('cards').innerHTML =
      card('Visitors', fmt(o.uv), 'unique people') + card('Pageviews', fmt(o.pv), 'all traffic') + card('Sessions', fmt(o.sessions), 'visits') +
      card('Bounce (engaged)', pct(o.bounce_rate), 'GA4 style', 'Visits with no engagement: under 10s, no second page, no conversion (GA4 definition)') +
      card('Engaged time', dur(o.avg_duration_ms), 'visible dwell', 'Average time the page was actually visible per visit') +
      card('Human share', cleanShare, 'of pageviews', 'Share of pageviews not judged bot or crawler');
    lineChart(ts.points || []);
    barTable('pages', ['Path', 'PV', 'Visitors'],
      (pages.rows || []).map((r) => [esc(r.path), fmt(r.pv), fmt(r.uv)]));
    barTable('channels', ['Channel', 'Sessions', 'Visitors'],
      (channels.rows || []).map((r) => [te(CHANNEL_LABEL[r.key] || r.key), fmt(r.sessions), fmt(r.uv)]));
    document.getElementById('main').hidden = false;
  } catch { fail(); return; }

  // vitals: separate try — absence just hides the section
  try {
    const d = await get('vitals');
    const sec = document.getElementById('vitalsSec');
    if (!d || !d.samples) { sec.hidden = true; return; }
    sec.hidden = false;
    document.getElementById('vitals').innerHTML = `<div class="cards cards-5">` + Object.keys(VITAL_META).map((k) => {
      const m = (d.metrics || {})[k] || {};
      const color = RATING_COLOR[m.rating] || 'var(--muted)';
      return `<div class="card" style="border-left:3px solid ${color}"><div class="v">${fmtVital(k, m.p75)}</div><div class="k">${esc(VITAL_META[k])} <span class="muted">p75</span></div></div>`;
    }).join('') + '</div>';
  } catch { document.getElementById('vitalsSec').hidden = true; }
}

async function loadMeta() {
  try {
    const m = await get('meta');
    if (m && m.name) {
      document.getElementById('siteName').textContent = m.name;
      document.title = `${m.name} — pvuv.ai`;
    }
  } catch { fail(); }
}

document.getElementById('period').addEventListener('change', load);
if (window.PVI18N) { window.PVI18N.applyStatic(); document.addEventListener('pvuv:lang', load); }
if (site && key) { loadMeta(); load(); }
