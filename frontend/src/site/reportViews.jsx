import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import { GoalTable } from './GoalTable.jsx';

const WorldMap = lazy(() => import('./worldMap.jsx'));
const roots = new WeakMap();
export function renderGoals(element, rows) {
  renderInto(element, <GoalTable rows={rows}/>);
}
export function renderInto(element, view) {
  if (!roots.has(element)) roots.set(element, createRoot(element));
  roots.get(element).render(view);
}

export function renderMetrics(element, metrics, selected) {
  renderInto(element, metrics.map(([key,label,value,help]) =>
    <button key={key} type="button" className="card" data-metric={key} aria-pressed={selected===key} aria-controls="chart" title={help}>
      <span className="k">{label}</span><span className="v">{value}</span>
    </button>));
}

export function renderTabStrip(element, tabs, selected, choose) {
  renderInto(element, tabs.map(([key,label])=><button key={key} type="button" data-dim={key}
    className={key===selected?'active':''} aria-pressed={key===selected} onClick={()=>choose(key)}>{label}</button>));
}

export function renderReport(element, { rows, dim, label, display, icon, choose, countryName }) {
  if (dim === 'map') {
    renderInto(element, <Suspense fallback={<p className="muted">{window.PVI18N.t('loading…')}</p>}>
      <WorldMap rows={rows} choose={choose} countryName={countryName}/></Suspense>);
    return;
  }
  const ranked = [...rows].sort((a,b)=>(b.uv || 0)-(a.uv || 0)).slice(0,9);
  const max = Math.max(1, ...ranked.map(row=>row.uv || 0));
  renderInto(element, <div className="ranked-report">
    <div className="rank-head"><span>{label}</span><span>{window.PVI18N.t('Visitors')}</span></div>
    {ranked.map(row=>{
      const key = row.path ?? row.key;
      const contents = <><span className="rank-fill" style={{width:((row.uv || 0)/max*100)+'%'}}/>
        <span className="rank-label">{icon?.(row)}<span title={display(row)}>{display(row)}</span></span><span className="rank-value">{row.uv?.toLocaleString() ?? '–'}</span></>;
      return choose ? <button className="rank-row" type="button" key={key} onClick={()=>choose(row)}>{contents}</button> :
        <div className="rank-row" key={key}>{contents}</div>;
    })}
    {!rows.length && <p className="empty-report">{window.PVI18N.t('no data yet')}</p>}
  </div>);
}
export function rowIcon(src, fallback) {
  return <span className="row-symbol" aria-hidden="true">{fallback}
    {src && <img src={src} alt="" loading="lazy" onError={e=>{e.currentTarget.hidden=true;}}/>}
  </span>;
}
