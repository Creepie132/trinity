'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, MeshDistortMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

// ─── Внутренняя сфера — тёплый SSS шар ───────────────────────────────────────
function KiraSphere({ mood }: { mood: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef  = useRef<any>(null!)
  const { viewport, mouse } = useThree()

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // Плавный наклон за мышью
    if (meshRef.current) {
      meshRef.current.rotation.y += (mouse.x * 0.4 - meshRef.current.rotation.y) * 0.05
      meshRef.current.rotation.x += (-mouse.y * 0.2 - meshRef.current.rotation.x) * 0.05
    }

    // Пульс distortion
    if (matRef.current) {
      const base = mood === 'thinking' ? 0.25 : 0.12
      matRef.current.distort = base + Math.sin(t * 1.8) * 0.06
    }
  })

  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[1, 128, 128]} />
      <MeshDistortMaterial
        ref={matRef}
        color="#f5c89a"
        emissive="#e8904a"
        emissiveIntensity={0.25}
        roughness={0.15}
        metalness={0.0}
        distort={0.15}
        speed={2.5}
        transparent
        opacity={0.97}
      />
    </mesh>
  )
}

// ─── Глаза — два скруглённых прямоугольника ──────────────────────────────────
function KiraEyes({ mood }: { mood: string }) {
  const lRef = useRef<THREE.Mesh>(null!)
  const rRef = useRef<THREE.Mesh>(null!)
  const { mouse } = useThree()

  const eyeH = mood === 'happy' ? 0.06 : 0.18
  const eyeGeo = useMemo(() => new THREE.BoxGeometry(0.09, eyeH, 0.05), [eyeH])
  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a1505',
    roughness: 0.3,
    metalness: 0.1,
  }), [])

  useFrame(() => {
    const lx = -0.28 + mouse.x * 0.04
    const ly =  0.05 + mouse.y * 0.04
    const rx =  0.28 + mouse.x * 0.04
    if (lRef.current) { lRef.current.position.set(lx, ly, 0.97) }
    if (rRef.current) { rRef.current.position.set(rx, ly, 0.97) }
  })

  return (
    <>
      <mesh ref={lRef} geometry={eyeGeo} material={eyeMat} position={[-0.28, 0.05, 0.97]}>
        {/* Блик */}
        <mesh position={[-0.02, 0.04, 0.03]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="white" transparent opacity={0.7} />
        </mesh>
      </mesh>
      <mesh ref={rRef} geometry={eyeGeo} material={eyeMat} position={[0.28, 0.05, 0.97]}>
        <mesh position={[-0.02, 0.04, 0.03]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="white" transparent opacity={0.7} />
        </mesh>
      </mesh>
    </>
  )
}

// ─── Кольца свечения вокруг шара ─────────────────────────────────────────────
function GlowRings() {
  const r1 = useRef<THREE.Mesh>(null!)
  const r2 = useRef<THREE.Mesh>(null!)
  const r3 = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    ;[r1, r2, r3].forEach((r, i) => {
      if (r.current) {
        r.current.rotation.x = t * 0.12 * (i % 2 === 0 ? 1 : -1)
        r.current.rotation.z = t * 0.08 + i * 0.6
        const s = 1 + Math.sin(t * 0.7 + i) * 0.015
        r.current.scale.setScalar(s)
      }
    })
  })

  const ringMat = (opacity: number) => (
    <meshBasicMaterial
      color="#f8b87a"
      transparent
      opacity={opacity}
      side={THREE.DoubleSide}
    />
  )

  return (
    <>
      <mesh ref={r1}>
        <torusGeometry args={[1.32, 0.007, 16, 120]} />
        {ringMat(0.35)}
      </mesh>
      <mesh ref={r2}>
        <torusGeometry args={[1.52, 0.005, 16, 120]} />
        {ringMat(0.22)}
      </mesh>
      <mesh ref={r3}>
        <torusGeometry args={[1.72, 0.004, 16, 120]} />
        {ringMat(0.12)}
      </mesh>
    </>
  )
}

// ─── Сцена ────────────────────────────────────────────────────────────────────
function Scene({ mood }: { mood: string }) {
  return (
    <>
      {/* Освещение */}
      <ambientLight intensity={0.6} />
      <pointLight position={[-3, 4, 3]} intensity={1.8} color="#ffe4c4" />
      <pointLight position={[3, -2, 2]} intensity={0.6} color="#ffd0a0" />
      <pointLight position={[0, 0, 3]} intensity={0.4} color="#ffffff" />

      {/* Шар + глаза */}
      <group>
        <KiraSphere mood={mood} />
        <KiraEyes mood={mood} />
      </group>

      {/* Кольца */}
      <GlowRings />

      {/* Bloom — ключевой эффект для свечения */}
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          radius={0.7}
        />
      </EffectComposer>
    </>
  )
}

// ─── Публичный компонент ──────────────────────────────────────────────────────
interface KiraOrb3DProps {
  size?: number
  mood?: 'idle' | 'happy' | 'thinking' | 'speaking'
}

export function KiraOrb3D({ size = 180, mood = 'idle' }: KiraOrb3DProps) {
  return (
    <div style={{ width: size, height: size }} className="select-none">
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene mood={mood} />
      </Canvas>
    </div>
  )
}
