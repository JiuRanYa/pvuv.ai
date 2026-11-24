export function GoalTable({rows}) {
  const t = window.PVI18N.t;
  const highest = Math.max(1, ...rows.map(r => r.uv || 0));
  const money = new Intl.NumberFormat(window.PVI18N.lang, {style:'currency',currency:'USD'});
  return <table className="goal-table w-full"><thead><tr>
    {['Goal','Visitors','Total','Revenue'].map((name,i)=><th key={name} className={i?'num':''}>{t(name)}</th>)}
  </tr></thead><tbody>{rows.map(row=><tr key={row.key}>
    <td><span className="goal-label relative block"><span className="rank-fill" style={{width:((row.uv || 0)/highest*100)+'%'}}/>{row.key}</span></td>
    <td className="num">{row.uv?.toLocaleString() ?? '–'}</td><td className="num">{row.pv?.toLocaleString() ?? '–'}</td>
    <td className="num">{row.revenue ? money.format(row.revenue) : '–'}</td>
  </tr>)}</tbody></table>;
}
