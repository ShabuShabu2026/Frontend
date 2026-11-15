import test from 'node:test'
import assert from 'node:assert/strict'
import { sortCandidates, loadCandidateSummaries } from './candidate-summary.js'
import { earthVisibilityNotice, isEarthVisibilityNotice } from './data-notices.js'

const sites = [
  { id: 'a', suitability: 90, sunVisibility: .5, earthVisibility: .6 },
  { id: 'b', suitability: 80, sunVisibility: .9, earthVisibility: .4 },
  { id: 'c', suitability: 70, sunVisibility: .6, earthVisibility: .95 },
  { id: 'missing', suitability: 99, sunVisibility: null },
]
test('visibility sorts use measured ratios and put missing values last', () => {
  assert.deepEqual(sortCandidates(sites, 'Most sunlight').map(site => site.id), ['b', 'c', 'a', 'missing'])
  assert.deepEqual(sortCandidates(sites, 'Best Earth view').map(site => site.id), ['c', 'a', 'b', 'missing'])
  assert.equal(sortCandidates(sites, 'Best fit')[0].id, 'missing')
  assert.equal(sites[0].id, 'a')
})
test('summary loading bounds requests and retains successes when one site fails', async () => {
  let active = 0, peak = 0
  const loaded = [], errors = []
  await loadCandidateSummaries(sites, async site => {
    active++; peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 2))
    active--
    if (site.id === 'b') throw Error('Unavailable')
    return { sunVisibility: .9 }
  }, { signal: new AbortController().signal, onData: id => loaded.push(id), onError: id => errors.push(id), concurrency: 2 })
  assert.equal(peak, 2)
  assert.deepEqual(errors, ['b'])
  assert.equal(loaded.length, 3)
})
test('an obsolete viewport cannot publish summaries or start more requests', async () => {
  const controller = new AbortController()
  let calls = 0, published = 0
  await loadCandidateSummaries(sites, async () => { calls++; controller.abort(); return {} }, { signal: controller.signal, onData: () => published++, onError: () => {}, concurrency: 1 })
  assert.equal(calls, 1)
  assert.equal(published, 0)
})
test('only the relocated Earth visibility notice is hidden from results', () => {
  assert.equal(isEarthVisibilityNotice(earthVisibilityNotice), true)
  assert.equal(isEarthVisibilityNotice('No elevation data available.'), false)
})
