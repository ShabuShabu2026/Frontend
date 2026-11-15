import test from 'node:test'
import assert from 'node:assert/strict'
import { analysisPayload, createApiServices } from './api.js'
import { defaults, objectives } from './mission.js'

function mockApi(handler) {
  return createApiServices({ baseUrl: 'https://example.test', retryDelays: [], fetchImpl: async (url, options) => {
    const data = await handler(new URL(url), options)
    return { ok: true, json: async () => data }
  } })
}
test('analysis sends API enum codes, all constraints and exact integer priorities', () => {
  const config = { ...defaults, missionType: 'Uncrewed', objective: objectives[1], uncrewedConstraints: true, batteryEndurance: 0, maximumBlackout: 12, priorities: { ...defaults.priorities, Communication: 1 } }
  const payload = analysisPayload(config)
  assert.equal(payload.stayDays, 6)
  assert.equal(payload.limit, 20)
  assert.equal(payload.objective, 'POLAR_VOLATILES')
  assert.equal(payload.missionType, 'UNCREWED')
  assert.deepEqual(payload.advanced.importanceWeights, [1, 5, 5, 3, 3])
  assert.deepEqual(payload.advanced.uncrewedConstraints, { enabled: true, batteryEnduranceHours: 0, maxCommBlackoutHours: 12 })
  assert.equal(payload.advanced.sunVisibilityCriterion, 'HALF_DISK')
  assert.equal(payload.advanced.earthVisibilityCriterion, 'CENTER_DELTA')
})
test('weights query and analysis adapt null Other and marginal candidates', async () => {
  const api = mockApi((url, options) => {
    if (url.pathname === '/weights') {
      assert.equal(url.searchParams.get('importanceWeights'), '3,5,5,3,3')
      return { importance: [3,5,5,3,null], normalizedWeights: [.1875,.3125,.3125,.1875,null] }
    }
    assert.equal(JSON.parse(options.body).objective, 'GENERAL')
    return { analysisId: 'a', candidates: [{siteId:'s', lat:-89, lon:20, status:'MARGINAL', suitability:72}], appliedImportance:[3,5,5,3,null], normalizedWeights:[.1875,.3125,.3125,.1875,null] }
  })
  assert.equal((await api.getWeights(defaults)).weights.Other, null)
  const result = await api.analyze(defaults)
  assert.equal(result.candidates[0].id, 's')
  assert.equal(result.candidates[0].status, 'Marginal')
  assert.equal(result.candidates[0].latitude, -89)
})
test('details preserve excluded scores and DEM holes, and use alternate-date visibility', async () => {
  const api = mockApi((url) => {
    if (url.pathname.endsWith('/terrain')) return { heights: [[1,null],[2,3]], resolution_m:80, coordinate_system:{crs_wkt:'Moon'} }
    if (url.pathname.endsWith('/visibility')) {
      assert.equal(url.searchParams.get('landingDate'), '2027-03-06')
      return { visibility:{sunlightRatio:.4}, passed:false, hourly:[{time:'2027-03-06T00:00:00Z',sunAzimuthDeg:10,sunDiskVisibleFraction:0,sunVisible:false}] }
    }
    return {suitability:null, passed:false, scores:null, exclusionReasons:['Slope'], terrain:{slopeDeg:8, roughnessM:1}, importance:[3,5,5,3,null], normalizedWeights:[.1875,.3125,.3125,.1875,null]}
  })
  const data = await api.getSiteDetails({analysisId:'a',siteId:'s',landingDate:'2027-03-06'})
  assert.equal(data.suitability, null)
  assert.equal(data.scores.Flatness, null)
  assert.equal(data.terrain.elevations[0][1], null)
  assert.equal(data.hourly[0].sunAzimuth, 10)
  assert.equal(data.hourly[0].sunDiskFraction, 0)
  assert.equal(data.sunVisibility, .4)
})
test('optional terrain failure keeps detail and visibility available', async () => {
  const api = mockApi((url) => {
    if (url.pathname.endsWith('/terrain')) throw new Error('Offline')
    if (url.pathname.endsWith('/visibility')) return {hourly:[], visibility:{sunlightRatio:.9}}
    return {suitability:80, terrain:{slopeDeg:2}}
  })
  const data = await api.getSiteDetails({analysisId:'a', siteId:'s', landingDate:'2027-03-05'})
  assert.equal(data.suitability, 80)
  assert.equal(data.terrain, null)
  assert.equal(data.notices.length, 1)
})
test('structured server errors reach the user', async () => {
  const api = createApiServices({fetchImpl:async () => ({ok:false,status:409,json:async () => ({error:{code:'ANALYSIS_VERSION_CHANGED',message:'Run a new analysis.'}})})})
  await assert.rejects(api.analyze(defaults), /Run a new analysis/)
})
test('viewport requests send bbox and map recommendations', async () => {
  const api = mockApi((url) => {
    assert.equal(url.searchParams.get('bbox'), '-10,-20,10,20')
    assert.equal(url.searchParams.get('limit'), '20')
    assert.ok(url.pathname.endsWith('/recommendations'))
    return url.pathname.endsWith('/grid') ? {sites:{ids:[]}} : {recommendations:[{siteId:'region',lat:-90,lon:0}]}
  })
  const result = await api.getRegion({analysisId:'a',bbox:{xmin:-10,ymin:-20,xmax:10,ymax:20}})
  assert.equal(result.candidates[0].id, 'region')
})

