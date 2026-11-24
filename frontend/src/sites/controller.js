const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const t = (s) => window.PVI18N.t(s);
let ingestHostCfg = ''; // from /api/me — see the snippet builder below
const te = (s) => esc(t(s));
async function guard(r) { if (r.status === 401) { location.href = '/login.html'; throw new Error('auth'); } return r; }

// collapsible panels: only one open at a time; toolbar buttons toggle them
function togglePanel(id) {
  for (const p of ['addPanel', 'homePanel']) {
    const el = document.getElementById(p);
    if (p === id) el.hidden = !el.hidden;
    else el.hidden = true;
  }
  const opened = document.getElementById(id);
  if (!opened.hidden) opened.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
document.getElementById('btnAdd').addEventListener('click', () => togglePanel('addPanel'));
document.getElementById('btnSettings').addEventListener('click', () => { togglePanel('homePanel'); loadTokens(); loadStorage(); });
document.querySelectorAll('.panel .close').forEach((b) =>
  b.addEventListener('click', () => { document.getElementById(b.dataset.close).hidden = true; }));

const fmt = (n) => n == null ? '–' : Number(n).toLocaleString('en-US');
const dur = (ms) => ms == null ? '–' : ms >= 60000 ? Math.floor(ms/60000)+'m '+Math.round(ms%60000/1000)+'s' : Math.round((ms||0)/1000)+'s';

async function loadSites() {
  const period = document.getElementById('period').value;
  const r = await guard(await fetch('/api/sites'));
  const { sites } = await r.json();
  const el = document.getElementById('sites');
  if (!sites.length) {
    el.innerHTML = `<p class="empty">${te('No sites yet — use the “＋ New site” button to add one.')}<br>`
      + `${te('Just deployed?')} <a href="/health.html" style="color:var(--link);text-decoration:none">${te('Run the self-check ↗')}</a></p>`;
    return;
  }
  // one card per site, each showing its own overview so all sites' numbers
  // are visible at a glance on this page; click a card for the full dashboard
  el.innerHTML = '<div class="scards">' + sites.map((s) => `
    <a class="scard" href="/site.html?id=${esc(s.site_id)}" data-id="${esc(s.site_id)}">
      <div class="name">${esc(s.name)}</div>
      <div class="dom">${esc(JSON.parse(s.allowed_domains).join(', '))}</div>
      <div class="stats" id="st-${esc(s.site_id)}">
        <div class="stat"><div class="v">…</div><div class="k">${te('Pageviews')}</div></div>
        <div class="stat"><div class="v">…</div><div class="k">${te('Visitors')}</div></div>
        <div class="stat"><div class="v">…</div><div class="k">${te('Sessions')}</div></div>
      </div>
      <div class="foot"><span class="tag" title="${te('Timezone')}">🕒 ${esc(s.timezone || 'UTC')}</span><span class="tag" title="${te('Ad protection mode')}">🛡 ${te(s.adguard_mode || 'off')}</span><span class="spacer"></span><span class="tag good" id="hs-${esc(s.site_id)}"></span></div>
    </a>`).join('') + '</div>';

  // ONE request for every card. This used to be one /overview per site, and
  // /overview is a live raw scan of the whole period — a dozen sites meant a
  // dozen concurrent whole-period scans, so the grid sat on "…" for a long time
  // whenever one site was busy. /api/sites/summary reads completed days from
  // the rollups and aggregates all sites in a single pass.
  try {
    const d = await (await fetch(`/api/sites/summary?period=${period}`)).json();
    for (const o of d.sites || []) {
      const st = document.getElementById('st-' + o.site_id);
      const hs = document.getElementById('hs-' + o.site_id);
      if (!st || !hs) continue;
      const human = o.pv ? (((o.clean_count + o.suspect_count) / o.pv) * 100).toFixed(0) : 0;
      st.innerHTML = `
        <div class="stat"><div class="v">${fmt(o.pv)}</div><div class="k">${te('Pageviews')}</div></div>
        <div class="stat"${d.uv_approx ? ` title="${te('uv-approx')}"` : ''}><div class="v">${d.uv_approx ? '≈' : ''}${fmt(o.uv)}</div><div class="k">${te('Visitors')}</div></div>
        <div class="stat"><div class="v">${fmt(o.sessions)}</div><div class="k">${te('Sessions')}</div></div>`;
      hs.textContent = o.pv ? human + '% ' + t('human') : t('no data yet');
      hs.className = 'tag ' + (o.pv ? (human >= 90 ? 'good' : human >= 70 ? 'warn' : 'bad') : '');
    }
  } catch {
    document.querySelectorAll('[id^="hs-"]').forEach((el) => { el.textContent = ''; });
  }
}
// remember the sites-overview period across refreshes (default: last 24h)
(() => {
  const sel = document.getElementById('period');
  const saved = localStorage.getItem('pvuv.sitesPeriod');
  if (saved && [...sel.options].some((o) => o.value === saved)) sel.value = saved;
})();
// cross-site clean-traffic ranking (§14): self-hides with <2 sites (nothing to
// rank). "External clean" excludes bots/crawlers and mutual visits between your
// own sites, so it reflects genuinely external human traffic.
async function loadRanking() {
  const sec = document.getElementById('rankingSection');
  const period = document.getElementById('period').value;
  let sites = [];
  try { sites = ((await (await guard(await fetch(`/api/ranking?period=${period}`))).json()).sites) || []; }
  catch { sec.hidden = true; return; }
  if (sites.length < 2) { sec.hidden = true; return; }
  sec.hidden = false;
  // external/internal come from rollup_source_daily, which the hourly job
  // fills; right after deploying (or on a brand-new hour) it is empty while
  // clean_pv already has live numbers — show a dash instead of a misleading 0
  const pending = sites.every((s) => !s.external_pv && !s.internal_pv) && sites.some((s) => s.clean_pv > 0);
  const dash = `<span class="muted" title="${te('populated by the hourly rollup — check back after :05')}">—</span>`;
  const body = sites.map((s, i) => `<tr>
    <td style="color:var(--muted)">${i + 1}</td>
    <td><a href="/site.html?id=${esc(s.site_id)}">${esc(s.name)}</a></td>
    <td class="num"><b>${pending ? dash : fmt(s.external_pv)}</b></td>
    <td class="num" style="color:var(--muted)">${pending ? dash : fmt(s.internal_pv)}</td>
    <td class="num">${fmt(s.clean_pv)}</td>
    <td class="num" style="color:var(--muted)">${fmt(s.pv)}</td>
    <td class="num">${s.quality_score}%</td>
  </tr>`).join('');
  document.getElementById('ranking').innerHTML = `<table>
    <thead><tr>
      <th>#</th><th>${te('Site')}</th><th class="num">${te('External clean')}</th><th class="num">${te('Internal (mutual)')}</th>
      <th class="num">${te('Clean PV')}</th><th class="num">${te('Total PV')}</th><th class="num">${te('Human')}</th>
    </tr></thead><tbody>${body}</tbody></table>`;
}
document.getElementById('period').addEventListener('change', () => {
  localStorage.setItem('pvuv.sitesPeriod', document.getElementById('period').value);
  loadSites();
  loadRanking();
});

// --- timezones -------------------------------------------------------------
const TZ_LIST = (() => {
  try { return Intl.supportedValuesOf('timeZone'); } catch {
    return ['UTC','Asia/Shanghai','Asia/Hong_Kong','Asia/Tokyo','Asia/Singapore','Asia/Kolkata',
            'Europe/London','Europe/Paris','Europe/Berlin','America/New_York','America/Chicago',
            'America/Los_Angeles','America/Sao_Paulo','Australia/Sydney'];
  }
})();
const browserTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; } })();
const validTz = (z) => TZ_LIST.includes(z);
let userTz = 'UTC';
async function loadUserTz() {
  // searchable datalist (type to filter hundreds of zones)
  document.getElementById('tzlist').innerHTML = TZ_LIST.map((z) => `<option value="${esc(z)}"></option>`).join('');
  try {
    const me = await (await fetch('/api/me')).json();
    userTz = me.timezone || 'UTC';
    ingestHostCfg = me.ingest_host || '';
  } catch { userTz = 'UTC'; }
  if (!validTz(userTz)) userTz = 'UTC';
  // new-site form: prefill the browser's timezone (unless a non-UTC default is set),
  // so the common case needs no searching; submitting saves it for real.
  const createTz = (userTz !== 'UTC') ? userTz : (validTz(browserTz) ? browserTz : 'UTC');
  document.getElementById('tz').value = createTz;
  document.getElementById('tzDefault').value = userTz;
}
document.getElementById('tzSettings').addEventListener('submit', async (e) => {
  e.preventDefault();
  const tz = document.getElementById('tzDefault').value.trim();
  const el = document.getElementById('tzMsg');
  if (!validTz(tz)) { el.style.color = ''; el.textContent = t('pick a valid timezone from the list'); return; }
  const r = await guard(await fetch('/api/settings/timezone', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ timezone: tz }),
  }));
  if (r.ok) { userTz = tz; document.getElementById('tz').value = tz; el.style.color = 'var(--good-text)'; el.textContent = t('saved'); }
  else { el.style.color = ''; el.textContent = t('save failed'); }
});

