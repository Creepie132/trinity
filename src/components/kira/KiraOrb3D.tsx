'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

// ── GLSL шейдеры ─────────────────────────────────────────────────────────────
const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;

  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
    vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-.5;
    i=mod289(i);
    vec4 p=permute(permute(permute(
      i.z+vec4(0.,i1.z,i2.z,1.))+
      i.y+vec4(0.,i1.y,i2.y,1.))+
      i.x+vec4(0.,i1.x,i2.x,1.));
    vec3 ns=0.142857142857*p.xyz-vec3(0.,0.,1.);
    vec4 j=p-49.*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 x2_=fract(x_*ns.x)-.5;
    vec4 y2_=fract(floor(j*x_)*ns.x)-.5;
    vec4 h=.5-abs(x2_)-abs(y2_);
    vec4 b0=vec4(x2_.xy,y2_.xy);vec4 b1=vec4(x2_.zw,y2_.zw);
    vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=1.79284291400159-.85373472095314*vec4(
      dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
    m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main(){
    vNormal=normalize(normalMatrix*normal);
    float noise=snoise(position*1.5+vec3(uTime*0.3));
    vec3 displaced=position+normal*noise*0.08;
    vPosition=(modelViewMatrix*vec4(displaced,1.0)).xyz;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(displaced,1.0);
  }
`

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;

  void main(){
    vec3 N=normalize(vNormal);
    vec3 V=normalize(-vPosition);
    vec3 L=normalize(vec3(2.,3.,3.)-vPosition);
    float diff=max(dot(N,L),0.);
    float rim=pow(1.-max(dot(V,N),0.),2.5);
    float sss=pow(max(dot(-L,V),0.),3.)*.6;

    vec3 base=mix(vec3(0.98,0.82,0.65),vec3(0.75,0.45,0.30),1.-diff*.7-.3);
    vec3 rimC=vec3(1.,.92,.75);
    vec3 sssC=vec3(1.,.55,.35);

    vec3 col=base+rimC*rim*.6+sssC*sss;
    vec3 H=normalize(L+V);
    col+=vec3(1.)*pow(max(dot(N,H),0.),48.)*.5;
    gl_FragColor=vec4(col,1.);
  }
`

// ── Орб ──────────────────────────────────────────────────────────────────────
function OrbMesh() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const { mouse } = useThree()

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uTime: { value: 0 } },
  }), [])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    if (meshRef.current) {
      meshRef.current.rotation.y += (mouse.x * 0.3 - meshRef.current.rotation.y) * 0.05
      meshRef.current.rotation.x += (-mouse.y * 0.15 - meshRef.current.rotation.x) * 0.05
    }
  })

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[1, 128, 128]} />
    </mesh>
  )
}

// ── Глаза ─────────────────────────────────────────────────────────────────────
function Eyes() {
  const lRef = useRef<THREE.Mesh>(null!)
  const rRef = useRef<THREE.Mesh>(null!)
  const { mouse } = useThree()

  const geo = useMemo(() => new THREE.BoxGeometry(0.10, 0.22, 0.06), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a1505', roughness: 0.3, metalness: 0.1,
  }), [])
  const hlMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 'white', transparent: true, opacity: 0.85,
  }), [])
  const hlGeo = useMemo(() => new THREE.SphereGeometry(0.022, 8, 8), [])

  useFrame(() => {
    const lx = -0.29 + mouse.x * 0.04
    const ly =  0.05 + mouse.y * 0.04
    if (lRef.current) lRef.current.position.set(lx, ly, 0.97)
    if (rRef.current) rRef.current.position.set(0.29 + mouse.x * 0.04, ly, 0.97)
  })

  return (
    <>
      <mesh ref={lRef} geometry={geo} material={mat} position={[-0.29, 0.05, 0.97]}>
        <mesh geometry={hlGeo} material={hlMat} position={[-0.02, 0.05, 0.04]} />
      </mesh>
      <mesh ref={rRef} geometry={geo} material={mat} position={[0.29, 0.05, 0.97]}>
        <mesh geometry={hlGeo} material={hlMat} position={[-0.02, 0.05, 0.04]} />
      </mesh>
    </>
  )
}

// ── Кольца ────────────────────────────────────────────────────────────────────
function Rings() {
  const refs = [
    useRef<THREE.Mesh>(null!),
    useRef<THREE.Mesh>(null!),
    useRef<THREE.Mesh>(null!),
  ]

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.forEach((r, i) => {
      if (r.current) {
        r.current.rotation.x = t * 0.12 * (i % 2 === 0 ? 1 : -1)
        r.current.rotation.z = t * 0.08 + i * 0.6
        r.current.scale.setScalar(1 + Math.sin(t * 0.7 + i) * 0.015)
      }
    })
  })

  const ringData = [
    { r: 1.32, t: 0.007, op: 0.35 },
    { r: 1.52, t: 0.005, op: 0.22 },
    { r: 1.72, t: 0.004, op: 0.12 },
  ]

  return (
    <>
      {ringData.map((d, i) => (
        <mesh key={i} ref={refs[i]}>
          <torusGeometry args={[d.r, d.t, 16, 120]} />
          <meshBasicMaterial color="#f8b87a" transparent opacity={d.op} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  )
}

// ── Сцена ─────────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[-3, 4, 3]} intensity={1.8} color="#ffe4c4" />
      <pointLight position={[3, -2, 2]} intensity={0.6} color="#ffd0a0" />
      <OrbMesh />
      <Eyes />
      <Rings />
      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.3} luminanceSmoothing={0.9} radius={0.7} />
      </EffectComposer>
    </>
  )
}

// ── Экспорт ───────────────────────────────────────────────────────────────────
interface KiraOrb3DProps {
  size?: number
  mood?: 'idle' | 'happy' | 'thinking' | 'speaking'
}

export function KiraOrb3D({ size = 180 }: KiraOrb3DProps) {
  return (
    <div style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
