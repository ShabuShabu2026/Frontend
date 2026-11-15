import test from 'node:test'
import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { createLocatorCamera, fitLocatorCamera } from './locator-camera.js'
import { unprojectSite, globePosition } from './projection.js'
const camera=createLocatorCamera()
function onScreen(x,y) {
  const {latitude,longitude}=unprojectSite(x,y)
  return new Vector3(...globePosition(latitude,longitude)).project(camera)
}
test('the south pole is exactly in the center of the spherical locator',()=>{
 const pole=onScreen(0,0)
 assert.ok(Math.abs(pole.x)<1e-12)
 assert.ok(Math.abs(pole.y)<1e-12)
})
test('map up/down/right/left remain the same directions on the globe',()=>{
 for(const offset of [1000,152000,500000]){
  assert.ok(onScreen(0,offset).y>0)
  assert.ok(onScreen(0,-offset).y<0)
  assert.ok(onScreen(offset,0).x>0)
  assert.ok(onScreen(-offset,0).x<0)
  assert.ok(Math.abs(onScreen(0,offset).x)<1e-12)
  assert.ok(Math.abs(onScreen(offset,0).y)<1e-12)
 }
})
test('resizing keeps the pole centered and the sphere undistorted',()=>{
 for(const aspect of [.7,1,1.6]){
  fitLocatorCamera(camera,aspect)
  const pole=onScreen(0,0)
  assert.ok(Math.abs(pole.x)<1e-12&&Math.abs(pole.y)<1e-12)
  assert.ok(Math.abs((camera.right-camera.left)/(camera.top-camera.bottom)-aspect)<1e-12)
 }
})
