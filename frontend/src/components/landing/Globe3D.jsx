// 3D hero: a dotted Earth with the BRICS nodes, glowing markers and animated data arcs (React Three Fiber).
import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'

const R = 1.6
const NODES = [
  { name: 'New Delhi', lat: 28.6, lng: 77.2, live: true },
  { name: 'Brasília', lat: -15.8, lng: -47.9, live: true },
  { name: 'Pretoria', lat: -25.7, lng: 28.2, live: true },
  { name: 'Moscow', lat: 55.75, lng: 37.6 },
  { name: 'Beijing', lat: 39.9, lng: 116.4 },
  { name: 'Cairo', lat: 30.0, lng: 31.2 },
  { name: 'Addis Ababa', lat: 9.0, lng: 38.7 },
  { name: 'Tehran', lat: 35.7, lng: 51.4 },
  { name: 'Abu Dhabi', lat: 24.45, lng: 54.4 },
  { name: 'Jakarta', lat: -6.2, lng: 106.8 },
]

function toVec(lat, lng, r = R) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}

function DotSphere() {
  const positions = useMemo(() => {
    const n = 2600
    const arr = new Float32Array(n * 3)
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2
      const rad = Math.sqrt(1 - y * y)
      const th = golden * i
      arr[i * 3] = Math.cos(th) * rad * R
      arr[i * 3 + 1] = y * R
      arr[i * 3 + 2] = Math.sin(th) * rad * R
    }
    return arr
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.024} color="#93c5fd" transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  )
}

function Marker({ node, index }) {
  const ref = useRef()
  const pos = useMemo(() => toVec(node.lat, node.lng, R * 1.01), [node])
  useFrame(({ clock }) => {
    const s = 1 + 0.35 * Math.sin(clock.elapsedTime * 2.2 + index)
    if (ref.current) ref.current.scale.setScalar(s)
  })
  const color = node.live ? '#f59e0b' : '#38bdf8'
  return (
    <group position={pos}>
      <mesh><sphereGeometry args={[node.live ? 0.045 : 0.032, 16, 16]} /><meshBasicMaterial color={color} /></mesh>
      <mesh ref={ref}><sphereGeometry args={[node.live ? 0.09 : 0.06, 16, 16]} /><meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} /></mesh>
    </group>
  )
}

function Arc({ from, to, color, speed }) {
  const ref = useRef()
  const [start, end, mid] = useMemo(() => {
    const a = toVec(from.lat, from.lng)
    const b = toVec(to.lat, to.lng)
    const m = a.clone().add(b).multiplyScalar(0.5)
    const lift = R + a.distanceTo(b) * 0.45
    return [a, b, m.normalize().multiplyScalar(lift)]
  }, [from, to])
  useFrame((_, delta) => {
    const mat = ref.current?.material
    if (mat && 'dashOffset' in mat) mat.dashOffset -= delta * speed
  })
  return <QuadraticBezierLine ref={ref} start={start} end={end} mid={mid} color={color} lineWidth={1.4} dashed dashScale={6} dashSize={0.6} gapSize={0.4} transparent opacity={0.9} />
}

function Earth({ reduced }) {
  const group = useRef()
  useFrame(({ pointer }, delta) => {
    if (!group.current) return
    if (!reduced) group.current.rotation.y += delta * 0.12
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0.25 + pointer.y * 0.15, 0.05)
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, -pointer.x * 0.08, 0.05)
  })
  const hub = NODES[0]
  return (
    <group ref={group} rotation={[0.25, -1.4, 0]}>
      <mesh><sphereGeometry args={[R * 0.985, 64, 64]} /><meshBasicMaterial color="#0a1830" /></mesh>
      <DotSphere />
      {NODES.map((n, i) => <Marker key={n.name} node={n} index={i} />)}
      {NODES.slice(1).map((n, i) => (
        <Arc key={n.name} from={hub} to={n} color={n.live ? '#fbbf24' : '#7dd3fc'} speed={reduced ? 0 : 0.6 + (i % 3) * 0.25} />
      ))}
    </group>
  )
}

export default function Globe3D() {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 5.2], fov: 45 }} gl={{ antialias: true, alpha: true }} aria-label="3D globe showing BRICS countries connected by JanSetu">
      <Earth reduced={reduced} />
    </Canvas>
  )
}
