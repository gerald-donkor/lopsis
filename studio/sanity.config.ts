import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {schemaTypes} from './schema-types'
import {structure} from './structure'

const projectId = assertEnvironmentVariable(
  process.env.SANITY_STUDIO_PROJECT_ID,
  'SANITY_STUDIO_PROJECT_ID',
)
const dataset = assertEnvironmentVariable(
  process.env.SANITY_STUDIO_DATASET,
  'SANITY_STUDIO_DATASET',
)

export default defineConfig({
  name: 'lopsis',
  title: 'Lopsis Studio',
  projectId,
  dataset,
  schema: {types: schemaTypes},
  plugins: [
    structureTool({structure}),
    visionTool({defaultApiVersion: '2026-09-02'}),
  ],
})

function assertEnvironmentVariable(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}
