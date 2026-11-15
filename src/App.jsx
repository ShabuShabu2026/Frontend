import { useCallback, useEffect, useRef, useState } from 'react'
import Configuration from './components/Configuration'
import SiteDetails from './components/SiteDetails'
import LunarMap from './components/LunarMap'
import CandidateList from './components/CandidateList.jsx'
import Home from './components/Home.jsx'
import { isEarthVisibilityNotice } from './lib/data-notices.js'
import Brand from './components/Brand.jsx'
import LoadingState from './components/LoadingState.jsx'
import { readSession, writeSession, restoreSession, routeFromLocation, routeUrl, sessionKey } from './lib/planner-session.js'
import { objectiveLabel } from './lib/presentation-labels.js'
import { dateBounds, localWeights, updateMission, validateMission } from './lib/mission'
import './App.css'
import './design.css'

const noServices = {}
export default function App({ services = noServices }) {
  const [initial, setInitial] = useState(null)
  useEffect(() => {
    let active = true
    let id
    try { id = sessionKey() } catch { /* Storage can be disabled by the browser. */ }
    const saved = id ? readSession(id).catch(() => null) : Promise.resolve(null)
    saved.then(snapshot => { if (active) setInitial({ ...restoreSession(snapshot, routeFromLocation(window.location, window.history.state)), sessionId: id }) })
    return () => { active = false }
  }, [])
  return initial ? <Planner services={services} initial={initial} /> : <LoadingState>Restoring your landing plan…</LoadingState>
}
function Planner({ services, initial }) {
  const [view, setView] = useState(initial.view)
  const [config, setConfig] = useState(initial.config)
  const [result, setResult] = useState(initial.result)
  const [selected, setSelected] = useState(initial.selected)
  const [detail, setDetail] = useState(initial.detail)
  const [detailRevision, setDetailRevision] = useState(0)
  const [detailDate, setDetailDate] = useState(initial.detailDate)
  const [detailError, setDetailError] = useState('')
  const [detailBusy, setDetailBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState([])
  const [weightResult, setWeightResult] = useState(null)
  const [weightError, setWeightError] = useState('')
  const [regionStatus, setRegionStatus] = useState({ busy: false, error: '' })
  const onRegionStatus = useCallback((status) => setRegionStatus(status), [])
  const [analyzedConfig, setAnalyzedConfig] = useState(initial.analyzedConfig)
  const [detailTab, setDetailTab] = useState(initial.detailTab)
  const [saveError, setSaveError] = useState(false)

  const lastSavedResult = useRef(initial.result)
  useEffect(() => {
    if (!initial.sessionId) return
    const resultChanged = lastSavedResult.current !== result
    writeSession(initial.sessionId, { view, config, selected, analyzedConfig, detail, detailDate, detailTab }, result, resultChanged)
      .then(() => { lastSavedResult.current = result; setSaveError(false) }).catch(() => setSaveError(true))
  }, [initial.sessionId, view, config, selected, analyzedConfig, detail, detailDate, detailTab, result])
  useEffect(() => {
    const current = routeFromLocation(window.location, window.history.state)
    if (!current.view) window.history.replaceState({ ...window.history.state, planner: { view: initial.view, selected: initial.selected, detailDate: initial.detailDate, detailTab: initial.detailTab } }, '', routeUrl(initial.view, initial.selected))
  }, [initial])
  function navigate(nextView, site = selected) {
    if (nextView === view && (nextView !== 'detail' || site?.id === selected?.id)) return
    window.history.pushState({ planner: { view: nextView, selected: site, detailDate: nextView === 'detail' ? (analyzedConfig ?? config).landingDate : detailDate, detailTab: nextView === 'detail' ? 'Overview' : detailTab } }, '', routeUrl(nextView, site))
    setView(nextView)
  }
  useEffect(() => {
    function restoreRoute() {
      const route = routeFromLocation(window.location, window.history.state)
      let nextView = route.view ?? 'home'
      if (nextView === 'detail') {
        const site = route.selected ?? (route.siteId === selected?.id ? selected : result?.candidates?.find(item => item.id === route.siteId))
        if (site && result) { setSelected(site); setDetailDate(route.detailDate ?? (analyzedConfig ?? config).landingDate); setDetailTab(route.detailTab ?? 'Overview') }
        else nextView = result ? 'candidates' : 'home'
      }
      if (nextView === 'candidates' && !result) nextView = 'home'
      setView(nextView)
    }
    window.addEventListener('popstate', restoreRoute)
    window.addEventListener('hashchange', restoreRoute)
    return () => { window.removeEventListener('popstate', restoreRoute); window.removeEventListener('hashchange', restoreRoute) }
  }, [result, selected, config, analyzedConfig])
  useEffect(() => {
    if (view !== 'detail') return
    window.history.replaceState({ ...window.history.state, planner: { view, selected, detailDate, detailTab } }, '', routeUrl(view, selected))
  }, [view, selected, detailDate, detailTab])
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
      setResult(response); setAnalyzedConfig(nextConfig); setSelected(null); setDetail(null); navigate('candidates')
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
    setSelected(site); setDetail({ terrainStatus: 'loading', visibilityStatus: 'loading', overviewStatus: 'loading' }); setDetailBusy(true); setDetailError(''); setDetailDate((analyzedConfig ?? config).landingDate); setDetailTab('Overview'); navigate('detail', site)
  }
  useEffect(() => {
    if (!selected || !services.getSiteDetails) return
    if (detailRevision === 0 && initial.detail && (!initial.detail.terrain || initial.detail.terrain.geometry) && !['terrainStatus', 'visibilityStatus', 'overviewStatus'].some(key => initial.detail[key] === 'loading') && initial.selected?.id === selected.id && initial.detailDate === detailDate && initial.result?.analysisId === result?.analysisId) return
    const controller = new AbortController()
    Promise.resolve().then(() => {
      if (controller.signal.aborted) return
      setDetailBusy(true); setDetail((current) => ({ ...current, terrainStatus: current?.terrain ? 'ready' : 'loading', visibilityStatus: 'loading' })); setDetailError('')
      return services.getSiteDetails({ analysisId: result?.analysisId, siteId: selected.id, latitude: selected.latitude, longitude: selected.longitude, landingDate: detailDate }, { signal: controller.signal, onProgress: (patch) => { if (!controller.signal.aborted) setDetail((current) => ({ ...current, ...patch })) } })
    }).then((response) => { if (!controller.signal.aborted) setDetail(response) })
      .catch((error) => { if (!controller.signal.aborted) setDetailError(error.message || 'Unable to load site details.') })
      .finally(() => { if (!controller.signal.aborted) setDetailBusy(false) })
    return () => controller.abort()
  }, [services, selected, result?.analysisId, detailDate, detailRevision, initial])
  if (view === 'home') return <Home config={config} update={update} weights={weights} onAnalyze={() => analyze()} busy={busy} errors={errors} weightError={weightError} />
  return <><header className="topbar"><Brand onClick={() => navigate('home')} /><nav aria-label="Search summary" className="search-summary"><span>{objectiveLabel(config.objective)}</span><label className="summary-date">Arrive <input aria-label="Landing Date" type="date" value={config.landingDate} min={dateBounds(config).min} max={dateBounds(config).max} disabled={busy} onChange={event => update('landingDate', event.target.value)} /></label><span>{config.stayDuration} days</span><span>{config.missionType === 'Uncrewed' ? 'Robotic' : 'Crewed'}</span><button type="button" onClick={() => navigate('configuration')}>{view === 'configuration' ? 'Editing…' : 'Edit search'}</button></nav><button className="back-results" type="button" onClick={() => navigate(view === 'detail' ? 'candidates' : 'home')}>{view === 'detail' ? '← Back to landing spots' : '← Back to trip selection'}</button></header>
    <main className="workspace">{saveError && <p className="session-notice" role="status">Your browser could not save this plan. Refresh may reset the current results.</p>}<aside className="sidebar">
      <div className="sidebar-content">
        <div className="configuration-panel" hidden={view !== 'configuration'}><Configuration config={config} update={update} weights={weights} onAnalyze={() => analyze()} busy={busy} weightError={weightError} errors={errors} /></div>
        {view === 'candidates' && <div className="candidate-panel"><CandidateList key={result?.analysisId ?? 'empty'} analysisId={result?.analysisId} services={services} sites={result?.candidates ?? []} selected={selected} onSelect={selectSite} analyzed={Boolean(result)} regionStatus={regionStatus} config={analyzedConfig ?? config} onEdit={() => navigate('configuration')} />{(result?.warnings ?? []).filter(warning => !isEarthVisibilityNotice(warning)).map((warning) => <p className="warning" key={warning}>{warning}</p>)}{errors.map((error) => <p className="warning" role="alert" key={error}>{error}</p>)}</div>}
        {view === 'detail' && <SiteDetails key={selected?.id ?? 'empty'} site={selected} data={detail} config={analyzedConfig ?? config} busy={detailBusy} error={detailError} date={detailDate} onDateChange={setDetailDate} tab={detailTab} onTabChange={setDetailTab} />}
      </div>
      {view === 'configuration' && <div className="analyze-actions"><button className="cancel-edit" type="button" onClick={() => navigate(result ? 'candidates' : 'home')}>Cancel</button><button className="analyze" type="submit" form="mission-configuration" disabled={busy}>{busy ? 'Analyzing…' : 'Update results'}</button></div>}
    </aside><LunarMap key={result?.analysisId ?? 'initial'} services={services} onRegion={onRegion} onRegionStatus={onRegionStatus} result={result} selected={selected} focused={view === 'detail'} onSelect={selectSite} onReset={() => { setSelected(null); navigate('candidates') }} /></main></>
}