document.getElementById('create').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    name: document.getElementById('name').value,
    domains: document.getElementById('domains').value.split(',').map((d) => d.trim()).filter(Boolean),
    adguard_mode: document.getElementById('agmode').value,
    adclient: document.getElementById('adclient').value.trim() || undefined,
    timezone: document.getElementById('tz').value,
    engaged_seconds: parseInt(document.getElementById('engaged').value, 10) || 15,
  };
  const r = await guard(await fetch('/api/sites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  const data = await r.json();
  if (!r.ok) { document.getElementById('err').textContent = data.error || t('failed'); return; }
  document.getElementById('err').textContent = '';
  // src: f.js as hosted by this console deployment (DEPLOY.md step 8);
  // data-api: ingest host, assumed in.<apex> per the reference layout —
  // deployers adjust if theirs differs (the SDK default is in.pvuv.ai).
  // ingest host comes from deployment config; the sibling-subdomain guess is
  // only a fallback for older deployments that predate INGEST_HOST
  const ingestHost = ingestHostCfg || 'in.' + location.hostname.replace(/^(www|console)\./, '');
  const attrs = [`data-site="${data.site_id}"`, `data-api="https://${ingestHost}"`];
  if (data.adguard_mode !== 'off') attrs.push(`data-adguard="${data.adguard_mode}"`);
  if (data.adclient) attrs.push(`data-adclient="${data.adclient}"`);
  document.getElementById('snippetCode').textContent =
    `<script defer src="${location.origin}/f.js"\n        ${attrs.join('\n        ')}><\/script>`;
  document.getElementById('snippet').style.display = 'block';
  loadSites();
});

