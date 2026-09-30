// 3D hero globe (React Three Fiber): real continents as glowing dots with India highlighted,
// a fresnel atmosphere, pulsing markers on the pilot districts and data pulses travelling to New Delhi.
import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import LAND from './landDots.json'

const R = 1.6
const COLORS = { land: '#3d5a85', india: '#7dd3fc', live: '#fbbf24', member: '#7dd3fc' }
// New Delhi (national planners) + the pilot districts across India's language regions
const NODES = [
  { name: 'New Delhi', lat: 28.61, lng: 77.21, hub: true },
  { name: 'Adilabad', lat: 19.67, lng: 78.53, live: true },
  { name: 'Hyderabad', lat: 17.39, lng: 78.49, live: true },
  { name: 'Koraput', lat: 18.81, lng: 82.71, live: true },
  { name: 'Gaya', lat: 24.79, lng: 85.0, live: true },
  { name: 'Bahraich', lat: 27.57, lng: 81.6, live: true },
]

function toVec(lat, lng, r = R) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}

/* ---------- ocean sphere: dark with a lit edge ---------- */
const oceanShader = {
  vertexShader: `varying vec3 vN; varying vec3 vV;
    void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying vec3 vN; varying vec3 vV;
    void main(){
      float rim = pow(1.0 - max(dot(vN, vV), 0.0), 2.6);
      float light = max(dot(vN, normalize(vec3(-0.6, 0.7, 0.6))), 0.0);
      vec3 base = mix(vec3(0.015, 0.035, 0.08), vec3(0.04, 0.10, 0.20), light);
      gl_FragColor = vec4(base + vec3(0.08, 0.30, 0.60) * rim, 1.0);
    }`,
}

/* ---------- atmosphere halo ---------- */
const atmoShader = {
  vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `varying vec3 vN; void main(){ float i = pow(max(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 0.0), 3.0); gl_FragColor = vec4(0.22, 0.58, 1.0, 1.0) * i * 0.9; }`,
}

