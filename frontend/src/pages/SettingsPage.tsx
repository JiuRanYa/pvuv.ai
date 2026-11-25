import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, Key, Play, Plus, Trash2, Users } from 'lucide-react';
import { api } from '../lib/api';
import type { AdminListResponse, ApiTokenItem, HomeSettings, SiteRecord, StorageReport } from '../lib/types';
import { fmtRelativeTime } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { Navbar } from '../components/Navbar';
import { Dropdown } from '../components/Dropdown';

type SettingsTab = 'general' | 'tokens' | 'admins' | 'ai' | 'crawlers' | 'cfedge' | 'storage';

export function SettingsPage() {
  const { lang, t } = useI18n();
  const [tab, setTab] = useState<SettingsTab>('general');
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  // General
  const [branding, setBranding] = useState<HomeSettings>({
    name: 'Tally',
    description: '',
    primary_domain: '',
    logo_light: '',
    logo_dark: '',
    favicon: '',
  });
  const [timezone, setTimezone] = useState('UTC');
  const [ingestHost, setIngestHost] = useState('');

  // Tokens
  const [tokens, setTokens] = useState<ApiTokenItem[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [tokenName, setTokenName] = useState('');
  const [tokenSite, setTokenSite] = useState('');
  const [newTokenPlain, setNewTokenPlain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // SSO Admins

  // AI
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiLang, setAiLang] = useState('zh');
  const [aiKey, setAiKey] = useState('');
  const [aiKeySet, setAiKeySet] = useState(false);

  // Botdir
  const [botdir, setBotdir] = useState<{ imported: boolean; count?: number; updated_at?: number } | null>(null);
  const [botJson, setBotJson] = useState('');

  // CF Edge
  const [cfedge, setCfedge] = useState<{ token_set: boolean; status: unknown } | null>(null);
  const [cfToken, setCfToken] = useState('');

  // Storage
  const [storage, setStorage] = useState<StorageReport | null>(null);
  const [busy, setBusy] = useState(false);

  const flash = (ok: boolean, msg: string) => {
    setNotice({ ok, msg });
    setTimeout(() => setNotice(null), 4000);
  };

  useEffect(() => {
    void (async () => {
      try {
        const [h, m, s] = await Promise.all([api.home(), api.me(), api.sites()]);
        setBranding(h);
        setTimezone(m.timezone || 'UTC');
        setIngestHost(m.ingest_host || '');
        setSites(s.sites ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    setNotice(null);
    if (tab === 'tokens') {
      api.tokens().then((r) => setTokens(r.tokens ?? [])).catch(() => {});
    } else if (tab === 'ai') {
      api.aiSettings().then((r) => {
        setAiProvider(r.provider || 'openai');
        setAiBaseUrl(r.base_url || '');
        setAiModel(r.model || '');
        setAiLang(r.lang || 'en');
        setAiKeySet(r.key_set);
      }).catch(() => {});
    } else if (tab === 'crawlers') {
      api.botdir().then(setBotdir).catch(() => {});
    } else if (tab === 'cfedge') {
      api.cfedge().then(setCfedge).catch(() => {});
    } else if (tab === 'storage') {
      api.storage().then(setStorage).catch(() => {});
    }
  }, [tab]);

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'general', label: t('settings.general') },
    { id: 'tokens', label: t('settings.tokens') },
    { id: 'ai', label: t('settings.ai') },
    { id: 'crawlers', label: t('settings.crawlers') },
    { id: 'cfedge', label: t('settings.cfedge') },
    { id: 'storage', label: t('settings.storage') },
  ];

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await Promise.all([
        api.saveBranding({
          name: branding.name,
          description: branding.description,
          primary_domain: branding.primary_domain,
        }),
        api.saveTimezone(timezone),
      ]);
      flash(true, lang === 'zh' ? '常规设置已保存' : 'General settings saved');
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.createToken(tokenName.trim() || 'API token', tokenSite || null);
      setNewTokenPlain(res.token);
      setTokenName('');
      const list = await api.tokens();
      setTokens(list.tokens ?? []);
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Failed to create token');
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    await api.revokeToken(id);
    const list = await api.tokens();
    setTokens(list.tokens ?? []);
  };

  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.saveAiSettings({
        provider: aiProvider,
        base_url: aiBaseUrl,
        model: aiModel,
        lang: aiLang,
        ...(aiKey.trim() ? { api_key: aiKey.trim() } : {}),
      });
      setAiKey('');
      const st = await api.aiSettings();
      setAiKeySet(st.key_set);
      flash(true, lang === 'zh' ? 'AI 配置已保存' : 'AI settings saved');
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Failed to save AI settings');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadBotdir = async () => {
    if (!botJson.trim()) return;
    setBusy(true);
    try {
      await api.uploadBotdir(botJson);
      setBotJson('');
      setBotdir(await api.botdir());
      flash(true, lang === 'zh' ? '爬虫目录导入成功' : 'Crawler directory imported');
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCf = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.saveCfedge(cfToken.trim());
      setCfToken('');
      setCfedge(await api.cfedge());
      flash(true, `Verified (${res.zones ?? 0} zones)`);
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Token verification failed');
    } finally {
      setBusy(false);
    }
  };

  const handlePurge = async () => {
    setBusy(true);
    try {
      const res = await api.purgeStorage();
      flash(res.ok, lang === 'zh' ? '过期数据清理完成' : 'Retention purge finished');
      setStorage(await api.storage());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <Navbar />

      <main className="max-w-[1120px] mx-auto px-4 pb-16">
        <div className="pt-1 pb-5">
          <h1 className="text-[22px] font-bold tracking-tight text-zinc-900">{t('settings.title')}</h1>
        </div>

        <div className="plausible-card p-5">
          {/* Plausible uppercase tab bar */}
          <div className="h-[34px] flex items-center gap-5 border-b border-zinc-200 overflow-x-auto no-scrollbar">
            {tabs.map((it) => {
              const active = it.id === tab;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setTab(it.id)}
                  className={`pb-[13px] -mb-px text-[12px] font-semibold uppercase tracking-[0.03em] border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    active ? 'text-zinc-900 border-zinc-900' : 'text-zinc-500 border-transparent hover:text-zinc-800'
                  }`}
                >
                  {it.label}
                </button>
              );
            })}
          </div>

          {notice && (
            <div
              className={`mt-4 rounded-md px-3.5 py-2.5 text-[13px] ${
                notice.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {notice.msg}
            </div>
          )}

          <div className="pt-5">
            {/* General */}
            {tab === 'general' && (
              <form onSubmit={handleSaveGeneral} className="max-w-lg space-y-4">
                <div>
                  <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">
                    {lang === 'zh' ? '实例品牌名称' : 'Instance name'}
                  </label>
                  <input
                    value={branding.name}
                    onChange={(e) => setBranding((b) => ({ ...b, name: e.target.value }))}
                    className="w-full h-9 px-3 rounded-md border border-zinc-300 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">
                    {lang === 'zh' ? '账号时区' : 'Account timezone'}
                  </label>
                  <input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="UTC / Asia/Shanghai"
                    className="w-full h-9 px-3 rounded-md border border-zinc-300 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
                {ingestHost && (
                  <div>
                    <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">
                      Ingest Host (TALLY_INGEST_HOST)
                    </label>
                    <input
                      readOnly
                      value={ingestHost}
                      className="w-full h-9 px-3 rounded-md border border-zinc-200 bg-zinc-50 text-[13px] font-mono text-zinc-600"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] font-medium cursor-pointer"
                >
                  {t('toolbar.save')}
                </button>
              </form>
            )}

            {/* API Tokens */}
            {tab === 'tokens' && (
              <div className="space-y-5">
                <form onSubmit={handleCreateToken} className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                      {lang === 'zh' ? '令牌名称' : 'Token name'}
                    </label>
                    <input
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                      placeholder="CI / CLI / MCP"
                      className="h-9 w-56 px-3 rounded-md border border-zinc-300 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-700 mb-1">
                      {lang === 'zh' ? '作用域（可选）' : 'Site scope (optional)'}
                    </label>
                    <Dropdown
                      align="left"
                      widthClass="min-w-[190px]"
                      value={tokenSite}
                      onSelect={setTokenSite}
                      options={[
                        { value: '', label: lang === 'zh' ? '全部站点' : 'All sites' },
                        ...sites.map((s) => ({ value: s.site_id, label: s.name })),
                      ]}
                      trigger={() => (
                        <button
                          type="button"
                          className="h-9 min-w-[160px] px-3 rounded-md border border-zinc-300 bg-white flex items-center justify-between gap-2 text-[13px] text-zinc-800 cursor-pointer"
                        >
                          <span className="truncate">
                            {tokenSite
                              ? sites.find((s) => s.site_id === tokenSite)?.name || tokenSite
                              : lang === 'zh'
                                ? '全部站点'
                                : 'All sites'}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        </button>
                      )}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'zh' ? '创建令牌' : 'Create token'}</span>
                  </button>
                </form>

                {newTokenPlain && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-4 space-y-2">
                    <div className="text-[12.5px] font-semibold text-amber-900">
                      {lang === 'zh' ? '请立即复制保存，该明文令牌仅显示一次：' : 'Copy your token now — it will not be shown again:'}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 rounded bg-white border border-amber-200 font-mono text-[12px] text-zinc-900 break-all">
                        {newTokenPlain}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(newTokenPlain);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1800);
                        }}
                        className="h-8 px-3 rounded bg-zinc-900 text-white text-[12px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? t('toolbar.copied') : t('toolbar.copy')}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-zinc-100">
                  {tokens.map((tk) => (
                    <div key={tk.token_id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Key className="w-4 h-4 text-zinc-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-medium text-zinc-900 flex items-center gap-2">
                            <span>{tk.name}</span>
                            <code className="text-[11.5px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                              {tk.prefix}…
                            </code>
                            {tk.revoked_at && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
                                Revoked
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] text-zinc-400 mt-0.5">
                            Created {fmtRelativeTime(tk.created_at, lang)}
                            {tk.last_used_at ? ` · Last used ${fmtRelativeTime(tk.last_used_at, lang)}` : ''}
                          </div>
                        </div>
                      </div>
                      {!tk.revoked_at && (
                        <button
                          type="button"
                          onClick={() => void handleRevokeToken(tk.token_id)}
                          className="h-7 px-2.5 rounded text-[12px] font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          {lang === 'zh' ? '吊销' : 'Revoke'}
                        </button>
                      )}
                    </div>
                  ))}
                  {tokens.length === 0 && (
                    <div className="py-8 text-center text-[13px] text-zinc-400">{t('empty.no_data')}</div>
                  )}
                </div>
              </div>
            )}

            {/* Feishu SSO Admins */}
            {tab === 'ai' && (
              <form onSubmit={handleSaveAi} className="max-w-lg space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">Provider</label>
                    <Dropdown
                      align="left"
                      widthClass="w-full min-w-[180px]"
                      value={aiProvider}
                      onSelect={setAiProvider}
                      options={[
                        { value: 'openai', label: 'OpenAI / Compatible' },
                        { value: 'anthropic', label: 'Anthropic' },
                      ]}
                      trigger={() => (
                        <button
                          type="button"
                          className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white flex items-center justify-between text-[13px] text-zinc-800 cursor-pointer"
                        >
                          <span>{aiProvider === 'anthropic' ? 'Anthropic' : 'OpenAI / Compatible'}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        </button>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">Report language</label>
                    <Dropdown
                      align="left"
                      widthClass="w-full min-w-[140px]"
                      value={aiLang}
                      onSelect={setAiLang}
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'zh', label: '简体中文' },
                      ]}
                      trigger={() => (
                        <button
                          type="button"
                          className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white flex items-center justify-between text-[13px] text-zinc-800 cursor-pointer"
                        >
                          <span>{aiLang === 'zh' ? '简体中文' : 'English'}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        </button>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">Model</label>
                  <input
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="gpt-4o-mini / claude-sonnet-4-5"
                    className="w-full h-9 px-3 rounded-md border border-zinc-300 text-[13.5px]"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">Base URL (optional)</label>
                  <input
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full h-9 px-3 rounded-md border border-zinc-300 text-[13.5px]"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-zinc-700 mb-1">
                    API Key {aiKeySet ? <span className="text-emerald-600">(configured)</span> : null}
                  </label>
                  <input
                    type="password"
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value)}
                    placeholder={aiKeySet ? 'Leave blank to keep existing key' : 'sk-...'}
                    className="w-full h-9 px-3 rounded-md border border-zinc-300 text-[13.5px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] font-medium cursor-pointer"
                >
                  {t('toolbar.save')}
                </button>
              </form>
            )}

            {/* Crawler Directory */}
            {tab === 'crawlers' && (
              <div className="max-w-xl space-y-4">
                <div className="text-[13px] text-zinc-600">
                  {botdir?.imported
                    ? `${lang === 'zh' ? '已导入规则数' : 'Imported entries'}: ${botdir.count ?? 0}`
                    : lang === 'zh'
                      ? '尚未导入第三方爬虫目录 JSON。'
                      : 'No external crawler directory imported yet.'}
                </div>
                <textarea
                  rows={5}
                  value={botJson}
                  onChange={(e) => setBotJson(e.target.value)}
                  placeholder='[{"pattern": "GPTBot", "category": "ai"}]'
                  className="w-full p-3 rounded-md border border-zinc-300 font-mono text-[12px]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleUploadBotdir()}
                    className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] font-medium cursor-pointer"
                  >
                    {lang === 'zh' ? '导入 JSON' : 'Import JSON'}
                  </button>
                  {botdir?.imported && (
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteBotdir();
                        setBotdir({ imported: false });
                      }}
                      className="h-9 px-3.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-[13px] font-medium cursor-pointer"
                    >
                      {t('toolbar.delete')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Cloudflare Edge */}
            {tab === 'cfedge' && (
              <form onSubmit={handleSaveCf} className="max-w-lg space-y-4">
                <div className="text-[13px] text-zinc-600">
                  {cfedge?.token_set
                    ? lang === 'zh'
                      ? '已配置 Cloudflare 只读 Token。'
                      : 'Cloudflare read-only API token is configured.'
                    : lang === 'zh'
                      ? '可选：配置 Cloudflare 只读 Token 对比边缘 HTML 请求与 JS 上报差异。'
                      : 'Optional: configure a read-only Cloudflare API token to compare edge HTML requests against JS beacons.'}
                </div>
                <input
                  type="password"
                  value={cfToken}
                  onChange={(e) => setCfToken(e.target.value)}
                  placeholder="Cloudflare API token"
                  className="w-full h-9 px-3 rounded-md border border-zinc-300 text-[13.5px]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="h-9 px-4 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] font-medium cursor-pointer"
                  >
                    {lang === 'zh' ? '验证并保存' : 'Verify & Save'}
                  </button>
                  {cfedge?.token_set && (
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteCfedge();
                        setCfedge({ token_set: false, status: null });
                      }}
                      className="h-9 px-3.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-[13px] font-medium cursor-pointer"
                    >
                      {t('toolbar.delete')}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Storage & Cron */}
            {tab === 'storage' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handlePurge()}
                    className="h-8 px-3 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12.5px] font-medium cursor-pointer"
                  >
                    {lang === 'zh' ? '清理过期明细' : 'Run retention purge'}
                  </button>
                </div>

                {storage && (
                  <pre className="p-4 rounded-md bg-zinc-50 border border-zinc-200/80 text-[12px] font-mono text-zinc-700 overflow-x-auto">
                    {JSON.stringify(storage, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
