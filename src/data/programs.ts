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
    CSI: { max: 0, minRec: 0 },
    PI: { max: 6, minRec: 6 },
    MAP: { max: 0, minRec: 0 },
    BONUS: 3,
};

const icsRules: ValidationRules = {
    TSM: { max: 12, minRec: 6 },
    FTP: { max: 9, minRec: 3 },
    MA: { max: 12, minRec: 9 },
    CM: { max: 6, minRec: 0 },
    PI: { max: 0, minRec: 0 },
    MAP: { max: 0, minRec: 0 },
    CSI: { max: 18, minRec: 0 },
    BONUS: 3,
};

const ceRules: ValidationRules = {
    TSM: { max: 12, minRec: 6 },
    FTP: { max: 9, minRec: 3 },
    MA: { max: 3, minRec: 0 },
    MAP: { max: 27, minRec: 0 },
    PI: { max: 0, minRec: 0 },
    CM: { max: 6, minRec: 0 },
    CSI: { max: 0, minRec: 0 },
    BONUS: 3,
};

/** Cache keyed by catalogFile */
const programsByYear: Partial<Record<string, Program[]>> = {};
const loadingPromiseByYear: Partial<Record<string, Promise<Program[]>>> = {};

async function loadProgramsAsync(catalogFile: string): Promise<Program[]> {
    if (programsByYear[catalogFile]) return programsByYear[catalogFile];
    if (loadingPromiseByYear[catalogFile]) return loadingPromiseByYear[catalogFile];

    loadingPromiseByYear[catalogFile] = (async () => {
        const mastersData = await getMastersData();
        const programs: Program[] = [];

        for (const master of mastersData.masters) {
            for (const specialization of master.specializations) {
                const masterCode = master.code;
                const specializationCode = specialization.code;
                const programId = `${masterCode}-${specializationCode || masterCode}`;

                const courses = await getCoursesBySpecialization(masterCode, specializationCode, catalogFile);

                const rules = masterCode === 'ICS' ? icsRules : masterCode === 'CE' ? ceRules : defaultRules;

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

        programsByYear[catalogFile] = programs;
        return programs;
    })();

    return loadingPromiseByYear[catalogFile];
}

export let PROGRAMS: Program[] = [];

/** Load programs for the given catalogue catalogFile and set them as active. */
export async function initializePrograms(catalogFile: string): Promise<void> {
    PROGRAMS = await loadProgramsAsync(catalogFile);
}

export const getProgramById = (id: string): Program | undefined => {
    const normalizedId = getProgramIdFromLegacy(id);
    return PROGRAMS.find(p => p.id === normalizedId);
};

/** Fallback rules used when no program is selected. */
export function getDefaultValidationRules(): ValidationRules {
    return {
        TSM: { max: 12, minRec: 6 },
        FTP: { max: 9,  minRec: 3 },
        MA:  { max: 18, minRec: 12 },
        CM:  { max: 6,  minRec: 0 },
        PI:  { max: 6,  minRec: 6 },
        MAP: { max: 0,  minRec: 0 },
        CSI: { max: 0,  minRec: 0 },
        BONUS: 3,
    };
}

export const getAllPrograms = async (): Promise<Program[]> => {
    if (PROGRAMS.length === 0) {
        throw new Error('Programs not initialized. Call initializePrograms(catalogFile) first.');
    }
    return PROGRAMS;
};
