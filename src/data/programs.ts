import type { Course, ValidationRules } from '../types';
import { getMastersData, getCoursesBySpecialization, getProgramIdFromLegacy } from './dataLoader';

export interface Program {
    id: string;
    name: string;
    description: string;
    masterCode: string;
    specializationCode: string | null;
    courses: Course[];
    validationRules: ValidationRules;
}

const defaultRules: ValidationRules = {
    TSM: { max: 12, minRec: 6 },
    FTP: { max: 9, minRec: 3 },
    MA: { max: 18, minRec: 12 },
    CM: { max: 6, minRec: 0 },
    BONUS: 3,
};

const icsRules: ValidationRules = {
    TSM: { max: 12, minRec: 6 },
    FTP: { max: 9, minRec: 3 },
    MA: { max: 12, minRec: 9 },
    CM: { max: 6, minRec: 0 },
    BONUS: 3,
};

let programsCache: Program[] | null = null;
let loadingPromise: Promise<Program[]> | null = null;

/**
 * Load all programs from the data folder dynamically
 */
async function loadProgramsAsync(): Promise<Program[]> {
    if (programsCache) {
        return programsCache;
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        const mastersData = await getMastersData();
        const programs: Program[] = [];

        for (const master of mastersData.masters) {
            for (const specialization of master.specializations) {
                const masterCode = master.code;
                const specializationCode = specialization.code;
                const programId = `${masterCode}-${specializationCode || masterCode}`;
                
                const courses = await getCoursesBySpecialization(masterCode, specializationCode);
                const rules = masterCode === 'ICS' ? icsRules : defaultRules;

                const name = master.specializations.length > 1 && specialization.code
                    ? `${master.name} - ${specialization.name}`
                    : master.name;

                const description = `Master of Science in Engineering - ${name}`;

                programs.push({
                    id: programId,
                    name,
                    description,
                    masterCode,
                    specializationCode: specializationCode,
                    courses,
                    validationRules: rules,
                });
            }
        }

        programsCache = programs;
        return programs;
    })();

    return loadingPromise;
}

export let PROGRAMS: Program[] = [];

// Initialize programs asynchronously
export async function initializePrograms(): Promise<void> {
    PROGRAMS = await loadProgramsAsync();
}

export const getProgramById = (id: string): Program | undefined => {
    // Support legacy IDs
    const normalizedId = getProgramIdFromLegacy(id);
    return PROGRAMS.find(p => p.id === normalizedId);
};

export const getAllPrograms = async (): Promise<Program[]> => {
    if (PROGRAMS.length === 0) {
        await initializePrograms();
    }
    return PROGRAMS;
};
