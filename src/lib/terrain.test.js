import test from 'node:test'
import assert from 'node:assert/strict'
import { terrainMesh } from './terrain.js'
import { moonTiles } from './moon-tiles.js'
test('DEM mesh retains metric horizontal and vertical scale',()=>{
 const mesh=terrainMesh({elevations:[[100,110],[120,130]],spacing:80})
 assert.deepEqual(mesh.positions,[-40,-15,-40,40,-5,-40,-40,5,40,40,15,40])
 assert.equal(mesh.indices.length,6)
 assert.equal(mesh.width,80)
 assert.equal(mesh.max-mesh.min,30)
})
test('DEM holes are not filled with fabricated elevations or faces',()=>{
 const mesh=terrainMesh({elevations:[[1,null],[2,3]],spacing:80})
 assert.equal(mesh,null)
 assert.equal(terrainMesh({elevations:[[1,2],[2,3]],spacing:0}),null)
})
test('NASA tiles refine on zoom and remain in the south polar coordinate system',()=>{
 const broad=moonTiles({xmin:-152000,ymin:-152000,xmax:152000,ymax:152000},800)
 const fine=moonTiles({xmin:-2000,ymin:-2000,xmax:2000,ymax:2000},800)
 assert.equal(broad.length,1)
 assert.equal(fine.length,1)
 assert.ok(fine[0].tiles.every(t=>t.url.includes('SPole875_5mp_v04')))
 assert.ok(broad[0].tiles.length<100)
 for(const layer of fine) for(const tile of layer.tiles) assert.ok(Number.isFinite(tile.left)&&tile.width>0)
})

test('the entry overview is a real broad DEM service, not the static image',()=>{
 const overview=moonTiles({xmin:-1150000,ymin:-1150000,xmax:1150000,ymax:1150000},800)
 assert.equal(overview.length,1)
 assert.equal(overview[0].name,'LRO_LOLA_Shade_SPole45_100mp_v04')
 assert.ok(overview[0].tiles.length>0)
 assert.ok(overview[0].tiles.every(tile=>tile.url.startsWith('https://trek.nasa.gov/tiles/Moon/SP/')))
})
