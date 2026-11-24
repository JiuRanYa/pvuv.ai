import { mount } from '../mount.jsx';
import './page.css';

function HealthPage() {
  return <>
    <header><a href="/sites.html">← console</a><b>Deployment self-check</b></header>
    <main className="narrow">
      <p className="lead">This runs each part of your deployment end to end and tells you what works and what to fix. Nothing here touches your real sites' data — the live test uses a hidden <code>__pvuv_selftest</code> site.</p>

      <div className="step">
        <h2>1 · Environment</h2>
        <p className="hint">Database, schema/migrations, secrets, scoring config, and KV — checked on the server.</p>
        <div id="env"><div className="row"><span className="ico pending">•</span><div className="body"><span className="detail">not run yet</span></div></div></div>
      </div>

      <div className="step">
        <h2>2 · Ingest endpoint</h2>
        <p className="hint">Where your <code>f.js</code> sends events. Default is <code>in.&lt;your-domain&gt;</code> — change it if your ingest host differs.</p>
        <label className="small">Ingest base URL</label>
        <input id="ingestUrl" placeholder="https://in.example.com" />
        <div id="ingest" style={{"marginTop": "10px"}}></div>
      </div>

      <div className="step">
        <h2>3 · End-to-end event flow</h2>
        <p className="hint">Sends a real test event to the ingest endpoint, then waits for it to appear in the database — proving ingest → Queue → consumer → D1, plus server-side enrichment and bot scoring.</p>
        <div id="e2e"></div>
      </div>

      <div className="step">
        <h2>4 · Fast verdict (/v)</h2>
        <p className="hint">The ad-load decision endpoint used by adguard.</p>
        <div id="verdict"></div>
      </div>

      <div id="summary"></div>
      <p><button id="run" className="btn primary" style={{"minHeight": "38px", "padding": "8px 18px"}}>Run self-check</button></p>
      <p className="kv">Trouble? See the <a className="doc" href="https://github.com/qiayue/pvuv.ai/blob/main/DEPLOY.md#troubleshooting">deployment troubleshooting guide</a>.</p>
    </main>
  </>;
}

mount(<HealthPage />);
import('./controller.js');
