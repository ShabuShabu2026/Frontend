import { useMemo, useState } from 'react'
import { terrainHorizon } from '../lib/terrain-horizon.js'

// Break paths at north so a 359° → 1° crossing never draws across the chart.
function skyPath(hourly, body, y) {
  let previous = null
  return hourly.map(sample => {
    const azimuth = sample[`${body}Azimuth`], elevation = sample[`${body}Elevation`]
    if (!Number.isFinite(azimuth) || !Number.isFinite(elevation)) { previous = null; return '' }
    const normalized = ((azimuth % 360) + 360) % 360
    const command = previous == null || Math.abs(normalized-previous) > 180 ? 'M' : 'L'
    previous = normalized
    return `${command}${(normalized / 360 * 376).toFixed(2)},${y(elevation).toFixed(2)}`
  }).join(' ')
}
export default function SkyView({ hourly = [], terrain, terrainStatus, site, observerHeight = 0 }) {
  const [hour, setHour] = useState(0)
  const horizon = useMemo(() => terrainHorizon(terrain, site, observerHeight), [terrain, site, observerHeight])
  const valid = hourly.filter(item => ['sunAzimuth','sunElevation','earthAzimuth','earthElevation'].some(key => Number.isFinite(item[key])))
  if (!valid.length) return <section className="sky-view"><h3>Sky view from this site</h3><p className="empty-state">Sky view data is not available.</p></section>
  const index = Math.min(hour, hourly.length-1), sample = hourly[index]
  const values = [...hourly.flatMap(item => [item.sunElevation,item.earthElevation]), ...(horizon?.samples.map(item => item.elevation) ?? [])].filter(Number.isFinite)
  const min = Math.min(-5,...values), max = Math.max(10,...values)
  const y = elevation => 112 - (elevation-min)/(max-min)*100
  const segments = []
  for (const sample of horizon?.samples ?? []) {
    if (sample.elevation == null) { if (segments.at(-1)?.length) segments.push([]); continue }
    if (!segments.length) segments.push([])
    segments.at(-1).push([sample.azimuth / 360 * 376, y(sample.elevation)])
  }
  return <section className="sky-view"><div className="sky-heading"><h3>Sky view from this site</h3><small>{sample?.time ? new Date(sample.time).toLocaleString('en-US', { month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC' }) + ' UTC' : '—'}</small></div><svg viewBox="0 0 376 142" role="img" aria-label="Sun and Earth elevation by azimuth, north through east, south and west"><rect width="376" height="120" rx="4" fill="#26272c" /><g className="terrain-horizon">{segments.filter(points => points.length > 1).map((points, index) => <g key={index}><path d={`M${points.map(point => point.join(',')).join(' L')} L${points.at(-1)[0]},120 L${points[0][0]},120 Z`} fill="#71757e" fillOpacity=".35" /><path d={`M${points.map(point => point.join(',')).join(' L')}`} fill="none" stroke="#969ba6" strokeWidth="1.3" /></g>)}</g><line x1="0" x2="376" y1={y(0)} y2={y(0)} stroke="#686b74" strokeDasharray="3 4" /><text x="3" y={y(0)-4} fill="#969696" fontSize="8">0°</text><path d={skyPath(hourly,'sun',y)} fill="none" stroke="#d6b87a" strokeWidth="2.5" /><path d={skyPath(hourly,'earth',y)} fill="none" stroke="#8fa9c8" strokeWidth="2.5" strokeDasharray="6 5" />{['sun','earth'].map(body => Number.isFinite(sample?.[`${body}Azimuth`]) && Number.isFinite(sample?.[`${body}Elevation`]) ? <circle key={body} cx={((sample[`${body}Azimuth`]%360+360)%360)/360*376} cy={y(sample[`${body}Elevation`])} r="5" fill={body === 'sun' ? '#d6b87a' : '#8fa9c8'}><title>{body}: {sample[`${body}Elevation`]}° elevation</title></circle> : null)}{['N','E','S','W','N'].map((label,i) => <text key={i} x={i * 94} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'} y="138" fill="#969696" fontSize="10">{label}</text>)}</svg><div className="sky-legend"><span>● Sun path</span><span>● Earth path</span><span>{horizon ? '▲ Terrain horizon (LOLA)' : '— 0° elevation'}</span></div><small className="horizon-caption">{horizon ? `Local DEM only · sampled up to ${(horizon.maxDistance / 1000).toFixed(1)} km · height ${observerHeight} m` : terrainStatus === 'loading' ? 'Loading terrain horizon…' : 'Terrain horizon unavailable for this DEM.'}</small><input aria-label="Sky view time" type="range" min="0" max={Math.max(0,hourly.length-1)} value={index} onChange={event => setHour(Number(event.target.value))} /></section>
}
