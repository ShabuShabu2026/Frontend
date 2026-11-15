import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { terrainMesh } from '../lib/terrain.js'
import LoadingState from './LoadingState.jsx'

export default function Terrain3D({ terrain }) {
  const host = useRef(null)
  const [failure, setFailure] = useState('')
  const [rendered, setRendered] = useState(false)
  useEffect(() => {
    const data = terrainMesh(terrain)
    if (!data || !host.current) return
    const container = host.current
    let renderer
    let disposed = false
    let firstFrame = false
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) }
    catch { queueMicrotask(() => setFailure('3D rendering is unavailable. Enable WebGL in your browser.')); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x252529, 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-label', 'Interactive lunar terrain from site DEM elevations')
    renderer.domElement.setAttribute('role', 'img')
    container.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3))
    geometry.setIndex(data.indices)
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    const material = new THREE.MeshStandardMaterial({ color: 0xa7a5a2, roughness: 1, metalness: 0, side: THREE.DoubleSide })
    scene.add(new THREE.Mesh(geometry, material))
    scene.add(new THREE.HemisphereLight(0xffffff, 0x30303b, 1.5))
    const sun = new THREE.DirectionalLight(0xfff6e8, 2.8)
    sun.position.set(-1, 1.2, .7)
    scene.add(sun)
    const radius = Math.max(1, geometry.boundingSphere.radius)
    const camera = new THREE.PerspectiveCamera(40, 1, radius / 1000, radius * 100)
    camera.position.set(radius * 1.5, radius * 1.6, radius * 2.5)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.minDistance = radius * .2
    controls.maxDistance = radius * 8
    controls.maxPolarAngle = Math.PI * .49
    controls.target.set(0,0,0)
    controls.update()
    const render = () => {
      try {
        renderer.render(scene, camera)
        if (!firstFrame) { firstFrame = true; queueMicrotask(() => { if (!disposed) setRendered(true) }) }
      } catch { queueMicrotask(() => { if (!disposed) setFailure('Unable to render terrain. Please reload and try again.') }) }
    }
    controls.addEventListener('change', render)
    const resize = () => {
      const width = container.clientWidth, height = container.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()
    const reset = () => { camera.position.set(radius * 1.5, radius * 1.6, radius * 2.5); controls.target.set(0,0,0); controls.update(); render() }
    container.addEventListener('dblclick', reset)
    return () => {
      disposed = true
      observer.disconnect(); container.removeEventListener('dblclick', reset)
      controls.dispose(); geometry.dispose(); material.dispose(); renderer.dispose(); renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [terrain])
  const mesh = terrainMesh(terrain)
  if (!mesh) return <div className="terrain-empty"><span>3D Terrain</span><p>No renderable elevation surface was returned.</p></div>
  return <figure className="terrain-webgl"><div className="terrain-stage"><div ref={host} className="terrain-webgl-host" />{!rendered && !failure && <div className="terrain-render-loading"><LoadingState>Rendering 3D terrain…</LoadingState></div>}</div>{failure && <p className="warning">{failure}</p>}<figcaption>{terrain.spacing} m DEM · True vertical scale<br /><span>Drag to rotate · Scroll to zoom · Double-click to reset</span></figcaption></figure>
}
