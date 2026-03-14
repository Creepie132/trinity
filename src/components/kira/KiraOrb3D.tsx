'use client'

import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

const vertexShader = `
  varying vec3 vN; varying vec3 vP;
  uniform float uTime; uniform int uState; uniform float uBlend;

  float hash(vec3 p){p=fract(p*0.3183099+0.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float noise(vec3 p){
    vec3 i=floor(p);vec3 f=fract(p);vec3 u=f*f*(3.-2.*f);
    return mix(
      mix(mix(hash(i),hash(i+vec3(1,0,0)),u.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),u.x),u.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),u.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),u.x),u.y),
      u.z);}
  float smoothstep_(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}

  void main(){
    vN=normalize(normalMatrix*normal);
    vec3 pos=position; float t=uTime; float disp=0.;

    if(uState==0){
      disp=(sin(pos.y*5.+t*1.4)*.022+sin(pos.x*4.-t*1.1)*.018+noise(pos*2.+t*.3)*.04);
    } else if(uState==1){
      float arcDist=abs(length(pos.xy-vec2(0.,.35))-.38);
      float qArc=exp(-arcDist*arcDist*40.)*.22;
      float dotD=length(pos.xy-vec2(0.,-.62));
      float qDot=exp(-dotD*dotD*55.)*.25;
      float tailD=length(pos.xy-vec2(0.,0.));
      float qTail=exp(-tailD*tailD*28.)*.18*smoothstep_(.2,-.1,pos.y);
      float qm=(qArc+qDot+qTail)*uBlend;
      float bg=noise(pos*2.+t*.3)*.025*(1.-uBlend);
      disp=qm+bg+sin(t*2.5)*.015;
    } else if(uState==2){
      float r=length(pos);
      float burst=sin(r*14.-t*7.)*exp(-r*.3)*.14;
      float spin=sin(atan(pos.y,pos.x)*8.+t*5.)*.07;
      disp=(burst+spin+sin(t*14.)*.025)*uBlend+noise(pos*2.+t*.3)*.02;
    } else if(uState==3){
      float mouthD=abs(length(pos.xy-vec2(0.,-.05))-.4);
      float mouth=exp(-mouthD*mouthD*22.)*smoothstep_(.1,-.5,pos.y)*.18;
      float eyeL=length(pos.xy-vec2(-.3,.22));
      float eyeR=length(pos.xy-vec2(.3,.22));
      float eyes=(exp(-eyeL*eyeL*35.)+exp(-eyeR*eyeR*35.))*.1;
      float tearOff=(sin(t*1.2)*.5+.5)*.3;
      float tearL=length(pos.xy-vec2(-.3,-(0.+tearOff)));
      float tearR=length(pos.xy-vec2(.3,-(0.+tearOff)));
      float tears=(exp(-tearL*tearL*60.)+exp(-tearR*tearR*60.))*.14;
      disp=(-mouth-eyes+tears)*uBlend+sin(pos.y*3.+t*.5)*.025*(1.-uBlend*.6);
    } else {
      float r=length(pos);
      float amp=.5+.5*sin(t*9.);
      disp=(sin(r*12.-t*4.5)*.08+sin(r*7.-t*3.)*.05)*amp+noise(pos*2.5+t*.5)*.02;
    }

    vec3 displaced=pos+normal*disp;
    vP=(modelViewMatrix*vec4(displaced,1.)).xyz;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(displaced,1.);
  }
`

