import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getVideoThumbnailCandidates,
  getVideoThumbnailUrl,
  getYouTubeThumbnailUrl,
  getYouTubeVideoId,
  resolveLessonThumbnail,
} from './video-thumbnails';

test('parses watch, share, embed and shorts YouTube URLs', () => {
  assert.equal(getYouTubeVideoId('https://www.youtube.com/watch?v=9602Yzvd7ik'), '9602Yzvd7ik');
  assert.equal(getYouTubeVideoId('https://youtu.be/k48WMdl2eUc'), 'k48WMdl2eUc');
  assert.equal(
    getYouTubeVideoId('https://www.youtube.com/embed/Qdkg_mrniLk?start=10'),
    'Qdkg_mrniLk',
  );
  assert.equal(getYouTubeVideoId('https://www.youtube.com/shorts/dMCSiA5gzkU'), 'dMCSiA5gzkU');
});

test('rejects non-YouTube and non-https URLs', () => {
  assert.equal(getVideoThumbnailUrl('https://vimeo.com/123456789'), null);
  assert.equal(getVideoThumbnailUrl('https://iframe.mediadelivery.net/embed/123/abc'), null);
  assert.equal(getVideoThumbnailUrl('http://www.youtube.com/watch?v=9602Yzvd7ik'), null);
  assert.equal(getVideoThumbnailUrl('not a url'), null);
});

test('prefers maxres with hq fallback candidate', () => {
  assert.deepEqual(getVideoThumbnailCandidates('https://www.youtube.com/watch?v=9602Yzvd7ik'), [
    'https://i.ytimg.com/vi/9602Yzvd7ik/maxresdefault.jpg',
    'https://i.ytimg.com/vi/9602Yzvd7ik/hqdefault.jpg',
  ]);
  assert.equal(
    getYouTubeThumbnailUrl('9602Yzvd7ik'),
    'https://i.ytimg.com/vi/9602Yzvd7ik/maxresdefault.jpg',
  );
});

test('resolveLessonThumbnail prefers Sanity assets over provider thumbs', () => {
  assert.equal(
    resolveLessonThumbnail({
      posterUrl: 'https://cdn.sanity.io/images/x/poster.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=9602Yzvd7ik',
    }),
    'https://cdn.sanity.io/images/x/poster.jpg',
  );
  assert.equal(
    resolveLessonThumbnail({
      thumbnailUrl: 'https://cdn.sanity.io/images/x/thumb.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=9602Yzvd7ik',
    }),
    'https://cdn.sanity.io/images/x/thumb.jpg',
  );
  assert.equal(
    resolveLessonThumbnail({ videoUrl: 'https://www.youtube.com/watch?v=9602Yzvd7ik' }),
    'https://i.ytimg.com/vi/9602Yzvd7ik/maxresdefault.jpg',
  );
  assert.equal(resolveLessonThumbnail({}), null);
});
