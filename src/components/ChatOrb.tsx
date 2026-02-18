'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface ChatOrbProps {
  isHovered: boolean
  isChatOpen: boolean
  onClick: () => void
  onHoverStart: () => void
  onHoverEnd: () => void
}

const torusVertexShader = `
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const torusFragmentShader = `
  varying vec3 vPosition;
  varying vec2 vUv;
  uniform float u_time;

  void main() {
    // Gradient based on position + time offset
    float t = (vPosition.x + vPosition.y) * 0.5 + 0.5 + u_time * 0.05;
    t = fract(t); // Loop 0-1

    // 5 gradient colors
    vec3 c1 = vec3(0.482, 0.184, 0.969); // #7B2FF7 purple
    vec3 c2 = vec3(0.784, 0.314, 0.753); // #C850C0 magenta
    vec3 c3 = vec3(1.0, 0.420, 0.420);   // #FF6B6B pink-red
    vec3 c4 = vec3(1.0, 0.557, 0.325);   // #FF8E53 orange
    vec3 c5 = vec3(0.310, 0.765, 0.969); // #4FC3F7 cyan

    vec3 color;
    if (t < 0.25) 
      color = mix(c1, c2, t / 0.25);
    else if (t < 0.5) 
      color = mix(c2, c3, (t - 0.25) / 0.25);
    else if (t < 0.75) 
      color = mix(c3, c4, (t - 0.5) / 0.25);
    else 
      color = mix(c4, c5, (t - 0.75) / 0.25);

    // Subtle glow pulse
    float glow = 0.8 + 0.2 * sin(u_time * 2.0 + vUv.x * 6.28);
    color *= glow;

    gl_FragColor = vec4(color, 1.0);
  }
`

export default function ChatOrb({ isHovered, isChatOpen, onClick, onHoverStart, onHoverEnd }: ChatOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    mainTorus: THREE.Mesh
    waves: THREE.Mesh[]
    centerGlow: THREE.Mesh
    uniforms: { u_time: { value: number } }
    animationId: number | null
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const size = 72

    // Scene
    const scene = new THREE.Scene()

    // Camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.set(0, 0, 4.5)
    camera.lookAt(0, 0, 0)

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    })
    renderer.setSize(size, size)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // Main torus with gradient shader
    const torusGeometry = new THREE.TorusGeometry(1, 0.3, 32, 100)
    const uniforms = {
      u_time: { value: 0.0 }
    }
    const torusMaterial = new THREE.ShaderMaterial({
      vertexShader: torusVertexShader,
      fragmentShader: torusFragmentShader,
      uniforms
    })
    const mainTorus = new THREE.Mesh(torusGeometry, torusMaterial)
    scene.add(mainTorus)

    // Waves (concentric rings)
    const waves: THREE.Mesh[] = []
    const waveSizes = [
      { radius: 1.3, tube: 0.02, opacity: 0.3 },
      { radius: 1.6, tube: 0.015, opacity: 0.15 },
      { radius: 1.9, tube: 0.01, opacity: 0.08 },
      { radius: 2.2, tube: 0.008, opacity: 0.04 }
    ]

    waveSizes.forEach((waveSpec) => {
      const waveGeo = new THREE.TorusGeometry(waveSpec.radius, waveSpec.tube, 16, 100)
      const waveMat = new THREE.MeshBasicMaterial({
        color: 0xC850C0,
        transparent: true,
        opacity: waveSpec.opacity
      })
      const wave = new THREE.Mesh(waveGeo, waveMat)
      waves.push(wave)
      scene.add(wave)
    })

    // Center glow
    const glowGeometry = new THREE.SphereGeometry(0.6, 32, 32)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xC850C0,
      transparent: true,
      opacity: 0.15
    })
    const centerGlow = new THREE.Mesh(glowGeometry, glowMaterial)
    scene.add(centerGlow)

    sceneRef.current = {
      scene,
      camera,
      renderer,
      mainTorus,
      waves,
      centerGlow,
      uniforms,
      animationId: null
    }

    // Animation loop
    let startTime = Date.now()

    const animate = () => {
      if (!sceneRef.current) return

      const elapsed = (Date.now() - startTime) / 1000

      // Rotation speed
      const rotationSpeed = isChatOpen ? 0.02 : isHovered ? 0.016 : 0.008
      sceneRef.current.mainTorus.rotation.z += rotationSpeed

      // Wave pulsation speed
      const pulseSpeed = isChatOpen ? 3.0 : 1.5
      sceneRef.current.waves.forEach((wave, i) => {
        const offset = i * 0.5
        const scale = 1.0 + Math.sin(elapsed * pulseSpeed + offset) * 0.05
        wave.scale.set(scale, scale, scale)
        
        // Brighten on hover
        const mat = wave.material as THREE.MeshBasicMaterial
        const baseOpacity = [0.3, 0.15, 0.08, 0.04][i]
        mat.opacity = baseOpacity * (isHovered ? 1.5 : 1.0)
      })

      // Center glow pulse
      const glowMat = sceneRef.current.centerGlow.material as THREE.MeshBasicMaterial
      const baseGlowOpacity = isChatOpen ? 0.3 : 0.15
      glowMat.opacity = baseGlowOpacity + Math.sin(elapsed * 2.0) * 0.08

      // Update shader time
      sceneRef.current.uniforms.u_time.value = elapsed

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
        sceneRef.current.mainTorus.geometry.dispose()
        ;(sceneRef.current.mainTorus.material as THREE.Material).dispose()
        sceneRef.current.waves.forEach(wave => {
          wave.geometry.dispose()
          ;(wave.material as THREE.Material).dispose()
        })
        sceneRef.current.centerGlow.geometry.dispose()
        ;(sceneRef.current.centerGlow.material as THREE.Material).dispose()
        containerRef.current?.removeChild(sceneRef.current.renderer.domElement)
      }
    }
  }, [isHovered, isChatOpen])

  return (
    <div
      style={{
        width: '72px',
        height: '72px',
        background: 'transparent',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        transform: isHovered ? 'scale(1.12)' : 'scale(1)',
        transition: 'transform 0.3s ease',
        overflow: 'visible'
      }}
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
