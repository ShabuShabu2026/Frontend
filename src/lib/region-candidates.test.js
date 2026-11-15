import test from 'node:test'
import assert from 'node:assert/strict'
import {createCandidateIndex,selectAreaCandidates,createRegionQueue,createAreaIndex,summarizeArea,mergeViewportSites} from './region-candidates.js'
const tick=()=>new Promise(resolve=>setTimeout(resolve,5))
const query=(x)=>({analysisId:'a',bbox:{xmin:x,ymin:0,xmax:x+20,ymax:20}})
test('panning selects actual scored sites from the original analysis instantly',()=>{
 const sites={ids:[],lat:[],lon:[],x:[],y:[],suitability:[],passed:[]}
 for(let i=0;i<60;i++){sites.ids.push('LSP-'+i);sites.lat.push(-89);sites.lon.push(0);sites.x.push(i);sites.y.push(10);sites.suitability.push(100-i);sites.passed.push(i!==25)}
 const index=createCandidateIndex({sites})
 const result=selectAreaCandidates(index,{xmin:20,ymin:0,xmax:50,ymax:20})
 assert.equal(result.length,20)
 assert.ok(result.every(p=>p.x>=20&&p.x<=50&&p.id!=='LSP-25'))
 assert.ok(result.every(p=>p.suitability===100-Number(p.id.slice(4))))
 assert.ok(selectAreaCandidates(index,{xmin:200,ymin:0,xmax:220,ymax:20}).length===0)
})
test('area requests never overlap and only the most recent queued viewport runs',async()=>{
 const calls=[],updates=[],finish=[]
 const queue=createRegionQueue({delay:0,load:request=>{calls.push(request);return new Promise(resolve=>finish.push(resolve))},onData:data=>updates.push(data),onStatus:()=>{}})
 queue.update(query(0),['local-a']);await tick()
 queue.update(query(10),['local-b']);await tick()
 queue.update(query(20),['local-c']);await tick()
 assert.equal(calls.length,1)
 assert.deepEqual(updates.at(-1),['local-c'])
 finish[0]({candidates:['old-server']});await tick()
 assert.equal(calls.length,2)
 assert.equal(calls[1].bbox.xmin,20)
 assert.ok(!updates.some(u=>u.includes('old-server')))
 finish[1]({candidates:['current-server']});await tick()
 assert.deepEqual(updates.at(-1),['current-server'])
 queue.update(query(20));await tick()
 assert.equal(calls.length,2)
 assert.deepEqual(updates.at(-1),['current-server'])
 queue.dispose()
})
test('a delayed or failed refresh never erases valid local area results',async()=>{
 const updates=[],states=[]
 const queue=createRegionQueue({delay:0,load:async()=>{throw new Error('Timed out')},onData:data=>updates.push(data),onStatus:state=>states.push(state)})
 queue.update(query(0),['real-scored-site']);await tick()
 assert.deepEqual(updates.at(-1),['real-scored-site'])
 assert.equal(states.at(-1).error,'')
 assert.match(states.at(-1).notice,/existing analysis results/)
 queue.dispose()
})
test('disposing the analysis stops pending work and stale callbacks',async()=>{
 const updates=[];let finish,signal
 const queue=createRegionQueue({delay:0,load:(_,options)=>{signal=options.signal;return new Promise(resolve=>finish=resolve)},onData:data=>updates.push(data),onStatus:()=>{}})
 queue.update(query(0));await tick();queue.dispose()
 assert.equal(signal.aborted,true)
 finish({candidates:['stale']});await tick();assert.deepEqual(updates,[])
})

test('outside coverage, missing samples and excluded samples are distinct',()=>{
 const sites={ids:['a','b'],lat:[-89,-89],lon:[0,0],x:[5,10],y:[5,10],passed:[false,false],exclusionCodes:[['SLOPE'],['SUN','SLOPE']]}
 const points=createAreaIndex({sites}),domain={xmin:0,ymin:0,xmax:20,ymax:20}
 const excluded=summarizeArea(points,domain,domain,{SLOPE:'Slope limit exceeded',SUN:'Continuous sunlight interrupted'})
 assert.equal(excluded.kind,'excluded');assert.equal(excluded.total,2);assert.equal(excluded.passed,0)
 assert.deepEqual(excluded.reasons[0],['Slope limit exceeded',2])
 assert.ok(excluded.excludedSites.every(p=>p.passed===false&&p.suitability===null))
 assert.equal(summarizeArea(points,{xmin:30,ymin:30,xmax:40,ymax:40},domain).kind,'outside')
 assert.equal(summarizeArea(points,{xmin:15,ymin:15,xmax:20,ymax:20},domain).kind,'unsampled')
})
test('empty server recommendations cannot wipe valid existing-grid candidates or their cache',async()=>{
 const updates=[],queue=createRegionQueue({delay:0,load:async()=>({candidates:[]}),onData:data=>updates.push(data),onStatus:()=>{}})
 queue.update(query(0),['valid-grid-site']);await tick()
 assert.deepEqual(updates.at(-1),['valid-grid-site'])
 queue.update(query(0),['valid-grid-site']);await tick()
 assert.deepEqual(updates.at(-1),['valid-grid-site'])
 queue.dispose()
})

test('a viewport with only excluded sites still displays 20 real sites',()=>{
 const sites={ids:[],lat:[],lon:[],x:[],y:[],passed:[],suitability:[],exclusionCodes:[]}
 for(let i=0;i<40;i++){sites.ids.push('E-'+i);sites.lat.push(-89);sites.lon.push(0);sites.x.push(i);sites.y.push(10);sites.passed.push(false);sites.suitability.push(null);sites.exclusionCodes.push(['SLOPE'])}
 const points=createCandidateIndex({sites,exclusionCodeLegend:{SLOPE:'Slope exceeds the limit'}})
 assert.equal(points.length,40)
 const a=selectAreaCandidates(points,{xmin:0,ymin:0,xmax:20,ymax:20}),b=selectAreaCandidates(points,{xmin:20,ymin:0,xmax:40,ymax:20})
 assert.equal(a.length,20);assert.equal(b.length,20)
 assert.ok(a.every(p=>p.passed===false&&p.status==='Excluded'&&p.suitability===null))
 assert.deepEqual(a[0].exclusionReasons,['Slope exceeds the limit'])
 assert.notDeepEqual(a.map(p=>p.id),b.map(p=>p.id))
})
test('server passed-only recommendations are supplemented with excluded viewport sites',()=>{
 const bbox={xmin:0,ymin:0,xmax:50,ymax:50}
 const local=Array.from({length:20},(_,i)=>({id:'S-'+i,x:i*2,y:10,passed:false,suitability:null}))
 const remote=[{id:'P-1',x:5,y:20,passed:true,suitability:70}]
 const combined=mergeViewportSites(remote,local,bbox)
 assert.equal(combined.length,20)
 assert.ok(combined.some(p=>p.id==='P-1'))
 assert.ok(combined.some(p=>p.passed===false))
 assert.equal(new Set(combined.map(p=>p.id)).size,20)
 assert.equal(mergeViewportSites(remote,local,{xmin:100,ymin:100,xmax:110,ymax:110}).length,0)
})
