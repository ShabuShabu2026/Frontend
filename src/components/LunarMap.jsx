import { metric } from '../lib/mission'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
export default function LunarMap({ result, selected, focused, onSelect, onReset }) {
  const points = (result?.mapImageUrl ? result.mapSites ?? [] : []).filter((site) => Number.isFinite(site.mapXPercent) && Number.isFinite(site.mapYPercent))
  const focus = focused && points.find((site) => site.id === selected?.id)
  const scale = focus ? 1.7 : 1
  const x = focus ? clamp(50 - focus.mapXPercent * scale, (1 - scale) * 100, 0) : 0
  const y = focus ? clamp(55 - focus.mapYPercent * scale, (1 - scale) * 100, 0) : 0
  return <section className={`lunar-map ${result ? 'candidates-map' : 'configuration'}`} aria-label="Lunar South Pole Map">
    <div className="terrain"><div className="map-camera" style={{ transform: `translate(${x}%, ${y}%) scale(${scale})`, '--annotation-scale': 1 / scale }}>
      {result ? <img className="terrain-image" src={result.mapImageUrl ?? '/figma/listimgImage2.png'} alt="Lunar south pole terrain" /> : <img className="moon" src="/figma/imgImage1.png" alt="Lunar south pole" />}
      {points.map((site) => {
        const active = selected?.id === site.id
        const tone = site.passed === false ? 'excluded' : site.status === 'Marginal' ? 'marginal' : 'feasible'
        const status = site.passed === false ? 'Excluded' : site.status ?? '—'
        return <div key={site.id} className={`map-annotation ${tone} ${active ? 'is-selected' : ''}`} style={{ left: `${site.mapXPercent}%`, top: `${site.mapYPercent}%` }}>
          <button type="button" className="spot-callout" aria-label={`View ${site.id}, ${status}, ${metric(site.suitability, '%')}`} aria-pressed={active} onClick={() => onSelect(site)}>
            <strong>{site.id}</strong><span className="spot-summary"><span><i />{status}</span><b>{metric(site.suitability, '%')}</b></span>
          </button>
          <button type="button" className="spot-marker" aria-label={`Select ${site.id}`} aria-pressed={active} title={[site.id, ...(site.exclusionReasons ?? [])].join(' · ')} onClick={() => onSelect(site)} />
        </div>
      })}
    </div></div>
    {focus && <button type="button" className="map-reset" onClick={onReset}>↗ Reset view</button>}
    {result && !points.length && <p className="map-notice">Georeferenced map data is not available.</p>}
  </section>
}
