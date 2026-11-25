import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getBasePath, withBase } from './api';

export type Route =
  | { name: 'sites' }
  | { name: 'site'; siteId: string }
  | { name: 'visitors'; siteId: string; vid?: string }
  | { name: 'health' }
  | { name: 'settings' }
  | { name: 'login' }
  | { name: 'public'; siteId: string; token: string };

function stripBase(pathname: string): string {
  const bp = getBasePath();
  if (bp && (pathname === bp || pathname.startsWith(`${bp}/`))) {
    return pathname.slice(bp.length) || '/';
  }
  return pathname || '/';
}

export function parseRoute(pathname: string, search: string): Route {
  const clean = stripBase(pathname).replace(/\/+$/, '') || '/';
  const sp = new URLSearchParams(search);

  // Legacy *.html support if navigated directly client-side
  if (clean === '/sites.html' || clean === '/' || clean === '/sites' || clean === '/index.html') {
    return { name: window.location.hash === '#settings' ? 'settings' : 'sites' };
  }
  if (clean === '/site.html' || clean === '/site') {
    const id = sp.get('id') || '';
    return id ? { name: 'site', siteId: id } : { name: 'sites' };
  }
  if (clean === '/visitor.html' || clean === '/visitor') {
    const siteId = sp.get('site') || '';
    const vid = sp.get('vid') || undefined;
    return siteId ? { name: 'visitors', siteId, vid } : { name: 'sites' };
  }
  if (clean === '/public.html' || clean === '/public') {
    const siteId = sp.get('site') || '';
    const token = sp.get('k') || '';
    return siteId && token ? { name: 'public', siteId, token } : { name: 'sites' };
  }
  if (clean === '/health.html' || clean === '/health') return { name: 'health' };
  if (clean === '/settings.html' || clean === '/settings') return { name: 'settings' };
  if (clean === '/login.html' || clean === '/login') return { name: 'login' };

  // Modern clean SPA routes
  const mVisitor = clean.match(/^\/sites\/([A-Za-z0-9_-]+)\/visitors(?:\/([^/]+))?$/);
  if (mVisitor) {
    return {
      name: 'visitors',
      siteId: decodeURIComponent(mVisitor[1]),
      vid: mVisitor[2] ? decodeURIComponent(mVisitor[2]) : undefined,
    };
  }
  const mSite = clean.match(/^\/sites\/([A-Za-z0-9_-]+)$/);
  if (mSite) {
    return { name: 'site', siteId: decodeURIComponent(mSite[1]) };
  }
  const mShare = clean.match(/^\/share\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)$/);
  if (mShare) {
    return { name: 'public', siteId: mShare[1], token: mShare[2] };
  }

  return { name: 'sites' };
}

interface RouterCtx {
  route: Route;
  search: string;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const Context = createContext<RouterCtx>({
  route: { name: 'sites' },
  search: '',
  navigate: () => {},
});

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [loc, setLoc] = useState(() => ({
    pathname: typeof window !== 'undefined' ? window.location.pathname : '/sites',
    search: typeof window !== 'undefined' ? window.location.search : '',
  }));

  useEffect(() => {
    const onPop = () => {
      setLoc({ pathname: window.location.pathname, search: window.location.search });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const full = withBase(to);
    if (opts?.replace) {
      window.history.replaceState(null, '', full);
    } else {
      window.history.pushState(null, '', full);
    }
    const u = new URL(full, window.location.origin);
    setLoc({ pathname: u.pathname, search: u.search });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const route = parseRoute(loc.pathname, loc.search);
  return <Context.Provider value={{ route, search: loc.search, navigate }}>{children}</Context.Provider>;
}

export function useRouter() {
  return useContext(Context);
}

export function Link({
  to,
  className,
  children,
  onClick,
  title,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  title?: string;
}) {
  const { navigate } = useRouter();
  const href = withBase(to);
  return (
    <a
      href={href}
      title={title}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
