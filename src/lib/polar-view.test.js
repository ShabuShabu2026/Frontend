import test from 'node:test'
import assert from 'node:assert/strict'
import { polarExtent, polarRadius, constrainPolarView } from './polar-view.js'
import { unprojectSite } from './projection.js'

test('map edge is exactly 85 degrees south, approximately 300 km across', () => {
  assert.ok(Math.abs(unprojectSite(0, polarRadius).latitude + 85) < 1e-10)
  assert.ok(2 * polarRadius > 300000 && 2 * polarRadius < 305000)
  assert.deepEqual(constrainPolarView(polarExtent), polarExtent)
})

test('zoom remains available and panning cannot leave the polar map', () => {
  const zoomed = constrainPolarView({ xmin: -25000, xmax: 25000, ymin: -25000, ymax: 25000 })
  assert.equal(zoomed.xmax - zoomed.xmin, 50000)
  const panned = constrainPolarView({ xmin: 300000, xmax: 350000, ymin: -350000, ymax: -300000 })
  assert.equal(panned.xmax, polarRadius)
  assert.equal(panned.ymin, -polarRadius)
  assert.equal(panned.xmax - panned.xmin, 50000)
})
