import assert from 'node:assert/strict'
import test from 'node:test'
import {
  lessonSearchRowsSchema,
  videoSearchRowsSchema,
} from './schema'
import {
  candidatesFromRows,
  createEmbedUrl,
  formatResultHref,
} from './timestamp-resolution'

test('two-stage timestamp resolution: chapter matches take precedence and suppress chunks', () => {
  const videoRows = videoSearchRowsSchema.parse([
    {
      videoId: 'video-1',
      lessonIds: ['lesson-1'],
      chapterMatches: [{startSeconds: 120, exactLabelMatch: true}],
      chunkMatches: [{startSeconds: 45}, {startSeconds: 90}],
    },
  ])

  const candidates = candidatesFromRows([], videoRows)
  assert.equal(candidates.length, 1)
  const candidate = candidates[0]
  assert.equal(candidate.kind, 'video')
  if (candidate.kind === 'video') {
    assert.equal(candidate.matchSource, 'chapter')
    assert.equal(candidate.startSeconds, 120)
    assert.equal(candidate.relevance, 98)
  }
})

test('two-stage timestamp resolution: transcript chunks are used when no chapters match', () => {
  const videoRows = videoSearchRowsSchema.parse([
    {
      videoId: 'video-2',
      lessonIds: ['lesson-2'],
      chapterMatches: [],
      chunkMatches: [{startSeconds: 30}, {startSeconds: 65}],
    },
  ])

  const candidates = candidatesFromRows([], videoRows)
  assert.equal(candidates.length, 2)
  for (const candidate of candidates) {
    assert.equal(candidate.kind, 'video')
    if (candidate.kind === 'video') {
      assert.equal(candidate.matchSource, 'chunk')
      assert.equal(candidate.relevance, 70)
    }
  }
  if (candidates[0].kind === 'video' && candidates[1].kind === 'video') {
    assert.equal(candidates[0].startSeconds, 30)
    assert.equal(candidates[1].startSeconds, 65)
  }
})

test('two-stage timestamp resolution: tolerates nullish chapter and chunk matches from GROQ', () => {
  const parsed = videoSearchRowsSchema.parse([
    {
      videoId: 'video-3',
      lessonIds: ['lesson-3'],
      chapterMatches: null,
      chunkMatches: null,
    },
  ])

  assert.deepEqual(parsed[0].chapterMatches, [])
  assert.deepEqual(parsed[0].chunkMatches, [])
  const candidates = candidatesFromRows([], parsed)
  assert.equal(candidates.length, 0)
})

test('relevance hierarchy: exact title > exact chapter > partial title > chapter > keyPoints > transcript chunks > notes', () => {
  const lessonRows = lessonSearchRowsSchema.parse([
    {
      lessonId: 'l-exact-title',
      exactTitleMatch: true,
      titleMatch: true,
      keyPointsMatch: false,
      notesMatch: false,
    },
    {
      lessonId: 'l-title',
      exactTitleMatch: false,
      titleMatch: true,
      keyPointsMatch: true,
      notesMatch: false,
    },
    {
      lessonId: 'l-keypoints',
      exactTitleMatch: false,
      titleMatch: false,
      keyPointsMatch: true,
      notesMatch: false,
    },
    {
      lessonId: 'l-notes',
      exactTitleMatch: false,
      titleMatch: false,
      keyPointsMatch: false,
      notesMatch: true,
    },
  ])

  const videoRows = videoSearchRowsSchema.parse([
    {
      videoId: 'v-exact-chapter',
      lessonIds: ['l-exact-chapter'],
      chapterMatches: [{startSeconds: 10, exactLabelMatch: true}],
      chunkMatches: [],
    },
    {
      videoId: 'v-chapter',
      lessonIds: ['l-chapter'],
      chapterMatches: [{startSeconds: 20, exactLabelMatch: false}],
      chunkMatches: [],
    },
    {
      videoId: 'v-chunk',
      lessonIds: ['l-chunk'],
      chapterMatches: [],
      chunkMatches: [{startSeconds: 30}],
    },
  ])

  const candidates = candidatesFromRows(lessonRows, videoRows)
  const scoreMap = new Map(candidates.map((c) => [c.lessonId, c.relevance]))

  assert.equal(scoreMap.get('l-exact-title'), 100)
  assert.equal(scoreMap.get('l-exact-chapter'), 98)
  assert.equal(scoreMap.get('l-title'), 94)
  assert.equal(scoreMap.get('l-chapter'), 88)
  assert.equal(scoreMap.get('l-keypoints'), 75)
  assert.equal(scoreMap.get('l-chunk'), 70)
  assert.equal(scoreMap.get('l-notes'), 60)
})

test('deep link URL: video results link to /lessons/[slug]?start=[startSeconds]', () => {
  assert.equal(
    formatResultHref('agent-loops', 'video', 160),
    '/lessons/agent-loops?start=160',
  )
  assert.equal(
    formatResultHref('agent-loops', 'video', 0),
    '/lessons/agent-loops?start=0',
  )
  assert.equal(
    formatResultHref('agent-loops', 'lesson'),
    '/lessons/agent-loops',
  )
})

test('on-site playback embed URLs: start parameters for YouTube, Vimeo, and Bunny', () => {
  const yt = createEmbedUrl('https://www.youtube.com/watch?v=GErEgIOMy_4', 160)
  assert.ok(yt)
  assert.equal(yt.provider, 'YouTube')
  assert.ok(yt.src.includes('start=160'))

  const vimeo = createEmbedUrl('https://vimeo.com/123456789', 95)
  assert.ok(vimeo)
  assert.equal(vimeo.provider, 'Vimeo')
  assert.ok(vimeo.src.includes('#t=95s'))

  const bunny = createEmbedUrl('https://iframe.mediadelivery.net/embed/12345/video-uuid', 42)
  assert.ok(bunny)
  assert.equal(bunny.provider, 'Bunny')
  assert.ok(bunny.src.includes('t=42'))
  assert.ok(bunny.src.includes('start=42'))
})
