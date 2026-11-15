import layers from '../data/moon-wmts.json' with { type: 'json' }
export function moonTiles(bbox, screenWidth = 800) {
  const width = bbox.xmax - bbox.xmin, height = bbox.ymax - bbox.ymin
  const desired = width / Math.max(1,screenWidth)
  const visible = layers.flatMap((layer, index) => {
    // Use the detailed polar coverage only when its resolution is beneficial.
    if (index && desired > layers[index - 1].levels.at(-1).resolution) return []
    const [xmin,ymin,xmax,ymax] = layer.extent
    // Avoid stitching layers with different illumination across a viewport.
    if (index && (bbox.xmin < xmin || bbox.xmax > xmax || bbox.ymin < ymin || bbox.ymax > ymax)) return []
    if (bbox.xmax < xmin || bbox.xmin > xmax || bbox.ymax < ymin || bbox.ymin > ymax) return []
    const level = layer.levels.find((entry) => entry.resolution <= desired) ?? layer.levels.at(-1)
    const span = level.resolution * 256
    const [originX,originY] = level.origin
    const startX = Math.max(0,Math.floor((Math.max(bbox.xmin,xmin) - originX) / span))
    const endX = Math.min(level.columns - 1,Math.floor((Math.min(bbox.xmax,xmax) - originX) / span))
    const startY = Math.max(0,Math.floor((originY - Math.min(bbox.ymax,ymax)) / span))
    const endY = Math.min(level.rows - 1,Math.floor((originY - Math.max(bbox.ymin,ymin)) / span))
    const tiles=[]
    for(let row=startY;row<=endY;row++) for(let col=startX;col<=endX;col++) tiles.push({
      key:`${layer.name}/${level.id}/${row}/${col}`,
      url:`${layer.url}/${level.id}/${row}/${col}.png`,
      left:(originX+col*span-bbox.xmin)/width*100,
      top:(bbox.ymax-(originY-row*span))/height*100,
      width:span/width*100,height:span/height*100,
    })
    return [{name:layer.name,tiles}]
  })
  return visible.slice(-1)
}
