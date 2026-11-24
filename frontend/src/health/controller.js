const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ICON = { ok: '✓', warn: '!', fail: '✕', pending: '•' };
let worst = 'ok';
const worse = (a, b) => (['ok','warn','fail'].indexOf(b) > ['ok','warn','fail'].indexOf(a) ? b : a);

function rowHtml(status, label, detail, fix) {
  return `<div class="row"><span class="ico ${status}">${ICON[status]}</span><div class="body">
    <div class="label">${esc(label)}</div>
    <div class="detail">${esc(detail)}</div>
    ${fix ? `<div class="fix">→ ${esc(fix)}</div>` : ''}
  </div></div>`;
}
function setRows(el, rows) { $(el).innerHTML = rows.join('') || '<div class="row"><span class="detail">—</span></div>'; }

async function guard(r) { if (r.status === 401) { location.href = '/login.html'; throw new Error('auth'); } return r; }
// production: in.<apex>; local wrangler dev has no subdomains — point at the
// ingest worker's default dev port instead of a nonsensical "in.127.0.0.1"
const defaultIngest = () => /^(localhost|127\.0\.0\.1|\[::1\]|\d+\.\d+\.\d+\.\d+)$/.test(location.hostname)
  ? `http://${location.hostname}:8787`
  : `https://in.${location.hostname.replace(/^(www|console)\./, '')}`;

async function run() {
  worst = 'ok';
  $('run').disabled = true;
  $('summary').innerHTML = '';

  // step 1 — environment
  setRows('env', [rowHtml('pending', 'Checking…', '')]);
  let checks = [];
  try {
    checks = (await (await guard(await fetch('/api/diagnostics'))).json()).checks;
  } catch (e) { setRows('env', [rowHtml('fail', 'Could not run server checks', String(e))]); }
  setRows('env', checks.map((c) => { worst = worse(worst, c.status); return rowHtml(c.status, c.label, c.detail, c.fix); }));

  // step 2 — ingest reachability + ensure self-test site
  const ingest = ($('ingestUrl').value || defaultIngest()).replace(/\/+$/, '');
  $('ingestUrl').value = ingest;
  let selftest;
  try {
    selftest = await (await guard(await fetch('/api/diagnostics/selftest-site', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ host: location.hostname }),
    }))).json();
  } catch (e) { setRows('ingest', [rowHtml('fail', 'Could not create self-test site', String(e))]); $('run').disabled = false; return; }

  const marker = 'diag-' + Date.now() + '-' + Math.floor(performance.now());
  const testEvent = { s: selftest.site_id, e: 'pageview', u: location.origin + '/__pvuv_selftest', vid: marker, sid: marker, sw: screen.width, sh: screen.height, lang: navigator.language, ts: Date.now() };

  let ingestReachable = false;
  try {
    const r = await fetch(ingest + '/in', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(testEvent) });
    ingestReachable = r.status === 204;
    setRows('ingest', [rowHtml(ingestReachable ? 'ok' : 'fail',
      `POST ${ingest}/in`,
      ingestReachable ? 'reachable, test event accepted (204)' : `unexpected status ${r.status}`,
      ingestReachable ? undefined : 'Confirm the ingest worker is deployed and its route points at this host. Check DNS (proxied) for the ingest subdomain.')]);
  } catch (e) {
    setRows('ingest', [rowHtml('fail', `POST ${ingest}/in`, 'not reachable: ' + e,
      'Deploy the ingest worker and bind its route; verify the ingest URL above and its DNS record (proxied).')]);
  }
  worst = worse(worst, ingestReachable ? 'ok' : 'fail');

  // step 3 — end-to-end: poll until the event lands in D1
  if (ingestReachable) {
    setRows('e2e', [rowHtml('pending', 'Waiting for the test event to reach the database…', 'ingest → Queue → consumer → D1')]);
    let found = null;
    for (let i = 0; i < 12 && !found; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const res = await (await guard(await fetch(`/api/diagnostics/probe?site=${selftest.site_id}&vid=${encodeURIComponent(marker)}`))).json();
        if (res.found) found = res.row;
      } catch { /* keep polling */ }
    }
    if (found) {
      setRows('e2e', [
        rowHtml('ok', 'End-to-end flow works', 'the test event was ingested, scored, and stored'),
        rowHtml('ok', 'Server-side enrichment', `country=${found.country ?? '–'}, browser=${found.browser ?? '–'}/${found.os ?? '–'}, network=${found.asn_type ?? '–'}`),
        rowHtml('ok', 'Bot scoring', `score=${found.bot_score}, verdict=${found.verdict}, stage=${found.score_stage}`),
      ]);
    } else {
      worst = worse(worst, 'fail');
      setRows('e2e', [rowHtml('fail', 'Test event never reached the database',
        'ingest accepted it but it did not appear within ~18s',
        'The Queue or consumer may be misconfigured. Confirm the pvuv-ingest queue exists, the consumer worker is deployed and bound to it, and DB ids match across workers.')]);
    }
  } else {
    setRows('e2e', [rowHtml('pending', 'Skipped', 'ingest endpoint was not reachable')]);
  }

  // step 4 — /v fast verdict
  try {
    const r = await fetch(ingest + '/v', { method: 'POST', headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ s: selftest.site_id, vid: marker, sid: marker, sw: screen.width, sh: screen.height, lang: navigator.language, i: 0 }) });
    const v = await r.json();
    const okv = r.ok && typeof v.v === 'string' && (v.ok === 0 || v.ok === 1);
    setRows('verdict', [rowHtml(okv ? 'ok' : 'fail', `POST ${ingest}/v`,
      okv ? `verdict=${v.v}, load ads=${v.ok ? 'yes' : 'no'}` : `unexpected response (status ${r.status})`,
      okv ? undefined : 'Confirm the ingest worker (which also serves /v) is deployed with HMAC_KEY set.')]);
    worst = worse(worst, okv ? 'ok' : 'fail');
  } catch (e) {
    worst = worse(worst, 'fail');
    setRows('verdict', [rowHtml('fail', `POST ${ingest}/v`, 'not reachable: ' + e)]);
  }

  // summary
  $('summary').innerHTML = worst === 'fail'
    ? `<div class="summary bad">Some checks failed — see the → fixes above.</div>`
    : worst === 'warn'
    ? `<div class="summary good">Core flow works. A few warnings above are non-blocking (e.g. rollups run hourly).</div>`
    : `<div class="summary good">All good — your deployment is fully working. 🎉</div>`;
  $('run').disabled = false;
}

$('ingestUrl').value = defaultIngest();
$('run').addEventListener('click', run);
// make sure we're logged in before showing anything actionable
fetch('/api/me').then((r) => { if (r.status === 401) location.href = '/login.html'; });
