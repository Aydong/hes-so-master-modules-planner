import type { SelectedCourse, ValidationResult, Collision, ValidationRules } from '../types';
import { timeBlocksOverlap } from './timeBlockUtils';

export const validateConstraints = (courses: SelectedCourse[], rules: ValidationRules): ValidationResult => {
    const stats = {
        TSM: { count: 0, rec: 0 },
        FTP: { count: 0, rec: 0 },
        MA: { count: 0, rec: 0 },
        CM: { count: 0, rec: 0 },
    };

    courses.forEach((course) => {
        const prefix = course.module.split('_')[0] as keyof typeof stats;
        const credits = course.credits || 3;
        if (stats[prefix]) {
            stats[prefix].count += credits;
            if (course.type === 'R') {
                stats[prefix].rec += credits;
            }
        }
    });

    const getStatus = (current: number, rec: number, limit: { max: number; minRec: number }) => {
        const validRec = rec >= limit.minRec;
        const overflow = Math.max(0, current - limit.max);
        return { validRec, overflow };
    };

    const tsmStatus = getStatus(stats.TSM.count, stats.TSM.rec, rules.TSM);
    const ftpStatus = getStatus(stats.FTP.count, stats.FTP.rec, rules.FTP);
    const maStatus = getStatus(stats.MA.count, stats.MA.rec, rules.MA);
    const cmStatus = getStatus(stats.CM.count, stats.CM.rec, rules.CM);

    const totalOverflow =
        tsmStatus.overflow + ftpStatus.overflow + maStatus.overflow + cmStatus.overflow;

    const bonusValid = totalOverflow <= rules.BONUS;

    const isValid =
        tsmStatus.validRec &&
        ftpStatus.validRec &&
        maStatus.validRec &&
        cmStatus.validRec &&
        bonusValid;

    return {
        tsm: {
            count: stats.TSM.count,
            rec: stats.TSM.rec,
            valid: tsmStatus.validRec && tsmStatus.overflow === 0, // Individual validity without bonus consideration for UI
            message: !tsmStatus.validRec
                ? `Need ${rules.TSM.minRec} ECTS Rec.`
                : tsmStatus.overflow > 0
                    ? `Over max by ${tsmStatus.overflow}`
                    : 'OK',
        },
        ftp: {
            count: stats.FTP.count,
            rec: stats.FTP.rec,
            valid: ftpStatus.validRec && ftpStatus.overflow === 0,
            message: !ftpStatus.validRec
                ? `Need ${rules.FTP.minRec} ECTS Rec.`
                : ftpStatus.overflow > 0
                    ? `Over max by ${ftpStatus.overflow}`
                    : 'OK',
        },
        ma: {
            count: stats.MA.count,
            rec: stats.MA.rec,
            valid: maStatus.validRec && maStatus.overflow === 0,
            message: !maStatus.validRec
                ? `Need ${rules.MA.minRec} ECTS Rec.`
                : maStatus.overflow > 0
                    ? `Over max by ${maStatus.overflow}`
                    : 'OK',
        },
        cm: {
            count: stats.CM.count,
            valid: cmStatus.validRec && cmStatus.overflow === 0,
            message: cmStatus.overflow > 0 ? `Over max by ${cmStatus.overflow}` : 'OK',
        },
        bonus: {
            count: totalOverflow,
            valid: bonusValid,
            message: bonusValid ? 'OK' : `Max ${rules.BONUS} ECTS overflow allowed`,
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
