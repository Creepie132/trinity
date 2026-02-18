'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface OrbButtonProps {
  isHovered: boolean
  isChatOpen: boolean
  onClick: () => void
  onHoverStart: () => void
  onHoverEnd: () => void
}

export default function OrbButton({ isHovered, isChatOpen, onClick, onHoverStart, onHoverEnd }: OrbButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    sphereGroup: THREE.Group
    ribbons: THREE.Mesh[]
    lights: THREE.PointLight[]
    animationId: number | null
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const size = 72

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.z = 3

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(size, size)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // Sphere
    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64)
    const sphereMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a1628,
      roughness: 0.2,
      metalness: 0.8,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.85
    })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)

    // Group for rotation
    const sphereGroup = new THREE.Group()
    sphereGroup.add(sphere)

    // Ribbons (Torus)
    const ribbons: THREE.Mesh[] = []

    // Ribbon 1 - Cyan
    const ribbon1Geo = new THREE.TorusGeometry(1.05, 0.08, 16, 100)
    const ribbon1Mat = new THREE.MeshBasicMaterial({ 
      color: 0x00D4FF,
      transparent: true,
      opacity: 0.9
    })
    const ribbon1 = new THREE.Mesh(ribbon1Geo, ribbon1Mat)
    ribbon1.rotation.x = 0.3
    ribbon1.rotation.z = 0.5
    ribbons.push(ribbon1)
    sphereGroup.add(ribbon1)

    // Ribbon 2 - Indigo
    const ribbon2Geo = new THREE.TorusGeometry(1.08, 0.06, 16, 100)
    const ribbon2Mat = new THREE.MeshBasicMaterial({ 
      color: 0x4F46E5,
      transparent: true,
      opacity: 0.85
    })
    const ribbon2 = new THREE.Mesh(ribbon2Geo, ribbon2Mat)
    ribbon2.rotation.x = -0.5
    ribbon2.rotation.z = -0.3
    ribbons.push(ribbon2)
    sphereGroup.add(ribbon2)

    // Ribbon 3 - White accent
    const ribbon3Geo = new THREE.TorusGeometry(1.03, 0.03, 16, 100)
    const ribbon3Mat = new THREE.MeshBasicMaterial({ 
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.4
    })
    const ribbon3 = new THREE.Mesh(ribbon3Geo, ribbon3Mat)
    ribbon3.rotation.x = 0.8
    ribbon3.rotation.z = 0.1
    ribbons.push(ribbon3)
    sphereGroup.add(ribbon3)

    scene.add(sphereGroup)

    // Lights
    const light1 = new THREE.PointLight(0x00D4FF, 2, 10)
    light1.position.set(2, 2, 2)
    scene.add(light1)

    const light2 = new THREE.PointLight(0x4F46E5, 1.5, 10)
    light2.position.set(-2, -1, 2)
    scene.add(light2)

    const ambientLight = new THREE.AmbientLight(0x111111, 0.3)
    scene.add(ambientLight)

    sceneRef.current = {
      scene,
      camera,
      renderer,
      sphereGroup,
      ribbons,
      lights: [light1, light2],
      animationId: null
    }

    // Animation loop
    let startTime = Date.now()

    const animate = () => {
      if (!sceneRef.current) return

      const elapsed = (Date.now() - startTime) / 1000
      const speedMultiplier = isChatOpen ? 0.5 : isHovered ? 2 : 1

      // Rotate whole group
      sceneRef.current.sphereGroup.rotation.y += 0.003 * speedMultiplier

      // Rotate individual ribbons
      sceneRef.current.ribbons[0].rotation.z += 0.005 * speedMultiplier
      sceneRef.current.ribbons[1].rotation.x += 0.004 * speedMultiplier
      sceneRef.current.ribbons[2].rotation.z -= 0.006 * speedMultiplier

      // Pulsing lights
      const pulse = Math.sin(elapsed * 0.5) * 0.5
      sceneRef.current.lights[0].intensity = 2 + pulse
      sceneRef.current.lights[1].intensity = 1.5 + pulse * 0.5

      sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera)
      sceneRef.current.animationId = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId)
      }
      if (sceneRef.current?.renderer) {
        sceneRef.current.renderer.dispose()
        containerRef.current?.removeChild(sceneRef.current.renderer.domElement)
      }
    }
  }, [isHovered, isChatOpen])

  return (
    <div
      style={{
        position: 'relative',
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        overflow: 'hidden',
        cursor: 'pointer',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.3s ease',
        background: 'transparent',
        border: 'none'
      }}
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      {isChatOpen && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '28px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 'bold',
            pointerEvents: 'none',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
          }}
        >
          ✕
        </div>
      )}
    </div>
  )
}
