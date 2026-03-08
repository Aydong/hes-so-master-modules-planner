export type StartingSemester = 'SA' | 'SP';

/**
 * Returns the course Semester type ('1'=Autumn, '2'=Spring) that corresponds
 * to a given assigned semester slot, depending on when the student starts.
 *
 * SA (Autumn start): S1=Autumn, S2=Spring, S3=Autumn, S4=Spring
 * SP (Spring start): S1=Spring, S2=Autumn, S3=Spring, S4=Autumn
 */
export const slotToCourseSemester = (
    slot: '1' | '2' | '3' | '4',
    startingSemester: StartingSemester
): '1' | '2' => {
    const isOddSlot = slot === '1' || slot === '3';
    if (startingSemester === 'SA') return isOddSlot ? '1' : '2';
    return isOddSlot ? '2' : '1';
};

/**
 * Returns the assigned semester slot for a course given its offering semester,
 * the target year (1 or 2), and when the student starts.
 */
export const courseToAssignedSemester = (
    courseSemester: '1' | '2',
    year: 1 | 2,
    startingSemester: StartingSemester
): '1' | '2' | '3' | '4' => {
    // SA: Autumn(1)→odd slots, Spring(2)→even slots
    // SP: Spring(2)→odd slots, Autumn(1)→even slots
    const goesOdd = startingSemester === 'SA'
        ? courseSemester === '1'
        : courseSemester === '2';
    return (year === 1 ? (goesOdd ? '1' : '2') : (goesOdd ? '3' : '4')) as '1' | '2' | '3' | '4';
};

/**
 * Returns the human-readable label for each of the 4 semester slots,
 * adjusted for the student's starting semester.
 */
export const getSemesterLabels = (startingSemester: StartingSemester): Record<string, string> => {
    const a = startingSemester === 'SA' ? 'Autumn' : 'Spring';
    const b = startingSemester === 'SA' ? 'Spring' : 'Autumn';
    return {
        '1': `Semester 1 – ${a} Year 1`,
        '2': `Semester 2 – ${b} Year 1`,
        '3': `Semester 3 – ${a} Year 2`,
        '4': `Semester 4 – ${b} Year 2`,
    };
};

/** Short label for a slot, e.g. "S1 (Autumn)" */
export const getSlotShortLabel = (slot: '1' | '2' | '3' | '4', startingSemester: StartingSemester): string => {
    const season = slotToCourseSemester(slot, startingSemester) === '1' ? 'Autumn' : 'Spring';
    return `S${slot} (${season})`;
};
