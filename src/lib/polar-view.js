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
