import { useState } from 'react'
import { metric, percent, scoreNames } from '../lib/mission'

function Metrics({ data }) {
  return <div className="visibility-metrics">{[['Sun Visibility', percent(data?.sunVisibility)], ['Earth Visibility', percent(data?.earthVisibility)], ['Longest Darkness', metric(data?.longestDarkness, ' h')], ['Longest Blackout', metric(data?.longestBlackout, ' h')]].map(([label, value]) => <div className="detail-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
}
function Terrain({ terrain }) {
  if (!terrain?.elevations?.length) return <div className="terrain-empty"><span>3D Terrain</span><p>Terrain data is not available.</p></div>
  const grid = terrain.elevations
  const flat = grid.flat().filter(Number.isFinite)
  if (!flat.length) return <p className="empty-state">Terrain data is not available.</p>
  const min = Math.min(...flat), max = Math.max(...flat)
  const rows = grid.length, columns = grid[0].length
  const project = (row, column) => {
    const x = column / Math.max(1, columns - 1), y = row / Math.max(1, rows - 1)
    return `${250 + (x - y) * 210},${70 + (x + y) * 85 - (grid[row][column] - min) / Math.max(1, max - min) * 90}`
  }
  return <figure className="terrain-figure"><svg viewBox="0 -30 500 300" role="img" aria-label="Elevation surface around the selected site">{grid.slice(0, -1).flatMap((row, r) => row.slice(0, -1).map((_, c) => <polygon key={`${r}-${c}`} points={[project(r,c),project(r,c+1),project(r+1,c+1),project(r+1,c)].join(' ')} fill={`hsl(251 13% ${32 + (grid[r][c] - min) / Math.max(1, max - min) * 35}%)`} stroke="#aca4c1" strokeWidth=".4" />))}</svg><figcaption>{metric(terrain.spacing, ' m')} grid · {terrain.coordinateSystem ?? '—'}</figcaption></figure>
}
function Timeline({ hourly = [] }) {
  if (!hourly.length) return <p className="empty-state">Hourly visibility data is not available.</p>
  return <div className="timeline"><div className="timeline-labels"><span>Sunlight</span><span>Earth Visibility</span></div><div className="timeline-chart">{['sunVisible', 'earthVisible'].map((key) => <div className="timeline-row" key={key}>{hourly.map((sample) => <span key={sample.time} className={sample[key] ? 'visible' : ''} title={`${sample.time}: ${sample[key] ? 'Visible' : 'Not visible'}`} />)}</div>)}<div className="timeline-dates"><span>{new Date(hourly[0].time).toLocaleString('en-US', { timeZone: 'UTC' })}</span><span>{new Date(hourly.at(-1).time).toLocaleString('en-US', { timeZone: 'UTC' })} UTC</span></div></div></div>
}
export default function SiteDetails({ site, data, config, busy, error, onDateChange, date }) {
  const [tab, setTab] = useState('Overview')
  const hourly = data?.hourly ?? []
  const [hour, setHour] = useState(0)
  const sample = hourly[Math.min(hour, hourly.length - 1)]
  const passed = data?.passed ?? site?.passed
  const reasons = data?.exclusionReasons ?? site?.exclusionReasons ?? []
  const weights = data?.weights
  const priorities = data?.priorities
  return <section className="site-details" aria-label="Selected Site Details" aria-busy={busy}>
    <h2>Selected Site Details</h2>
    <div className="detail-content"><div className="detail-heading"><div><h1>{site?.id ?? '—'}</h1><p>{metric(site?.latitude, '°')} latitude · {metric(site?.longitude, '°')} longitude</p></div>{site?.status && <span className={`status-badge ${site.status === 'Marginal' ? 'amber' : 'green'}`}>{site.status}</span>}</div>
    <div className="detail-tabs" role="tablist" aria-label="Site analysis">{['Overview', '3D Terrain', 'Sun & Earth'].map((name) => <button key={name} id={`tab-${name.replaceAll(' ', '-')}`} type="button" role="tab" aria-selected={tab === name} aria-controls="detail-tabpanel" onClick={() => setTab(name)}>{name}</button>)}</div>
    {busy && <p role="status" className="data-notice">Loading site analysis…</p>}{error && <p role="alert" className="warning">{error}</p>}
    {!site && <p className="data-notice">Select a candidate site to view its analysis.</p>}
    <div id="detail-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab.replaceAll(' ', '-')}`}>
    {tab === 'Overview' && <>
      <div className="detail-hero"><div className="detail-card suitability"><span>Suitability Score</span><strong>{metric(data?.suitability ?? site?.suitability, '%')}</strong></div><div className="detail-card terrain-preview"><Terrain terrain={data?.terrain} /></div></div>
      <div className="score-grid">{scoreNames.map((name) => <div className="detail-card" key={name}><span>{name}</span><strong>{percent(data?.scores?.[name])}</strong><small>Importance {priorities?.[name] ?? '—'} · Weight {percent(weights?.[name])}</small></div>)}</div>
      <section className="constraints-result"><h3>Absolute Constraints: <span className={passed === true ? 'passed' : ''}>{passed == null ? '—' : passed ? 'Passed' : 'Not passed'}</span></h3>{reasons.map((reason) => <p key={reason}>{reason}</p>)}</section>
      <dl className="terrain-metrics">{[['Slope', metric(data?.slope, '°')], ['Roughness', metric(data?.roughness, ' m')], ['Best Landing Date', config.searchRange === 0 ? 'Not applicable' : data?.bestLandingDate ?? '—']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <h3>Sun &amp; Earth</h3><Timeline hourly={hourly} /><Metrics data={data} />
    </>}
    {tab === '3D Terrain' && <><h3>3D Terrain</h3><div className="detail-card terrain-full"><Terrain terrain={data?.terrain} /></div></>}
    {tab === 'Sun & Earth' && <><h3>Sun &amp; Earth</h3>{site && config.searchRange > 0 && <label className="detail-date">Landing Date<select value={date} disabled={busy} onChange={(event) => onDateChange(event.target.value)}>{Array.from({ length: config.searchRange * 2 + 1 }, (_, index) => { const day = new Date(`${config.landingDate}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + index - config.searchRange); const value = day.toISOString().slice(0,10); return <option key={value}>{value}</option> })}</select></label>}<Timeline hourly={hourly} /><Metrics data={data} />
      <h3>Hourly Visibility</h3>{sample ? <><label className="hour-selector">Time (UTC)<select value={Math.min(hour, hourly.length - 1)} onChange={(event) => setHour(Number(event.target.value))}>{hourly.map((item, index) => <option key={item.time} value={index}>{item.time}</option>)}</select></label><div className="hourly-table"><table><thead><tr><th>Body</th><th>Visible</th><th>Azimuth</th><th>Elevation</th></tr></thead><tbody>{[['Sun',sample.sunVisible,sample.sunAzimuth,sample.sunElevation],['Earth',sample.earthVisible,sample.earthAzimuth,sample.earthElevation]].map(([body,visible,azimuth,elevation]) => <tr key={body}><th>{body}</th><td>{visible == null ? '—' : visible ? 'Yes' : 'No'}</td><td>{metric(azimuth,'°')}</td><td>{metric(elevation,'°')}</td></tr>)}</tbody></table></div><p className="data-notice">Solar disk visibility: {percent(sample.sunDiskFraction)}</p></> : <p className="empty-state">Hourly analysis is not available.</p>}
    </>}
    </div></div>
  </section>
}
