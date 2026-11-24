import { mount } from '../mount.jsx';
import './page.css';

function PublicPage() {
  return <>
    <header>
      <b id="siteName">…</b><span className="pub" data-i18n="public dashboard">public dashboard</span>
      <div className="hdr-right">
        <select id="period" aria-label="Date range" defaultValue="30d">
          <option value="today" data-i18n="Today">Today</option>
          <option value="7d" data-i18n="Last 7 days">Last 7 days</option>
          <option value="30d" data-i18n="Last 30 days">Last 30 days</option>
          <option value="90d" data-i18n="Last 90 days">Last 90 days</option>
          <option value="this_month" data-i18n="This month">This month</option>
          <option value="last_month" data-i18n="Last month">Last month</option>
        </select>
      </div>
    </header>
    <main id="main" hidden>
      <div className="cards" id="cards"></div>

      <h2 id="trendTitle" data-i18n="Visitors per day">Visitors per day</h2>
      <div className="panel" id="chart"></div>

      <div className="grid2">
        <div><h2 data-i18n="Top pages">Top pages</h2><div className="panel" id="pages"></div></div>
        <div><h2 data-i18n="Channels">Channels</h2><div className="panel" id="channels"></div></div>
      </div>

      <div id="vitalsSec" hidden>
        <h2 data-i18n="Web Vitals">Web Vitals</h2>
        <div className="panel" id="vitals"></div>
      </div>
    </main>
    <div className="err" id="err" hidden>
      <p><b data-i18n="This dashboard link is invalid or has been disabled.">This dashboard link is invalid or has been disabled.</b></p>
      <p className="muted" data-i18n="Ask the site owner for a fresh link.">Ask the site owner for a fresh link.</p>
    </div>
    <footer>Powered by <a href="https://pvuv.ai">pvuv.ai</a> — <span data-i18n="analytics with invalid-traffic detection">analytics with invalid-traffic detection</span></footer>
  </>;
}

mount(<PublicPage />);
import('./controller.js');
