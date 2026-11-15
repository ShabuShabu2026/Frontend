import { useEffect, useRef, useState } from 'react'
import { moonTiles } from '../lib/moon-tiles.js'
export default function MoonBasemap({ bbox }) {
  const element = useRef(null)
  const [width,setWidth]=useState(800)
  useEffect(()=>{ const observer=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width)); observer.observe(element.current);return ()=>observer.disconnect() },[])
  return <div className="moon-basemap" ref={element} aria-label="NASA LRO LOLA south polar shaded-relief basemap">
    {moonTiles(bbox,width).map(layer=><div className="nasa-tile-layer" key={layer.name} data-layer={layer.name}>{layer.tiles.map(tile=><img key={tile.key} src={tile.url} alt="" draggable="false" className="nasa-moon-tile" style={{left:`${tile.left}%`,top:`${tile.top}%`,width:`calc(${tile.width}% + 0.75px)`,height:`calc(${tile.height}% + 0.75px)`}} onError={event=>{event.currentTarget.style.visibility='hidden'}} />)}</div>)}
  </div>
}
