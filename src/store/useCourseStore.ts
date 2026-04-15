import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Course, SelectedCourse } from '../types';
import type { StartingSemester } from '../utils/semesterUtils';
import { courseToAssignedSemester } from '../utils/semesterUtils';
import { getProgramById, getProgramByIdAndCatalog, initializePrograms } from '../data/programs';
import { getProgramIdFromLegacy } from '../data/dataLoader';
import { extractTimeBlocks } from '../utils/timeBlockUtils';
import { getBlockTime, formatMinutes } from '../utils/timeBlockData';
import { encodeSharePayload } from '../utils/urlShare';

export type SemesterSlot = '1' | '2' | '3' | '4';

const DEFAULT_CATALOG = 'data/courses/courses_25-26.json';
const DEFAULT_CATALOG_FILES: Record<SemesterSlot, string> = {
    '1': DEFAULT_CATALOG,
    '2': DEFAULT_CATALOG,
    '3': DEFAULT_CATALOG,
    '4': DEFAULT_CATALOG,
};

export interface ScheduleExport {
    version: string;
    exportedAt: string;
    programId: string;
    programName: string;
    startingSemester?: StartingSemester;
    catalogFile?: string;  // legacy single-catalogue format
    catalogFiles?: Record<SemesterSlot, string>;  // per-semester format
    selectedCourses: SelectedCourse[];
}

interface CourseStore {
    currentProgramId: string | null;
    startingSemester: StartingSemester;
    selectedCoursesByProgram: Record<string, SelectedCourse[]>;
    importVersion: number;
    scopeFilter: 'own' | 'extended';
    catalogFiles: Record<SemesterSlot, string>;

    // Actions
    setProgram: (programId: string) => void;
    setStartingSemester: (s: StartingSemester) => void;
    setScopeFilter: (scope: 'own' | 'extended') => void;
    setCatalogFile: (semester: SemesterSlot, file: string) => Promise<void>;
    setCatalogFiles: (files: Record<SemesterSlot, string>) => Promise<void>;
    addCourse: (course: Course, assignedSemester: SemesterSlot) => void;
    removeCourse: (moduleCode: string) => void;
    isCourseSelected: (moduleCode: string) => boolean;
    refreshData: () => void;
    exportSchedule: (semesters?: SemesterSlot[]) => void;
    importSchedule: (jsonData: string, semesters?: SemesterSlot[]) => { success: boolean; error?: string; data?: ScheduleExport };
    buildShareURL: (semesters?: SemesterSlot[]) => string | null;

    // Getters (computed)
    getAllCourses: () => Course[];
    getAllCoursesForSemester: (semester: SemesterSlot) => Course[];
    getSelectedCourses: () => SelectedCourse[];
}

/**
 * Migrate old program IDs to new format
 */
const migrateOldProgramId = (oldId: string): string => {
    return getProgramIdFromLegacy(oldId);
};

