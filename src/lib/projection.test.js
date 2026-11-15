import test from 'node:test'
import assert from 'node:assert/strict'
import {projectSite,unprojectSite,globePosition,viewportOutline} from './projection.js'
test('locator inversion matches the analysis projection including longitude quadrants',()=>{
 for(const [lat,lon] of [[-90,0],[-86.8,-156.9],[-85,120],[-60,45],[-75,-90]]){
  const point=projectSite(lat,lon),back=unprojectSite(point.x,point.y)
  assert.ok(Math.abs(lat-back.latitude)<1e-9)
  if(lat!==-90)assert.ok(Math.abs(lon-back.longitude)<1e-9)
 }
})
test('locator outlines the current viewport on the spherical surface',()=>{
 const box={xmin:-152000,ymin:-152000,xmax:152000,ymax:152000}
 const line=viewportOutline(box)
 assert.equal(line.length,4*24*3)
 for(let i=0;i<line.length;i+=3)assert.ok(Math.abs(Math.hypot(...line.slice(i,i+3))-1.012)<1e-9)
 const south=globePosition(-90,0)
 assert.ok(Math.abs(south[1]+1)<1e-10)
 const small=viewportOutline({xmin:-1000,ymin:-1000,xmax:1000,ymax:1000})
 assert.ok(Math.abs(small[1])>Math.abs(line[1]))
})
