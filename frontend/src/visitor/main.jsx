import { mount } from '../mount.jsx';
import './page.css';

function VisitorPage() {
  return <>
    <header>
      <a id="back" href="/sites.html" data-i18n="← dashboard">← dashboard</a><b id="title" data-i18n="Visitor journeys">Visitor journeys</b><span className="sub" id="siteLabel"></span>
      <div className="hdr-right">
        <select id="lang" aria-label="Language"></select>
        <select id="period" aria-label="Date range" defaultValue="30d">
          <option value="today" data-i18n="Today">Today</option>
          <option value="7d" data-i18n="Last 7 days">Last 7 days</option>
          <option value="30d" data-i18n="Last 30 days">Last 30 days</option>
          <option value="90d" data-i18n="Last 90 days">Last 90 days</option>
        </select>
      </div>
    </header>
    <main>
      {/* finder mode: recent visitors, optionally only those who opened a path / of one verdict */}
      <section id="finder" hidden>
        <h2 data-i18n="Find visitors">Find visitors</h2>
        <div className="filter">
          <input id="path" placeholder="Page path, e.g. /pay — trailing * matches a prefix (/pay*)" data-i18n-ph="Page path, e.g. /pay — trailing * matches a prefix (/pay*)" />
          <select id="verdict" aria-label="Verdict">
            <option value="" data-i18n="All verdicts">All verdicts</option>
            <option value="clean" data-i18n="clean">clean</option>
            <option value="suspect" data-i18n="suspect">suspect</option>
            <option value="bot" data-i18n="bot">bot</option>
            <option value="crawler" data-i18n="crawler">crawler</option>
          </select>
          <button id="apply" className="btn primary" data-i18n="Filter">Filter</button>
        </div>
        <p className="hint" data-i18n="Show visitors who opened a page, or only a verdict class. Click a visitor to replay the full journey.">Show visitors who opened a page, or only a verdict class. Click a visitor to replay the full journey.</p>
        <div className="panel" id="list"><p className="loading" data-i18n="loading…">loading…</p></div>
      </section>

      {/* journey mode: one visitor's trail, grouped by session, chronological */}
      <section id="journey" hidden>
        <h2 id="vidTitle" data-i18n="Journey">Journey</h2>
        <div className="cards" id="summary"></div>
        <div className="ctx" id="ctx"></div>
        <div className="evidence" id="evidence" hidden></div>
        <h2><span data-i18n="Sessions">Sessions</span> <span className="muted" id="trailNote"></span></h2>
        <div id="sessions"></div>
      </section>
    </main>
  </>;
}

mount(<VisitorPage />);
import('./controller.js');
