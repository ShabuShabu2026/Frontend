import { projectSite } from './projection.js'

export function createCandidateIndex(result) {
  const sites=result?.sites
  if(!sites?.ids?.length)return null
  const known=new Map((result.candidates??[]).map(site=>[site.id,site]))
  const points=[]
  sites.ids.forEach((id,i)=>{
    const point=sites.x?{x:sites.x[i],y:sites.y[i]}:projectSite(sites.lat[i],sites.lon[i])
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return
    const passed=sites.passed[i]
    const codes=Array.isArray(sites.exclusionCodes?.[i])?sites.exclusionCodes[i]:[]
    points.push({...known.get(id),id,latitude:sites.lat[i],longitude:sites.lon[i],...point,
      suitability:Number.isFinite(sites.suitability[i])?sites.suitability[i]:null,
      passed,status:passed===false?'Excluded':known.get(id)?.status??(passed===true?'Feasible':undefined),
      exclusionReasons:codes.map(code=>result.exclusionCodeLegend?.[code]??code),
    })
  })
  points.sort((a,b)=>Number(b.passed===true)-Number(a.passed===true)||(b.suitability??-Infinity)-(a.suitability??-Infinity)||a.id.localeCompare(b.id))
  return points
}
export function selectAreaCandidates(points,bbox,limit=20) {
  if(!points)return null
  const available=points.filter(p=>p.x>=bbox.xmin&&p.x<=bbox.xmax&&p.y>=bbox.ymin&&p.y<=bbox.ymax)
  if(available.length<=limit)return available.map((p,i)=>({...p,rank:i+1}))
  let separation=.5*Math.sqrt((bbox.xmax-bbox.xmin)*(bbox.ymax-bbox.ymin)/limit)
  let selected=[]
  for(let attempt=0;attempt<20;attempt++){
    selected=[]
    for(const point of available){
      if(selected.every(p=>(p.x-point.x)**2+(p.y-point.y)**2>=separation**2))selected.push(point)
      if(selected.length===limit)break
    }
    if(selected.length===limit)break
    separation/=2
  }
  return selected.map((p,i)=>({...p,rank:i+1}))
}
// A canceled browser fetch does not cancel server-side work. Keep only one area
// request in flight and replace the queued viewport with the user's latest one.
export function createRegionQueue({load,onData,onStatus,delay=350,capacity=24,mergeCandidates}) {
  let timer=null,active=null,pending=null,latest=null,disposed=false
  const cache=new Map()
  const keyFor=query=>JSON.stringify([query.analysisId,query.bbox.xmin,query.bbox.ymin,query.bbox.xmax,query.bbox.ymax])
  function drain(){
    if(disposed||active||!pending)return
    const job=pending;pending=null
    const controller=new AbortController();active={key:job.key,controller}
    Promise.resolve().then(()=>load(job.query,{signal:controller.signal})).then(data=>{
      if(disposed)return
      const preserve=job.local?.length>0&&!data.candidates.length
      const effective=mergeCandidates?{...data,candidates:mergeCandidates(data.candidates,job.local,job.query.bbox)}:preserve?{...data,candidates:job.local,fromExisting:true}:data
      cache.delete(job.key);cache.set(job.key,effective)
      if(cache.size>capacity)cache.delete(cache.keys().next().value)
      if(latest?.key===job.key){
        onData(effective.candidates);onStatus({busy:false,error:'',summary:job.query.summary,notice:preserve?'Showing sites from the existing analysis grid.':''})
      }
    }).catch(error=>{
      if(!disposed&&latest?.key===job.key&&error.name!=='AbortError')onStatus({busy:false,error:job.local===null?error.message:'',notice:job.local!==null?'Showing existing analysis results. Detailed refresh is delayed.':'',summary:job.query.summary,refreshFailed:true})
    }).finally(()=>{active=null;drain()})
  }
  return {
    update(query,local=null){
      if(disposed)return
      const key=keyFor(query);latest={key};clearTimeout(timer);pending=null
      if(cache.has(key)){const data=cache.get(key);onData(data.candidates);onStatus({busy:false,error:'',summary:query.summary,notice:data.fromExisting?'Showing sites from the existing analysis grid.':''});return}
      if(local!==null)onData(local)
      onStatus({busy:true,error:'',summary:query.summary})
      if(active?.key===key)return
      timer=setTimeout(()=>{if(disposed||latest?.key!==key)return;pending={key,query,local};drain()},delay)
    },
    clear(){clearTimeout(timer);latest=null;pending=null;onStatus({busy:false,error:''})},
    dispose(){disposed=true;clearTimeout(timer);pending=null;active?.controller.abort();cache.clear()},
  }
}

export function createAreaIndex(result) {
  const sites=result?.sites
  if(!sites?.ids)return null
  return sites.ids.map((id,i)=>({id,latitude:sites.lat[i],longitude:sites.lon[i],...(sites.x?{x:sites.x[i],y:sites.y[i]}:projectSite(sites.lat[i],sites.lon[i])),passed:sites.passed[i]===true,codes:Array.isArray(sites.exclusionCodes?.[i])?sites.exclusionCodes[i]:[]}))
}
export function summarizeArea(points,bbox,domain,legend={}) {
  if(domain&&(bbox.xmax<domain.xmin||bbox.xmin>domain.xmax||bbox.ymax<domain.ymin||bbox.ymin>domain.ymax))return {kind:'outside',total:0,passed:0,excludedSites:[]}
  if(!points)return {kind:'unknown',excludedSites:[]}
  const inside=points.filter(p=>p.x>=bbox.xmin&&p.x<=bbox.xmax&&p.y>=bbox.ymin&&p.y<=bbox.ymax)
  const passed=inside.filter(p=>p.passed).length
  const counts={}
  if(!passed)for(const point of inside)for(const code of point.codes)counts[legend[code]??code]=(counts[legend[code]??code]??0)+1
  const reasons=Object.entries(counts).sort((a,b)=>b[1]-a[1])
  const excludedSites=passed?[]:selectAreaCandidates(inside,bbox).map(p=>({...p,status:'Excluded',suitability:null,exclusionReasons:p.codes.map(code=>legend[code]??code)}))
  return {kind:!inside.length?'unsampled':passed?'available':'excluded',total:inside.length,passed,reasons,excludedSites}
}

// Backend recommendations may contain passed sites only. Fill the same viewport
// with real excluded/other sampled sites rather than hiding them from the list.
export function mergeViewportSites(remote,local,bbox,limit=20) {
  const unique=new Map()
  for(const point of [...(local??[]),...(remote??[])])unique.set(point.id,point)
  const points=[...unique.values()].filter(p=>p&&p.id).map(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)?p:{...p,...projectSite(p.latitude,p.longitude)})
  points.sort((a,b)=>Number(b.passed===true)-Number(a.passed===true)||(b.suitability??-Infinity)-(a.suitability??-Infinity)||a.id.localeCompare(b.id))
  return selectAreaCandidates(points,bbox,limit)??[]
}
