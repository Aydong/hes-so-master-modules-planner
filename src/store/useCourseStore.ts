import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Course, SelectedCourse } from '../types';
import { getProgramById } from '../data/programs';

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
 * Returns the mandatory (type 'C') courses for a program as SelectedCourses.
 * These are never stored in state — always computed on-the-fly to avoid duplicates.
 */
const getMandatoryCourses = (programId: string): SelectedCourse[] => {
    const program = getProgramById(programId);
    if (!program) return [];
    return program.courses
        .filter((c) => c.type === 'C')
        .map((c) => ({ ...c, assignedSemester: (c.Semester === '1' ? '1' : '2') as '1' | '2' | '3' | '4' }));
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

                    // Strip any mandatory courses from the import — they are always computed
                    const nonMandatory = data.selectedCourses.filter((c) => c.type !== 'C');

                    set((state) => ({
                        currentProgramId: data.programId,
                        selectedCoursesByProgram: {
                            ...state.selectedCoursesByProgram,
                            [data.programId!]: nonMandatory,
                        },
                    }));

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
                const stored = state.selectedCoursesByProgram[state.currentProgramId] || [];
                // Mandatory courses are never stored — always injected here to avoid duplicates
                return [...stored, ...getMandatoryCourses(state.currentProgramId)];
            }
        }),
        {
            name: 'course-planner-storage-v2',
            partialize: (state) => ({
                currentProgramId: state.currentProgramId,
                selectedCoursesByProgram: state.selectedCoursesByProgram,
            }),
        }
    )
);
