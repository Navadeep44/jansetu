// Generates src/components/landing/landDots.json: evenly spaced points that sit on land (for the 3D globe).
import { readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { geoContains } from 'd3-geo'
const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/land-110m.json', import.meta.url)))
const land = feature(topo, topo.objects.land)
const ctopo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-110m.json', import.meta.url)))
const countries = feature(ctopo, ctopo.objects.countries).features
// India = 1 (highlighted); every other country = 0 (dim)
const india = countries.find((c) => String(c.id) === '356')
const N = 60000, golden = Math.PI * (3 - Math.sqrt(5)), out = []
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2, th = golden * i
  const lat = Math.asin(y) * 180 / Math.PI
  let lng = ((th * 180 / Math.PI) % 360) - 180
  if (lat < -60) continue // skip Antarctica
  if (!geoContains(land, [lng, lat])) continue
  const inIndia = geoContains(india, [lng, lat])
  // keep the rest of the world sparse so India stands out
  if (!inIndia && i % 3 !== 0) continue
  out.push(Math.round(lat * 10), Math.round(lng * 10), inIndia ? 1 : 0)
}
writeFileSync(new URL('../src/components/landing/landDots.json', import.meta.url), JSON.stringify(out))
console.log('land dots:', out.length / 3)
