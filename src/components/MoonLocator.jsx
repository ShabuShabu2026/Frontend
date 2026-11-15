import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { globePosition, unprojectSite, viewportOutline } from '../lib/projection.js'
import { createLocatorCamera, fitLocatorCamera } from '../lib/locator-camera.js'

export default function MoonLocator({ bbox }) {
  const host = useRef(null)
  const model = useRef(null)
  const indicator = useRef(null)
  const [unavailable,setUnavailable] = useState(false)
  const center = unprojectSite((bbox.xmin+bbox.xmax)/2,(bbox.ymin+bbox.ymax)/2)
  useEffect(()=>{
    let renderer
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}) }
    catch { queueMicrotask(()=>setUnavailable(true)); return }
    const node=host.current
    let disposed=false
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
    renderer.setClearColor(0x000000,0)
    renderer.domElement.setAttribute('role','img')
    renderer.domElement.setAttribute('aria-label','3D Moon showing the current 2D map footprint')
    node.appendChild(renderer.domElement)
    const scene=new THREE.Scene()
    const camera=createLocatorCamera()
    const globeGeometry=new THREE.SphereGeometry(1,64,40)
    const globeMaterial=new THREE.MeshStandardMaterial({color:0xbebec3,roughness:1})
    scene.add(new THREE.Mesh(globeGeometry,globeMaterial))
    scene.add(new THREE.AmbientLight(0xffffff,2))
    const light=new THREE.DirectionalLight(0xffffff,1.4);light.position.set(-2,-4,4);scene.add(light)
    const lineGeometry=new THREE.BufferGeometry()
    const lineMaterial=new THREE.LineBasicMaterial({color:0xb5a2ff,depthTest:true})
    scene.add(new THREE.LineLoop(lineGeometry,lineMaterial))
    const patchGeometry=new THREE.BufferGeometry()
    const patchMaterial=new THREE.MeshBasicMaterial({color:0x9e83ff,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false})
    scene.add(new THREE.Mesh(patchGeometry,patchMaterial))
    const dotGeometry=new THREE.SphereGeometry(.025,12,8)
    const dotMaterial=new THREE.MeshBasicMaterial({color:0xe8dbff})
    const dot=new THREE.Mesh(dotGeometry,dotMaterial);scene.add(dot)
    const draw=()=>{
      renderer.render(scene,camera)
      // A screen-sized ring stays legible while the real footprint shrinks on zoom.
      const point=dot.position.clone().project(camera)
      if(indicator.current){
        indicator.current.style.left=`${(point.x+1)*50}%`
        indicator.current.style.top=`${(1-point.y)*50}%`
        indicator.current.hidden=false
      }
    }
    model.current={ update(box) {
      lineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(viewportOutline(box),3));lineGeometry.computeBoundingSphere()
      const positions=[],indices=[],steps=12
      for(let row=0;row<=steps;row++)for(let col=0;col<=steps;col++){
        const {latitude,longitude}=unprojectSite(box.xmin+(box.xmax-box.xmin)*col/steps,box.ymax-(box.ymax-box.ymin)*row/steps)
        positions.push(...globePosition(latitude,longitude,1.006))
        if(row<steps&&col<steps){const a=row*(steps+1)+col,b=a+1,c=a+steps+1,d=c+1;indices.push(a,c,b,b,c,d)}
      }
      patchGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));patchGeometry.setIndex(indices);patchGeometry.computeBoundingSphere()
      const middle=unprojectSite((box.xmin+box.xmax)/2,(box.ymin+box.ymax)/2)
      dot.position.set(...globePosition(middle.latitude,middle.longitude,1.025));draw()
    }}
    const resize=()=>{const width=node.clientWidth,height=node.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);fitLocatorCamera(camera,width/height);draw()}
    const observer=new ResizeObserver(resize);observer.observe(node);resize()
    const textureCanvas=document.createElement('canvas');textureCanvas.width=512;textureCanvas.height=256
    const context=textureCanvas.getContext('2d')
    const images=[new Image(),new Image()]
    let texture
    const load=()=>{
      if(disposed||!images.every(img=>img.complete&&img.naturalWidth))return
      images.forEach((img,index)=>context.drawImage(img,index*256,0,256,256))
      texture=new THREE.CanvasTexture(textureCanvas);texture.colorSpace=THREE.SRGBColorSpace
      globeMaterial.map=texture;globeMaterial.color.set(0xffffff);globeMaterial.needsUpdate=true;draw()
    }
    images.forEach((img,index)=>{img.onload=load;img.src=`/moon/globe/wac-${index?'east':'west'}.jpg`})
    return ()=>{disposed=true;model.current=null;observer.disconnect();images.forEach(img=>{img.onload=null});texture?.dispose();globeGeometry.dispose();globeMaterial.dispose();lineGeometry.dispose();lineMaterial.dispose();patchGeometry.dispose();patchMaterial.dispose();dotGeometry.dispose();dotMaterial.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()}
  },[])
  useEffect(()=>{model.current?.update(bbox)},[bbox])
  return <aside className="moon-locator" aria-label="Current map location on the Moon"><div className="locator-title">Moon overview<span>3D</span></div><div className="locator-globe" ref={host}><span className="locator-position-indicator" ref={indicator} hidden aria-hidden="true" /></div>{unavailable&&<p className="locator-unavailable">3D overview unavailable</p>}<div className="locator-caption"><i/>Current view</div><small>{Math.abs(center.latitude).toFixed(1)}°{center.latitude<0?'S':'N'} · {Math.abs(center.longitude).toFixed(1)}°{center.longitude<0?'W':'E'}</small></aside>
}
