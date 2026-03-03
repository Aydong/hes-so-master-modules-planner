import type { Course } from '../types';

// Import the master index from the data folder (via public)
// We'll load this dynamically

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

// Maps for dynamic loading
let mastersDataCache: MastersData | null = null;
let courseDataCache: Record<string, Course[]> = {};

// Map specialization codes to legacy course data file names
const courseDataFileMap: Record<string, string> = {
  'CE-S': 'CE/MSE_CE_S.json',
  'CE-G': 'CE/MSE_CE_G.json',
  'CE-H': 'CE/MSE_CE_H.json',
  'CE-T': 'CE/MSE_CE_T.json',
  'CS-C': 'CS/MSE_CS_C.json',
  'CS-Cy': 'CS/MSE_CS_Cy.json',
  'CS-E': 'CS/MSE_CS_E.json',
  'CS-S': 'CS/MSE_CS_S.json',
  'DS-DS': 'DS/MSE_DS.json',
  'ElE-S': 'EIE/MSE_ElE_S.json',
  'ElE-P': 'EIE/MSE_ElE_P.json',
  'EnEn-EnEn': 'EnEn/MSE_EnEn.json',
  'ICS-ICS': 'ICS/MSE_ICS.json',
  'ME-ME': 'ME/MSE_ME.json',
  'Mic-B': 'Mic/MSE_Mic_B.json',
  'Mic-D': 'Mic/MSE_Mic_D.json',
  'Mic-H': 'Mic/MSE_Mic_H.json',
  'Mic-P': 'Mic/MSE_Mic_P.json',
};

// Map old program IDs to new format for backward compatibility
const legacyIdMap: Record<string, string> = {
  'ds': 'DS-DS',
  'cs-s': 'CS-S',
  'cs-cy': 'CS-Cy',
  'cs-e': 'CS-E',
  'cs-c': 'CS-C',
  'ics': 'ICS-ICS',
};

export async function getMastersData(): Promise<MastersData> {
  if (mastersDataCache) {
    return mastersDataCache;
  }
  
  try {
    // Use import.meta.env.BASE_URL to get the correct base path
    const basePath = import.meta.env.BASE_URL;
    const response = await fetch(`${basePath}data/MSE_masters_index.json`);
    const data: MastersData = await response.json();
    mastersDataCache = data;
    return data;
  } catch (error) {
    console.error('Failed to load masters index:', error);
    throw error;
  }
}

export async function getCoursesBySpecialization(masterCode: string, specializationCode: string | null): Promise<Course[]> {
  // Build the ID based on master and specialization
  const id = specializationCode ? `${masterCode}-${specializationCode}` : `${masterCode}-${masterCode}`;
  
  if (courseDataCache[id]) {
    return courseDataCache[id];
  }

  const filePath = courseDataFileMap[id];
  if (!filePath) {
    console.warn(`No course data file mapping for ${id}`);
    return [];
  }

  try {
    // Use import.meta.env.BASE_URL to get the correct base path
    const basePath = import.meta.env.BASE_URL;
    const response = await fetch(`${basePath}data/${filePath}`);
    const data: Course[] = await response.json();
    courseDataCache[id] = data;
    return data;
  } catch (error) {
    console.error(`Failed to load courses for ${id}:`, error);
    return [];
  }
}

export function getProgramIdFromLegacy(legacyId: string): string {
  return legacyIdMap[legacyId] || legacyId;
}

export function getLegacyIdFromProgram(programId: string): string {
  // Reverse lookup
  for (const [legacy, program] of Object.entries(legacyIdMap)) {
    if (program === programId) {
      return legacy;
    }
  }
  return programId;
}
