import { mount } from '../mount.jsx';
import './page.css';

function SitesPage() {
  return <>
    <header>
      <span className="brand" id="brand">pvuv.ai</span>
      <div className="hdr-right">
        <select id="lang" aria-label="Language"></select>
        <a href="/health.html" id="selfcheckLink" className="btn" data-i18n="Self-check">Self-check</a>
        <button id="logout" className="btn" data-i18n="Sign out">Sign out</button>
      </div>
    </header>
    <main>
      <div className="head">
        <h2 data-i18n="Your sites">Your sites</h2>
        <div className="toolbar">
          <select id="period" aria-label="Date range" defaultValue="24h">
            <optgroup label="Rolling" data-i18n-label="Rolling">
              <option value="24h" data-i18n="Last 24 hours">Last 24 hours</option>
              <option value="today" data-i18n="Today">Today</option>
              <option value="7d" data-i18n="Last 7 days">Last 7 days</option>
              <option value="30d" data-i18n="Last 30 days">Last 30 days</option>
              <option value="90d" data-i18n="Last 90 days">Last 90 days</option>
            </optgroup>
            <optgroup label="Calendar" data-i18n-label="Calendar">
              <option value="yesterday" data-i18n="Yesterday">Yesterday</option>
              <option value="this_week" data-i18n="This week">This week</option>
              <option value="last_week" data-i18n="Last week">Last week</option>
              <option value="this_month" data-i18n="This month">This month</option>
              <option value="last_month" data-i18n="Last month">Last month</option>
              <option value="this_year" data-i18n="This year">This year</option>
            </optgroup>
          </select>
          <button className="btn primary" id="btnAdd">＋ <span data-i18n="New site">New site</span></button>
          <button className="btn icon" id="btnSettings" title="Settings" data-i18n-title="Settings" aria-label="Settings">⚙</button>
        </div>
      </div>
      <div id="sites"><p className="loading" data-i18n="loading…">loading…</p></div>

      <section id="rankingSection" hidden style={{"marginTop": "24px"}}>
        <div className="head">
          <h2 data-i18n="Site ranking · clean traffic">Site ranking · clean traffic</h2>
          <span style={{"fontSize": "12px", "color": "var(--muted)"}} data-i18n="ranking-help">Ranked by external clean pageviews — bots &amp; crawlers excluded, mutual visits between your own sites don't count.</span>
        </div>
        <div className="panel" id="ranking"><p className="loading" data-i18n="loading…">loading…</p></div>
      </section>

      <datalist id="tzlist"></datalist>

      <section className="panel form" id="addPanel" hidden>
        <div className="phead"><h3 data-i18n="Add a site">Add a site</h3><button className="close" data-close="addPanel" aria-label="Close">×</button></div>
        <form className="create" id="create">
          <div><label><span data-i18n="Site name">Site name</span><input id="name" required placeholder="My Blog" data-i18n-ph="My Blog" /></label></div>
          <div><label><span data-i18n="Domains (comma-separated)">Domains (comma-separated)</span><input id="domains" required placeholder="example.com, www.example.com" /></label></div>
          <div><label><span data-i18n="Ad protection mode">Ad protection mode</span>
            {/* values are the stored modes; labels say what each BLOCKS, in ascending
                 strength, because "loose" blocks more than "balanced" (see site.html) */}
            <select id="agmode">
              <option value="off" data-i18n="Off">Off</option>
              <option value="balanced" data-i18n="Balanced — bots &amp; crawlers">Balanced — bots &amp; crawlers</option>
              <option value="loose" data-i18n="Aggressive — everything not clean">Aggressive — everything not clean</option>
              <option value="strict" data-i18n="Strictest — clean + interacted">Strictest — clean + interacted</option>
            </select></label></div>
          <div><label><span data-i18n="AdSense client (optional)">AdSense client (optional)</span><input id="adclient" placeholder="ca-pub-1234567890123456" /></label></div>
          <div><label><span data-i18n="Timezone">Timezone</span> <span style={{"color": "#e0a34a"}} data-i18n="(can't be changed later)">(can't be changed later)</span>
            <input id="tz" list="tzlist" autoComplete="off" placeholder="Search timezone…" data-i18n-ph="Search timezone…" /></label></div>
          <div><label><span data-i18n="Engagement threshold (seconds)">Engagement threshold (seconds)</span>
            <input id="engaged" type="number" min="1" max="300" defaultValue="15" placeholder="15" />
            <span style={{"color": "var(--muted)", "fontSize": "12px"}}>a visit is "engaged" (not a bounce) after this dwell time. GA4 default 10s; we default 15s.</span>
          </label></div>
          <p className="err" id="err"></p>
          <button type="submit" data-i18n="Create site">Create site</button>
        </form>
        <div className="snippet" id="snippet">
          <b data-i18n="Site created — embed this snippet:">Site created — embed this snippet:</b>
          <pre id="snippetCode"></pre>
          <p style={{"color": "var(--muted)", "fontSize": "12px", "margin": "8px 0 0"}}>
            data-api must point at your ingest host — adjust it if yours is not
            in.&lt;your-domain&gt;. See DEPLOY.md.
          </p>
        </div>
      </section>

      <section className="panel form" id="homePanel" hidden>
        <div className="phead"><h3 data-i18n="Site & branding">Site &amp; branding</h3><button className="close" data-close="homePanel" aria-label="Close">×</button></div>
        <form className="create" id="homeSettings">
          <div><label><span data-i18n="Brand name (header + homepage)">Brand name (header + homepage)</span><input id="hsName" maxLength="100" placeholder="PVUV.ai" /></label></div>
          <div><label><span data-i18n="Primary domain">Primary domain</span><input id="hsDomain" maxLength="120" placeholder="www.example.com" /></label></div>
          <div className="full"><label><span data-i18n="Description">Description</span><input id="hsDesc" maxLength="500" placeholder="This site runs a self-hosted analytics instance." /></label></div>
          <div><label><span data-i18n="Logo — light (for dark backgrounds)">Logo — light (for dark backgrounds)</span><input id="hsLogoLight" maxLength="500" placeholder="/logo-light.svg or https://…" /></label></div>
          <div><label><span data-i18n="Logo — dark (for light backgrounds)">Logo — dark (for light backgrounds)</span><input id="hsLogoDark" maxLength="500" placeholder="/logo-dark.svg or https://…" /></label></div>
          <div className="full"><label><span data-i18n="Favicon">Favicon</span><input id="hsFavicon" maxLength="500" placeholder="/favicon.ico or https://…" /></label></div>
          <p className="err" id="hsMsg"></p>
          <button type="submit" data-i18n="Save">Save</button>
        </form>
        <p style={{"margin": "14px 0 0", "fontSize": "12.5px", "color": "var(--muted)", "borderTop": "1px solid var(--border)", "paddingTop": "12px"}}>
          <span data-i18n="logo-help">Logos/favicon can be URLs or files you place in <code>workers/console/public/</code>.
          The console header (dark) uses the light logo.</span> · <a href="/health.html" style={{"color": "var(--link)", "textDecoration": "none"}} data-i18n="Run self-check ↗">Run self-check ↗</a>
        </p>
        <form className="create" id="tzSettings" style={{"marginTop": "16px", "borderTop": "1px solid var(--border)", "paddingTop": "16px"}}>
          <div className="full"><label><span data-i18n="Default timezone for new sites">Default timezone for new sites</span>
            <input id="tzDefault" list="tzlist" autoComplete="off" placeholder="Search timezone…" data-i18n-ph="Search timezone…" /></label></div>
          <p className="err" id="tzMsg"></p>
          <button type="submit" data-i18n="Save default timezone">Save default timezone</button>
        </form>
        <form className="create" id="aiSettings" style={{"marginTop": "16px", "borderTop": "1px solid var(--border)", "paddingTop": "16px"}}>
          <div className="full" style={{"marginBottom": "4px"}}><strong style={{"fontSize": "13px", "color": "var(--text-2)"}} data-i18n="AI analysis reports">AI analysis reports</strong>
            <span style={{"fontSize": "12px", "color": "var(--muted)"}} data-i18n="ai-help"> — used on each site's dashboard to generate a written summary.</span></div>
          <div><label><span data-i18n="Provider (API format)">Provider (API format)</span>
            <select id="aiProvider">
              <option value="openai" data-i18n="OpenAI-compatible">OpenAI-compatible</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select></label></div>
          <div><label><span data-i18n="Model name">Model name</span><input id="aiModel" maxLength="120" placeholder="gpt-4o-mini / claude-opus-4-8" /></label></div>
          <div className="full"><label><span data-i18n="API base URL">API base URL</span> <span style={{"color": "var(--muted)"}} data-i18n="(optional — blank uses the provider default)">(optional — blank uses the provider default)</span>
            <input id="aiBaseUrl" maxLength="300" placeholder="https://api.openai.com/v1 or https://api.anthropic.com" /></label></div>
          <div><label><span data-i18n="API key">API key</span> <span id="aiKeyState" style={{"color": "var(--muted)"}}></span>
            <input id="aiKey" type="password" maxLength="300" autoComplete="off" placeholder="sk-…" /></label></div>
          <div><label><span data-i18n="Report language">Report language</span>
            <select id="aiLang"><option value="en">English</option><option value="zh">中文</option></select></label></div>
          <p className="err" id="aiMsg"></p>
          <button type="submit" data-i18n="Save AI settings">Save AI settings</button>
        </form>
        <form className="create" id="tokenSettings" style={{"marginTop": "16px", "borderTop": "1px solid var(--border)", "paddingTop": "16px"}}>
          <div className="full" style={{"marginBottom": "4px"}}><strong style={{"fontSize": "13px", "color": "var(--text-2)"}} data-i18n="API tokens">API tokens</strong>
            <span style={{"fontSize": "12px", "color": "var(--muted)"}} data-i18n="token-help"> — read-only credentials for the CLI, the MCP server (so your own chatbot can query this data) and other integrations. Shown once at creation.</span></div>
          <div><label><span data-i18n="Token name">Token name</span><input id="tokName" maxLength="60" placeholder="Claude Desktop" /></label></div>
          <div><label><span data-i18n="Scope">Scope</span>
            <select id="tokSite"><option value="" data-i18n="All my sites">All my sites</option></select></label></div>
          <p className="err" id="tokMsg"></p>
          <div className="full" id="tokNew" hidden style={{"background": "var(--surface-2)", "border": "1px solid var(--good-border)", "borderRadius": "8px", "padding": "12px", "marginBottom": "4px"}}>
            <div style={{"fontSize": "12px", "color": "var(--good-text)", "marginBottom": "6px"}} data-i18n="Copy it now — it cannot be shown again.">Copy it now — it cannot be shown again.</div>
            <code id="tokValue" style={{"fontSize": "12.5px", "wordBreak": "break-all", "color": "var(--text)"}}></code>
          </div>
          <div className="full" id="tokList" style={{"fontSize": "12px", "color": "var(--muted)"}}></div>
          <button type="submit" data-i18n="Create token">Create token</button>
        </form>
        <form className="create" id="botdirSettings" style={{"marginTop": "16px", "borderTop": "1px solid var(--border)", "paddingTop": "16px"}}>
          <div className="full" style={{"marginBottom": "4px"}}><strong style={{"fontSize": "13px", "color": "var(--text-2)"}} data-i18n="Crawler directory">Crawler directory</strong>
            <span style={{"fontSize": "12px", "color": "var(--muted)"}} data-i18n="botdir-help"> — optional. Import a public bots-and-agents catalogue to label crawler traffic by kind (search / AI training / SEO / ads). Classification only: it never changes scoring, verdicts or ad protection.</span></div>
          <div className="full"><label><span data-i18n="Directory JSON file">Directory JSON file</span>
            <input id="botdirFile" type="file" accept=".json,application/json" /></label></div>
          <div className="full"><label><span data-i18n="…or paste the JSON">…or paste the JSON</span>
            <textarea id="botdirText" rows="4" style={{"font": "12px/1.4 var(--mono)"}} placeholder='[{"name":"Googlebot","category":"Search"}, …]'></textarea></label></div>
          <p className="err" id="botdirMsg"></p>
          <div className="full" id="botdirState" style={{"fontSize": "12px", "color": "var(--muted)"}}></div>
          <div className="actions"><button type="submit" data-i18n="Import directory">Import directory</button>
          <button type="button" id="botdirClear" className="danger" data-i18n="Remove">Remove</button></div>
        </form>
        <form className="create" id="cfSettings" style={{"marginTop": "16px", "borderTop": "1px solid var(--border)", "paddingTop": "16px"}}>
          <div className="full" style={{"marginBottom": "4px"}}><strong style={{"fontSize": "13px", "color": "var(--text-2)"}} data-i18n="Cloudflare edge requests">Cloudflare edge requests</strong>
            <span style={{"fontSize": "12px", "color": "var(--muted)"}} data-i18n="cf-help"> — optional, advanced. The tracking script only sees visitors whose browser ran JavaScript. AI crawlers and scrapers fetch your HTML and leave, so they never appear. Cloudflare saw all of them: add a read-only API token and the daily job pulls those request counts, so your dashboard can show what the script missed. Leave it empty and nothing changes.</span></div>
          <div className="full helpbox" style={{"marginBottom": "4px"}}>
            <span data-i18n="cf-steps">In the Cloudflare dashboard: <b>My Profile → API Tokens → Create Token → Create Custom Token</b>. Give it exactly these two permissions, both read-only:</span>
            <div style={{"margin": "6px 0 6px 0", "fontFamily": "ui-monospace,monospace", "color": "var(--text-2)"}}>Zone · Zone · Read<br />Zone · Analytics · Read</div>
            <span data-i18n="cf-steps2">Under <i>Zone Resources</i> choose the zones your sites are on (or all zones in the account), then create the token and paste it below.</span>
            <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" style={{"color": "var(--link)", "textDecoration": "none", "display": "inline-block", "marginTop": "6px"}} data-i18n="Open Cloudflare API Tokens ↗">Open Cloudflare API Tokens ↗</a>
          </div>
          <div className="full"><label><span data-i18n="Cloudflare API token">Cloudflare API token</span> <span id="cfKeyState" style={{"color": "var(--muted)"}}></span>
            <input id="cfToken" type="password" maxLength="200" autoComplete="off" placeholder="••••••••••••••••" /></label></div>
          <p className="err" id="cfMsg"></p>
          <div className="full" id="cfState" style={{"fontSize": "12px", "color": "var(--muted)"}}></div>
          <div className="actions"><button type="submit" data-i18n="Save & check">Save &amp; check</button>
          <button type="button" id="cfTest" data-i18n="Re-check">Re-check</button>
          <button type="button" id="cfClear" className="danger" data-i18n="Remove">Remove</button></div>
        </form>
        <form className="create" id="storageSettings" style={{"marginTop": "16px", "borderTop": "1px solid var(--border)", "paddingTop": "16px"}} onSubmit={e => e.preventDefault()}>
          <div className="full" style={{"marginBottom": "4px"}}><strong style={{"fontSize": "13px", "color": "var(--text-2)"}} data-i18n="Storage & retention">Storage &amp; retention</strong>
            <span style={{"fontSize": "12px", "color": "var(--muted)"}} data-i18n="storage-help"> — raw event rows are what fills the D1 database (roughly 0.8 KB each with indexes; a pageview produces several once behavior heartbeats are counted). Dashboards read from rollups that are kept forever; the windows below only decide how far back visitor journeys and the suspicious-visitor drill-down reach. Set them in <code>config.local.toml [retention]</code>, then redeploy the cron and console workers.</span></div>
          <div className="full" id="storageState"><p className="loading" data-i18n="loading…">loading…</p></div>
          <div className="actions"><button type="button" id="storagePurge" data-i18n="Run purge now">Run purge now</button>
            <button type="button" id="storageRefresh" data-i18n="Refresh">Refresh</button></div>
          <p className="err" id="storageMsg"></p>
        </form>
      </section>
    </main>
  </>;
}

mount(<SitesPage />);
import('./controller.js');
