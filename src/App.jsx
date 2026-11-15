import { useState } from 'react'
import './App.css'

const image = (name) => `/figma/${name}`
const initial = { Communication: 3, Other: 3, Flatness: 5, Roughness: 5, Sunlight: 3 }
const positions = [[279,220],[187,306],[237,495],[287,613],[435,520],[656,306],[766,588],[404,785],[656,745]]
// 디자인에 있는 예시 데이터입니다. 실제 분석 API를 연결할 때 교체합니다.
const sites = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: 'LSP-0347', score: i === 9 ? '-' : '79%', status: i === 2 ? 'Marginal' : 'Feasible', color: i < 3 ? 'green' : i < 6 ? 'amber' : i < 9 ? 'red' : 'gray' }))
function Field({ label, children, className = '' }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}</label>
}
function Toggle({ label, checked, onChange }) {
  return <button type="button" className="toggle" role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)}>{checked ? <img src={image('imgGroup2.svg')} alt="" /> : <span />}</button>
}
function Configuration({ onAnalyze }) {
  const [priorities, setPriorities] = useState(initial)
  const [constraints, setConstraints] = useState({ slope: true, crewed: true, uncrewed: true })
  const [criteria, setCriteria] = useState({ 'Darkness Criterion': 'Medium', 'Earth Visibility Criterion': 'Medium', 'Panel / Antenna Height': '5 m' })
  const [days, setDays] = useState(20)
  const total = Object.values(priorities).reduce((a, b) => a + b, 0)
  const toggle = (key, label) => <Toggle label={label} checked={constraints[key]} onChange={(value) => setConstraints({ ...constraints, [key]: value })} />
  return <form onSubmit={(event) => { event.preventDefault(); onAnalyze() }}>
    <h2>Mission Configuration</h2>
    <div className="mission-fields">
      <Field label="Landing Date"><input type="date" defaultValue="2026-11-15" required /></Field>
      <Field label="Stay Duration"><input type="number" aria-label="Stay Duration in days" min="1" max="365" defaultValue="14" required /></Field>
      {[
        ['Mission Type', ['Uncrewed', 'Crewed']], ['Mission Objective', ['Exploration', 'Research', 'Resource extraction']], ['Power Requirement', ['Medium', 'Low', 'High']], ['Communication Dependency', ['Medium', 'Low', 'High']],
      ].map(([label, options]) => <Field key={label} label={label}><select>{options.map((option) => <option key={option}>{option}</option>)}</select></Field>)}
    </div>
    <h2>Auto Weight Summary</h2>
    <div className="weights">{['Communication','Flatness','Roughness','Sunlight','Other'].map((name) => <div className="weight" key={name}><span>{name}</span><div className="weight-track"><div style={{ width: `${priorities[name] / total * 100}%` }} /></div><output>{Math.floor(priorities[name] / total * 100)}%</output></div>)}</div>
    <h2>Advanced Settings</h2>
    <div className="advanced">
      <div className="constraint slope"><span>Absolute Slope Constraint</span>{toggle('slope','Absolute Slope Constraint')}<label htmlFor="slope">Limit</label><input id="slope" type="number" min="0" max="90" defaultValue="15" disabled={!constraints.slope} required /></div>
      <div className="constraint crewed"><span>Crewed Sunlight Absolute Constraint</span>{toggle('crewed','Crewed Sunlight Absolute Constraint')}</div>
      <div className="constraint uncrewed"><span>Uncrewed Absolute Constraint</span>{toggle('uncrewed','Uncrewed Absolute Constraint')}</div>
      <Field label="Uncrewed Absolute Constraint" className="indented"><input type="number" min="0" defaultValue="48" disabled={!constraints.uncrewed} required /></Field>
      <Field label="Max Communication Blackout" className="indented"><input type="number" min="0" defaultValue="24" disabled={!constraints.uncrewed} required /></Field>
      <p className="priority-title">Priority Bars (1 - 5)</p>
      <div className="priorities">{Object.entries(priorities).map(([name, value]) => <div className="priority" key={name}><label htmlFor={`priority-${name}`}>{name}</label><input id={`priority-${name}`} type="range" style={{ '--progress': `${(value - 1) / 4 * 100}%` }} min="1" max="5" value={value} onChange={(event) => setPriorities({ ...priorities, [name]: Number(event.target.value) })} /><output>{value}</output></div>)}</div>
      <Field label="Required Sunlight Ratio" className="criteria"><input type="number" min="0" max="100" defaultValue="80" required /></Field>
      {Object.entries(criteria).map(([label, value]) => <div className="field criteria" key={label}><span>{label}</span><div className="segmented" role="group" aria-label={label}>{(label.includes('Height') ? ['1 m','5 m','10 m'] : ['Low','Medium','High']).map((option) => <button type="button" key={option} aria-pressed={value === option} className={value === option ? 'active' : ''} onClick={() => setCriteria({ ...criteria, [label]: option })}>{option}</button>)}</div></div>)}
      <div className="field criteria search-range"><label htmlFor="days">Landing Date Search Range</label><div><input id="days" style={{ '--progress': `${days / 30 * 100}%` }} type="range" min="0" max="30" value={days} aria-valuetext={`${days} days`} onChange={(event) => setDays(Number(event.target.value))} /><output>{days}</output></div></div>
      <button className="analyze" type="submit"><img src={image('imgSearch.svg')} alt="" />Analyze Landing Sites</button>
    </div>
  </form>
}
function CandidateList({ onSelect }) {
  return <><h2>Candidate Sites</h2><div className="candidates">{sites.map((site) => <button className="candidate" key={site.id} onClick={() => onSelect(site)}><span className="rank">{site.id}</span><span>{site.name}</span><span className={`score ${site.color}`}>{site.score}</span><span className="description">{site.status} · High sunlight<br />· Low roughness</span></button>)}</div></>
}
function LunarMap({ view, selected, onSelect }) {
  const detail = view === 'detail'
  return <section className={`lunar-map ${view}`} aria-label="Lunar south pole map">{view === 'configuration' ? <img className="moon" src={image('imgImage1.png')} alt="Lunar south pole" /> : <div className="terrain">
    <img className="terrain-image" src={image(detail ? 'detailimgImage2.png' : 'listimgImage2.png')} alt="Lunar south pole crater terrain" />
    {positions.map(([x,y], index) => {
      const site = sites[index]
      const colorAsset = index < 3 ? '66' : [3,6,8].includes(index) ? '69' : '70'
      return <button key={site.id} className={`map-site ${selected?.id === site.id ? 'selected' : ''}`} style={{ left: `${x / 10}%`, top: `${y / 9.26}%` }} aria-label={`Candidate ${site.id}, ${site.name}, ${site.score}`} onClick={() => onSelect(site)}>
        <img className="marker" src={image(`${detail ? 'detail' : 'list'}imgEllipse${colorAsset}.svg`)} alt="" />
        {detail && <span className="callout"><img className="callout-tail" src={image(selected?.id === site.id ? 'detailimgUnion1.svg' : 'detailimgUnion.svg')} alt="" /><strong>{site.name}</strong><span><b>{site.status}</b><b>{site.score}</b></span></span>}
      </button>
    })}
  </div>}</section>
}
export default function App() {
  // state가 바뀌면 React가 해당 화면을 다시 그립니다.
  const [view, setView] = useState('configuration')
  const [selected, setSelected] = useState(null)
  const selectSite = (site) => { setSelected(site); setView('detail') }
  return <><header className="topbar">{view !== 'configuration' && <nav aria-label="Screen navigation"><button onClick={() => setView('configuration')}>← Mission Configuration</button>{view === 'detail' && <button onClick={() => setView('candidates')}>← Candidate Sites</button>}<span className="demo-label">Design preview · Sample results</span></nav>}</header>
    <main className="workspace"><aside className="sidebar"><div hidden={view !== 'configuration'}><Configuration onAnalyze={() => setView('candidates')} /></div>{view === 'candidates' && <CandidateList onSelect={selectSite} />}{view === 'detail' && <><h2>Selected Site Details</h2><h1 className="selected-name">{selected.name}</h1></>}</aside><LunarMap view={view} selected={selected} onSelect={selectSite} /></main>
  </>
}
