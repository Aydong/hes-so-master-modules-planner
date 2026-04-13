import type { Course } from '../types';

export interface Master {
  code: string;
  name: string;
  link?: string;
  specializations: Specialization[];
  has_specializations: boolean;
  specialization_count: number;
}

export interface Specialization {
  code: string | null;
  name: string;
}

export interface MastersData {
  program: string;
  masters: Master[];
}

export interface CourseYearEntry {
  file: string;
  label: string;
}

export interface CourseIndex {
  default: string;
  years: CourseYearEntry[];
}

//  Caches

let mastersDataCache: MastersData | null = null;
let courseIndexCache: CourseIndex | null = null;
/** keyed by filename (e.g. "courses_25-26.json") */
const courseRegistryByFile: Record<string, Record<string, Omit<Course, 'module' | 'type'>>> = {};
/** per-program manifest cache */
let manifestCache: Record<string, Array<{ module: string; type: Course['type'] }>> = {};
/** resolved courses per "year:programId" key */
let courseDataCache: Record<string, Course[]> = {};
/** out-of-specialization courses per "year:programId" key */
let outOfSpecCache: Record<string, Course[]> = {};

const OUT_OF_SPEC_PREFIXES = ['TSM', 'FTP', 'CM'];

// Map old program IDs to new format for backward compatibility
const legacyIdMap: Record<string, string> = {
  'ds':    'DS-DS',
  'cs-s':  'CS-S',
  'cs-cy': 'CS-Cy',
  'cs-e':  'CS-E',
  'cs-c':  'CS-C',
  'ics':   'ICS-ICS',
};

//  Loaders

export async function getMastersData(): Promise<MastersData> {
  if (mastersDataCache) return mastersDataCache;
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}data/MSE_masters_index.json`);
  mastersDataCache = await res.json() as MastersData;
  return mastersDataCache;
}

export async function getCourseIndex(): Promise<CourseIndex> {
  if (courseIndexCache) return courseIndexCache;
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}data/courses_index.json`);
  courseIndexCache = await res.json() as CourseIndex;
  return courseIndexCache;
}

async function getCourseRegistry(
  catalogFile: string,
): Promise<Record<string, Omit<Course, 'module' | 'type'>>> {
  if (courseRegistryByFile[catalogFile]) return courseRegistryByFile[catalogFile];
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}${catalogFile}`);
  if (!res.ok) throw new Error(`Course catalogue not found: ${catalogFile} (HTTP ${res.status})`);
  const courses = await res.json() as Record<string, Omit<Course, 'module' | 'type'>>;
  courseRegistryByFile[catalogFile] = courses;
  return courses;
}

async function getProgramManifest(
  programId: string,
): Promise<Array<{ module: string; type: Course['type'] }>> {
  if (manifestCache[programId]) return manifestCache[programId];
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}data/programs/${programId}.json`);
  if (!res.ok) {
    console.warn(`No manifest found for program ${programId}`);
    return [];
  }
  const manifest = await res.json() as Array<{ module: string; type: Course['type'] }>;
  manifestCache[programId] = manifest;
  return manifest;
}

//  Public API

export async function getCoursesBySpecialization(
  masterCode: string,
  specializationCode: string | null,
  catalogFile: string,
): Promise<Course[]> {
  const programId = specializationCode
    ? `${masterCode}-${specializationCode}`
    : `${masterCode}-${masterCode}`;

  const cacheKey = `${catalogFile}:${programId}`;
  if (courseDataCache[cacheKey]) return courseDataCache[cacheKey];

  const [registry, manifest] = await Promise.all([
    getCourseRegistry(catalogFile),
    getProgramManifest(programId),
  ]);

  const courses: Course[] = [];
  for (const entry of manifest) {
    const data = registry[entry.module];
    if (!data) {
      console.warn(`Module ${entry.module} not found in course registry (${catalogFile})`);
      continue;
    }
    courses.push({ module: entry.module, type: entry.type, ...data });
  }

  courseDataCache[cacheKey] = courses;
  return courses;
}

/**
 * Returns all TSM/FTP/CM courses from the registry that are NOT in the given program's manifest.
 * These courses are forced to type 'O' and flagged as out-of-specialization.
 */
export async function getOutOfSpecializationCourses(
  programId: string,
  catalogFile: string,
): Promise<Course[]> {
  const cacheKey = `${catalogFile}:${programId}`;
  if (outOfSpecCache[cacheKey]) return outOfSpecCache[cacheKey];

  const [registry, manifest] = await Promise.all([
    getCourseRegistry(catalogFile),
    getProgramManifest(programId),
  ]);

  const manifestModules = new Set(manifest.map(e => e.module));

  const courses: Course[] = [];
  for (const [module, data] of Object.entries(registry)) {
    const prefix = module.split('_')[0];
    if (OUT_OF_SPEC_PREFIXES.includes(prefix) && !manifestModules.has(module)) {
      courses.push({ module, type: 'O', isOutOfSpecialization: true, ...data });
    }
  }

  outOfSpecCache[cacheKey] = courses;
  return courses;
}


export function getProgramIdFromLegacy(legacyId: string): string {
  return legacyIdMap[legacyId] || legacyId;
}

export function getLegacyIdFromProgram(programId: string): string {
  for (const [legacy, program] of Object.entries(legacyIdMap)) {
    if (program === programId) return legacy;
  }
  return programId;
}