document.getElementById('logout').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/login.html';
});

// apply configured branding to the header, favicon and title (console is dark,
// so the header uses the LIGHT logo; the dark logo is for light backgrounds).
function applyBranding(b) {
  const name = (b.name || '').trim() || 'pvuv.ai';
  const logo = b.logo_light || b.logo_dark;
  const brand = document.getElementById('brand');
  brand.innerHTML = logo ? `<img class="logo" src="${esc(logo)}" alt="${esc(name)}">` : esc(name);
  document.title = name + ' — Sites';
  if (b.favicon) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = b.favicon;
  }
}
async function loadHomeSettings() {
  const r = await fetch('/api/home');
  if (!r.ok) return;
  const b = await r.json();
  applyBranding(b);
  document.getElementById('hsName').value = b.name || '';
  document.getElementById('hsDomain').value = b.primary_domain || '';
  document.getElementById('hsDesc').value = b.description || '';
  document.getElementById('hsLogoLight').value = b.logo_light || '';
  document.getElementById('hsLogoDark').value = b.logo_dark || '';
  document.getElementById('hsFavicon').value = b.favicon || '';
}
document.getElementById('homeSettings').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await guard(await fetch('/api/settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: document.getElementById('hsName').value,
      primary_domain: document.getElementById('hsDomain').value,
      description: document.getElementById('hsDesc').value,
      logo_light: document.getElementById('hsLogoLight').value,
      logo_dark: document.getElementById('hsLogoDark').value,
      favicon: document.getElementById('hsFavicon').value,
    }),
  }));
  const el = document.getElementById('hsMsg');
  el.style.color = r.ok ? 'var(--good-text)' : '';
  el.textContent = r.ok ? t('saved') : t('save failed');
  if (r.ok) loadHomeSettings(); // re-apply header/favicon immediately
});

