import { defaults } from './mission.js'

const version = 1
const routes = ['home', 'candidates', 'detail', 'configuration']
const databaseName = 'honeymoon-planner'
let databasePromise
export function sessionKey(storage = window.sessionStorage) {
  const key = 'honeymoon-tab'
  let id = storage.getItem(key)
  if (!id) { id = crypto.randomUUID(); storage.setItem(key, id) }
  return id
}
function database() {
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, version)
    request.onupgradeneeded = () => request.result.createObjectStore('sessions')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return databasePromise
}
export function routeFromLocation(location, historyState) {
  const [path, query = ''] = location.hash.replace(/^#/, '').split('?')
  const preview = new URLSearchParams(location.search).get('preview')
  const view = routes.includes(path) ? path : ({ details: 'detail', candidates: 'candidates', configuration: 'configuration' }[preview] ?? null)
  const entry = historyState?.planner
  return { view, siteId: new URLSearchParams(query).get('site'), ...(entry?.view === view ? { selected: entry.selected, detailDate: entry.detailDate, detailTab: entry.detailTab } : {}) }
}
export function routeUrl(view, selected) {
  return `#${view}${view === 'detail' && selected?.id ? `?site=${encodeURIComponent(selected.id)}` : ''}`
}
export function restoreSession(snapshot, route) {
  const state = snapshot?.version === version ? snapshot.state : null
  const config = { ...defaults, ...state?.config, priorities: { ...defaults.priorities, ...state?.config?.priorities } }
  const result = state ? snapshot.result ?? null : null
  const selected = route.selected ?? (route.siteId ? (state?.selected?.id === route.siteId ? state.selected : result?.candidates?.find(site => site.id === route.siteId)) : state?.selected) ?? null
  let view = route.view ?? state?.view ?? 'home'
  // URLs alone cannot recreate an analysis; never manufacture missing results.
  if (view === 'detail' && (!selected || !result)) view = result ? 'candidates' : 'home'
  if (view === 'candidates' && !result) view = 'home'
  return { config, result, selected, view, analyzedConfig: state?.analyzedConfig ?? null, detail: selected?.id === state?.selected?.id ? state?.detail ?? null : null, detailDate: route.detailDate ?? state?.detailDate ?? config.landingDate, detailTab: route.detailTab ?? state?.detailTab ?? 'Overview' }
}
export async function readSession(id) {
  const db = await database()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sessions', 'readonly'), store = transaction.objectStore('sessions')
    const state = store.get(`${id}:state`), result = store.get(`${id}:result`)
    transaction.oncomplete = () => resolve({ version, state: state.result, result: result.result })
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}
export async function writeSession(id, state, result, writeResult = true) {
  const db = await database()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sessions', 'readwrite'), store = transaction.objectStore('sessions')
    store.put(state, `${id}:state`)
    if (writeResult) store.put(result, `${id}:result`)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}
