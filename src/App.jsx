import { useCallback, useEffect, useRef, useState } from 'react'
import Configuration from './components/Configuration'
import SiteDetails from './components/SiteDetails'
import LunarMap from './components/LunarMap'
import LoadingState from './components/LoadingState.jsx'
import AreaEmptyState from './components/AreaEmptyState.jsx'
import { dateBounds, defaults, localWeights, metric, updateMission, validateMission } from './lib/mission'
import './App.css'

const noServices = {}
function CandidateList({ sites, selected, onSelect, analyzed, regionStatus }) {
  return <><h2>Sites in this view</h2>{regionStatus?.busy && <LoadingState>Updating sites in this area…</LoadingState>}{regionStatus?.notice && <p className="data-notice region-notice">{regionStatus.notice}</p>}{regionStatus?.error && <p className="warning" role="alert">{regionStatus.error}</p>}{!sites.length && !regionStatus?.busy && <AreaEmptyState analyzed={analyzed} status={regionStatus} />}<div className="candidates">{sites.map((site, index) => <button className={`candidate ${selected?.id === site.id ? 'candidate-selected' : ''}`} key={site.id} onClick={() => onSelect(site)}><span className="rank">{site.rank ?? index + 1}</span><span className="candidate-identity"><strong>{site.id}</strong><small>{metric(site.latitude, '°')}, {metric(site.longitude, '°')}</small></span><span className={`score ${site.passed === false ? 'gray' : site.status === 'Marginal' ? 'amber' : 'green'}`}>{metric(site.suitability, '%')}</span><span className="description">{site.status ?? '—'}<br />{(site.tags ?? []).slice(0,2).join(' · ')}<small>Absolute Constraints: {site.passed == null ? '—' : site.passed ? 'Passed' : 'Not passed'}</small>{(site.exclusionReasons ?? []).map((reason) => <small key={reason}>{reason}</small>)}</span></button>)}</div></>
}
export default function App({ services = noServices }) {
  const previewDetails = new URLSearchParams(window.location.search).get('preview') === 'details'
  const [view, setView] = useState(previewDetails ? 'detail' : new URLSearchParams(window.location.search).get('preview') === 'candidates' ? 'candidates' : 'configuration')
  const [config, setConfig] = useState(defaults)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailRevision, setDetailRevision] = useState(0)
  const [detailDate, setDetailDate] = useState(defaults.landingDate)
  const [detailError, setDetailError] = useState('')
  const [detailBusy, setDetailBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState([])
  const [weightResult, setWeightResult] = useState(null)
  const [weightError, setWeightError] = useState('')
  const [regionStatus, setRegionStatus] = useState({ busy: false, error: '' })
  const onRegionStatus = useCallback((status) => setRegionStatus(status), [])
  const [analyzedConfig, setAnalyzedConfig] = useState(null)
  const analysisRequest = useRef(0)
  const analysisController = useRef(null)
  useEffect(() => () => analysisController.current?.abort(), [])
  const onRegion = useCallback((candidates) => setResult((current) => current ? { ...current, candidates } : current), [])
  const weightInputs = JSON.stringify({ missionType: config.missionType, power: config.power, communication: config.communication, objective: config.objective, priorities: config.priorities, manualWeights: config.manualWeights })
  useEffect(() => {
    if (!services.getWeights) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await services.getWeights(JSON.parse(weightInputs), { signal: controller.signal })
        if (!controller.signal.aborted) { setWeightResult({ key: weightInputs, ...response }); setWeightError('') }
      } catch (error) { if (!controller.signal.aborted) setWeightError(error.message || 'Unable to load automatic weights.') }
    }, 150)
    return () => { clearTimeout(timer); controller.abort() }
  }, [services, weightInputs])
  const weights = config.manualWeights ?? (weightResult?.key === weightInputs ? weightResult.weights : localWeights(config))
  async function analyze(nextConfig = config) {
    const validation = validateMission(nextConfig)
    if (validation.length) { setErrors(validation); return }
    if (!services.analyze) { setErrors(['Analysis is not connected. No results have been generated.']); return }
    analysisController.current?.abort()
    const controller = new AbortController()
    analysisController.current = controller
    const request = ++analysisRequest.current
    setBusy(true); setErrors([]); setRegionStatus({ busy: false, error: '' }); setResult(null); setSelected(null); setDetail(null)
    try {
      const response = await services.analyze(nextConfig, { signal: controller.signal })
      if (request !== analysisRequest.current) return
      setResult(response); setAnalyzedConfig(nextConfig); setSelected(null); setDetail(null); setView('candidates')
      if (response.weights) setWeightResult({ key: JSON.stringify({ missionType: nextConfig.missionType, power: nextConfig.power, communication: nextConfig.communication, objective: nextConfig.objective, priorities: nextConfig.priorities, manualWeights: nextConfig.manualWeights }), weights: response.weights, priorities: response.priorities })
    } catch (error) { if (request === analysisRequest.current) setErrors([error.message || 'Analysis failed. Please try again.']) }
    finally { if (request === analysisRequest.current) setBusy(false) }
  }
  function update(key, value) {
    const next = updateMission(config, key, value)
    analysisController.current?.abort()
    setConfig(next); setErrors([]); ++analysisRequest.current; setBusy(false)
    // Changing the date reruns the same analysis with the new landing date.
    if (key === 'landingDate' && result) { setResult(null); setSelected(null); setDetail(null); analyze(next) }
    else if (result) { ++analysisRequest.current; setBusy(false); setResult(null); setAnalyzedConfig(null); setSelected(null); setDetail(null) }
  }
  function selectSite(site) {
    setDetailRevision((value) => value + 1)
    setSelected(site); setDetail({ terrainStatus: 'loading', visibilityStatus: 'loading', overviewStatus: 'loading' }); setDetailBusy(true); setDetailError(''); setDetailDate((analyzedConfig ?? config).landingDate); setView('detail')
  }
  useEffect(() => {
    if (!selected || !services.getSiteDetails) return
    const controller = new AbortController()
    Promise.resolve().then(() => {
      if (controller.signal.aborted) return
      setDetailBusy(true); setDetail((current) => ({ ...current, terrainStatus: current?.terrain ? 'ready' : 'loading', visibilityStatus: 'loading' })); setDetailError('')
      return services.getSiteDetails({ analysisId: result?.analysisId, siteId: selected.id, latitude: selected.latitude, longitude: selected.longitude, landingDate: detailDate }, { signal: controller.signal, onProgress: (patch) => { if (!controller.signal.aborted) setDetail((current) => ({ ...current, ...patch })) } })
    }).then((response) => { if (!controller.signal.aborted) setDetail(response) })
      .catch((error) => { if (!controller.signal.aborted) setDetailError(error.message || 'Unable to load site details.') })
      .finally(() => { if (!controller.signal.aborted) setDetailBusy(false) })
    return () => controller.abort()
  }, [services, selected, result?.analysisId, detailDate, detailRevision])
  return <><header className="topbar"><nav aria-label="Screen navigation">{view !== 'configuration' && <button onClick={() => setView('configuration')}>← Mission Configuration</button>}{view === 'detail' && <button onClick={() => setView('candidates')}>← Candidate Sites</button>}{view !== 'configuration' && <label className="header-date">Landing Date<input type="date" value={config.landingDate} min={dateBounds(config).min} max={dateBounds(config).max} disabled={busy} onChange={(event) => update('landingDate', event.target.value)} /></label>}</nav></header>
    <main className="workspace"><aside className="sidebar">
      <div className="sidebar-content">
        <div className="configuration-panel" hidden={view !== 'configuration'}><Configuration config={config} update={update} weights={weights} onAnalyze={() => analyze()} busy={busy} weightError={weightError} errors={errors} /></div>
        {view === 'candidates' && <div className="candidate-panel"><CandidateList sites={result?.candidates ?? []} selected={selected} onSelect={selectSite} analyzed={Boolean(result)} regionStatus={regionStatus} />{(result?.warnings ?? []).map((warning) => <p className="warning" key={warning}>{warning}</p>)}{errors.map((error) => <p className="warning" role="alert" key={error}>{error}</p>)}</div>}
        {view === 'detail' && <SiteDetails key={selected?.id ?? 'empty'} site={selected} data={detail} config={analyzedConfig ?? config} busy={detailBusy} error={detailError} date={detailDate} onDateChange={setDetailDate} />}
      </div>
      <div className="analyze-actions"><button className="analyze" type="submit" form="mission-configuration" disabled={busy} onClick={() => setView('configuration')}><img src="/figma/imgSearch.svg" alt="" />{busy ? 'Analyzing…' : 'Analyze Landing Sites'}</button></div>
    </aside><LunarMap key={result?.analysisId ?? 'initial'} services={services} onRegion={onRegion} onRegionStatus={onRegionStatus} result={result} selected={selected} focused={view === 'detail'} onSelect={selectSite} onReset={() => { setSelected(null); setView('candidates') }} /></main></>
}
