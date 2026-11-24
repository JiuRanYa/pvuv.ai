import { DashboardHeader, DetailTabs, FilterMenu, ReportPanels } from './components.jsx';
import { mount } from '../mount.jsx';
import './page.css';
import './dashboard.css';

function SitePage() {
  return <>
    <DashboardHeader />

    <div className="site-toolbar">
      <div className="switcher" id="switcher">
        <button className="title-btn" id="titleBtn" aria-controls="switchPop" aria-expanded="false">
          <span className="site-initial" aria-hidden="true" id="siteInitial">·</span><span id="titleText">…</span><span className="caret">▾</span>
        </button>
        <div className="switch-pop" id="switchPop" hidden>
          <ul id="switchList"></ul>
        </div>
      </div>
      <a className="rt" id="visitorsLink" href="#" data-i18n-title="visitors →"><span id="realtime"><span data-i18n="Visitors">Visitors</span></span></a>
      <FilterMenu />
      <select id="period" aria-label="Date range" defaultValue="today">
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
      <details className="site-tools"><summary className="btn" data-i18n-title="Settings">⋮</summary>
      <div className="site-actions">
      <nav aria-label="Reports"><ul id="secnav"></ul></nav>
      <button id="embedBtn" className="btn" title="The tracking snippet for this site" data-i18n-title="The tracking snippet for this site">&lt;/&gt; <span data-i18n="Embed code">Embed code</span></button>
      <button id="shareBtn" className="btn" title="Read-only public dashboard link">🔗 <span data-i18n="Share link">Share link</span></button>
      <button id="dlBtn" className="btn" title="Download all data for the selected range as JSON">⬇ <span data-i18n="Download data">Download data</span></button>
      </div></details>
    </div>
    <main>

      {/* first-run state: shown instead of the dashboard until the site has recorded a single event */}
      <section className="onboard panel" id="onboard" hidden>
        <h2 style={{"margin": "0 0 6px", "color": "var(--text)"}} data-i18n="Waiting for the first visit">Waiting for the first visit</h2>
        <p className="muted" style={{"margin": "0 0 14px"}} data-i18n="onboard-help">This site has not recorded any event yet. Add the snippet below to every page (before <code>&lt;/head&gt;</code> or at the end of <code>&lt;body&gt;</code>), open your site once, and this page switches to the dashboard by itself.</p>
        <pre id="onboardSnippet"></pre>
        <div className="actions" style={{"display": "flex", "gap": "8px", "flexWrap": "wrap", "alignItems": "center", "marginTop": "12px"}}>
          <button className="btn" id="onboardCopy" data-i18n="Copy snippet">Copy snippet</button>
          <a className="btn" href="/health.html" data-i18n="Run self-check ↗">Run self-check ↗</a>
          <span className="loading" id="onboardProbe" data-i18n="listening for events…">listening for events…</span>
        </div>
        <p className="muted" style={{"fontSize": "12px", "margin": "14px 0 0"}} data-i18n="onboard-note">The snippet is the same one the site list shows after creation. <b>data-api</b> must be your ingest host; <b>data-adguard</b> only matters if you protect ads.</p>
      </section>
      <div className="shadow-banner" id="shadowBanner" hidden></div>
      <div className="filters" id="filters"></div>
      <div className="cards cards-4" id="cards"></div>

      <section className="sec" data-sec="overview" hidden>
      <div className="chart-head">
        <h2 id="chartTitle">Pageviews</h2>
        <div className="chart-ctrls">
          <select id="metric" aria-label="Metric"></select>
          <select id="interval" aria-label="Interval"></select>
        </div>
      </div>
      <div className="panel" id="chart"></div>

      </section>

      <ReportPanels />
      <div id="detailCard" className="detail-card"><DetailTabs />
      <section className="sec" data-sec="vitals" hidden>
      <div id="vitalsSec" hidden>
        <h2 data-i18n="Web Vitals">Web Vitals</h2>
        <div className="panel" id="vitals"></div>
      </div>

        <p className="muted" id="vitalsEmpty" hidden data-i18n="no data yet">no data yet</p>
      </section>

      <section className="sec" data-sec="campaigns" hidden>
      <div className="chart-head">
        <h2 data-i18n="Campaigns (UTM)">Campaigns (UTM)</h2>
        <div className="chart-ctrls">
          <select id="utmDim" aria-label="UTM dimension">
            <option value="utm_campaign" data-i18n="Campaign">Campaign</option>
            <option value="utm_medium" data-i18n="Medium">Medium</option>
            <option value="utm_term" data-i18n="Term">Term</option>
            <option value="utm_content" data-i18n="Content">Content</option>
            <option value="ft_source" data-i18n="FT source">FT source</option>
            <option value="ft_medium" data-i18n="FT medium">FT medium</option>
            <option value="ft_campaign" data-i18n="FT campaign">FT campaign</option>
          </select>
        </div>
      </div>
      <div className="panel" id="utm"></div>

      </section>

      <section className="sec" data-sec="goals" hidden>
      <div id="goalsSection" hidden>
        <h2 data-i18n="Goals (custom events)">Goals (custom events)</h2>
        <div className="panel" id="goals"></div>
      </div>
      <div id="ctitSection" hidden>
        <h2 data-i18n="Conversion timing">Conversion timing</h2>
        <div className="panel" id="ctit"></div>
      </div>

        <p className="muted" id="goalsEmpty" hidden data-i18n="no data yet">no data yet</p>
      </section>

      <section className="sec" data-sec="funnel" hidden>
      <div className="chart-head">
        <h2 data-i18n="Funnel">Funnel</h2>
        <div className="chart-ctrls">
          <select id="funnelPick" aria-label="Saved funnels"></select>
          <select id="funnelSeg" aria-label="Break down by">
            <option value="" data-i18n="No breakdown">No breakdown</option>
            <option value="source" data-i18n="By source">By source</option>
            <option value="country" data-i18n="By country">By country</option>
            <option value="device" data-i18n="By device">By device</option>
            <option value="browser" data-i18n="By browser">By browser</option>
            <option value="os" data-i18n="By OS">By OS</option>
          </select>
          <button id="funnelAdd" className="btn" data-i18n="+ step">+ step</button>
          <button id="funnelRun" className="btn primary" data-i18n="Run">Run</button>
        </div>
      </div>
      <p className="sec-desc" data-i18n="Clean traffic only — bots and crawlers never enter a funnel. Each drop shows what the people who left were doing on that step.">Clean traffic only — bots and crawlers never enter a funnel. Each drop shows what the people who left were doing on that step.</p>
      <div className="panel">
        <div id="funnelSteps"></div>
        <div className="fname-row">
          <input id="funnelName" maxLength="60" placeholder="Funnel name" data-i18n-ph="Funnel name" />
          <button id="funnelSave" className="btn" data-i18n="Save funnel">Save funnel</button>
          <button id="funnelDel" className="btn danger" hidden data-i18n="Delete">Delete</button>
          <span className="muted" id="funnelMsg" style={{"fontSize": "12px"}}></span>
        </div>
        <div id="funnelResult"></div>
      </div>

      </section>

      <section className="sec" data-sec="quality" hidden>
      <h2 data-i18n="Traffic quality">Traffic quality</h2>
      <p className="sec-desc" data-i18n="How much of this range's traffic was invalid, which checks caught it, and how close each ratio is to its alert line.">How much of this range's traffic was invalid, which checks caught it, and how close each ratio is to its alert line.</p>
      <div className="panel" id="health"></div>
      <div className="grid2">
        <div className="panel" id="quality"></div>
        <div className="panel" id="flags"></div>
      </div>
      <div id="crawlerSec" hidden><div className="sec-head"><h2 data-i18n="Crawlers by category">Crawlers by category</h2></div><div className="panel" id="crawlers"></div></div>
      <div id="edgeSec" hidden><div className="sec-head"><h2 data-i18n="What the script never saw">What the script never saw</h2></div><div className="panel" id="edge"></div></div>

      </section>

      <section className="sec" data-sec="adguard" hidden>
      <h2 data-i18n="Ad protection">Ad protection</h2>
      <div className="panel" id="adguard"></div>

      </section>

      <section className="sec" data-sec="suspicious" hidden>
      <div className="sec-head"><h2 data-i18n="Suspicious visitors">Suspicious visitors</h2><a className="all-btn" id="trafficAll" href="#" data-i18n="All visitors →">All visitors →</a></div>
      <p className="sec-desc" data-i18n="Visitors whose bot score reached 30 or more in this range, worst first — click one to replay its journey.">Visitors whose bot score reached 30 or more in this range, worst first — click one to replay its journey.</p>
      <div className="panel" id="traffic"></div>

      </section>

      <section className="sec" data-sec="ai" hidden>
      <div className="chart-head">
        <h2 data-i18n="AI report">AI report</h2>
        <div className="chart-ctrls">
          <button id="aiGen" className="btn primary" data-i18n="Generate">Generate</button>
        </div>
      </div>
      <div className="panel" id="aiReport"></div>
      </section>

      </div>
    </main>

    <div className="modal" id="modal" hidden>
      <div className="modal-box">
        <div className="modal-head"><b id="modalTitle"></b><button className="modal-x" id="modalClose" aria-label="Close">×</button></div>
        <div className="modal-body" id="modalBody"></div>
      </div>
    </div>
  </>;
}

mount(<SitePage />);
import('./controller.js');
