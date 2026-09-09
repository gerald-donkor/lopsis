import fs from 'node:fs'
import path from 'node:path'

/**
 * Pre-publish guard: aborts `content:publish` when the Studio scripts would
 * target an unexpected dataset. Pass `--dataset=<name>` explicitly (or set
 * `LOPSIS_ALLOW_DATASET=1`) to acknowledge a non-production target.
 */
function getEnvVar(name: string): string | undefined {
  if (process.env[name]) return process.env[name]
  for (const file of ['studio/.env.local', '.env.local', '../studio/.env.local']) {
    const full = path.resolve(process.cwd(), file)
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, 'utf8')
      const match = content.match(new RegExp(`^${name}=(.*)$`, 'm'))
      if (match) return match[1].trim().replace(/^['"]|['"]$/g, '')
    }
  }
  return undefined
}

const EXPECTED_DATASET = 'production'
const overrideArg = process.argv.find((arg) => arg.startsWith('--dataset='))?.slice('--dataset='.length)
const allowAny = process.env.LOPSIS_ALLOW_DATASET === '1'
const dataset = getEnvVar('SANITY_STUDIO_DATASET')

if (!dataset) {
  console.error('content:guard: SANITY_STUDIO_DATASET is not set (env or studio/.env.local)')
  process.exit(1)
}

if (!allowAny && !overrideArg && dataset !== EXPECTED_DATASET) {
  console.error(
    `content:guard: refusing to publish to dataset "${dataset}" (expected "${EXPECTED_DATASET}"). ` +
      `Re-run with --dataset=${dataset} to acknowledge, or set LOPSIS_ALLOW_DATASET=1.`,
  )
  process.exit(1)
}

if (overrideArg && overrideArg !== dataset) {
  console.error(`content:guard: --dataset=${overrideArg} does not match configured dataset "${dataset}"`)
  process.exit(1)
}

console.log(`content:guard: target dataset "${dataset}" acknowledged`)
