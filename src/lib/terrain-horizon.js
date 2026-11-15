import { projectSite } from './projection.js'

const radians = Math.PI / 180
function elevationAt(grid, row, column) {
  const r = Math.floor(row), c = Math.floor(column)
  if (r < 0 || c < 0 || r + 1 >= grid.length || c + 1 >= grid[0].length) return null
  const cells = [grid[r][c], grid[r][c + 1], grid[r + 1][c], grid[r + 1][c + 1]]
  if (!cells.every(Number.isFinite)) return null
  const fy = row - r, fx = column - c
  return cells[0] * (1 - fx) * (1 - fy) + cells[1] * fx * (1 - fy) + cells[2] * (1 - fx) * fy + cells[3] * fx * fy
}

// A local DEM skyline, not an estimate of terrain beyond the returned grid.
// Ray bearings match the visibility API: clockwise from true north.
export function terrainHorizon(terrain, site, observerHeight = 0, azimuthStep = 0.25) {
  const grid = terrain?.elevations, geometry = terrain?.geometry
  const origin = geometry?.origin, column = geometry?.column_step, row = geometry?.row_step
  const radius = terrain?.referenceRadius ?? 1737400
  if (!Array.isArray(grid) || grid.length < 2 || grid[0]?.length < 2 || grid.some(line => line.length !== grid[0].length) || !origin || !column || !row || !Number.isFinite(site?.latitude) || !Number.isFinite(site?.longitude) || !Number.isFinite(observerHeight) || observerHeight < 0 || !Number.isFinite(azimuthStep) || azimuthStep <= 0 || radius <= 0) return null
  if (geometry.origin_reference !== 'center of upper-left pixel') return null
  const determinant = column.x * row.y - row.x * column.y
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-8) return null
  const pixel = point => {
    const x = point.x - origin.x, y = point.y - origin.y
    return { column: (x * row.y - row.x * y) / determinant, row: (column.x * y - x * column.y) / determinant }
  }
  const position = pixel(geometry.site_position ?? projectSite(site.latitude, site.longitude))
  const ground = elevationAt(grid, position.row, position.column)
  if (ground == null) return null
  const spacing = Math.min(Math.hypot(column.x, column.y), Math.hypot(row.x, row.y))
  if (!Number.isFinite(spacing) || spacing <= 0) return null
  const step = spacing / 2
  const maxDistance = Math.hypot(grid.length * Math.hypot(row.x, row.y), grid[0].length * Math.hypot(column.x, column.y))
  const lat = site.latitude * radians, lon = site.longitude * radians
  const samples = []
  for (let azimuth = 0; azimuth <= 360; azimuth += azimuthStep) {
    const bearing = azimuth * radians
    let highest = -90, distance = 0, complete = true, count = 0
    for (let d = step; d <= maxDistance; d += step) {
      const arc = d / radius
      const targetLat = Math.asin(Math.sin(lat) * Math.cos(arc) + Math.cos(lat) * Math.sin(arc) * Math.cos(bearing))
      const targetLon = lon + Math.atan2(Math.sin(bearing) * Math.sin(arc) * Math.cos(lat), Math.cos(arc) - Math.sin(lat) * Math.sin(targetLat))
      const target = pixel(projectSite(targetLat / radians, targetLon / radians))
      if (target.row < 0 || target.column < 0 || target.row >= grid.length - 1 || target.column >= grid[0].length - 1) break
      const height = elevationAt(grid, target.row, target.column)
      if (height == null) { complete = false; break }
      const up = (radius + height) * Math.cos(arc) - (radius + ground + observerHeight)
      const horizontal = (radius + height) * Math.sin(arc)
      highest = Math.max(highest, Math.atan2(up, horizontal) / radians)
      distance = d; count++
    }
    samples.push({ azimuth, elevation: complete && count ? highest : null, distance })
  }
  return samples.some(sample => sample.elevation != null) ? { samples, maxDistance: Math.max(...samples.map(sample => sample.distance)) } : null
}
