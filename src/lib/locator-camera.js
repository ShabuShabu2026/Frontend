import { OrthographicCamera } from 'three'

export function fitLocatorCamera(camera, aspect) {
  camera.left = -1.2 * aspect
  camera.right = 1.2 * aspect
  camera.top = 1.2
  camera.bottom = -1.2
  camera.updateProjectionMatrix()
}
export function createLocatorCamera(aspect = 1) {
  const camera = new OrthographicCamera(-1.2, 1.2, 1.2, -1.2, .1, 20)
  // Look directly at the south pole. The map's +Y (0° longitude) is screen up;
  // map +X (90° E) is screen right. Do not tilt or mirror the spherical inset.
  camera.position.set(0, -4, 0)
  camera.up.set(1, 0, 0)
  camera.lookAt(0, 0, 0)
  fitLocatorCamera(camera, aspect)
  camera.updateMatrixWorld()
  return camera
}
