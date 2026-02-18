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

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float u_time;
  uniform float u_speed;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    // Fresnel effect (brighter on edges)
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDirection)), 2.5);
    
    // Base dark color
    vec3 baseColor = vec3(0.02, 0.04, 0.08);
    
    // Add noise for organic feel
    float noise1 = snoise(vPosition * 2.0 + u_time * u_speed * 0.1);
    float noise2 = snoise(vPosition * 3.0 - u_time * u_speed * 0.15);
    
    // Band 1 - Cyan flowing ribbon
    float band1 = sin(vPosition.y * 3.0 + vPosition.x * 2.0 + u_time * u_speed * 0.3 + noise1) * 0.5 + 0.5;
    band1 = smoothstep(0.35, 0.65, band1);
    band1 *= smoothstep(0.0, 0.3, band1) * smoothstep(1.0, 0.7, band1);
    vec3 color1 = vec3(0.0, 0.83, 1.0) * band1 * 1.5;
    
    // Band 2 - Deep blue ribbon (different angle)
    float band2 = sin(vPosition.z * 3.0 - vPosition.y * 2.0 + u_time * u_speed * 0.2 + 1.5 + noise2 * 0.5) * 0.5 + 0.5;
    band2 = smoothstep(0.4, 0.6, band2);
    band2 *= smoothstep(0.0, 0.25, band2) * smoothstep(1.0, 0.75, band2);
    vec3 color2 = vec3(0.0, 0.4, 1.0) * band2 * 1.3;
    
    // Band 3 - White accent (thin, subtle)
    float band3 = sin(vPosition.x * 4.0 + vPosition.z * 3.0 + u_time * u_speed * 0.4 + 3.0 + noise1 * 0.3) * 0.5 + 0.5;
    band3 = smoothstep(0.47, 0.53, band3);
    band3 *= smoothstep(0.0, 0.1, band3) * smoothstep(1.0, 0.9, band3);
    vec3 color3 = vec3(1.0) * band3 * 0.6;
    
    // Combine colors
    vec3 finalColor = baseColor;
    finalColor += color1;
    finalColor += color2;
    finalColor += color3;
    
    // Add fresnel glow
    finalColor += fresnel * vec3(0.0, 0.3, 0.8) * 0.8;
    
    // Add subtle ambient color variation
    finalColor += vec3(0.01, 0.02, 0.04) * (noise1 * 0.5 + 0.5);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`

const glowVertexShader = `
  varying vec3 vNormal;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const glowFragmentShader = `
  uniform float u_time;
  varying vec3 vNormal;
  
  void main() {
    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    float pulse = sin(u_time * 0.5) * 0.1 + 0.9;
    vec3 glowColor = vec3(0.0, 0.6, 1.0);
    gl_FragColor = vec4(glowColor, intensity * 0.3 * pulse);
  }
`

export default function ChatOrb({ isHovered, isChatOpen, onClick, onHoverStart, onHoverEnd }: ChatOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    orb: THREE.Mesh
    glow: THREE.Mesh
    uniforms: { u_time: { value: number }; u_speed: { value: number } }
    glowUniforms: { u_time: { value: number } }
    animationId: number | null
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const size = 80

    // Scene
    const scene = new THREE.Scene()
    
    // Camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.z = 2.5

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(size, size)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // Main orb with shader
    const geometry = new THREE.SphereGeometry(1, 64, 64)
    const uniforms = {
      u_time: { value: 0.0 },
      u_speed: { value: 1.0 }
    }
    
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms
    })
    
    const orb = new THREE.Mesh(geometry, material)
    scene.add(orb)

    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(1.15, 32, 32)
    const glowUniforms = {
      u_time: { value: 0.0 }
    }
    
    const glowMaterial = new THREE.ShaderMaterial({
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: glowUniforms,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    })
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    scene.add(glow)

    sceneRef.current = {
      scene,
      camera,
      renderer,
      orb,
      glow,
      uniforms,
      glowUniforms,
      animationId: null
    }

    // Animation loop
    let startTime = Date.now()

    const animate = () => {
      if (!sceneRef.current) return

      const elapsed = (Date.now() - startTime) / 1000
      const speedMultiplier = isChatOpen ? 0.5 : isHovered ? 2 : 1

      // Update uniforms
      sceneRef.current.uniforms.u_time.value = elapsed
      sceneRef.current.uniforms.u_speed.value = speedMultiplier
      sceneRef.current.glowUniforms.u_time.value = elapsed

      // Rotate orb
      sceneRef.current.orb.rotation.y += 0.003 * speedMultiplier
      sceneRef.current.orb.rotation.x += 0.001 * speedMultiplier
      sceneRef.current.glow.rotation.y = sceneRef.current.orb.rotation.y
      sceneRef.current.glow.rotation.x = sceneRef.current.orb.rotation.x

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
        sceneRef.current.orb.geometry.dispose()
        ;(sceneRef.current.orb.material as THREE.Material).dispose()
        sceneRef.current.glow.geometry.dispose()
        ;(sceneRef.current.glow.material as THREE.Material).dispose()
        containerRef.current?.removeChild(sceneRef.current.renderer.domElement)
      }
    }
  }, [isHovered, isChatOpen])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '80px',
        height: '80px',
        cursor: 'pointer',
        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 0.3s ease',
        zIndex: 999,
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
            fontSize: '32px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 'bold',
            pointerEvents: 'none',
            textShadow: '0 0 15px rgba(255, 255, 255, 0.6)'
          }}
        >
          ✕
        </div>
      )}
    </div>
  )
}
