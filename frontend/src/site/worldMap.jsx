import paths from 'virtual:country-paths';

export default function WorldMap({rows, choose, countryName}) {
  const byCode = new Map(rows.map(row=>[row.key, row]));
  const max = Math.max(1,...rows.map(row=>row.uv || 0));
  const tr = window.PVI18N.t;
  return <div className="map-wrap">
    <svg viewBox="0 0 600 312" aria-label={tr('Visitors')+' · '+tr('Country')}>
      {paths.map(({code,name,path})=>{
        const row = byCode.get(code);
        const strength = row?.uv ? Math.sqrt(row.uv/max) : 0;
        const label = (code ? countryName(code) : name)+' · '+(row?.uv || 0)+' '+tr('Visitors');
        return <path key={name} d={path} fill={strength ? 'hsl(238 65% '+(89-strength*32)+'%)' : '#e7e8f3'}
          stroke="white" strokeWidth=".55" aria-label={label} role={row?'button':undefined} tabIndex={row?0:undefined}
          onClick={row?()=>choose(row):undefined} onKeyDown={e=>{if(row && ['Enter',' '].includes(e.key)){e.preventDefault();choose(row);}}}><title>{label}</title></path>;
      })}
    </svg>
    {!rows.length && <small>{tr('no data yet')}</small>}
  </div>;
}
