// Lunar south polar stereographic: sphere R=1737400m, central meridian 0°.
export function projectSite(lat, lon) {
  const rho = 2 * 1737400 * Math.tan((90 + lat) * Math.PI / 360)
  return { x: rho * Math.sin(lon * Math.PI / 180), y: rho * Math.cos(lon * Math.PI / 180) }
}

export function unprojectSite(x, y) {
  const radius = Math.hypot(x, y)
  return { latitude: -90 + 2 * Math.atan(radius / (2 * 1737400)) * 180 / Math.PI, longitude: radius ? Math.atan2(x,y) * 180 / Math.PI : 0 }
}
export function globePosition(latitude, longitude, radius = 1) {
  const lat = latitude * Math.PI / 180, lon = longitude * Math.PI / 180
  return [radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon)]
}
export function viewportOutline(bbox, steps = 24) {
  const points=[]
  for(let edge=0;edge<4;edge++) for(let i=0;i<steps;i++) {
    const t=i/steps
    const x=edge===0 ? bbox.xmin+t*(bbox.xmax-bbox.xmin) : edge===1 ? bbox.xmax : edge===2 ? bbox.xmax-t*(bbox.xmax-bbox.xmin) : bbox.xmin
    const y=edge===0 ? bbox.ymax : edge===1 ? bbox.ymax-t*(bbox.ymax-bbox.ymin) : edge===2 ? bbox.ymin : bbox.ymin+t*(bbox.ymax-bbox.ymin)
    const {latitude,longitude}=unprojectSite(x,y)
    points.push(...globePosition(latitude,longitude,1.012))
  }
  return points
}
