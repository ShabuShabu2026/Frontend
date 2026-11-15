import { useEffect, useRef } from 'react'
import { earthVisibilityNotice } from '../lib/data-notices.js'

const project = 'https://github.com/ShabuShabu2026'
const analysisSources = [
  ['NASA LRO LOLA · PGDA 90', 'Elevation, slope, roughness and permanently shadowed regions used to evaluate landing sites.', 'https://pgda.gsfc.nasa.gov/products/90'],
  ['NASA JPL Horizons', 'Hourly Sun and Earth positions for January 2026 through December 2028.', 'https://ssd.jpl.nasa.gov/horizons/'],
  ['USGS Unified Geologic Map of the Moon · GIS v2', 'Geological units used by supported mission-goal scores.', 'https://asc-astropedia.s3.us-west-2.amazonaws.com/Moon/Geology/Unified_Geologic_Map_of_the_Moon_GIS_v2.zip'],
  ['USGS Moon Crater Database v1', 'Crater locations and sizes used for the impact-history mission goal.', 'https://astrogeology.usgs.gov/search/map/moon_crater_database_v1_salamuni_car'],
]
const validationSources = [
  ['NASA/MIT lunar illumination products', 'Average Sun and Earth visibility maps used to compare the analysis results.', 'https://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/'],
  ['NASA PGDA 78 · 5 m site DEMs', 'Selected high-resolution terrain used for horizon validation, rather than the main analysis grid.', 'https://pgda.gsfc.nasa.gov/products/78'],
]
const imagerySources = [
  ['NASA Moon Trek · LRO LOLA', 'South-polar shaded-relief tiles for the interactive map.', 'https://trek.nasa.gov/moon/'],
  ['LROC WAC Global Morphologic Map', 'Global surface imagery for the Moon locator. Moon Trek layer: LRO_WAC_Mosaic_Global_303ppd_v02.', 'https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLOBAL/'],
  ['NASA SVS CGI Moon Kit', 'LRO LROC/LOLA imagery used for the home-page Moon visual.', 'https://svs.gsfc.nasa.gov/4720/'],
]
function Sources({ title, sources }) {
  return <div className="info-block"><h4>{title}</h4><ul className="info-sources">{sources.map(([name, description, href]) => <li key={name}><a href={href} target="_blank" rel="noreferrer">{name} <span aria-hidden="true">↗</span></a><p>{description}</p></li>)}</ul></div>
}
function HowItWorks() {
  return <><p className="info-intro">From your mission plan to a landing spot at the lunar south pole.</p><ol className="info-steps"><li><h4>Plan your trip</h4><p>Choose your trip purpose, arrival date, stay duration and a crewed or robotic mission. Use advanced settings to adjust what matters most, power and Earth-link needs, and landing rules.</p></li><li><h4>Compare landing spots</h4><p>Explore ranked sites south of 85°S. Compare Best fit, Most sunlight and Best Earth view. Moving or zooming the map refreshes the spots in the visible area.</p></li><li><h4>Explore a site</h4><p>Open Overview for scores, landing rules and the 3D terrain. Use Sun &amp; Earth to inspect sky paths, hourly visibility and the longest periods without sunlight or an Earth signal. Review the best arrival day within your flexible date range.</p></li></ol><div className="info-block"><h4>How recommendations are calculated</h4><p>The backend evaluates 72,297 base-grid sites, with refined analysis in the visible region. It checks each hour of your stay against terrain horizons traced in 720 directions, up to 100 km, at the selected observer height.</p><p>Earth link, flatness, roughness, sunlight and supported mission goals contribute to a score weighted by your priorities. Sunlight and Earth-link scores also account for the longest interruption.</p><p>Mission-goal scores are available for polar volatiles, planetary processes and impact history. Other goals use the four shared criteria.</p></div></>
}
function Data() {
  return <><p className="info-intro">The terrain, sky positions and reference maps behind HoneyMoon.</p><Sources title="Analysis data" sources={analysisSources} /><Sources title="Validation data" sources={validationSources} /><Sources title="Map and visual imagery" sources={imagerySources} /><div className="info-block info-data-limits"><h4>Resolution and interpretation</h4><p>The main terrain analysis uses an 80 m DEM. Features smaller than that resolution, including individual boulders, are not modeled. Observer heights are 1, 5 or 10 m.</p><p>The Sky view terrain outline is calculated from the local DEM returned for the site. The backend visibility analysis uses a larger terrain-horizon range.</p><p>{earthVisibilityNotice}</p></div></>
}
function About() {
  return <><p className="info-eyebrow">NASA Space Apps Challenge 2026 · Seoul</p><h4 className="info-project-name">HoneyMoon</h4><p className="info-intro">Lunar Landing Site Navigator</p><p>HoneyMoon helps you compare lunar south-pole landing sites and find the best arrival day for your mission. It brings terrain, sunlight and Earth visibility together so you can see the tradeoffs behind each recommendation.</p><div className="info-block"><h4>Team ShabuShabu</h4><dl className="info-team"><div><dt>Jimin Shin</dt><dd>Frontend</dd></div><div><dt>Sanghyun Kim</dt><dd>Aerospace Engineer</dd></div><div><dt>Youngeun Seol</dt><dd>Backend</dd></div></dl></div><p>Built for the “Lunar Landing Site Navigator” challenge at NASA Space Apps Challenge 2026 in Seoul.</p></>
}
export default function HomeInfoDialog({ topic, onClose }) {
  const dialog = useRef(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    const previous = document.activeElement
    const root = document.getElementById('root'), overflow = root?.style.overflow
    if (root) root.style.overflow = 'hidden'
    dialog.current.querySelector('button').focus()
    function keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); return }
      if (event.key !== 'Tab') return
      const controls = [...dialog.current.querySelectorAll('a[href], button:not([disabled])')]
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown, true)
    return () => { document.removeEventListener('keydown', keydown, true); if (root) root.style.overflow = overflow; previous?.focus() }
  }, [])
  return <div className="info-overlay" onClick={onClose}><section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="home-info-title" ref={dialog} onClick={event => event.stopPropagation()}><div className="info-dialog-header"><h3 id="home-info-title">{topic}</h3><button type="button" aria-label={`Close ${topic}`} onClick={onClose}>✕</button></div><div className="info-dialog-body">{topic === 'How it works' ? <HowItWorks /> : topic === 'Data' ? <Data /> : <About />}</div><footer className="info-dialog-footer"><a href={project} target="_blank" rel="noreferrer">Read the project README <span aria-hidden="true">↗</span></a></footer></section></div>
}