// Crawler directory (§6.6): import a public bots-and-agents catalogue so
// crawler traffic can be labelled by kind. Purely descriptive — the UI says so
// explicitly, because an import that silently changed verdicts would be a trap.
// API tokens (§10) — credentials for the CLI / MCP server / integrations.
// The plaintext exists only in this one response; the server stores an HMAC.
async function loadTokens() {
  const box = document.getElementById('tokList');
  const sel = document.getElementById('tokSite');
  // fetch the site list here rather than reusing the one loadSites() renders:
  // that one is a local, and depending on load order would leave the scope
  // picker empty whenever the panel opens first
  while (sel.options.length > 1) sel.remove(1);
  try {
    const { sites } = await (await guard(await fetch('/api/sites'))).json();
    for (const s of sites || []) {
      const o = document.createElement('option');
      o.value = s.site_id; o.textContent = s.name;
      sel.appendChild(o);
    }
  } catch { /* scope picker just stays at "All my sites" */ }
  let d;
  try { d = await (await guard(await fetch('/api/tokens'))).json(); } catch { box.textContent = ''; return; }
  const live = (d.tokens || []).filter((x) => !x.revoked_at);
  if (!live.length) { box.textContent = t('No tokens yet.'); return; }
  box.innerHTML = '<table style="width:100%;border-collapse:collapse;margin-top:4px">'
    + live.map((x) => `<tr style="border-top:1px solid var(--border)">
        <td style="padding:5px 0">${esc(x.name)}</td>
        <td style="color:var(--text-2)"><code>${esc(x.prefix)}…</code></td>
        <td>${x.site_id ? esc(x.site_id) : te('all sites')}</td>
        <td style="color:var(--muted)">${x.last_used_at ? te('used') + ' ' + esc(new Date(x.last_used_at).toISOString().slice(0, 10)) : te('never used')}</td>
        <td style="text-align:right"><button type="button" data-revoke="${esc(x.token_id)}"
          style="background:none;border:1px solid var(--bad-border);color:var(--bad);border-radius:5px;padding:2px 8px;cursor:pointer;font-size:11px">${te('Revoke')}</button></td>
      </tr>`).join('') + '</table>';
  box.querySelectorAll('[data-revoke]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(t('Revoke this token? Anything using it stops working immediately.'))) return;
    await guard(await fetch('/api/tokens?id=' + encodeURIComponent(b.dataset.revoke), { method: 'DELETE' }));
    loadTokens();
  }));
}
document.getElementById('tokenSettings').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('tokMsg');
  msg.style.color = ''; msg.textContent = '';
  const r = await guard(await fetch('/api/tokens', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: document.getElementById('tokName').value.trim(),
      site_id: document.getElementById('tokSite').value || undefined,
    }),
  }));
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { msg.textContent = d.error ? t(d.error) : t('Could not create the token.'); return; }
  document.getElementById('tokValue').textContent = d.token;
  document.getElementById('tokNew').hidden = false;
  document.getElementById('tokName').value = '';
  loadTokens();
});

