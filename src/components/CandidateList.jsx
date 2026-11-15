import { useEffect, useMemo, useState } from 'react'
import { metric, percent } from '../lib/mission.js'
import { communicationLabel, fitLabel, powerLabel, shortDate } from '../lib/presentation-labels.js'
import LoadingState from './LoadingState.jsx'
import { sortCandidates, loadCandidateSummaries } from '../lib/candidate-summary.js'
import AreaEmptyState from './AreaEmptyState.jsx'

export default function CandidateList({ sites, selected, onSelect, analyzed, regionStatus, config, onEdit, analysisId, services }) {
  const [sort, setSort] = useState('Best fit')
  const [limit, setLimit] = useState(5)
  const [summaries, setSummaries] = useState({})
  const [summaryStatus, setSummaryStatus] = useState({ busy: false, failed: 0 })
  const [retry, setRetry] = useState(0)
  // Only membership changes restart reads; region refreshes can replace site objects.
  const membership = JSON.stringify(sites.filter(site => !Number.isFinite(site.sunVisibility) || !Number.isFinite(site.earthVisibility)).map(site => site.id).sort())
  useEffect(() => {
    const ids = JSON.parse(membership)
    if (!ids.length || !analysisId || !services?.getSiteSummary) return
    const controller = new AbortController()
    let failed = 0
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) return
      setSummaryStatus({ busy: true, failed: 0 })
      await loadCandidateSummaries(ids.map(id => ({ id })), (site, options) => services.getSiteSummary({ analysisId, siteId: site.id }, options), {
        signal: controller.signal,
        onData: (id, data) => setSummaries(current => ({ ...current, [id]: data })),
        onError: () => { failed++ },
      })
      if (!controller.signal.aborted) setSummaryStatus({ busy: false, failed })
    })
    return () => controller.abort()
  }, [analysisId, services, membership, retry])
  const enriched = useMemo(() => sites.map(site => ({ ...site, ...summaries[site.id] })), [sites, summaries])
  const sorted = useMemo(() => sortCandidates(enriched, sort), [enriched, sort])
  return <><div className="results-heading"><h2>{sites.length} landing spots</h2></div><div className="result-filters">{config.slopeEnabled && <span className="rule-chip">✓ Slope ≤ {config.slopeLimit}°</span>}{config.missionType === 'Crewed' && config.crewedSunlight && <span className="rule-chip">✓ Sunlight all stay</span>}<span>Earth link: {communicationLabel(config.communication)}</span><span>Power: {powerLabel(config.power)}</span><button type="button" onClick={onEdit}>+ All filters</button></div><div className="result-recommendations" role="group" aria-label="Rank landing spots">{['Best fit','Most sunlight','Best Earth view'].map(value => <button className={sort === value ? 'active' : ''} type="button" aria-pressed={sort === value} key={value} onClick={() => setSort(value)}>{value}</button>)}</div>{summaryStatus.busy && <p className="candidate-summary-status" role="status">Loading sunlight and Earth view for these spots…</p>}{summaryStatus.failed > 0 && <p className="candidate-summary-status" role="status">Some visibility data could not be loaded. <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}{regionStatus?.busy && <LoadingState>Updating spots in this area…</LoadingState>}{regionStatus?.notice && <p className="data-notice region-notice">{regionStatus.notice}</p>}{regionStatus?.error && <p className="warning" role="alert">{regionStatus.error}</p>}{!sites.length && !regionStatus?.busy && <AreaEmptyState analyzed={analyzed} status={regionStatus} />}<div className="candidates">{sorted.slice(0,limit).map(site => <button className={`candidate ${selected?.id === site.id ? 'candidate-selected' : ''} fit-${fitLabel(site).toLowerCase()}`} key={site.id} onClick={() => onSelect(site)}><span className="candidate-fit"><strong>{metric(site.suitability)}</strong><small>{fitLabel(site)}</small></span><span className="candidate-identity"><span><strong>{site.name ?? site.regionName ?? site.id}</strong>{(site.name || site.regionName) && <small>{site.id}</small>}</span><span className="candidate-stats"><span><span>☀ Sun</span><b>{percent(site.sunVisibility)}</b></span><span><span>◎ Earth</span><b>{percent(site.earthVisibility)}</b></span><span><span>◐ Dark</span><b>{metric(site.longestDarkness, ' h')}</b></span></span><small>{metric(site.latitude,'°')}, {metric(site.longitude,'°')} · {site.passed == null ? '—' : site.passed ? 'Meets landing rules' : 'Excluded'}</small>{(site.exclusionReasons ?? []).map(reason => <small key={reason}>{reason}</small>)}</span><span className="candidate-best"><small>Best day</small><strong>{shortDate(site.bestLandingDate)}</strong></span></button>)}</div>{sorted.length > limit && <button type="button" className="show-spots" onClick={() => setLimit(limit+20)}>Show {sorted.length-limit} more spots ⌄</button>}</>
}
