import {z} from 'zod'

export const searchRequestSchema = z.object({
  query: z.string().trim().min(1).max(240),
})

const normalizedSearchTermSchema = z.string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[\p{L}\p{N}]+(?:[ '\-’][\p{L}\p{N}]+)*$/u)
  .transform((term) => term.normalize('NFKC').toLocaleLowerCase())

export const searchTermsSchema = z.object({
  terms: z.array(normalizedSearchTermSchema).min(1).max(12),
})

export const lessonSearchRowsSchema = z.array(z.object({
  lessonId: z.string().min(1).max(200),
  exactTitleMatch: z.boolean(),
  titleMatch: z.boolean(),
  keyPointsMatch: z.boolean(),
  notesMatch: z.boolean(),
})).max(2_000)

const timestampMatchSchema = z.object({
  startSeconds: z.number().int().min(0),
  exactLabelMatch: z.boolean().optional().default(false),
})

export const videoSearchRowsSchema = z.array(z.object({
  videoId: z.string().min(1).max(240),
  lessonIds: z.array(z.string().min(1).max(200)).max(100),
  chapterMatches: z.array(timestampMatchSchema).max(500),
  chunkMatches: z.array(z.object({startSeconds: z.number().int().min(0)})).max(5),
})).max(2_000)

const candidateBase = z.object({
  lessonId: z.string().min(1).max(200),
  relevance: z.number().min(0).max(100),
})

export const searchCandidatesSchema = z.object({
  candidates: z.array(z.discriminatedUnion('kind', [
    candidateBase.extend({kind: z.literal('lesson')}),
    candidateBase.extend({
      kind: z.literal('video'),
      videoId: z.string().min(1).max(240),
      startSeconds: z.number().int().min(0),
      matchSource: z.enum(['chapter', 'chunk']),
    }),
  ])),
})

const resultBase = z.object({
  id: z.string(),
  lessonSlug: z.string(),
  lessonTitle: z.string(),
  courseId: z.string(),
  courseSlug: z.string(),
  courseTitle: z.string(),
  courseIconUrl: z.string().url().nullable(),
  moduleTitle: z.string(),
  moduleNumber: z.number().int().positive(),
  lessonNumber: z.number().int().positive(),
  description: z.string(),
  relevance: z.number(),
})

export const searchResultSchema = z.discriminatedUnion('kind', [
  resultBase.extend({
    kind: z.literal('lesson'),
    keyPoints: z.array(z.string()),
  }),
  resultBase.extend({
    kind: z.literal('video'),
    posterUrl: z.string().url().nullable(),
    startSeconds: z.number().int().min(0),
    clipLengthSeconds: z.number().int().positive(),
    matchSource: z.enum(['chapter', 'chunk']),
  }),
])

export const searchResponseSchema = z.object({
  version: z.literal(1),
  query: z.string(),
  resultCount: z.number().int().min(0),
  courseCount: z.number().int().min(0),
  sortOptions: z.tuple([z.literal('relevance')]),
  results: z.array(searchResultSchema),
})

export type SearchCandidate = z.infer<typeof searchCandidatesSchema>['candidates'][number]
export type SearchResult = z.infer<typeof searchResultSchema>
export type SearchResponse = z.infer<typeof searchResponseSchema>
