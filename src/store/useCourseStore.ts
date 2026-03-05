import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Course, SelectedCourse } from '../types';
import { getProgramById } from '../data/programs';
import { getProgramIdFromLegacy } from '../data/dataLoader';

export interface ScheduleExport {
    version: string;
    exportedAt: string;
    programId: string;
    programName: string;
    selectedCourses: SelectedCourse[];
}

interface CourseStore {
    currentProgramId: string | null;
    selectedCoursesByProgram: Record<string, SelectedCourse[]>;

    // Actions
    setProgram: (programId: string) => void;
    addCourse: (course: Course, assignedSemester: '1' | '2' | '3' | '4') => void;
    removeCourse: (moduleCode: string) => void;
    isCourseSelected: (moduleCode: string) => boolean;
    refreshData: () => void;
    exportSchedule: () => void;
    importSchedule: (jsonData: string) => { success: boolean; error?: string };

    // Getters (computed)
    getAllCourses: () => Course[];
    getSelectedCourses: () => SelectedCourse[];
}

/**
 * Courses of type 'C' are now optional — users can choose to add them and select their year.
 * This function is kept for backward compatibility but returns an empty array.
 */

/**
 * Migrate old program IDs to new format
 */
const migrateOldProgramId = (oldId: string): string => {
    const newId = getProgramIdFromLegacy(oldId);
    return newId;
};

export const useCourseStore = create<CourseStore>()(
    persist(
        (set, get) => ({
            currentProgramId: null,
            selectedCoursesByProgram: {},

            setProgram: (programId) => set({ currentProgramId: programId || null }),

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
                        const program = getProgramById(programId);
                        if (!program) return;

                        const freshCoursesMap = new Map(program.courses.map((c) => [c.module, c]));
                        newSelectionsByProgram[programId] = newSelectionsByProgram[programId].map(selected => {
                            const freshData = freshCoursesMap.get(selected.module);
                            if (freshData) {
                                return { ...freshData, assignedSemester: selected.assignedSemester };
                            }
                            return selected;
                        });
                    });

                    return { selectedCoursesByProgram: newSelectionsByProgram };
                }),

            exportSchedule: () => {
                const state = get();
                const programId = state.currentProgramId;
                if (!programId) return;

                const program = getProgramById(programId);
                const selectedCourses = state.selectedCoursesByProgram[programId] || [];

                const exportData: ScheduleExport = {
                    version: '1.0',
                    exportedAt: new Date().toISOString(),
                    programId,
                    programName: program?.name || programId,
                    selectedCourses,
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mse-schedule-${programId}.json`;
                a.click();
                URL.revokeObjectURL(url);
            },

            importSchedule: (jsonData: string) => {
                try {
                    const data = JSON.parse(jsonData) as Partial<ScheduleExport>;

                    if (!data.programId || !Array.isArray(data.selectedCourses)) {
                        return { success: false, error: 'Invalid schedule data (programId or selectedCourses missing)' };
                    }

                    // Migrate old program IDs to new format
                    const migratedProgramId = migrateOldProgramId(data.programId);

                    // Validate that the program exists
                    const program = getProgramById(migratedProgramId);
                    if (!program) {
                        return { success: false, error: `Program not found: ${migratedProgramId}` };
                    }

                    // All courses including type 'C' can now be imported
                    set((state) => {
                        const newSelections: Record<string, SelectedCourse[]> = {};
                        Object.entries(state.selectedCoursesByProgram).forEach(([key, value]) => {
                            if (value) newSelections[key] = value;
                        });
                        return {
                            currentProgramId: migratedProgramId,
                            selectedCoursesByProgram: {
                                ...newSelections,
                                [migratedProgramId]: data.selectedCourses,
                            },
                        } as CourseStore;
                    });

                    return { success: true };
                } catch (e) {
                    return { success: false, error: 'Failed to import schedule data' };
                }
            },

            getAllCourses: () => {
                const state = get();
                if (!state.currentProgramId) return [];
                return getProgramById(state.currentProgramId)?.courses || [];
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
                selectedCoursesByProgram: state.selectedCoursesByProgram,
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
            },
        }
    )
);