// --- storage & retention -----------------------------------------------------
const mb = (x) => x >= 1024 ? (x / 1024).toFixed(2) + ' GB' : x.toFixed(1) + ' MB';
async function loadStorage() {
  const box = document.getElementById('storageState');
  box.innerHTML = `<p class="loading">${te('loading…')}</p>`;
  let d;
  try { d = await (await guard(await fetch('/api/storage'))).json(); } catch { box.innerHTML = `<p class="muted">${te('failed')}</p>`; return; }
  const r = d.retention || {};
  const win = (v) => v ? `${v} ${t('days')}` : t('keep forever');
  const rows = (d.partitions || []).slice().reverse().map((p) => `<tr><td>${esc(p.table.replace('events_', '').replace(/^(\d{4})(\d{2})$/, '$1-$2'))}</td>
      <td class="num">${fmt(p.rows)}</td><td class="num muted">${fmt(p.pulse_rows)}</td><td class="num muted">${fmt(p.bot_rows)}</td><td class="num">≈ ${mb(p.est_mb)}</td></tr>`).join('');
  box.innerHTML = `
    <div class="cards cards-4" style="margin-bottom:12px">
      <div class="card"><div class="v">≈ ${mb(d.est_total_mb)}</div><div class="k">${te('Estimated size')}</div><div class="h">${te('exact: wrangler d1 info')}</div></div>
      <div class="card"><div class="v">${fmt(d.total_events)}</div><div class="k">${te('Raw event rows')}</div><div class="h">${(d.partitions || []).length} ${te('monthly partitions')}</div></div>
      <div class="card"><div class="v">${fmt(d.sessions)}</div><div class="k">${te('Sessions')}</div><div class="h">${te('kept')} ${win(r.raw_events_days)}</div></div>
      <div class="card"><div class="v">${fmt(d.profiles)}</div><div class="k">${te('Visitor profiles')}</div><div class="h">${te('idle limit')} ${win(r.profiles_idle_days)}</div></div>
    </div>
    <table><tr><th>${te('Month')}</th><th class="num">${te('Rows')}</th><th class="num">${te('heartbeats')}</th><th class="num">${te('bot / crawler')}</th><th class="num">${te('Est. size')}</th></tr>${rows || `<tr><td colspan="5" class="muted">${te('no data yet')}</td></tr>`}</table>
    <p class="muted" style="font-size:12px;margin:10px 0 0">${te('Windows:')} ${te('raw events')} <b>${win(r.raw_events_days)}</b> · ${te('heartbeats')} <b>${win(r.pulse_events_days)}</b> · ${te('bot / crawler')} <b>${win(r.bot_events_days)}</b> · ${te('idle profiles')} <b>${win(r.profiles_idle_days)}</b>. ${te('The daily job applies them at 03:30 UTC; whole months past the raw window are dropped at once, the rest is trimmed in batches.')}</p>`;
}
document.getElementById('storageRefresh').addEventListener('click', loadStorage);
document.getElementById('storagePurge').addEventListener('click', async () => {
  const msg = document.getElementById('storageMsg'); const btn = document.getElementById('storagePurge');
  if (!confirm(t('Run the retention purge now? Raw rows outside the configured windows are deleted permanently; dashboards are unaffected.'))) return;
  btn.disabled = true; msg.style.color = ''; msg.textContent = t('purging…');
  try {
    const d = await (await guard(await fetch('/api/storage/purge', { method: 'POST' }))).json();
    msg.textContent = `${t('Done:')} ${d.dropped_partitions.length} ${t('partitions dropped')}, ${fmt(d.pulse_rows_deleted)} ${t('heartbeats')}, ${fmt(d.bot_rows_deleted)} ${t('bot / crawler')}, ${fmt(d.sessions_deleted)} ${t('sessions')}, ${fmt(d.profiles_deleted)} ${t('profiles')}${d.more_pending ? ` — ${t('more remains; run again or let the nightly job continue')}` : ''}${d.errors && d.errors.length ? ` · ${d.errors.join(' | ')}` : ''}`;
    msg.style.color = d.ok ? 'var(--good-text)' : '';
    loadStorage();
  } catch { msg.textContent = t('failed'); }
  btn.disabled = false;
});

