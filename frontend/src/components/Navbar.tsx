import React, { useEffect, useState } from 'react';
import { ChevronDown, Globe, LogOut, Settings, Activity, LayoutGrid } from 'lucide-react';
import { TallyLogo } from './Icons';
import { Dropdown } from './Dropdown';
import { Link, useRouter } from '../lib/router';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';

export function Navbar({
  isPublic = false,
  brandName = 'Tally',
}: {
  isPublic?: boolean;
  brandName?: string;
}) {
  const { lang, setLang, t } = useI18n();
  const { route, navigate } = useRouter();
  const [user, setUser] = useState('');

  useEffect(() => {
    if (isPublic) return;
    let alive = true;
    api
      .me()
      .then((res) => {
        if (!alive) return;
        setUser(res.user);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isPublic]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    navigate('/login');
  };

  return (
    <header className="w-full">
      <div className="max-w-[1120px] mx-auto px-3 sm:px-4 py-3 sm:py-5 flex items-center justify-between gap-1 sm:gap-4">
        <Link
          to={isPublic ? '/' : '/sites'}
          className="inline-flex items-center gap-1.5 sm:gap-2.5 group focus:outline-none"
        >
          <TallyLogo size={28} />
          <span className="text-[19px] font-bold tracking-tight text-zinc-900">
            {brandName || 'Tally'}
          </span>
        </Link>

        <nav className="flex items-center gap-0 sm:gap-1.5">
          {!isPublic && (
            <>
              <Link
                to="/sites"
                className={`h-8 px-1.5 sm:px-2.5 rounded-md inline-flex items-center gap-1.5 text-[13.5px] font-medium transition-colors ${
                  route.name === 'sites' || route.name === 'site' || route.name === 'visitors'
                    ? 'text-zinc-900 bg-zinc-200/60'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:inline" />
                <span className="max-sm:sr-only">{t('nav.sites')}</span>
              </Link>

              <Link
                to="/health"
                className={`h-8 px-1.5 sm:px-2.5 rounded-md inline-flex items-center gap-1.5 text-[13.5px] font-medium transition-colors ${
                  route.name === 'health'
                    ? 'text-zinc-900 bg-zinc-200/60'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Activity className="w-3.5 h-3.5 sm:inline" />
                <span className="max-sm:sr-only">{t('nav.health')}</span>
              </Link>

              <Link
                to="/settings"
                className={`h-8 px-1.5 sm:px-2.5 rounded-md inline-flex items-center gap-1.5 text-[13.5px] font-medium transition-colors ${
                  route.name === 'settings'
                    ? 'text-zinc-900 bg-zinc-200/60'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Settings className="w-3.5 h-3.5 sm:inline" />
                <span className="max-sm:sr-only">{t('nav.settings')}</span>
              </Link>
            </>
          )}

          {/* Custom Language Popover (no native <select>) */}
          <Dropdown
            align="right"
            widthClass="min-w-[132px]"
            value={lang}
            onSelect={(v) => setLang(v === 'zh' ? 'zh' : 'en')}
            options={[
              { value: 'en', label: 'English' },
              { value: 'zh', label: '简体中文' },
            ]}
            trigger={() => (
              <button
                type="button"
                className="h-8 px-1.5 sm:px-2.5 rounded-md inline-flex items-center gap-1 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-zinc-500" />
                <span>{lang === 'zh' ? '中文' : 'EN'}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>
            )}
          />

          {/* User Badge / Sign Out */}
          {!isPublic && user && (
            <Dropdown
              align="right"
              widthClass="min-w-[210px]"
              header={
                <div>
                  <div className="text-[13px] font-semibold text-zinc-900 truncate">{user}</div>
                </div>
              }
              options={[
                {
                  value: 'settings',
                  label: t('nav.settings'),
                  icon: <Settings className="w-3.5 h-3.5 text-zinc-400" />,
                },
                { value: 'logout', label: t('nav.signout'), icon: <LogOut className="w-3.5 h-3.5" />, danger: true, dividerBefore: true },
              ]}
              onSelect={(v) => {
                if (v === 'settings') navigate('/settings');
                if (v === 'logout') void handleLogout();
              }}
              trigger={() => (
                <button
                  type="button"
                  className="h-8 pl-1.5 pr-2 rounded-md inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-200/50 transition-colors cursor-pointer"
                >
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-semibold inline-flex items-center justify-center">
                      {(user || 'A').charAt(0).toUpperCase()}
                    </span>
                  <span className="hidden md:inline max-w-[110px] truncate">{user}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>
              )}
            />
          )}
        </nav>
      </div>
    </header>
  );
}
