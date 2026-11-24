import { useEffect, useRef, useState } from 'react';
import { Activity, Bell, CalendarDays, ChartNoAxesCombined, ChevronDown, Globe, LayoutGrid, ListFilter, Maximize, Settings } from 'lucide-react';

const tr = value => window.PVI18N.t(value);
export const detailTabs = [
  ['goals', 'Goals'], ['funnel', 'Funnel'], ['quality', 'Traffic quality'],
  ['adguard', 'Ad protection'], ['vitals', 'Web Vitals'], ['suspicious', 'Suspicious'], ['ai', 'AI report'],
];

export function DashboardHeader() {
  const [user, setUser] = useState('');
  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(me => setUser(me?.user || '')).catch(() => {});
  }, []);
  return <header className="dashboard-header">
    <a href="/sites.html" className="brand-link inline-flex items-center gap-2"><span className="brand-mark"><ChartNoAxesCombined size={18}/></span><b id="brand">pvuv.ai</b></a>
    <nav className="header-nav flex items-center" aria-label="Account">
      <a className="header-item selected" href="/sites.html" data-i18n-title="Sites"><LayoutGrid/><span data-i18n="Sites">Sites</span></a>
      <a className="header-item" href="/health.html" data-i18n-title="Self-check"><Activity/><span data-i18n="Self-check">Self-check</span></a>
      <a className="header-item" href="/sites.html#settings" data-i18n-title="Settings"><Settings/><span data-i18n="Settings">Settings</span></a>
      <label className="header-item language"><Globe/><select id="lang" aria-label="Language"/></label>
      <details className="account-menu"><summary className="header-item"><b className="avatar">{(user || '·')[0].toUpperCase()}</b><span>{user || '…'}</span><ChevronDown size={12}/></summary>
        <div className="menu-box"><button type="button" data-i18n="Sign out" onClick={async () => { const r=await fetch('/api/logout',{method:'POST'}); if(r.ok) location.href='/login.html'; }}>Sign out</button></div>
      </details>
    </nav>
  </header>;
}

export function FilterMenu() {
  const menu = useRef(null);
  const [dim, setDim] = useState('page');
  const [value, setValue] = useState('');
  const dimensions = { page:'Page', source:'Source', country:'Country', region:'Region', city:'City', browser:'Browser', os:'OS', device:'Device', utm_campaign:'Campaign', utm_medium:'Medium' };
  async function submit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    const { addFilter } = await import('./controller.js');
    addFilter(dim, dim === 'country' ? value.trim().toUpperCase() : value.trim());
    setValue('');
    menu.current.open = false;
  }
  return <><details className="alert-menu"><summary className="toolbar-action" data-i18n-title="Alerts"><Bell size={15}/></summary>
    <div className="menu-box"><div className="alerts" id="alerts"/><div className="anomalies" id="anomalies"/></div>
  </details><details ref={menu} className="filter-menu"><summary className="toolbar-action" data-i18n-title="Filter"><ListFilter size={16}/><span data-i18n="Filter">Filter</span></summary>
    <form className="menu-box filter-form" onSubmit={submit}><select aria-label={tr('Filter')} value={dim} onChange={e=>setDim(e.target.value)}>
      {Object.entries(dimensions).map(([key,label])=><option key={key} value={key} data-i18n={label}>{tr(label)}</option>)}
    </select><input required value={value} onChange={e=>setValue(e.target.value)} placeholder={dim==='page' ? '/guides' : tr(dimensions[dim])} aria-label={tr(dimensions[dim])}/>
    <button className="btn primary" data-i18n="Filter">Filter</button></form>
  </details><CalendarDays className="calendar-icon" size={15}/></>;
}

function ReportPanel({name, heading}) {
  return <div className="report-card"><div className="sec-head">
    <h2 data-i18n={heading}>{tr(heading)}</h2><span className="tabs" data-tabs={name}/>
    <button className="all-btn" data-panel={name} data-i18n-title="All" aria-label={tr('All')}><Maximize size={14}/></button>
  </div><div className="panel" id={name}/></div>;
}
export function ReportPanels() {
  return <>{[
    ['sources', [['sources','Top sources'],['pages','Pages']]],
    ['audience', [['countries','Locations'],['devices','Devices']]],
  ].map(([section, panels]) => <section key={section} className="sec" data-sec={section} data-overview-report="" hidden>
    <div className="grid2">{panels.map(([name,heading])=><ReportPanel key={name} name={name} heading={heading}/>)}</div>
  </section>)}</>;
}
export function DetailTabs() {
  return <div className="detail-tabs flex items-center overflow-x-auto" aria-label={tr('Reports')}>
    {detailTabs.map(([key,label])=><button key={key} data-detail={key} data-i18n={label}
      onClick={async () => (await import('./controller.js')).selectDetail(key)}>{tr(label)}</button>)}
  </div>;
}
