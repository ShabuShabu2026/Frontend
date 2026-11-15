import { useEffect, useState } from 'react'
export default function LoadingState({ children = 'Loading…' }) {
  const [seconds,setSeconds]=useState(0)
  useEffect(()=>{const start=Date.now();const timer=setInterval(()=>setSeconds(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(timer)},[])
  return <div className="loading-state" role="status" aria-live="polite"><span className="loading-spinner" aria-hidden="true" /><span>{children}{seconds>=8&&<small className="slow-request">This is taking longer than usual. Please keep this page open…</small>}{seconds>=3&&<small className="loading-elapsed" aria-live="off">{seconds}s elapsed</small>}</span></div>
}
