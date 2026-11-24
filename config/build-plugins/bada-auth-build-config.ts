import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

const Configuration = z.object({
  clientId: z.string().trim().min(1).max(512).default('orca'),
  clientSecret: z.string().max(8192).default('')
})

export function badaAuthBuildDefines(root: string): Record<string, string> {
  const file = resolve(root, 'config/bada-auth.local.json')
  let input: unknown = {}
  try {
    if (existsSync(file)) {
      input = JSON.parse(readFileSync(file, 'utf8'))
    }
    const config = Configuration.parse(input)
    return {
      BADA_CLIENT_ID: JSON.stringify(process.env.ORCA_BUILD_BADA_CLIENT_ID || config.clientId),
      BADA_CLIENT_SECRET: JSON.stringify(
        process.env.ORCA_BUILD_BADA_CLIENT_SECRET ?? config.clientSecret
      )
    }
  } catch {
    throw new Error('Invalid BADA build configuration. Check config/bada-auth.local.json.')
  }
}
