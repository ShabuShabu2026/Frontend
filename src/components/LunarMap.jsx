import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { metric } from '../lib/mission'

import MoonBasemap from './MoonBasemap.jsx'

import { projectSite } from '../lib/projection.js'
import { polarExtent, polarRadius, constrainPolarView } from '../lib/polar-view.js'
import { createCandidateIndex, selectAreaCandidates, createRegionQueue, createAreaIndex, summarizeArea, mergeViewportSites } from '../lib/region-candidates.js'

const MoonLocator = lazy(() => import('./MoonLocator.jsx'))

// The map itself covers only the polar cap south of 85°S (about 300 km across).
const defaultBbox = polarExtent

export default function LunarMap({ result, selected, focused, onSelect, onReset, services, onRegion, onRegionStatus }) {
  const surface = useRef(null)
  const drag = useRef(null)
  const cameraAnimation = useRef(null)
  const [viewport, updateViewport] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const bbox = viewport ?? defaultBbox
  const analysisId = result?.analysisId
  const [initialCandidates] = useState(() => result?.candidates ?? [])
  const analysisSites = result?.sites
  const exclusionLegend = result?.exclusionCodeLegend
  const index=useMemo(()=>createCandidateIndex({ sites: analysisSites, candidates: initialCandidates, exclusionCodeLegend: exclusionLegend }),[analysisSites, initialCandidates, exclusionLegend])
  const areaIndex=useMemo(()=>createAreaIndex({sites:analysisSites}),[analysisSites])
  const summary=useMemo(()=>summarizeArea(areaIndex,bbox,result?.bbox,result?.exclusionCodeLegend),[areaIndex,bbox,result?.bbox,result?.exclusionCodeLegend])
  const queue=useRef(null)
  useEffect(()=>{
    if(!analysisId||!services?.getRegion)return
    queue.current=createRegionQueue({mergeCandidates:mergeViewportSites,load:(query,options)=>services.getRegion(query,options),onData:onRegion,onStatus:status=>{setBusy(status.busy);setError(status.error??'');onRegionStatus?.(status)}})
    return ()=>{queue.current?.dispose();queue.current=null}
  },[analysisId,services,onRegion,onRegionStatus])
  useEffect(()=>{
    if(!viewport||!queue.current)return
    const local=selectAreaCandidates(index,viewport)
    // The viewport is not clipped to the initial analysis response's bbox.
    queue.current.update({analysisId,bbox:viewport,summary},local)
  },[analysisId,viewport,services,onRegion,onRegionStatus,result?.bbox,index,summary])
  const currentBox = useRef(bbox)
  useEffect(() => { currentBox.current = bbox }, [bbox])
  function setViewport(next) {
    const box = next ? constrainPolarView(next) : null
    currentBox.current = box ?? defaultBbox
    updateViewport(box)
  }
  function moveCamera(target, animate = false) {
    target = constrainPolarView(target)
    cancelAnimationFrame(cameraAnimation.current)
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setViewport(target); return }
    const initial = currentBox.current, start = performance.now()
    const step = (now) => {
      const progress = Math.min(1, (now - start) / 650)
      const eased = 1 - (1 - progress) ** 3
      setViewport(Object.fromEntries(Object.keys(target).map(key => [key, initial[key] + (target[key] - initial[key]) * eased])))
      if (progress < 1) cameraAnimation.current = requestAnimationFrame(step)
    }
    cameraAnimation.current = requestAnimationFrame(step)
  }
  useEffect(() => {
    if (!focused || !selected || !result?.bbox) return
    const point = Number.isFinite(selected.x) ? selected : projectSite(selected.latitude, selected.longitude)
    const width = Math.max(4000,(result.bbox.xmax - result.bbox.xmin) / 6)
    const height = width * (result.bbox.ymax - result.bbox.ymin) / (result.bbox.xmax - result.bbox.xmin)
    const initial = currentBox.current, target = { xmin: point.x-width/2,xmax:point.x+width/2,ymin:point.y-height/2,ymax:point.y+height/2 }
    const start=performance.now(), reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const step=(now)=>{
      const progress=reduced?1:Math.min(1,(now-start)/650), eased=1-(1-progress)**3
      setViewport(Object.fromEntries(Object.keys(target).map(key=>[key,initial[key]+(target[key]-initial[key])*eased])))
      if(progress<1)cameraAnimation.current=requestAnimationFrame(step)
    }
    cameraAnimation.current=requestAnimationFrame(step)
    return ()=>cancelAnimationFrame(cameraAnimation.current)
  }, [focused, selected, result?.bbox])
  const mapCandidates = result?.candidates ?? []
  const markers = selected && !mapCandidates.some((site) => site.id === selected.id) ? [...mapCandidates, selected] : mapCandidates
  function zoom(factor, dx = 0, dy = 0) {
    const width = Math.max(1000,Math.min(2 * polarRadius,(bbox.xmax - bbox.xmin) * factor)), height = width * (bbox.ymax - bbox.ymin) / (bbox.xmax - bbox.xmin)
    const center = { x: (bbox.xmin + bbox.xmax) / 2, y: (bbox.ymin + bbox.ymax) / 2 }
    const x = center.x ?? projectSite(center.latitude, center.longitude).x
    const y = center.y ?? projectSite(center.latitude, center.longitude).y
    moveCamera({ xmin: x - width / 2 + dx * width, xmax: x + width / 2 + dx * width, ymin: y - height / 2 + dy * height, ymax: y + height / 2 + dy * height }, true)
  }
  function reset() {
    if (!result) { cancelAnimationFrame(cameraAnimation.current); setViewport(null); onReset(); return }
    moveCamera(defaultBbox, true); onReset()
  }
  useEffect(() => {
    const node=surface.current
    const wheel=(event)=>{
      if(event.target.closest('button'))return
      event.preventDefault();cancelAnimationFrame(cameraAnimation.current)
      const box=currentBox.current, rect=node.getBoundingClientRect(), fx=(event.clientX-rect.left)/rect.width, fy=(event.clientY-rect.top)/rect.height
      const width=Math.max(1000,Math.min(2 * polarRadius,(box.xmax-box.xmin)*Math.exp(event.deltaY*.0015)))
      const height=width*(box.ymax-box.ymin)/(box.xmax-box.xmin)
      const x=box.xmin+fx*(box.xmax-box.xmin),y=box.ymax-fy*(box.ymax-box.ymin)
      setViewport({xmin:x-fx*width,xmax:x+(1-fx)*width,ymin:y-(1-fy)*height,ymax:y+fy*height})
    }
    node.addEventListener('wheel',wheel,{passive:false})
    return ()=>{node.removeEventListener('wheel',wheel);cancelAnimationFrame(cameraAnimation.current)}
  }, [])
  function startDrag(event) {
    if(event.target.closest('button')||event.button!==0)return
    cancelAnimationFrame(cameraAnimation.current)
    drag.current={x:event.clientX,y:event.clientY,bbox:currentBox.current}
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function moveDrag(event) {
    if(!drag.current)return
    const {x,y,bbox:box}=drag.current, rect=event.currentTarget.getBoundingClientRect()
    const dx=(event.clientX-x)/rect.width*(box.xmax-box.xmin),dy=(event.clientY-y)/rect.height*(box.ymax-box.ymin)
    setViewport({xmin:box.xmin-dx,xmax:box.xmax-dx,ymin:box.ymin+dy,ymax:box.ymax+dy})
  }
  return <section className={`lunar-map ${result ? 'candidates-map' : 'configuration'}`} aria-label="Lunar South Pole Map">
      <div className="projected-map" style={{aspectRatio: (bbox.xmax-bbox.xmin)/(bbox.ymax-bbox.ymin)}} ref={surface} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
        <div className="polar-map-coverage" style={{ clipPath: `ellipse(${polarRadius / (bbox.xmax-bbox.xmin) * 100}% ${polarRadius / (bbox.ymax-bbox.ymin) * 100}% at ${-bbox.xmin / (bbox.xmax-bbox.xmin) * 100}% ${bbox.ymax / (bbox.ymax-bbox.ymin) * 100}%)` }}><MoonBasemap bbox={bbox} /></div>

        {markers.map((site) => {
          const point = Number.isFinite(site.x) ? site : projectSite(site.latitude, site.longitude)
          if (Math.hypot(point.x, point.y) > polarRadius) return null
          const x = (point.x - bbox.xmin) / (bbox.xmax - bbox.xmin) * 100
          const y = (bbox.ymax - point.y) / (bbox.ymax - bbox.ymin) * 100
          if (x < 0 || x > 100 || y < 0 || y > 100) return null
          return <div key={site.id} className={`map-annotation ${site.passed === false ? 'excluded' : site.status === 'Marginal' ? 'marginal' : 'feasible'} ${selected?.id === site.id ? 'is-selected' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}>
            <button className="spot-callout" onClick={() => onSelect(site)} aria-label={`View ${site.id}`}><strong>{site.id}</strong><span className="spot-summary"><span>{site.status}</span><b>{metric(site.suitability, '%')}</b></span></button>
            <button className="spot-marker" onClick={() => onSelect(site)} aria-label={`Select ${site.id}`} />
          </div>
        })}
      </div>
      <Suspense fallback={null}><MoonLocator bbox={bbox} /></Suspense>
      <div className="map-controls" aria-label="Map controls"><button onClick={() => zoom(.5)}>+ Zoom in</button><button onClick={() => zoom(2)}>− Zoom out</button><button onClick={() => zoom(1, -.25)} aria-label="Pan west">←</button><button onClick={() => zoom(1, .25)} aria-label="Pan east">→</button><button onClick={() => zoom(1, 0, .25)} aria-label="Pan north">↑</button><button onClick={() => zoom(1, 0, -.25)} aria-label="Pan south">↓</button><button onClick={reset}>Reset view</button></div>
      <p className="map-legend">NASA / LRO LOLA DEM · 85°S–90°S{busy && ' · Loading region…'}<br /><span>{result?'Gray points: constraints not met · ':''}Drag to pan · Scroll to zoom</span></p>
      {error && <p role="alert" className="map-notice">{error}</p>}
  </section>
}