export const useCourseStore = create<CourseStore>()(
    persist(
        (set, get) => ({
            currentProgramId: null,
            startingSemester: 'SA' as StartingSemester,
            selectedCoursesByProgram: {},
            importVersion: 0,
            scopeFilter: 'own' as 'own' | 'extended',
            catalogFiles: { ...DEFAULT_CATALOG_FILES },

            setProgram: (programId) => set({ currentProgramId: programId || null }),
            setScopeFilter: (scope) => set({ scopeFilter: scope }),
            setStartingSemester: (s) => set((state) => {
                const programId = state.currentProgramId;
                if (!programId) return { startingSemester: s };

                const currentSelections = state.selectedCoursesByProgram[programId] || [];
                const remapped = currentSelections.map((course) => {
                    const year = (course.assignedSemester === '1' || course.assignedSemester === '2') ? 1 : 2;
                    return { ...course, assignedSemester: courseToAssignedSemester(course.Semester, year, s) };
                });

                return {
                    startingSemester: s,
                    selectedCoursesByProgram: {
                        ...state.selectedCoursesByProgram,
                        [programId]: remapped,
                    },
                };
            }),

            setCatalogFile: async (semester, file) => {
                await initializePrograms(file);
                set(state => ({ catalogFiles: { ...state.catalogFiles, [semester]: file } }));
                get().refreshData();
            },

            setCatalogFiles: async (files) => {
                const uniqueFiles = [...new Set(Object.values(files))];
                await Promise.all(uniqueFiles.map(f => initializePrograms(f)));
                set({ catalogFiles: files });
                get().refreshData();
            },

            addCourse: (course, assignedSemester) =>
                set((state) => {
                    const programId = state.currentProgramId;
                    if (!programId) return state;

                    const currentSelections = state.selectedCoursesByProgram[programId] || [];

                    if (currentSelections.some((c) => c.module === course.module)) {
                        return state;
                    }
                    const newCourse: SelectedCourse = { ...course, assignedSemester };

                    return {
                        selectedCoursesByProgram: {
                            ...state.selectedCoursesByProgram,
                            [programId]: [...currentSelections, newCourse],
                        },
                    };
                }),

            removeCourse: (moduleCode) =>
                set((state) => {
                    const programId = state.currentProgramId;
                    if (!programId) return state;

                    const currentSelections = state.selectedCoursesByProgram[programId] || [];

                    return {
                        selectedCoursesByProgram: {
                            ...state.selectedCoursesByProgram,
                            [programId]: currentSelections.filter((c) => c.module !== moduleCode),
                        },
                    };
                }),

            isCourseSelected: (moduleCode) => {
                const state = get();
                const programId = state.currentProgramId;
                if (!programId) return false;
                const currentSelections = state.selectedCoursesByProgram[programId] || [];
                return currentSelections.some((c) => c.module === moduleCode);
            },

            refreshData: () =>
                set((state) => {
                    const newSelectionsByProgram = { ...state.selectedCoursesByProgram };

                    Object.keys(newSelectionsByProgram).forEach(programId => {
                        // Build fresh course maps per catalogue to avoid redundant lookups
                        const freshMaps = new Map<string, Map<string, Course>>();

                        newSelectionsByProgram[programId] = (newSelectionsByProgram[programId] || []).map(selected => {
                            const catalogFile = state.catalogFiles[selected.assignedSemester];

                            if (!freshMaps.has(catalogFile)) {
                                const program = getProgramByIdAndCatalog(programId, catalogFile)
                                    ?? getProgramById(programId);
                                freshMaps.set(
                                    catalogFile,
                                    program ? new Map(program.courses.map(c => [c.module, c])) : new Map()
                                );
                            }

                            const freshData = freshMaps.get(catalogFile)?.get(selected.module);
                            if (freshData) {
                                return { ...freshData, assignedSemester: selected.assignedSemester };
                            }
                            return selected;
                        });
                    });

                    return { selectedCoursesByProgram: newSelectionsByProgram };
                }),

            exportSchedule: (semesters) => {
                const state = get();
                const programId = state.currentProgramId;
                if (!programId) return;

                const program = getProgramById(programId);
                const allCourses = state.selectedCoursesByProgram[programId] || [];
                const selectedCourses = semesters
                    ? allCourses.filter(c => semesters.includes(c.assignedSemester))
                    : allCourses;

                const enrichedCourses = selectedCourses.map(c => {
                    const blockNums = extractTimeBlocks(c.TimeBlock)
                        .map(b => parseInt(b.replace('TB', '')))
                        .filter(n => !isNaN(n));
                    const first = blockNums.length > 0 ? getBlockTime(c.location, Math.min(...blockNums)) : null;
                    const last  = blockNums.length > 0 ? getBlockTime(c.location, Math.max(...blockNums)) : null;
                    return {
                        ...c,
                        ...(first ? { time_start: formatMinutes(first.startMin) } : {}),
                        ...(last  ? { time_end:   formatMinutes(last.endMin)    } : {}),
                    };
                });

                const exportData: ScheduleExport = {
                    version: '1.0',
                    exportedAt: new Date().toISOString(),
                    programId,
                    programName: program?.name || programId,
                    startingSemester: state.startingSemester,
                    catalogFiles: state.catalogFiles,
                    selectedCourses: enrichedCourses,
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mse-schedule-${programId}.json`;
                a.click();
                URL.revokeObjectURL(url);
            },

            importSchedule: (jsonData: string, semesters?) => {
                try {
                    const data = JSON.parse(jsonData) as Partial<ScheduleExport>;

                    if (!data.programId || !Array.isArray(data.selectedCourses)) {
                        return { success: false, error: 'Invalid schedule data (programId or selectedCourses missing)' };
                    }

                    // If no semesters provided, just parse and return data for the dialog
                    if (!semesters) {
                        return { success: true, data: data as ScheduleExport };
                    }

                    const migratedProgramId = migrateOldProgramId(data.programId);
                    const program = getProgramById(migratedProgramId);
                    if (!program) {
                        return { success: false, error: `Program not found: ${migratedProgramId}` };
                    }

                    // Only import courses from selected semesters; keep others intact
                    const coursesToImport = data.selectedCourses.filter(
                        c => semesters.includes(c.assignedSemester)
                    );

                    set((state) => {
                        const existing = (state.selectedCoursesByProgram[migratedProgramId] || [])
                            .filter(c => !semesters.includes(c.assignedSemester));
                        const merged = [...existing, ...coursesToImport];

                        // Merge catalogFiles from the imported file (only for selected semesters)
                        const importedCatalogFiles = data.catalogFiles
                            ?? (data.catalogFile
                                ? { '1': data.catalogFile, '2': data.catalogFile, '3': data.catalogFile, '4': data.catalogFile }
                                : null);

                        const mergedCatalogFiles = importedCatalogFiles
                            ? semesters.reduce(
                                (acc, s) => ({ ...acc, [s]: importedCatalogFiles[s] ?? acc[s] }),
                                { ...state.catalogFiles }
                              )
                            : state.catalogFiles;

                        return {
                            currentProgramId: migratedProgramId,
                            startingSemester: data.startingSemester ?? 'SA',
                            selectedCoursesByProgram: {
                                ...state.selectedCoursesByProgram,
                                [migratedProgramId]: merged,
                            },
                            catalogFiles: mergedCatalogFiles,
                            importVersion: state.importVersion + 1,
                        } as CourseStore;
                    });

                    return { success: true };
                } catch (e) {
                    return { success: false, error: 'Failed to import schedule data' };
                }
            },

            buildShareURL: (semesters) => {
                const state = get();
                const { currentProgramId, startingSemester, selectedCoursesByProgram, catalogFiles } = state;
                if (!currentProgramId) return null;
                const all = selectedCoursesByProgram[currentProgramId] || [];
                const courses = semesters ? all.filter(c => semesters.includes(c.assignedSemester)) : all;

                // If all 4 semesters use the same catalogue, encode compactly as `y`
                const vals = Object.values(catalogFiles) as string[];
                const allSame = vals.every(v => v === vals[0]);
                const encoded = encodeSharePayload(
                    currentProgramId,
                    startingSemester,
                    courses,
                    allSame ? catalogFiles['1'] : undefined,
                    allSame ? undefined : catalogFiles,
                );
                return `${window.location.origin}${window.location.pathname}#plan=${encoded}`;
            },

            getAllCourses: () => {
                const state = get();
                if (!state.currentProgramId) return [];
                // Use S1's catalogue as the representative view (e.g. for the sidebar)
                const catalogFile = state.catalogFiles['1'];
                return getProgramByIdAndCatalog(state.currentProgramId, catalogFile)?.courses
                    ?? getProgramById(state.currentProgramId)?.courses
                    ?? [];
            },

            getAllCoursesForSemester: (semester) => {
                const state = get();
                if (!state.currentProgramId) return [];
                const catalogFile = state.catalogFiles[semester];
                return getProgramByIdAndCatalog(state.currentProgramId, catalogFile)?.courses
                    ?? getProgramById(state.currentProgramId)?.courses
                    ?? [];
            },

            getSelectedCourses: () => {
                const state = get();
                if (!state.currentProgramId) return [];
                return state.selectedCoursesByProgram[state.currentProgramId] || [];
            }
        }),
        {
            name: 'course-planner-storage-v2',
            partialize: (state) => ({
                currentProgramId: state.currentProgramId,
                startingSemester: state.startingSemester,
                selectedCoursesByProgram: state.selectedCoursesByProgram,
                catalogFiles: state.catalogFiles,
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) return;

                // Migrate old program IDs to new format
                const migratedProgramId = state.currentProgramId
                    ? migrateOldProgramId(state.currentProgramId)
                    : null;

                if (migratedProgramId !== state.currentProgramId && migratedProgramId) {
                    state.currentProgramId = migratedProgramId;
                }

                // Migrate keys in selectedCoursesByProgram
                const migratedSelections: Record<string, SelectedCourse[]> = {};
                Object.entries(state.selectedCoursesByProgram).forEach(([oldId, courses]) => {
                    if (courses) {
                        const newId = migrateOldProgramId(oldId);
                        migratedSelections[newId] = courses;
                    }
                });
                state.selectedCoursesByProgram = migratedSelections;

                // Migrate old single catalogFile → catalogFiles
                const anyState = state as unknown as Record<string, unknown>;
                if (typeof anyState['catalogFile'] === 'string' && !state.catalogFiles) {
                    const oldFile = anyState['catalogFile'] as string;
                    state.catalogFiles = { '1': oldFile, '2': oldFile, '3': oldFile, '4': oldFile };
                }
                if (!state.catalogFiles) {
                    state.catalogFiles = { ...DEFAULT_CATALOG_FILES };
                }
            },
        }
    )
);