/* ---------- round, soft land dots ---------- */
const dotShader = {
  vertexShader: `attribute vec3 aColor; attribute float aSize; uniform float uPx; varying vec3 vC; varying float vFace;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vFace = normalize(normalMatrix * normalize(position)).z;
      vC = aColor;
      gl_PointSize = aSize * uPx * (5.2 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `varying vec3 vC; varying float vFace;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.18, d) * clamp(0.25 + vFace * 1.1, 0.0, 1.0);
      gl_FragColor = vec4(vC * (0.75 + 0.45 * clamp(vFace, 0.0, 1.0)), a);
    }`,
}

function LandDots() {
  const { gl } = useThree()
  const { positions, colors, sizes } = useMemo(() => {
    const n = LAND.length / 3
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), siz = new Float32Array(n)
    const pal = [new THREE.Color(COLORS.land), new THREE.Color(COLORS.india)]
    for (let i = 0; i < n; i++) {
      const v = toVec(LAND[i * 3] / 10, LAND[i * 3 + 1] / 10, R * 1.004)
      pos.set([v.x, v.y, v.z], i * 3)
      const c = pal[LAND[i * 3 + 2]]
      col.set([c.r, c.g, c.b], i * 3)
      siz[i] = LAND[i * 3 + 2] ? 3.6 : 2.4
    }
    return { positions: pos, colors: col, sizes: siz }
  }, [])
  const uniforms = useMemo(() => ({ uPx: { value: Math.min(gl.getPixelRatio(), 2) } }), [gl])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial args={[dotShader]} uniforms={uniforms} transparent depthWrite={false} />
    </points>
  )
}

function Marker({ node, index, reduced }) {
  const rings = [useRef(), useRef()]
  const pos = useMemo(() => toVec(node.lat, node.lng, R * 1.012), [node])
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()), [pos])
  const color = node.hub ? '#ffffff' : COLORS.live
  useFrame(({ clock }) => {
    rings.forEach((r, k) => {
      if (!r.current) return
      const t = reduced ? 0.4 : ((clock.elapsedTime * 0.55 + index * 0.13 + k * 0.5) % 1)
      r.current.scale.setScalar(1 + t * 2.6)
      r.current.material.opacity = (1 - t) * 0.7
    })
  })
  const s = node.hub ? 1.15 : 0.8
  return (
    <group position={pos} quaternion={quat}>
      <mesh><circleGeometry args={[0.028 * s, 24]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <mesh position={[0, 0, 0.001]}><circleGeometry args={[0.012 * s, 16]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      {rings.map((r, k) => (
        <mesh key={k} ref={r}><ringGeometry args={[0.03 * s, 0.037 * s, 40]} /><meshBasicMaterial color={color} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
      ))}
    </group>
  )
}

function Arc({ from, to, color, speed, offset, reduced }) {
  const pulse = useRef()
  const glow = useRef()
  const curve = useMemo(() => {
    const a = toVec(from.lat, from.lng, R * 1.01)
    const b = toVec(to.lat, to.lng, R * 1.01)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const lift = R + 0.06 + a.distanceTo(b) * 0.55
    return new THREE.QuadraticBezierCurve3(a, mid.normalize().multiplyScalar(lift), b)
  }, [from, to])
  const points = useMemo(() => curve.getPoints(64), [curve])
  useFrame(({ clock }) => {
    const t = reduced ? 0.5 : ((clock.elapsedTime * speed + offset) % 1)
    const p = curve.getPoint(t)
    pulse.current?.position.copy(p)
    glow.current?.position.copy(p)
    if (glow.current) glow.current.material.opacity = 0.35 * Math.sin(t * Math.PI)
  })
  return (
    <group>
      <Line points={points} color={color} lineWidth={1.2} transparent opacity={0.4} toneMapped={false} />
      <mesh ref={pulse}><sphereGeometry args={[0.016, 12, 12]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      <mesh ref={glow}><sphereGeometry args={[0.05, 16, 16]} /><meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} toneMapped={false} /></mesh>
    </group>
  )
}

function Stars() {
  const positions = useMemo(() => {
    const n = 500, arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(7 + Math.random() * 5)
      arr.set([v.x, v.y, v.z - 4], i * 3)
    }
    return arr
  }, [])
  return (
    <points>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial size={0.025} color="#cbd5e1" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  )
}

const BASE_Y = -3.22 // India faces the viewer
function Earth({ reduced }) {
  const group = useRef()
  useFrame(({ pointer, clock }) => {
    if (!group.current) return
    // gentle sway around India instead of spinning India away
    const sway = reduced ? 0 : Math.sin(clock.elapsedTime * 0.18) * 0.32
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, BASE_Y + sway + pointer.x * 0.25, 0.05)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0.36 + pointer.y * 0.12, 0.05)
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, -pointer.x * 0.06, 0.05)
  })
  const hub = NODES[0]
  return (
    // start with India facing the viewer
    <group ref={group} rotation={[0.36, BASE_Y, 0]}>
      <mesh><sphereGeometry args={[R, 96, 96]} /><shaderMaterial args={[oceanShader]} /></mesh>
      <LandDots />
      {NODES.map((n, i) => <Marker key={n.name} node={n} index={i} reduced={reduced} />)}
      {NODES.slice(1).map((n, i) => (
        <Arc key={n.name} from={n} to={hub} color={COLORS.live} speed={0.35 + (i % 3) * 0.08} offset={i * 0.2} reduced={reduced} />
      ))}
    </group>
  )
}

export default function Globe3D() {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4.6], fov: 45 }} gl={{ antialias: true, alpha: true }} aria-label="3D globe: India's pilot districts connected to national planners in New Delhi">
      <Stars />
      <mesh scale={1.16}><sphereGeometry args={[R, 64, 64]} /><shaderMaterial args={[atmoShader]} side={THREE.BackSide} blending={THREE.AdditiveBlending} transparent depthWrite={false} /></mesh>
      <Earth reduced={reduced} />
    </Canvas>
  )
}
