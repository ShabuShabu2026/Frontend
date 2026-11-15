export function sortCandidates(sites, sort) {
  const key = { 'Most sunlight': 'sunVisibility', 'Best Earth view': 'earthVisibility' }[sort] ?? 'suitability'
  return [...sites].sort((a, b) => {
    const left = Number.isFinite(a[key]) ? a[key] : -Infinity
    const right = Number.isFinite(b[key]) ? b[key] : -Infinity
    return (right > left ? 1 : right < left ? -1 : 0) || (b.suitability ?? -Infinity) - (a.suitability ?? -Infinity) || a.id.localeCompare(b.id)
  })
}
// Bound concurrent summary reads; changing the viewport cancels obsolete work.
export async function loadCandidateSummaries(sites, load, { signal, onData, onError, concurrency = 3 }) {
  let next = 0
  async function worker() {
    while (!signal.aborted && next < sites.length) {
      const site = sites[next++]
      try {
        const summary = await load(site, { signal })
        if (!signal.aborted) onData(site.id, summary)
      } catch (error) { if (!signal.aborted) onError(site.id, error) }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, sites.length) }, worker))
}
