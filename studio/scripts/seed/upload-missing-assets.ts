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
  }>>('*[_type == "course"]{_id, title, coverImage}');

  console.log(`Found ${courses.length} courses`);

  for (const course of courses) {
    const cover = course.coverImage;
    if (cover?.asset?._ref) {
      console.log(`[PASS] Course "${course.title}" already has valid asset ref: ${cover.asset._ref}`);
      continue;
    }

    const rawUrl = cover?._sanityAsset;
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

  console.log('\n=== Asset Upload and Patching Complete ===');
}

run().catch((err) => {
  console.error('Fatal error during asset upload:', err);
  process.exit(1);
});
