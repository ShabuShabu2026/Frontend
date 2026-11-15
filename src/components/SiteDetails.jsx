import { lazy, Suspense, useState } from 'react'
import { metric, percent, scoreNames } from '../lib/mission'
import LoadingState from './LoadingState.jsx'

function Metrics({ data }) {
  return <div className="visibility-metrics">{[['Sun Visibility', percent(data?.sunVisibility)], ['Earth Visibility', percent(data?.earthVisibility)], ['Longest Darkness', metric(data?.longestDarkness, ' h')], ['Longest Blackout', metric(data?.longestBlackout, ' h')]].map(([label, value]) => <div className="detail-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
}
const Terrain3D = lazy(() => import('./Terrain3D.jsx'))
function Terrain({ terrain, status, error, site, busy }) {
  if (status === 'loading' || (!status && busy && !terrain)) return <LoadingState>Loading terrain data. Please wait…</LoadingState>
  if (status === 'error') return <div className="terrain-empty" role="alert"><p>Unable to load terrain.</p><small>{error}</small></div>
  if (!site) return <p className="empty-state">Select a site to view its terrain.</p>
  if (status === 'empty') return <p className="empty-state">No elevation data is available for this site.</p>
  if (!terrain) return <p className="empty-state">No elevation data was returned for this site.</p>
  return <Suspense fallback={<LoadingState>Preparing 3D terrain…</LoadingState>}><Terrain3D terrain={terrain} /></Suspense>
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
    <div className="detail-content"><div className="detail-heading"><div><h1>{site?.id ?? '—'}</h1><p>{metric(site?.latitude, '°')} latitude · {metric(site?.longitude, '°')} longitude</p></div>{site?.status && <span className={`status-badge ${site.passed === false ? 'gray' : site.status === 'Marginal' ? 'amber' : 'green'}`}>{site.status}</span>}</div>
    <div className="detail-tabs" role="tablist" aria-label="Site analysis">{['Overview', '3D Terrain', 'Sun & Earth'].map((name) => <button key={name} id={`tab-${name.replaceAll(' ', '-')}`} type="button" role="tab" aria-selected={tab === name} aria-controls="detail-tabpanel" onClick={() => setTab(name)}>{name}</button>)}</div>
    {busy && <p role="status" className="data-notice">Loading site analysis…</p>}{(error || data?.overviewError) && <p role="alert" className="warning">{error || data.overviewError}</p>}
    {(data?.notices ?? []).filter((notice) => notice !== data?.terrainError && notice !== data?.visibilityError).map((notice) => <p key={notice} role="alert" className="warning">{notice}</p>)}
    {!site && <p className="data-notice">Select a candidate site to view its analysis.</p>}
    <div id="detail-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab.replaceAll(' ', '-')}`}>
    {tab === 'Overview' && <>
      <div className="detail-hero"><div className="detail-card suitability"><span>Suitability Score</span><strong>{metric(data?.suitability ?? site?.suitability, '%')}</strong></div><div className="detail-card terrain-preview"><Terrain terrain={data?.terrain} status={data?.terrainStatus} error={data?.terrainError} site={site} busy={busy} /></div></div>
      <div className="score-grid">{scoreNames.map((name) => <div className="detail-card" key={name}><span>{name}</span><strong>{percent(data?.scores?.[name])}</strong><small>Importance {priorities?.[name] ?? '—'} · Weight {percent(weights?.[name])}</small></div>)}</div>
      <section className="constraints-result"><h3>Absolute Constraints: <span className={passed === true ? 'passed' : ''}>{passed == null ? '—' : passed ? 'Passed' : 'Not passed'}</span></h3>{reasons.map((reason) => <p key={reason}>{reason}</p>)}</section>
      <dl className="terrain-metrics">{[['Slope', metric(data?.slope, '°')], ['Roughness', metric(data?.roughness, ' m')], ['Best Landing Date', config.searchRange === 0 ? 'Not applicable' : data?.bestLandingDate ?? '—']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <h3>Sun &amp; Earth</h3>{data?.visibilityStatus === 'loading' ? <LoadingState>Loading visibility analysis…</LoadingState> : data?.visibilityStatus === 'error' ? <p className="warning" role="alert">{data.visibilityError}</p> : <Timeline hourly={hourly} />}<Metrics data={data} />
    </>}
    {tab === '3D Terrain' && <><h3>3D Terrain</h3><div className="detail-card terrain-full"><Terrain terrain={data?.terrain} status={data?.terrainStatus} error={data?.terrainError} site={site} busy={busy} /></div></>}
    {tab === 'Sun & Earth' && <><h3>Sun &amp; Earth</h3>{site && config.searchRange > 0 && <label className="detail-date">Landing Date<select value={date} disabled={busy} onChange={(event) => onDateChange(event.target.value)}>{Array.from({ length: config.searchRange * 2 + 1 }, (_, index) => { const day = new Date(`${config.landingDate}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + index - config.searchRange); const value = day.toISOString().slice(0,10); return <option key={value}>{value}</option> })}</select></label>}{data?.visibilityStatus === 'loading' ? <LoadingState>Loading visibility analysis…</LoadingState> : data?.visibilityStatus === 'error' ? <p className="warning" role="alert">{data.visibilityError}</p> : <Timeline hourly={hourly} />}<Metrics data={data} />
      <h3>Hourly Visibility</h3>{sample ? <><label className="hour-selector">Time (UTC)<select value={Math.min(hour, hourly.length - 1)} onChange={(event) => setHour(Number(event.target.value))}>{hourly.map((item, index) => <option key={item.time} value={index}>{item.time}</option>)}</select></label><div className="hourly-table"><table><thead><tr><th>Body</th><th>Visible</th><th>Azimuth</th><th>Elevation</th></tr></thead><tbody>{[['Sun',sample.sunVisible,sample.sunAzimuth,sample.sunElevation],['Earth',sample.earthVisible,sample.earthAzimuth,sample.earthElevation]].map(([body,visible,azimuth,elevation]) => <tr key={body}><th>{body}</th><td>{visible == null ? '—' : visible ? 'Yes' : 'No'}</td><td>{metric(azimuth,'°')}</td><td>{metric(elevation,'°')}</td></tr>)}</tbody></table></div><p className="data-notice">Solar disk visibility: {percent(sample.sunDiskFraction)}</p></> : data?.visibilityStatus === 'loading' ? <LoadingState>Loading hourly visibility…</LoadingState> : <p className="empty-state">No hourly analysis was returned.</p>}
    </>}
    </div></div>
  </section>
}
