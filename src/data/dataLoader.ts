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

//  Caches 

let mastersDataCache: MastersData | null = null;
/** courses.json: module code → course data (without type) */
let courseRegistryCache: Record<string, Omit<Course, 'module' | 'type'>> | null = null;
/** per-program manifest cache */
let manifestCache: Record<string, Array<{ module: string; type: Course['type'] }>> = {};
/** resolved courses per program */
let courseDataCache: Record<string, Course[]> = {};
/** out-of-specialization courses per program */
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

async function getCourseRegistry(): Promise<Record<string, Omit<Course, 'module' | 'type'>>> {
  if (courseRegistryCache) return courseRegistryCache;
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}data/courses.json`);
  courseRegistryCache = await res.json() as Record<string, Omit<Course, 'module' | 'type'>>;
  return courseRegistryCache;
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
): Promise<Course[]> {
  const programId = specializationCode
    ? `${masterCode}-${specializationCode}`
    : `${masterCode}-${masterCode}`;

  if (courseDataCache[programId]) return courseDataCache[programId];

  const [registry, manifest] = await Promise.all([
    getCourseRegistry(),
    getProgramManifest(programId),
  ]);

  const courses: Course[] = [];
  for (const entry of manifest) {
    const data = registry[entry.module];
    if (!data) {
      console.warn(`Module ${entry.module} not found in course registry`);
      continue;
    }
    courses.push({ module: entry.module, type: entry.type, ...data });
  }

  courseDataCache[programId] = courses;
  return courses;
}

/**
 * Returns all TSM/FTP/CM courses from the registry that are NOT in the given program's manifest.
 * These courses are forced to type 'O' and flagged as out-of-specialization.
 */
export async function getOutOfSpecializationCourses(programId: string): Promise<Course[]> {
  if (outOfSpecCache[programId]) return outOfSpecCache[programId];

  const [registry, manifest] = await Promise.all([
    getCourseRegistry(),
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

  outOfSpecCache[programId] = courses;
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
