import type { SelectedCourse, ValidationResult, Collision, ValidationRules } from '../types';
import { timeBlocksOverlap } from './timeBlockUtils';

// --- Helpers ---

const buildMessage = (
    current: number,
    max: number,
    rec: number,
    minRec: number,
    overflow: number,
    hasRecRequirement = true,
): string => {
    if (hasRecRequirement && rec < minRec) return `Need ${minRec} ECTS Rec.`;
    if (overflow > 0) return `Over by ${overflow} ECTS`;
    if (current < max) return `Missing ${max - current} ECTS`;
    return 'OK';
};

const getStatus = (current: number, rec: number, limit: { max: number; minRec: number }) => ({
    validRec: rec >= limit.minRec,
    overflow: Math.max(0, current - limit.max),
});

// --- Main validation ---

export const validateConstraints = (courses: SelectedCourse[], rules: ValidationRules): ValidationResult => {
    const stats = {
        TSM: { count: 0, rec: 0 },
        FTP: { count: 0, rec: 0 },
        MA:  { count: 0, rec: 0 },
        CM:  { count: 0, rec: 0 },
        PI:  { count: 0, rec: 0 },
        MAP: { count: 0, rec: 0 },
        CSI: { count: 0, rec: 0 },
    };

    courses.forEach((course) => {
        const prefix = course.module.split('_')[0] as keyof typeof stats;
        const credits = course.credits || 3;
        if (stats[prefix]) {
            stats[prefix].count += credits;
            if (course.type === 'R' || course.type === 'C') {
                stats[prefix].rec += credits;
            }
        }
    });

    const tsmStatus = getStatus(stats.TSM.count, stats.TSM.rec, rules.TSM);
    const ftpStatus = getStatus(stats.FTP.count, stats.FTP.rec, rules.FTP);
    const maStatus  = getStatus(stats.MA.count,  stats.MA.rec,  rules.MA);
    const cmStatus  = getStatus(stats.CM.count,  0,             { max: rules.CM.max, minRec: 0 });
    const piStatus  = getStatus(stats.PI.count,  stats.PI.rec,  rules.PI);
    const mapStatus = getStatus(stats.MAP.count, stats.MAP.rec, rules.MAP);
    const icsStatus = getStatus(stats.CSI.count, stats.CSI.rec, rules.CSI);

    const totalOverflow =
        (rules.TSM.max > 0 ? tsmStatus.overflow : 0) +
        (rules.FTP.max > 0 ? ftpStatus.overflow : 0) +
        (rules.MA.max  > 0 ? maStatus.overflow  : 0) +
        (rules.CM.max  > 0 ? cmStatus.overflow  : 0) +
        (rules.PI.max  > 0 ? piStatus.overflow  : 0) +
        (rules.MAP.max > 0 ? mapStatus.overflow : 0) +
        (rules.CSI.max > 0 ? icsStatus.overflow : 0);

    const isValid =
        (rules.TSM.max === 0 || (tsmStatus.validRec)) &&
        (rules.FTP.max === 0 || (ftpStatus.validRec)) &&
        (rules.MA.max  === 0 || (maStatus.validRec))  &&
        (rules.CM.max  === 0 || (cmStatus.validRec))  &&
        (rules.PI.max  === 0 || (piStatus.validRec))  &&
        (rules.MAP.max === 0 || (mapStatus.validRec)) &&
        (rules.CSI.max === 0 || (icsStatus.validRec)) &&
        totalOverflow <= rules.BONUS; 

    return {
        tsm: {
            count: stats.TSM.count,
            rec: stats.TSM.rec,
            valid: tsmStatus.validRec && (tsmStatus.overflow === 0 || (totalOverflow <= rules.BONUS && tsmStatus.overflow <= rules.BONUS)) && rules.TSM.max <= stats.TSM.count,
            message: buildMessage(stats.TSM.count, rules.TSM.max, stats.TSM.rec, rules.TSM.minRec, tsmStatus.overflow),
        },
        ftp: {
            count: stats.FTP.count,
            rec: stats.FTP.rec,
            valid: ftpStatus.validRec && (ftpStatus.overflow === 0 || (totalOverflow <= rules.BONUS && ftpStatus.overflow <= rules.BONUS)) && rules.FTP.max <= stats.FTP.count,
            message: buildMessage(stats.FTP.count, rules.FTP.max, stats.FTP.rec, rules.FTP.minRec, ftpStatus.overflow),
        },
        ma: {
            count: stats.MA.count,
            rec: stats.MA.rec,
            valid: maStatus.validRec && (maStatus.overflow === 0 || (totalOverflow <= rules.BONUS && maStatus.overflow <= rules.BONUS)) && rules.MA.max <= stats.MA.count,
            message: buildMessage(stats.MA.count, rules.MA.max, stats.MA.rec, rules.MA.minRec, maStatus.overflow),
        },
        cm: {
            count: stats.CM.count,
            valid: (cmStatus.overflow === 0 || (totalOverflow <= rules.BONUS && cmStatus.overflow <= rules.BONUS)) && rules.CM.max <= stats.CM.count,
            message: buildMessage(stats.CM.count, rules.CM.max, 0, 0, cmStatus.overflow, false),
        },
        pi: {
            count: stats.PI.count,
            rec: stats.PI.rec,
            valid: piStatus.validRec && (piStatus.overflow === 0 || (totalOverflow <= rules.BONUS && piStatus.overflow <= rules.BONUS)) && rules.PI.max <= stats.PI.count,
            message: buildMessage(stats.PI.count, rules.PI.max, stats.PI.rec, rules.PI.minRec, piStatus.overflow),
        },
        map: {
            count: stats.MAP.count,
            rec: stats.MAP.rec,
            valid: mapStatus.validRec && (mapStatus.overflow === 0 || (totalOverflow <= rules.BONUS && mapStatus.overflow <= rules.BONUS)) && rules.MAP.max <= stats.MAP.count,
            message: buildMessage(stats.MAP.count, rules.MAP.max, stats.MAP.rec, rules.MAP.minRec, mapStatus.overflow),
        },
        csi: {
            count: stats.CSI.count,
            rec: stats.CSI.rec,
            valid: icsStatus.validRec && (icsStatus.overflow === 0 || (totalOverflow <= rules.BONUS && icsStatus.overflow <= rules.BONUS)) && rules.CSI.max <= stats.CSI.count,
            message: buildMessage(stats.CSI.count, rules.CSI.max, stats.CSI.rec, rules.CSI.minRec, icsStatus.overflow),
        },
        bonus: {
            count: totalOverflow,
            valid: totalOverflow <= rules.BONUS,
            message:
                totalOverflow === 0
                    ? 'No overflow'
                    : totalOverflow <= rules.BONUS
                        ? `Using ${totalOverflow}/${rules.BONUS} ECTS bonus`
                        : `Overflow too high: ${totalOverflow} ECTS (max ${rules.BONUS})`,
        },
        totalEcts: courses.reduce((sum, c) => sum + (c.credits || 3), 0),
        isValid,
    };
};

export const checkCollisions = (courses: SelectedCourse[]): Collision[] => {
    const collisions: Collision[] = [];
    for (let i = 0; i < courses.length; i++) {
        for (let j = i + 1; j < courses.length; j++) {
            const c1 = courses[i];
            const c2 = courses[j];
            if (
                c1.assignedSemester === c2.assignedSemester &&
                c1.WeekDay === c2.WeekDay &&
                timeBlocksOverlap(c1.TimeBlock, c2.TimeBlock)
            ) {
                collisions.push({ course1: c1, course2: c2 });
            }
        }
    }
    return collisions;
};