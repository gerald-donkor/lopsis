import fs from 'fs';
import path from 'path';
import { createClient } from '@sanity/client';

function getEnvVar(name: string): string {
  if (process.env[name]) return process.env[name]!;
  for (const file of ['studio/.env.local', '.env.local', '../studio/.env.local']) {
    const full = path.resolve(process.cwd(), file);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, 'utf8');
      const match = content.match(new RegExp(`^${name}=(.*)$`, 'm'));
      if (match) return match[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  throw new Error(`Environment variable ${name} not found`);
}

const projectId = getEnvVar('SANITY_STUDIO_PROJECT_ID');
const dataset = getEnvVar('SANITY_STUDIO_DATASET');
const token = getEnvVar('SANITY_API_READ_TOKEN');

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2025-08-15',
  useCdn: false,
});

function cleanUrl(raw: string): string {
  return raw.replace(/^image@/, '').trim();
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LopsisAssetUploader/1.0)',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function run() {
  console.log('=== Uploading Missing Sanity Image Assets ===');
  console.log(`Target: Project ${projectId}, Dataset ${dataset}`);

  // 1. Process Courses
  console.log('\n--- Checking Course Cover Images ---');
  const courses = await client.fetch<Array<{
    _id: string;
    title: string;
    coverImage?: any;
    coverAssetUrl?: string | null;
  }>>('*[_type == "course"]{_id, title, coverImage, "coverAssetUrl": coverImage.asset->url}');

  console.log(`Found ${courses.length} courses`);

  // Curated topic-corresponding replacements for legacy random picsum placeholders.
  // See studio/scripts/seed/image-sources.md. Verified live 2026-09-09.
  const CURATED_COVERS: Record<string, string> = {
    'course.nextjs-app-router-in-depth': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1600&q=80',
    'course.react-performance-engineering': 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1600&q=80',
    'course.typescript-for-application-developers': 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=1600&q=80',
    'course.building-ai-apps-with-llms': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1600&q=80',
    'course.retrieval-augmented-generation-from-scratch': 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1600&q=80',
    'course.python-for-data-work': 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1600&q=80',
    'course.system-design-foundations': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80',
    'course.postgresql-for-developers': 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1600&q=80',
    'course.devops-with-docker-and-kubernetes': 'https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=1600&q=80',
    'course.practical-web-security': 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1600&q=80',
  };

  for (const course of courses) {
    const cover = course.coverImage;
    const isPlaceholder = (course.coverAssetUrl || '').includes('picsum.photos');
    const curatedUrl = CURATED_COVERS[course._id];
    // One-time migration: set LOPSIS_SWAP_COVERS=1 to replace legacy random
    // picsum uploads (indistinguishable by URL after upload) with curated covers.
    const forceSwap = process.env.LOPSIS_SWAP_COVERS === '1' && Boolean(curatedUrl);
    if (cover?.asset?._ref && !isPlaceholder && !forceSwap) {
      console.log(`[PASS] Course "${course.title}" already has valid asset ref: ${cover.asset._ref}`);
      continue;
    }

    const rawUrl = forceSwap ? curatedUrl : isPlaceholder && curatedUrl ? curatedUrl : cover?._sanityAsset;
    if ((isPlaceholder || forceSwap) && curatedUrl) {
      console.log(`[SWAP] Course "${course.title}" gets curated cover`);
    }
    if (!rawUrl) {
      console.warn(`[WARN] Course "${course.title}" has no coverImage or _sanityAsset`);
      continue;
    }

    const imageUrl = cleanUrl(rawUrl);
    console.log(`[UPLOADING] Fetching cover image for "${course.title}" from ${imageUrl}...`);

    try {
      const buffer = await fetchImageBuffer(imageUrl);
      const filename = `${course._id.replace(/^course\./, '')}-cover.jpg`;
      const assetDoc = await client.assets.upload('image', buffer, {
        filename,
        contentType: 'image/jpeg',
      });

      console.log(`[UPLOADED] Created asset ${assetDoc._id} for "${course.title}"`);

      await client
        .patch(course._id)
        .set({
          coverImage: {
            _type: 'contentImage',
            alt: cover.alt || `Cover image for ${course.title}`,
            asset: {
              _type: 'reference',
              _ref: assetDoc._id,
            },
          },
        })
        .unset(['coverImage._sanityAsset'])
        .commit();

      console.log(`[PATCHED] Updated course "${course.title}" with asset ref ${assetDoc._id}`);
    } catch (err: any) {
      console.error(`[ERROR] Failed to process cover for "${course.title}":`, err.message);
    }
  }

  // 2. Process Instructors
  console.log('\n--- Checking Instructor Photos ---');
  const instructors = await client.fetch<Array<{
    _id: string;
    name: string;
    photo?: any;
  }>>('*[_type == "instructor"]{_id, name, photo}');

  console.log(`Found ${instructors.length} instructors`);

  for (const instructor of instructors) {
    const photo = instructor.photo;
    if (photo?.asset?._ref) {
      console.log(`[PASS] Instructor "${instructor.name}" already has valid photo ref: ${photo.asset._ref}`);
      continue;
    }

    const rawUrl = photo?._sanityAsset;
    if (!rawUrl) {
      console.warn(`[WARN] Instructor "${instructor.name}" has no photo or _sanityAsset`);
      continue;
    }

    const imageUrl = cleanUrl(rawUrl);
    console.log(`[UPLOADING] Fetching portrait for "${instructor.name}" from ${imageUrl}...`);

    try {
      const buffer = await fetchImageBuffer(imageUrl);
      const filename = `${instructor._id.replace(/^instructor\./, '')}-photo.jpg`;
      const assetDoc = await client.assets.upload('image', buffer, {
        filename,
        contentType: 'image/jpeg',
      });

      console.log(`[UPLOADED] Created asset ${assetDoc._id} for "${instructor.name}"`);

      await client
        .patch(instructor._id)
        .set({
          photo: {
            _type: 'contentImage',
            alt: photo.alt || `Portrait of ${instructor.name}`,
            asset: {
              _type: 'reference',
              _ref: assetDoc._id,
            },
          },
        })
        .unset(['photo._sanityAsset'])
        .commit();

      console.log(`[PATCHED] Updated instructor "${instructor.name}" with photo ref ${assetDoc._id}`);
    } catch (err: any) {
      console.error(`[ERROR] Failed to process photo for "${instructor.name}":`, err.message);
    }
  }

  // 3. Process Lessons (poster/thumbnail from the lesson's own video thumb)
  console.log('\n--- Checking Lesson Posters ---');
  const lessons = await client.fetch<Array<{
    _id: string;
    title: string;
    videoUrl?: string;
    poster?: any;
    thumbnail?: any;
  }>>('*[_type == "lesson"]{_id, title, videoUrl, poster, thumbnail}');

  console.log(`Found ${lessons.length} lessons`);

  for (const lesson of lessons) {
    const existing = lesson.poster?.asset?._ref
      ? lesson.poster
      : lesson.thumbnail?.asset?._ref
        ? lesson.thumbnail
        : null;
    if (existing) {
      console.log(`[PASS] Lesson "${lesson.title}" already has valid poster ref`);
      continue;
    }

    const candidates: string[] = [];
    const seededRaw = lesson.poster?._sanityAsset || lesson.thumbnail?._sanityAsset;
    if (seededRaw) candidates.push(cleanUrl(seededRaw));
    if (lesson.videoUrl) {
      const match = lesson.videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
      const videoId = match?.[1];
      if (videoId) {
        candidates.push(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);
        candidates.push(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
      }
    }
    if (candidates.length === 0) {
      console.warn(`[WARN] Lesson "${lesson.title}" has no poster source or videoUrl`);
      continue;
    }

    let buffer: Buffer | null = null;
    let usedUrl = '';
    for (const candidate of candidates) {
      try {
        buffer = await fetchImageBuffer(candidate);
        usedUrl = candidate;
        break;
      } catch (err: any) {
        console.warn(`[RETRY] Lesson "${lesson.title}" thumbnail unavailable at ${candidate}: ${err.message}`);
      }
    }
    if (!buffer) {
      console.error(`[ERROR] Lesson "${lesson.title}": all thumbnail candidates failed`);
      continue;
    }

    try {
      console.log(`[UPLOADING] Fetching poster for "${lesson.title}" from ${usedUrl}...`);
      const filename = `${lesson._id.replace(/^lesson\./, '').slice(0, 90)}-poster.jpg`;
      const assetDoc = await client.assets.upload('image', buffer, {
        filename,
        contentType: 'image/jpeg',
      });

      console.log(`[UPLOADED] Created asset ${assetDoc._id} for "${lesson.title}"`);

      const posterValue = {
        _type: 'contentImage',
        alt: lesson.poster?.alt || lesson.thumbnail?.alt || `Video thumbnail for ${lesson.title}`,
        asset: {
          _type: 'reference',
          _ref: assetDoc._id,
        },
      };

      await client
        .patch(lesson._id)
        .set({ poster: posterValue, thumbnail: posterValue })
        .unset(['poster._sanityAsset', 'thumbnail._sanityAsset'])
        .commit();

      console.log(`[PATCHED] Updated lesson "${lesson.title}" with poster ref ${assetDoc._id}`);
    } catch (err: any) {
      console.error(`[ERROR] Failed to process poster for "${lesson.title}":`, err.message);
    }
  }

  console.log('\n=== Asset Upload and Patching Complete ===');
}

run().catch((err) => {
  console.error('Fatal error during asset upload:', err);
  process.exit(1);
});
