import { projectSite } from './projection.js'

export const polarRadius = projectSite(-85, 0).y
export const polarExtent = { xmin: -polarRadius, ymin: -polarRadius, xmax: polarRadius, ymax: polarRadius }

// Keep the camera inside the map extent while allowing zoom and pan within it.
export function constrainPolarView(box) {
  const width = Math.min(2 * polarRadius, Math.max(1000, box.xmax - box.xmin))
  const height = Math.min(2 * polarRadius, Math.max(1000, box.ymax - box.ymin))
  const x = Math.max(-polarRadius + width / 2, Math.min(polarRadius - width / 2, (box.xmin + box.xmax) / 2))
  const y = Math.max(-polarRadius + height / 2, Math.min(polarRadius - height / 2, (box.ymin + box.ymax) / 2))
  return { xmin: x - width / 2, xmax: x + width / 2, ymin: y - height / 2, ymax: y + height / 2 }
}

// Match the geographic viewport to the panel, keeping metres square on screen.
export function fitPolarViewport(box, aspect = 1) {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const maxWidth = 2 * polarRadius * Math.min(1, ratio)
  const minWidth = Math.min(maxWidth, 1000 * Math.max(1, ratio))
  const width = Math.min(maxWidth, Math.max(minWidth, box.xmax - box.xmin))
  const height = width / ratio
  const x = (box.xmin + box.xmax) / 2, y = (box.ymin + box.ymax) / 2
  return constrainPolarView({ xmin: x - width / 2, xmax: x + width / 2, ymin: y - height / 2, ymax: y + height / 2 })
}

// Start with a rectangle inside the supported polar cap, rather than empty corners.
export function initialPolarViewport(aspect = 1) {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const height = 2 * polarRadius / Math.sqrt(1 + ratio * ratio)
  const width = height * ratio
  return { xmin: -width / 2, xmax: width / 2, ymin: -height / 2, ymax: height / 2 }
}
