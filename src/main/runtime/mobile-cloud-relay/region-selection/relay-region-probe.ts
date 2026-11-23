import { performance } from 'node:perf_hooks'
import { z } from 'zod'

export const RELAY_REGIONS = ['us-central1', 'asia-east2'] as const
export type RelayRegion = (typeof RELAY_REGIONS)[number]

export const PROBE_TIMEOUT_MS = 1_500
const PROBE_SAMPLES = 3

const SPREAD_FLOOR_MS = 150

export const RelayRegionSchema = z.enum(RELAY_REGIONS)
export const RelayProbeOriginSchema = z.string().max(2_048).refine(isCanonicalHttpsOrigin)
export const RelayRegionCatalogSchema = z
  .object({
    v: z.literal(1),
    regions: z
      .array(
        z
          .object({
            region: RelayRegionSchema,
            probeOrigins: z.array(RelayProbeOriginSchema).min(1).max(2)
          })
          .strict()
      )
      .max(RELAY_REGIONS.length)
  })
  .strict()
  .superRefine((catalog, context) => {
    const regions = new Set<RelayRegion>()
    const origins = new Set<string>()
    for (const [regionIndex, entry] of catalog.regions.entries()) {
      if (regions.has(entry.region)) {
        context.addIssue({
          code: 'custom',
          message: 'duplicate relay region',
          path: ['regions', regionIndex, 'region']
        })
      }
      regions.add(entry.region)
      for (const [originIndex, origin] of entry.probeOrigins.entries()) {
        if (origins.has(origin)) {
          context.addIssue({
            code: 'custom',
            message: 'duplicate relay probe origin',
            path: ['regions', regionIndex, 'probeOrigins', originIndex]
          })
        }
        origins.add(origin)
      }
    }
  })

export type RelayRegionCatalog = z.infer<typeof RelayRegionCatalogSchema>
export type RelayRegionCatalogEntry = RelayRegionCatalog['regions'][number]
export type RegionMeasurement = { region: RelayRegion; latencyMs: number }
export type RelayProbe = (origin: string) => Promise<number | null>

export async function probeRelayOrigin(
  _origin: string,
  _fetch: typeof globalThis.fetch,
  _now = () => performance.now(),
  _timeoutMs = PROBE_TIMEOUT_MS
): Promise<number | null> {
  throw new Error('This service is not included in the internal edition.')
}

type LatencySamples = {
  warmupMs: (number | null)[]

  keptMs: number[]
}

export type RelayRegionProbeVerdict = 'measured' | 'rejected-spread' | 'unreachable'

export type RelayRegionProbeReport = {
  region: RelayRegion
  origins: string[]
  warmupMs: (number | null)[]
  keptMs: number[]
  minMs: number | null
  spreadMs: number | null
  verdict: RelayRegionProbeVerdict
}

async function sampleMinLatencies(origins: string[], probe: RelayProbe): Promise<LatencySamples> {
  const warmupMs = await Promise.all(origins.map(probe))

  const live = origins.filter((_origin, index) => warmupMs[index] !== null)
  if (live.length === 0) {
    return { warmupMs, keptMs: [] }
  }
  const keptMs: number[] = []
  for (let sample = 0; sample < PROBE_SAMPLES; sample++) {
    const latencies = (await Promise.all(live.map(probe))).filter(
      (latency): latency is number => latency !== null
    )
    if (latencies.length === 0) {
      return { warmupMs, keptMs: [] }
    }
    keptMs.push(Math.min(...latencies))
  }
  keptMs.sort((left, right) => left - right)
  return { warmupMs, keptMs }
}

export async function measureOriginLatency(
  origin: string,
  probe: RelayProbe
): Promise<number | null> {
  return (await sampleMinLatencies([origin], probe)).keptMs[0] ?? null
}

export async function measureRegion(
  entry: RelayRegionCatalogEntry,
  probe: RelayProbe
): Promise<RelayRegionProbeReport> {
  const { warmupMs, keptMs } = await sampleMinLatencies(entry.probeOrigins, probe)
  const probed = { region: entry.region, origins: entry.probeOrigins, warmupMs, keptMs }
  if (keptMs.length === 0) {
    return { ...probed, minMs: null, spreadMs: null, verdict: 'unreachable' }
  }
  const [min, median, max] = keptMs as [number, number, number]
  const spreadMs = max - min

  const verdict = spreadMs > Math.max(SPREAD_FLOOR_MS, median) ? 'rejected-spread' : 'measured'
  return { ...probed, minMs: min, spreadMs, verdict }
}

export function regionMeasurement(report: RelayRegionProbeReport): RegionMeasurement | null {
  return report.verdict === 'measured' && report.minMs !== null
    ? { region: report.region, latencyMs: report.minMs }
    : null
}

function isCanonicalHttpsOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.origin === value
  } catch {
    return false
  }
}