async function loadBotdir() {
  const box = document.getElementById('botdirState');
  try {
    const d = await (await guard(await fetch('/api/settings/botdir'))).json();
    if (!d.imported) { box.textContent = t('No directory imported — crawler traffic is not categorised.'); return; }
    const cats = Object.entries(d.categories || {}).sort((a, b) => b[1] - a[1]);
    box.innerHTML = `<b>${esc(String(d.count))}</b> ${te('bots imported')}`
      + (d.skipped ? ` · ${esc(String(d.skipped))} ${te('skipped')}` : '')
      + ` · ${te('updated')} ${esc(new Date(d.updated_at).toISOString().slice(0, 16).replace('T', ' '))}<br>`
      + cats.map(([c, n]) => `${esc(c)} <span style="color:var(--text-2)">${esc(String(n))}</span>`).join(' · ');
  } catch { box.textContent = ''; }
}
document.getElementById('botdirSettings').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('botdirMsg');
  const file = document.getElementById('botdirFile').files[0];
  const pasted = document.getElementById('botdirText').value.trim();
  msg.style.color = ''; msg.textContent = '';
  let text = pasted;
  if (file) { try { text = await file.text(); } catch { msg.textContent = t('Could not read that file.'); return; } }
  if (!text) { msg.textContent = t('Choose a file or paste the JSON first.'); return; }
  let parsed;
  try { parsed = JSON.parse(text); } catch { msg.textContent = t('That is not valid JSON.'); return; }
  const r = await guard(await fetch('/api/settings/botdir', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(parsed),
  }));
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { msg.textContent = d.error ? t(d.error) : t('Import failed.'); return; }
  msg.style.color = 'var(--good-text)';
  msg.textContent = t('Imported {n} bots.').replace('{n}', d.count);
  document.getElementById('botdirText').value = '';
  document.getElementById('botdirFile').value = '';
  loadBotdir();
});
document.getElementById('botdirClear').addEventListener('click', async () => {
  const msg = document.getElementById('botdirMsg');
  await guard(await fetch('/api/settings/botdir', { method: 'DELETE' }));
  msg.style.color = ''; msg.textContent = t('Directory removed.');
  loadBotdir();
});

async function loadAiSettings() {
  const r = await fetch('/api/settings/ai');
  if (!r.ok) return;
  const a = await r.json();
  document.getElementById('aiProvider').value = a.provider || 'openai';
  document.getElementById('aiModel').value = a.model || '';
  document.getElementById('aiBaseUrl').value = a.base_url || '';
  document.getElementById('aiLang').value = a.lang || 'en';
  document.getElementById('aiKeyState').textContent = a.key_set ? t('(a key is saved — leave blank to keep it)') : t('(not set)');
}
document.getElementById('aiSettings').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await guard(await fetch('/api/settings/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      provider: document.getElementById('aiProvider').value,
      model: document.getElementById('aiModel').value,
      base_url: document.getElementById('aiBaseUrl').value,
      lang: document.getElementById('aiLang').value,
      api_key: document.getElementById('aiKey').value,
    }),
  }));
  const el = document.getElementById('aiMsg');
  const body = await r.json().catch(() => ({}));
  el.style.color = r.ok ? 'var(--good-text)' : '';
  el.textContent = r.ok ? t('saved') : (body.error || t('save failed'));
  if (r.ok) { document.getElementById('aiKey').value = ''; loadAiSettings(); }
});