const fragmentShader = `
  varying vec3 vN; varying vec3 vP;
  uniform float uTime; uniform int uState; uniform float uBlend;
  void main(){
    vec3 N=normalize(vN);vec3 V=normalize(-vP);
    vec3 L=normalize(vec3(2.,3.,3.)-vP);
    float diff=max(dot(N,L),0.);
    float rim=pow(1.-max(dot(V,N),0.),2.5);
    vec3 H=normalize(L+V);
    float spec=pow(max(dot(N,H),0.),80.)*.5;
    vec3 col;
    if(uState==0){
      col=mix(vec3(0.,.04,.28),vec3(.08,.3,.9),diff*.7+.2);
      col+=vec3(.2,.5,1.)*rim*.7+vec3(.8,.9,1.)*spec;
    } else if(uState==1){
      float p=.5+.5*sin(uTime*2.5);
      col=mix(vec3(0.,.06,.35),vec3(.15,.5,1.),diff*.6+p*.15);
      col+=vec3(.4,.75,1.)*rim*(.5+p*.3)+vec3(.8,.9,1.)*spec;
    } else if(uState==2){
      float h=uTime*.8;
      vec3 c1=vec3(.15,.5,1.);vec3 c2=vec3(.6,.1,1.);vec3 c3=vec3(.1,.9,.8);
      col=mix(c1,c2,sin(h)*.5+.5);col=mix(col,c3,sin(h*1.4+1.)*.5+.5);
      col=col*(diff*.6+.4)+vec3(1.)*rim*.4+vec3(1.)*spec*.8;
    } else if(uState==3){
      col=mix(vec3(.01,.03,.12),vec3(.07,.18,.45),diff*.5+.2);
      col+=vec3(.1,.25,.55)*rim*.35;
      float tL=length(vP.xy-vec2(-.28,-.1))-.06;
      float tR=length(vP.xy-vec2(.28,-.1))-.06;
      col+=vec3(.2,.5,1.)*(exp(-tL*tL*60.)+exp(-tR*tR*60.))*.4*uBlend;
    } else {
      float p=.5+.5*sin(uTime*9.);
      col=mix(vec3(0.,.06,.3),vec3(.1,.4,1.),diff*.6+p*.25);
      col+=vec3(.25,.55,1.)*rim*(.5+p*.4)+vec3(.8,.9,1.)*spec;
    }
    gl_FragColor=vec4(col,.96);
  }
`

// ── Состояния орба ────────────────────────────────────────────────────────────
export type KiraOrbState = 'idle' | 'thinking' | 'happy' | 'sad' | 'speaking'
const STATE_MAP: Record<KiraOrbState, number> = { idle:0, thinking:1, happy:2, sad:3, speaking:4 }

// ── Меш с шейдером ────────────────────────────────────────────────────────────
function OrbMesh({ state }: { state: KiraOrbState }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const targetState = STATE_MAP[state]

  useFrame(({ clock, camera }) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = clock.elapsedTime
    matRef.current.uniforms.uState.value = targetState
    const b = matRef.current.uniforms.uBlend.value
    matRef.current.uniforms.uBlend.value = Math.min(1, b + 0.02)
    // Лёгкое покачивание
    if (meshRef.current) {
      const t = clock.elapsedTime
      meshRef.current.rotation.y = Math.sin(t * 0.18) * 0.07
      meshRef.current.rotation.x = Math.sin(t * 0.14) * 0.04
    }
  })

  // При смене состояния — сбрасываем blend
  const prevState = useRef(targetState)
  useEffect(() => {
    if (prevState.current !== targetState && matRef.current) {
      matRef.current.uniforms.uBlend.value = 0
      prevState.current = targetState
    }
  }, [targetState])

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 128, 128]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime:  { value: 0 },
          uState: { value: 0 },
          uBlend: { value: 1 },
        }}
      />
    </mesh>
  )
}

// ── Сцена ─────────────────────────────────────────────────────────────────────
function Scene({ state }: { state: KiraOrbState }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[2, 3, 3]} intensity={1.5} color="#aabbff" />
      <pointLight position={[-2, -1, 2]} intensity={0.5} color="#4466ff" />
      <OrbMesh state={state} />
      <EffectComposer>
        <Bloom intensity={2.0} luminanceThreshold={0.1} luminanceSmoothing={0.9} radius={0.6} />
      </EffectComposer>
    </>
  )
}

// ── Публичный компонент ───────────────────────────────────────────────────────
interface KiraOrb3DProps {
  size?: number
  mood?: KiraOrbState
}

export function KiraOrb3D({ size = 160, mood = 'idle' }: KiraOrb3DProps) {
  return (
    <div style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene state={mood} />
      </Canvas>
    </div>
  )
}
