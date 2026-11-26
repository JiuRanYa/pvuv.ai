import React from 'react';
import { I18nProvider } from './lib/i18n';
import { RouterProvider, useRouter } from './lib/router';
import { SitesPage } from './pages/SitesPage';
import { Ga4DashboardPage } from './pages/Ga4DashboardPage';
import { SiteDashboardPage } from './pages/SiteDashboardPage';
import { VisitorPage } from './pages/VisitorPage';
import { HealthPage } from './pages/HealthPage';
import { SettingsPage } from './pages/SettingsPage';
import { PublicDashboardPage } from './pages/PublicDashboardPage';
import { LoginPage } from './pages/LoginPage';

function AppRoutes() {
  const { route, search } = useRouter();
  switch (route.name) {
    case 'sites':
      return <SitesPage />;
    case 'site':
      if (new URLSearchParams(search).get('source') === 'ga4') return <Ga4DashboardPage key={route.siteId} siteId={route.siteId}/>;
      return <SiteDashboardPage key={route.siteId} siteId={route.siteId} />;
    case 'visitors':
      if (!route.vid && new URLSearchParams(search).get('online') === '1') return <SiteDashboardPage key={route.siteId} siteId={route.siteId} />;
      return <VisitorPage key={route.siteId} siteId={route.siteId} vid={route.vid} />;
    case 'health':
      return <HealthPage />;
    case 'settings':
      return <SettingsPage />;
    case 'public':
      return <PublicDashboardPage key={route.siteId + route.token} siteId={route.siteId} token={route.token} />;
    case 'login':
      return <LoginPage />;
    default:
      return <SitesPage />;
  }
}

export function App() {
  return (
    <I18nProvider>
      <RouterProvider>
        <AppRoutes />
      </RouterProvider>
    </I18nProvider>
  );
}

export default App;
