import { changedSettings, dateBounds, includesOther, objectives, scoreNames } from '../lib/mission'
import LoadingState from './LoadingState.jsx'

export function Field({ label, children, className = '' }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}</label>
}
function Switch({ label, checked, disabled, onChange }) {
  return <button type="button" className={`setting-switch ${checked ? 'is-on' : ''}`} role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}><span /></button>
}
export default function Configuration({ config, update, weights, onAnalyze, errors, busy, weightError }) {
  const other = includesOther(config.objective)
  const bounds = dateBounds(config)
  const number = (event) => event.target.value === '' ? '' : Number(event.target.value)
  const input = (key, label, min, max, step = 'any', disabled = false) => <input aria-label={label} type="number" min={min} max={max} step={step} value={config[key]} disabled={disabled} required={!disabled} onChange={(event) => update(key, number(event))} />
  const select = (key, label, options) => <Field label={label}><select value={config[key]} onChange={(event) => update(key, event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></Field>
  const segmented = (key, label, options) => <div className="field criteria" key={key}><span>{label}</span><div className="segmented" role="group" aria-label={label}>{options.map((option) => <button key={option} type="button" aria-pressed={config[key] === option} className={config[key] === option ? 'active' : ''} onClick={() => update(key, option)}>{option}{key === 'height' ? ' m' : ''}</button>)}</div></div>
  const warnings = [(!config.slopeEnabled || config.slopeLimit > 5) && 'The default 5° slope constraint has been relaxed.', config.missionType === 'Crewed' && !config.crewedSunlight && 'Continuous sunlight is no longer required for this crewed mission.'].filter(Boolean)
  return <form id="mission-configuration" className="configuration-form" onInvalidCapture={(event) => { const section = event.target.closest('details'); if (section) section.open = true }} onSubmit={(event) => { event.preventDefault(); onAnalyze() }}>
    <div className="configuration-scroll"><h2>Mission Configuration</h2><div className="mission-fields">
      <Field label="Landing Date"><input type="date" min={bounds.min} max={bounds.max} value={config.landingDate} required onChange={(event) => update('landingDate', event.target.value)} /></Field>
      <Field label="Stay Duration (days)">{input('stayDuration', 'Stay Duration in days', 1, undefined, 1)}</Field>
      {select('missionType', 'Mission Type', ['Crewed', 'Uncrewed'])}
      {select('objective', 'Mission Objective', objectives)}
      <p className="objective-name">{config.objective}</p>
      {select('power', 'Power Requirement', ['Low', 'Normal', 'High'])}
      {select('communication', 'Communication Dependency', ['Independent', 'Normal', 'Critical'])}
    </div>
    <details className="settings-section"><summary><h2>Auto Weight Summary</h2></summary><div className="weights">{scoreNames.map((name) => <div className="weight" key={name}><span>{name}</span><div className="weight-track"><div style={{ width: `${(config.priorities[name] - 1) / 4 * 100}%` }} /></div><output>{weights[name] == null ? 'N/A' : `${(weights[name] * 100).toFixed(1)}%`}</output></div>)}</div></details>
    <details className="settings-section"><summary><h2>Advanced Settings <span className="change-count">{changedSettings(config)} changed</span></h2></summary><div className="advanced">
      <div className="constraint slope"><span>Absolute Slope Constraint</span><Switch label="Absolute Slope Constraint" checked={config.slopeEnabled} onChange={(value) => update('slopeEnabled', value)} /><span>Limit</span>{input('slopeLimit', 'Slope limit in degrees', 0, 15, 'any', !config.slopeEnabled)}<span>°</span></div>
      <div className="constraint crewed"><span>Crewed Sunlight Constraint</span><Switch label="Crewed Sunlight Constraint" checked={config.crewedSunlight} disabled={config.missionType !== 'Crewed'} onChange={(value) => update('crewedSunlight', value)} /></div>
      <div className="constraint uncrewed"><span>Uncrewed Absolute Constraints</span><Switch label="Uncrewed Absolute Constraints" checked={config.uncrewedConstraints} disabled={config.missionType !== 'Uncrewed'} onChange={(value) => update('uncrewedConstraints', value)} /></div>
      {config.missionType === 'Uncrewed' && config.uncrewedConstraints && <><Field label="Battery Endurance (hours)" className="indented">{input('batteryEndurance', 'Battery Endurance in hours', 0)}</Field><Field label="Maximum Communication Blackout (hours)" className="indented">{input('maximumBlackout', 'Maximum Communication Blackout in hours', 0)}</Field></>}
      {warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}
      <p className="priority-title">Importance Weights (1–5)</p><p className="weight-hint">Set importance from 1 to 5. Normalized percentages are shown below.</p><div className="priorities">{scoreNames.filter((name) => name !== 'Other' || other).map((name) => <div className="priority" key={name}><label htmlFor={`priority-${name}`}>{name}</label><input id={`priority-${name}`} type="range" min="1" max="5" step="1" value={config.priorities[name]} aria-valuetext={`Importance ${config.priorities[name]} of 5, ${((weights[name] ?? 0) * 100).toFixed(1)} percent`} style={{ '--progress': `${(config.priorities[name] - 1) / 4 * 100}%` }} onChange={(event) => update('manualWeights'(weights, name, Number(event.target.value) / 100))} /><output className="importance-value"><span>{((weights[name] ?? 0) * 100).toFixed(1)}%</span></output></div>)}</div>
      <Field label="Required Sunlight Ratio (%)" className="criteria">{input('sunlightRatio', 'Required Sunlight Ratio in percent', 0, 100)}</Field>
      {segmented('sunCriterion', 'Sun Visibility Criterion', ['Partial', 'Half Disk', 'Full'])}
      {segmented('earthCriterion', 'Earth Visibility Criterion', ['Upper Edge', 'Center + Δ', 'Full'])}
      {segmented('height', 'Panel / Antenna Height', [1, 5, 10])}
      <div className="field criteria search-range"><label htmlFor="days">Landing Date Search Range</label><div><input id="days" type="range" min="0" max="30" step="1" value={config.searchRange} aria-valuetext={`Plus or minus ${config.searchRange} days`} style={{ '--progress': `${config.searchRange / 30 * 100}%` }} onChange={(event) => update('searchRange', Number(event.target.value))} /><output>±{config.searchRange} d</output></div></div>
    </div></details>
    {busy && <LoadingState>Analyzing landing sites. Please wait…</LoadingState>}
    {!busy && weightError && <p className="data-notice weight-refresh-notice">Automatic weights could not be refreshed. You can still run the analysis.</p>}
    {errors.length > 0 && <div className="form-errors" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
    </div>
  </form>
}
