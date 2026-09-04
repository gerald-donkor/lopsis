import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createClient } from '@sanity/client';

// Resolve environment variables from studio/.env.local or root .env.local
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

interface SanityDoc {
  _id: string;
  _type: string;
  [key: string]: any;
}

async function run() {
  console.log('--- Starting Sanity Content Seeding & Harmonization ---');
  console.log(`Target: Project ${projectId}, Dataset ${dataset}`);

  const ndjsonPath = path.resolve(process.cwd(), path.basename(process.cwd()) === 'studio' ? '../studio/scripts/seed/seed.ndjson' : 'studio/scripts/seed/seed.ndjson');
  if (!fs.existsSync(ndjsonPath)) {
    throw new Error(`Seed file not found at ${ndjsonPath}`);
  }

  const rawDocs: SanityDoc[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(ndjsonPath) });
  for await (const line of rl) {
    if (line.trim()) {
      rawDocs.push(JSON.parse(line));
    }
  }

  console.log(`Read ${rawDocs.length} raw documents from seed.ndjson`);

  // Query existing documents in Sanity to get resolved image asset refs
  console.log('Fetching currently uploaded image assets from Sanity...');
  const existingLessons = await client.fetch<Array<{ _id: string; thumbnail?: any; poster?: any }>>(
    '*[_type == "lesson"]{_id, thumbnail, poster}'
  );
  const existingCourses = await client.fetch<Array<{ _id: string; coverImage?: any; icon?: any }>>(
    '*[_type == "course"]{_id, coverImage, icon}'
  );
  const existingInstructors = await client.fetch<Array<{ _id: string; photo?: any }>>(
    '*[_type == "instructor"]{_id, photo}'
  );

  const lessonMediaMap = new Map(existingLessons.map(l => [l._id, l.poster || l.thumbnail]));
  const courseCoverMap = new Map(existingCourses.map(c => [c._id, c.coverImage]));
  const instructorPhotoMap = new Map(existingInstructors.map(i => [i._id, i.photo]));

  // Process and harmonize each document
  const enrichedDocs: SanityDoc[] = [];

  for (const doc of rawDocs) {
    if (doc._type === 'lesson') {
      const existingMedia = lessonMediaMap.get(doc._id);
      const posterAsset = doc.poster || doc.thumbnail || existingMedia;
      const cleanPoster = posterAsset?.asset?._ref ? {
        _type: 'contentImage',
        alt: posterAsset.alt || `Video poster for ${doc.title}`,
        asset: {
          _type: 'reference',
          _ref: posterAsset.asset._ref,
        },
      } : (existingMedia?.asset?._ref ? {
        _type: 'contentImage',
        alt: existingMedia.alt || `Video poster for ${doc.title}`,
        asset: {
          _type: 'reference',
          _ref: existingMedia.asset._ref,
        },
      } : undefined);

      const durationSec = doc.durationSeconds ?? doc.duration ?? 300;

      const enrichedLesson: SanityDoc = {
        ...doc,
        durationSeconds: durationSec,
        duration: durationSec,
        poster: cleanPoster,
        thumbnail: cleanPoster,
      };
      // Clean up raw _sanityAsset if present to avoid mutation errors on update
      if (enrichedLesson.poster && (enrichedLesson.poster as any)._sanityAsset) {
        delete (enrichedLesson.poster as any)._sanityAsset;
      }
      if (enrichedLesson.thumbnail && (enrichedLesson.thumbnail as any)._sanityAsset) {
        delete (enrichedLesson.thumbnail as any)._sanityAsset;
      }
      enrichedDocs.push(enrichedLesson);
    } else if (doc._type === 'course') {
      const existingCover = courseCoverMap.get(doc._id);
      const cover = existingCover?.asset?._ref ? existingCover : doc.coverImage;
      const cleanCover = cover?.asset?._ref ? {
        _type: 'contentImage',
        alt: cover.alt || doc.coverImage?.alt || `Cover image for ${doc.title}`,
        asset: {
          _type: 'reference',
          _ref: cover.asset._ref,
        },
      } : undefined;

      const enrichedCourse: SanityDoc = {
        ...doc,
        coverImage: cleanCover || doc.coverImage,
      };
      if (enrichedCourse.coverImage && (enrichedCourse.coverImage as any)._sanityAsset) {
        if (cleanCover) {
          enrichedCourse.coverImage = cleanCover;
        } else {
          delete (enrichedCourse.coverImage as any)._sanityAsset;
        }
      }
      enrichedDocs.push(enrichedCourse);
    } else if (doc._type === 'instructor') {
      const existingPhoto = instructorPhotoMap.get(doc._id);
      const photo = existingPhoto?.asset?._ref ? existingPhoto : doc.photo;
      const cleanPhoto = photo?.asset?._ref ? {
        _type: 'contentImage',
        alt: photo.alt || doc.photo?.alt || `Portrait of ${doc.name}`,
        asset: {
          _type: 'reference',
          _ref: photo.asset._ref,
        },
      } : undefined;

      const enrichedInstructor: SanityDoc = {
        ...doc,
        photo: cleanPhoto || doc.photo,
      };
      if (enrichedInstructor.photo && (enrichedInstructor.photo as any)._sanityAsset) {
        if (cleanPhoto) {
          enrichedInstructor.photo = cleanPhoto;
        } else {
          delete (enrichedInstructor.photo as any)._sanityAsset;
        }
      }
      enrichedDocs.push(enrichedInstructor);
    } else {
      enrichedDocs.push(doc);
    }
  }

  console.log(`Enriched ${enrichedDocs.length} documents. Applying updates in batches...`);

  // Use patches / transactional commits for robust idempotent updates
  const batchSize = 25;
  for (let i = 0; i < enrichedDocs.length; i += batchSize) {
    const batch = enrichedDocs.slice(i, i + batchSize);
    const tx = client.transaction();
    for (const doc of batch) {
      tx.createOrReplace(doc);
    }
    await tx.commit();
    console.log(`Committed batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(enrichedDocs.length / batchSize)}`);
  }

  console.log('All documents committed. Running comprehensive validation checks...');

  // 1. Count checks
  const [categories, instructors, courses, lessons] = await Promise.all([
    client.fetch<any[]>('*[_type == "category"]{_id, title, slug}'),
    client.fetch<any[]>('*[_type == "instructor"]{_id, name, slug, expertise, photo}'),
    client.fetch<any[]>('*[_type == "course"]{_id, title, slug, modules, instructor, category, coverImage, learningOutcomes}'),
    client.fetch<any[]>('*[_type == "lesson"]{_id, title, slug, durationSeconds, duration, poster, thumbnail, videoUrl}'),
  ]);

  console.log(`Verified Counts:
- Categories: ${categories.length} (expected 6)
- Instructors: ${instructors.length} (expected 5)
- Courses: ${courses.length} (expected 10)
- Lessons: ${lessons.length} (expected 120)`);

  if (categories.length !== 6 || instructors.length !== 5 || courses.length !== 10 || lessons.length !== 120) {
    throw new Error('Document count mismatch!');
  }

  // 2. Relational checks: module = sum of lessons, course = sum of modules
  const lessonMap = new Map(lessons.map(l => [l._id, l]));
  let totalLessonsInModules = 0;
  let missingLessons = 0;
  let lessonsWithoutPoster = 0;
  let lessonsWithoutDuration = 0;

  for (const lesson of lessons) {
    if (!lesson.durationSeconds || lesson.durationSeconds <= 0) {
      lessonsWithoutDuration++;
    }
    if (!lesson.poster?.asset?._ref) {
      lessonsWithoutPoster++;
    }
  }

  for (const course of courses) {
    const modules = course.modules || [];
    if (modules.length !== 4) {
      throw new Error(`Course ${course.title} has ${modules.length} modules, expected 4`);
    }

    let courseLessonCount = 0;
    let courseDurationSum = 0;

    for (const mod of modules) {
      const modLessons = mod.lessons || [];
      if (modLessons.length !== 3) {
        throw new Error(`Course ${course.title} module "${mod.title}" has ${modLessons.length} lessons, expected 3`);
      }

      let moduleDurationSum = 0;
      for (const lRef of modLessons) {
        totalLessonsInModules++;
        const targetLesson = lessonMap.get(lRef._ref);
        if (!targetLesson) {
          console.error(`Missing lesson ref ${lRef._ref} in course ${course.title}`);
          missingLessons++;
        } else {
          moduleDurationSum += (targetLesson.durationSeconds || 0);
        }
      }
      courseLessonCount += modLessons.length;
      courseDurationSum += moduleDurationSum;
    }

    console.log(`Course "${course.title}": 4 modules, ${courseLessonCount} lessons, total duration: ${Math.round(courseDurationSum / 60)}m`);
  }

  console.log(`\nIntegrity Summary:
- Total module lesson references: ${totalLessonsInModules} (expected 120)
- Missing lesson references: ${missingLessons} (expected 0)
- Lessons missing poster asset: ${lessonsWithoutPoster} (expected 0)
- Lessons missing durationSeconds: ${lessonsWithoutDuration} (expected 0)`);

  if (missingLessons > 0 || lessonsWithoutDuration > 0 || lessonsWithoutPoster > 0) {
    throw new Error('Integrity validation failed!');
  }

  console.log('\n SUCCESS: Sample content in Sanity is 100% consistent, validated, and ready!');
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