// --- Cloudflare edge requests (optional) ------------------------------------
// The token itself is never returned by the API; GET only reports whether one
// is saved plus the last pull's outcome, so the field stays blank on reload and
// a blank submit means "keep the saved token, just re-check it".
function renderCfState(d) {
  const box = document.getElementById('cfState');
  document.getElementById('cfKeyState').textContent = d.token_set
    ? t('(a token is saved — leave blank to keep it)') : t('(not set)');
  if (!d.token_set) {
    box.textContent = t('Not configured — the dashboard shows only what the tracking script recorded.');
    return;
  }
  const s = d.status;
  if (!s) { box.textContent = t('Saved. The first pull runs with tonight’s daily job.'); return; }
  const when = esc(new Date(s.checked_at).toISOString().slice(0, 16).replace('T', ' '));
  if (s.error) {
    box.innerHTML = `<span style="color:var(--bad-text)">${te('Last check failed')} · ${when}</span><br>`
      + `<span style="font-family:ui-monospace,monospace">${esc(s.error)}</span>`;
    return;
  }
  box.innerHTML = `${te('Last pull')} ${when} · <b>${esc(String(s.days_written ?? 0))}</b> ${esc(window.PVI18N.tk('site-days', 'site-days'))}`
    + ` · ${esc(String(s.sites_matched ?? 0))} ${te('sites matched')} · ${esc(String(s.zones ?? 0))} ${te('zones visible')}`;
}
async function loadCfSettings() {
  try {
    const d = await (await guard(await fetch('/api/settings/cfedge'))).json();
    renderCfState(d);
  } catch { /* leave the panel as-is */ }
}
async function saveCf(token) {
  const msg = document.getElementById('cfMsg');
  msg.style.color = ''; msg.textContent = t('checking…');
  const r = await guard(await fetch('/api/settings/cfedge', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }),
  }));
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    // Cloudflare's own message, verbatim — "Authentication error" vs a missing
    // permission are different fixes and the deployer needs to know which
    msg.style.color = 'var(--bad-text)';
    msg.textContent = d.error || t('Could not verify that token.');
    return;
  }
  msg.style.color = 'var(--good-text)';
  const matched = (d.sites || []).filter((s) => s.zone);
  msg.textContent = matched.length
    ? t('Token works. Matched {n} site(s): ').replace('{n}', matched.length)
      + matched.map((s) => `${s.name} → ${s.zone}`).join(', ')
    : t('Token works, but none of your sites are on a zone it can see. Check the token’s Zone Resources.');
  document.getElementById('cfToken').value = '';
  loadCfSettings();
}
document.getElementById('cfSettings').addEventListener('submit', (e) => {
  e.preventDefault();
  saveCf(document.getElementById('cfToken').value.trim());
});
document.getElementById('cfTest').addEventListener('click', () => saveCf(''));
document.getElementById('cfClear').addEventListener('click', async () => {
  const msg = document.getElementById('cfMsg');
  await guard(await fetch('/api/settings/cfedge', { method: 'DELETE' }));
  msg.style.color = ''; msg.textContent = t('Token removed.');
  loadCfSettings();
});

// language switcher: mount, apply static labels, and re-render dynamic content
window.PVI18N.mountSelect(document.getElementById('lang'));
window.PVI18N.applyStatic();
document.addEventListener('pvuv:lang', () => {
  window.PVI18N.applyStatic();
  loadSites();
  loadRanking();
  loadAiSettings(); // refreshes the key-state hint text
  loadCfSettings();
});

loadSites();
loadRanking();
loadHomeSettings();
loadUserTz();
loadAiSettings();
loadCfSettings();

if (location.hash === '#settings') document.getElementById('btnSettings').click();
