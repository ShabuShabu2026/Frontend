export function retryPause(milliseconds, signal) {
  if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
  return new Promise((resolve,reject) => {
    const finish=()=>{signal?.removeEventListener('abort',abort);resolve()}
    const timer=setTimeout(finish,milliseconds)
    const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(signal.reason ?? new DOMException('Aborted','AbortError'))}
    signal?.addEventListener('abort',abort,{once:true})
  })
}
export async function requestJson(fetchImpl, url, options, retryDelays = [800,2000]) {
  const readOnly=options.method==='GET'
  for(let attempt=0;;attempt++) {
    if(options.signal?.aborted)throw options.signal.reason ?? new DOMException('Aborted','AbortError')
    try {
      const response=await fetchImpl(url,options)
      const data=await response.json().catch(error=>{
        if(error.name==='AbortError'||error instanceof TypeError)throw error
        return null
      })
      if(options.signal?.aborted)throw options.signal.reason ?? new DOMException('Aborted','AbortError')
      if(!response.ok||data?.success===false) {
        const message=data?.error?.message ?? data?.detail
        const fallback=[408,504].includes(response.status)
          ? 'The server response timed out. Processing may still be in progress. Please try again shortly.'
          : [502,503].includes(response.status)
            ? 'The server is temporarily unavailable or busy. Please try again shortly.'
            : `Request failed (${response.status}).`
        const error=new Error(typeof message==='string'?message:fallback)
        error.status=response.status
        throw error
      }
      if(!data) {const error=new Error('The analysis server returned an invalid response.');error.status=response.status;throw error}
      return data
    } catch(error) {
      if(options.signal?.aborted)throw options.signal.reason ?? new DOMException('Aborted','AbortError')
      if(error.name==='AbortError')throw error
      const transient=error.status == null || [408,502,503,504].includes(error.status)
      if(readOnly&&transient&&attempt<retryDelays.length){await retryPause(retryDelays[attempt],options.signal);continue}
      if(error.status!=null)throw error
      throw new Error(readOnly
        ? 'The server response was interrupted after retrying. Check your connection and try again.'
        : 'The analysis response was interrupted. The server may still be processing it. Please wait before trying again.')
    }
  }
}
