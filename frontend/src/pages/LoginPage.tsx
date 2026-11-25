import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { TallyLogo } from '../components/Icons';

export function LoginPage() {
  const { lang, t } = useI18n();
  const [providers, setProviders] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const error = new URLSearchParams(location.search).get('error');
  useEffect(() => { api.providers().then(p => setProviders(p.providers)).catch(() => setFailed(true)); }, []);
  return <main className="min-h-screen flex flex-col items-center justify-center px-4">
    <div className="w-full max-w-sm plausible-card p-7 space-y-4">
      <div className="flex items-center gap-2"><TallyLogo /><h1 className="font-bold text-xl">{t('login.title')}</h1></div>
      {error && <p role="alert">{error === 'not_admin' ? (lang === 'zh' ? '此账号没有管理员权限。' : 'This account does not have admin access.') : (lang === 'zh' ? '登录失败，请重试。' : 'Sign-in failed. Please try again.')}</p>}
      {failed && <p role="alert">{lang === 'zh' ? '无法加载登录方式。' : 'Could not load sign-in options.'}</p>}
      {providers?.length === 0 && <p>{lang === 'zh' ? '尚未配置登录方式。' : 'No sign-in provider is configured.'}</p>}
      {providers?.filter(p => p === 'google' || p === 'github').map(p => {
        const name = p === 'google' ? 'Google' : 'GitHub';
        return <a key={p} className="block text-center rounded-md border border-zinc-200 py-2 hover:bg-zinc-50" href={`/api/auth/${p}/start`}>{lang === 'zh' ? `使用 ${name} 登录` : `Continue with ${name}`}</a>;
      })}
    </div>
  </main>;
}
