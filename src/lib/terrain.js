// All three axes use the same metre scale. No synthetic terrain or height stretching.
export function terrainMesh(terrain) {
  const grid = terrain?.elevations
  const spacing = Number(terrain?.spacing)
  if (!Array.isArray(grid) || grid.length < 2 || !Number.isFinite(spacing) || spacing <= 0) return null
  const rows = grid.length, columns = grid[0]?.length ?? 0
  if (columns < 2 || grid.some((row) => row.length !== columns)) return null
  const valid = grid.flat().filter(Number.isFinite)
  if (!valid.length) return null
  const min = valid.reduce((a,b) => Math.min(a,b), Infinity)
  const max = valid.reduce((a,b) => Math.max(a,b), -Infinity)
  const positions = [], indices = []
  const center = (min + max) / 2
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    positions.push((column - (columns - 1) / 2) * spacing, Number.isFinite(grid[row][column]) ? grid[row][column] - center : 0, (row - (rows - 1) / 2) * spacing)
  }
  for (let row = 0; row < rows - 1; row++) for (let column = 0; column < columns - 1; column++) {
    const a = row * columns + column, b = a + 1, c = a + columns, d = c + 1
    if ([grid[row][column],grid[row+1][column],grid[row][column+1]].every(Number.isFinite)) indices.push(a,c,b)
    if ([grid[row][column+1],grid[row+1][column],grid[row+1][column+1]].every(Number.isFinite)) indices.push(b,c,d)
  }
  return indices.length ? { positions, indices, min, max, width: (columns - 1) * spacing, depth: (rows - 1) * spacing } : null
}
