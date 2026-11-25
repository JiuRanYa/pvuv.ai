import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Play, RefreshCw, XCircle } from 'lucide-react';
import { api, withBase } from '../lib/api';
import type { DiagnosticCheck } from '../lib/types';
import { useI18n } from '../lib/i18n';
import { Navbar } from '../components/Navbar';

interface LiveStep {
  label: string;
  status: 'idle' | 'running' | 'pass' | 'fail';
  detail?: string;
}

export function HealthPage() {
  const { lang, t } = useI18n();
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [liveSteps, setLiveSteps] = useState<LiveStep[]>([]);

  const loadChecks = async () => {
    setLoading(true);
    try {
      const res = await api.diagnostics();
      setChecks(res.checks ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChecks();
  }, []);

  const runLiveTest = async () => {
    setTesting(true);
    const steps: LiveStep[] = [
      { label: lang === 'zh' ? '1. 加载 /f.js 埋点脚本' : '1. Fetch /f.js SDK loader', status: 'running' },
      { label: lang === 'zh' ? '2. 准备自检站点白名单' : '2. Provision self-test site', status: 'idle' },
      { label: lang === 'zh' ? '3. 向 /in 上报实时测试事件' : '3. Send live beacon to /in', status: 'idle' },
      { label: lang === 'zh' ? '4. 验证数据库落盘可读' : '4. Verify DB persistence probe', status: 'idle' },
    ];
    setLiveSteps([...steps]);

    const update = (idx: number, patch: Partial<LiveStep>) => {
      steps[idx] = { ...steps[idx], ...patch };
      setLiveSteps([...steps]);
    };

    try {
      // Step 1: /f.js
      const rSdk = await fetch(withBase('/f.js'));
      if (!rSdk.ok) throw new Error(`/f.js returned HTTP ${rSdk.status}`);
      const txt = await rSdk.text();
      update(0, { status: 'pass', detail: `${(txt.length / 1024).toFixed(1)} KB` });

      // Step 2: selftest-site
      update(1, { status: 'running' });
      const st = await api.selftestSite(window.location.hostname);
      update(1, { status: 'pass', detail: `site_id=${st.site_id} (${st.host})` });

      // Step 3: POST /in
      update(2, { status: 'running' });
      const vid = `selftest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const { ingest_host } = await api.me();
      const rIn = await fetch(`https://${ingest_host}/in`, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: JSON.stringify(
          {
            s: st.site_id,
            e: 'pageview',
            u: window.location.href,
            vid,
            sid: `s_${Date.now()}`,
            hi: 1,
            hp: 1,
            ts: Date.now(),
          }
        ),
      });
      if (!rIn.ok && rIn.status !== 204) throw new Error(`/in returned HTTP ${rIn.status}`);
      update(2, { status: 'pass', detail: `HTTP ${rIn.status}` });

      // Step 4: Poll probe
      update(3, { status: 'running' });
      let found = false;
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise((r) => setTimeout(r, 1500));
        const pr = await api.probeEvent(st.site_id, vid);
        if (pr.found) {
          found = true;
          break;
        }
      }
      if (!found) throw new Error('Event did not appear in database within timeout');
      update(3, { status: 'pass', detail: lang === 'zh' ? '端到端写入成功' : 'Verified in D1' });
    } catch (err) {
      const idx = steps.findIndex((s) => s.status === 'running');
      if (idx >= 0) update(idx, { status: 'fail', detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <Navbar />

      <main className="max-w-[1120px] mx-auto px-4 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-6">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-zinc-900">{t('health.title')}</h1>
            <p className="text-[13.5px] text-zinc-500 mt-0.5">{t('health.desc')}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadChecks()}
              className="h-9 px-3 rounded-md text-[13px] font-medium text-zinc-700 hover:bg-zinc-200/60 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('toolbar.refresh')}</span>
            </button>

            <button
              type="button"
              disabled={testing}
              onClick={() => void runLiveTest()}
              className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-60 text-white text-[13.5px] font-medium inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{testing ? t('health.running') : t('health.run_live')}</span>
            </button>
          </div>
        </div>

        {/* Server Diagnostics */}
        <section className="plausible-card p-5">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-900 border-b border-zinc-200 pb-3">
            {lang === 'zh' ? '服务端核心检查' : 'Server Configuration Checks'}
          </h2>
          <div className="divide-y divide-zinc-100 mt-1">
            {checks.map((c) => (
              <div key={c.id} className="py-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  {c.status === 'pass' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  ) : c.status === 'warn' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="text-[13.5px] font-medium text-zinc-900">{c.name}</div>
                    {c.detail && <div className="text-[12.5px] text-zinc-500 mt-0.5">{c.detail}</div>}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase shrink-0 ${
                    c.status === 'pass'
                      ? 'bg-emerald-50 text-emerald-700'
                      : c.status === 'warn'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Live End-to-End Beacon Test */}
        {liveSteps.length > 0 && (
          <section className="plausible-card p-5 mt-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-zinc-900 border-b border-zinc-200 pb-3">
              {lang === 'zh' ? '实时端到端采集链路测试' : 'Live Ingestion Pipeline Test'}
            </h2>
            <div className="divide-y divide-zinc-100 mt-1">
              {liveSteps.map((st, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    {st.status === 'pass' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : st.status === 'fail' ? (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : st.status === 'running' ? (
                      <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-zinc-300 shrink-0" />
                    )}
                    <span className="text-[13.5px] font-medium text-zinc-800">{st.label}</span>
                  </div>
                  {st.detail && <span className="text-[12.5px] font-mono text-zinc-500">{st.detail}</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
