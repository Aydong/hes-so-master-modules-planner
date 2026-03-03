import type { SelectedCourse } from '../types';

const TB_ORDER = ['TB1', 'TB2', 'TB3', 'TB4'];
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const isRemote = (location?: string) =>
    !location || location.toLowerCase() === 'remote' || location.toLowerCase() === 'online' || location.toLowerCase() === 'distance';

/**
 * Returns a Set of module codes whose location differs from the immediately
 * adjacent course on the same day (consecutive time blocks, neither remote).
 */
export const buildTravelWarningModules = (courses: SelectedCourse[]): Set<string> => {
    const warnings = new Set<string>();

    for (const day of WEEK_DAYS) {
        const dayCourses = courses
            .filter((c) => c.WeekDay === day)
            .sort((a, b) => TB_ORDER.indexOf(a.TimeBlock) - TB_ORDER.indexOf(b.TimeBlock));

        for (let i = 0; i < dayCourses.length - 1; i++) {
            const curr = dayCourses[i];
            const next = dayCourses[i + 1];

            const currIdx = TB_ORDER.indexOf(curr.TimeBlock);
            const nextIdx = TB_ORDER.indexOf(next.TimeBlock);

            if (nextIdx - currIdx === 1 &&
                !isRemote(curr.location) &&
                !isRemote(next.location) &&
                curr.location !== next.location
            ) {
                warnings.add(curr.module);
                warnings.add(next.module);
            }
        }
    }

    return warnings;
};
