import { lazy, Suspense, useState } from 'react'
import { metric, percent, scoreNames } from '../lib/mission'
import SkyView from './SkyView.jsx'
import { scoreLabel, shortDate } from '../lib/presentation-labels.js'
import LoadingState from './LoadingState.jsx'

function Metrics({ data }) {
  return <div className="visibility-metrics">{[['Sunlight', percent(data?.sunVisibility)], ['Earth view', percent(data?.earthVisibility)], ['Longest dark', metric(data?.longestDarkness, ' h')], ['No-signal gap', metric(data?.longestBlackout, ' h')]].map(([label, value]) => <div className="detail-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
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
  return <section className="hour-by-hour"><h3>Hour by hour</h3><div className="timeline"><div className="timeline-labels"><span>Sun</span><span>Earth</span></div><div className="timeline-chart">{['sunVisible', 'earthVisible'].map((key) => <div className="timeline-row" key={key}>{hourly.map((sample) => <span key={sample.time} className={sample[key] ? 'visible' : ''} title={`${sample.time}: ${sample[key] ? 'Visible' : 'Not visible'}`} />)}</div>)}<div className="timeline-dates"><span>{new Date(hourly[0].time).toLocaleString('en-US', { timeZone: 'UTC' })}</span><span>{new Date(hourly.at(-1).time).toLocaleString('en-US', { timeZone: 'UTC' })} UTC</span></div></div></div></section>
}
export default function SiteDetails({ site, data, config, busy, error, onDateChange, date, tab = 'Overview', onTabChange }) {
  const hourly = data?.hourly ?? []
  const [hour, setHour] = useState(0)
  const sample = hourly[Math.min(hour, hourly.length - 1)]
  const passed = data?.passed ?? site?.passed
  const reasons = data?.exclusionReasons ?? site?.exclusionReasons ?? []
  const weights = data?.weights
  return <section className="site-details" aria-label="Selected Site Details" aria-busy={busy}>
    <h2>Selected Site Details</h2>
    <div className="detail-content"><div className="detail-heading"><div><h1>{site?.id ?? '—'}</h1></div></div>
    <div className="detail-tabs" role="tablist" aria-label="Site analysis">{['Overview', '3D Terrain', 'Sun & Earth'].map((name) => <button key={name} id={`tab-${name.replaceAll(' ', '-')}`} type="button" role="tab" aria-selected={tab === name} aria-controls="detail-tabpanel" onClick={() => onTabChange(name)}>{name}</button>)}</div>
    {busy && <p role="status" className="data-notice">Loading site analysis…</p>}{(error || data?.overviewError) && <p role="alert" className="warning">{error || data.overviewError}</p>}
    {(data?.notices ?? []).filter((notice) => notice !== data?.terrainError && notice !== data?.visibilityError).map((notice) => <p key={notice} role="alert" className="warning">{notice}</p>)}
    {!site && <p className="data-notice">Select a candidate site to view its analysis.</p>}
    <div id="detail-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab.replaceAll(' ', '-')}`}>
    {tab === 'Overview' && <>
      <div className="site-summary"><span className={`status-badge ${passed === false ? 'gray' : 'green'}`}>{metric(data?.suitability ?? site?.suitability, '%')} · {site?.status ?? '—'}</span><small>{site?.name ?? site?.regionName ?? ''}{(site?.name || site?.regionName) ? ' · ' : ''}{shortDate(date,true)} · {config.stayDuration} days</small></div>
      <Metrics data={data} />
      <section className="overview-terrain"><h3>3D Terrain</h3><Terrain terrain={data?.terrain} status={data?.terrainStatus} error={data?.terrainError} site={site} busy={busy} /></section>
      {data?.visibilityStatus === 'loading' ? <LoadingState>Loading visibility analysis…</LoadingState> : data?.visibilityStatus === 'error' ? <p className="warning" role="alert">{data.visibilityError}</p> : <Timeline hourly={hourly} />}
      <section className="why-score"><h3>Why {metric(data?.suitability ?? site?.suitability, '%')}?</h3><div className="score-breakdown">{scoreNames.map(name => <div key={name}><span>{scoreLabel(name)}</span><div className="breakdown-track"><span style={{ width: `${Math.max(0,Math.min(100,(data?.scores?.[name] ?? 0)*100))}%` }} /></div><strong>{data?.scores?.[name] == null ? '—' : data.scores[name].toFixed(2)}</strong><small>{percent(weights?.[name])}</small></div>)}</div><p className={passed ? 'passed' : ''}>Slope {metric(data?.slope, '°')} · Roughness {metric(data?.roughness, ' m')} · {passed == null ? '—' : passed ? 'Meets landing rules' : 'Does not meet landing rules'}</p>{reasons.map(reason => <p key={reason}>{reason}</p>)}</section>
      <dl className="terrain-metrics"><div><dt>Coordinates</dt><dd>{metric(site?.latitude,'°')}, {metric(site?.longitude,'°')}</dd></div><div><dt>Best day</dt><dd>{config.searchRange === 0 ? 'Not applicable' : shortDate(data?.bestLandingDate,true)}</dd></div></dl>
    </>}
    {tab === '3D Terrain' && <><h3>3D Terrain</h3><div className="detail-card terrain-full"><Terrain terrain={data?.terrain} status={data?.terrainStatus} error={data?.terrainError} site={site} busy={busy} /></div></>}
    {tab === 'Sun & Earth' && <><h3>Sun &amp; Earth</h3><SkyView hourly={hourly} terrain={data?.terrain} terrainStatus={data?.terrainStatus} site={site} observerHeight={config.height} />{site && config.searchRange > 0 && <label className="detail-date">Landing Date<select value={date} disabled={busy} onChange={(event) => onDateChange(event.target.value)}>{Array.from({ length: config.searchRange * 2 + 1 }, (_, index) => { const day = new Date(`${config.landingDate}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + index - config.searchRange); const value = day.toISOString().slice(0,10); return <option key={value}>{value}</option> })}</select></label>}{data?.visibilityStatus === 'loading' ? <LoadingState>Loading visibility analysis…</LoadingState> : data?.visibilityStatus === 'error' ? <p className="warning" role="alert">{data.visibilityError}</p> : <Timeline hourly={hourly} />}<Metrics data={data} />
      <h3>Hourly Visibility</h3>{sample ? <><label className="hour-selector">Time (UTC)<select value={Math.min(hour, hourly.length - 1)} onChange={(event) => setHour(Number(event.target.value))}>{hourly.map((item, index) => <option key={item.time} value={index}>{item.time}</option>)}</select></label><div className="hourly-table"><table><thead><tr><th>Body</th><th>Visible</th><th>Azimuth</th><th>Elevation</th></tr></thead><tbody>{[['Sun',sample.sunVisible,sample.sunAzimuth,sample.sunElevation],['Earth',sample.earthVisible,sample.earthAzimuth,sample.earthElevation]].map(([body,visible,azimuth,elevation]) => <tr key={body}><th>{body}</th><td>{visible == null ? '—' : visible ? 'Yes' : 'No'}</td><td>{metric(azimuth,'°')}</td><td>{metric(elevation,'°')}</td></tr>)}</tbody></table></div><p className="data-notice">Solar disk visibility: {percent(sample.sunDiskFraction)}</p></> : data?.visibilityStatus === 'loading' ? <LoadingState>Loading hourly visibility…</LoadingState> : <p className="empty-state">No hourly analysis was returned.</p>}
    </>}
    </div></div>
  </section>
}