test('map projection matches a real server candidate in meters', async () => {
  const {projectSite} = await import('./projection.js')
  const point = projectSite(-86.8094580328954, -156.87915133757528)
  assert.ok(Math.abs(point.x - -38000) < .001)
  assert.ok(Math.abs(point.y - -89000) < .001)
})

test('terrain and overview appear progressively without waiting for visibility',async()=>{
 let releaseVisibility
 const patches=[]
 const pendingVisibility=new Promise(resolve=>{releaseVisibility=resolve})
 const api=mockApi(url=>{
  if(url.pathname.endsWith('/terrain'))return {heights:[[1,2],[3,4]],resolution_m:80}
  if(url.pathname.endsWith('/visibility'))return pendingVisibility
  return {suitability:80,terrain:{slopeDeg:2}}
 })
 let finished=false
 const request=api.getSiteDetails({analysisId:'a',siteId:'s',landingDate:'2027-03-05'},{onProgress:patch=>patches.push(patch)}).then(data=>{finished=true;return data})
 await new Promise(resolve=>setImmediate(resolve))
 assert.equal(finished,false)
 assert.ok(patches.some(p=>p.terrainStatus==='ready'))
 assert.ok(patches.some(p=>p.overviewStatus==='ready'))
 releaseVisibility({visibility:{sunlightRatio:1},hourly:[]})
 const result=await request
 assert.equal(result.terrainStatus,'ready')
 assert.equal(result.visibilityStatus,'ready')
})
test('terrain failure and a successful empty DEM are distinct states',async()=>{
 for(const failed of [true,false]){
  const api=mockApi(url=>{
   if(url.pathname.endsWith('/terrain')){if(failed)throw new Error('Unavailable');return {heights:[],resolution_m:80}}
   if(url.pathname.endsWith('/visibility'))return {hourly:[]}
   return {suitability:80}
  })
  const result=await api.getSiteDetails({analysisId:'a',siteId:'s'})
  assert.equal(result.terrainStatus,failed?'error':'empty')
  assert.equal(Boolean(result.terrainError),failed)
 }
})
test('canceled site requests never publish stale progress',async()=>{
 let release
 const deferred=new Promise(resolve=>{release=resolve})
 const controller=new AbortController(),patches=[]
 const api=mockApi(()=>deferred)
 const promise=api.getSiteDetails({analysisId:'a',siteId:'s'},{signal:controller.signal,onProgress:patch=>patches.push(patch)})
 controller.abort();release({})
 await assert.rejects(promise,{name:'AbortError'})
 assert.deepEqual(patches,[])
})
