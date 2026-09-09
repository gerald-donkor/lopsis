/**
 * Provider thumbnail derivation for lesson videos.
 *
 * Thumbnails always correspond to the lesson's own `videoUrl` — never stock,
 * never a neighbouring lesson's image. YouTube exposes deterministic public
 * thumbnails per video id (`maxresdefault` 1280x720 preferred, `hqdefault`
 * 480x360 fallback). Vimeo/Bunny have no deterministic URL scheme, so those
 * lessons rely on their Sanity `poster`/`thumbnail` assets.
 */

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{6,}$/;

/** Extracts the YouTube video id from any canonical watch/share/embed URL. */
export function getYouTubeVideoId(videoUrl: string): string | null {
  try {
    const url = new URL(videoUrl);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const param = url.searchParams.get('v');
      if (param && YOUTUBE_ID_PATTERN.test(param)) return param;
      const parts = url.pathname.split('/').filter(Boolean);
      const embedIndex = parts.indexOf('embed');
      if (embedIndex >= 0 && parts[embedIndex + 1]) {
        const id = parts[embedIndex + 1];
        return YOUTUBE_ID_PATTERN.test(id) ? id : null;
      }
      const shortsIndex = parts.indexOf('shorts');
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) {
        const id = parts[shortsIndex + 1];
        return YOUTUBE_ID_PATTERN.test(id) ? id : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Builds the deterministic YouTube thumbnail URL for a video id. */
export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: 'maxres' | 'high' = 'maxres',
): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality === 'maxres' ? 'maxresdefault' : 'hqdefault'}.jpg`;
}

/**
 * Derives a content-corresponding thumbnail URL from a lesson `videoUrl`.
 * Returns null for providers without a deterministic thumbnail scheme
 * (Vimeo, Bunny) — those lessons use their Sanity poster instead.
 */
export function getVideoThumbnailUrl(videoUrl: string): string | null {
  const id = getYouTubeVideoId(videoUrl);
  return id ? getYouTubeThumbnailUrl(id) : null;
}

/** High-quality (1280x720) with standard (480x360) fallback, in order. */
export function getVideoThumbnailCandidates(videoUrl: string): string[] {
  const id = getYouTubeVideoId(videoUrl);
  if (!id) return [];
  return [getYouTubeThumbnailUrl(id, 'maxres'), getYouTubeThumbnailUrl(id, 'high')];
}

type LessonThumbnailInput = {
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
};

/**
 * Fallback chain for lesson imagery: Sanity poster → Sanity thumbnail →
 * provider (YouTube maxres) thumbnail → null (caller renders its letter/SVG
 * fallback). Never returns an empty string.
 */
export function resolveLessonThumbnail(input: LessonThumbnailInput): string | null {
  if (input.posterUrl) return input.posterUrl;
  if (input.thumbnailUrl) return input.thumbnailUrl;
  if (input.videoUrl) return getVideoThumbnailUrl(input.videoUrl);
  return null;
}
