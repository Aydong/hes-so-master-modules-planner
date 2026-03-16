/**
 * Client-side schedule generator page
 *
 * Usage:
 *   /generate?program=DS-DS
 *   &courses=TSM_AdvNLP,MA_BDA   — preferred courses (included first)
 *   &avoid=TSM_X,MA_Y            — courses to skip during pool fill if possible
 *   &semester=SP                 — SA | SP
 *   &years=1                     — 1 = 2 semesters only | 2 = up to 4 semesters
 *   &redirect=1                  — 1 = redirect to plan | 0 = return JSON
 */

import { useEffect, useState } from 'react';
import { initializePrograms, getAllPrograms } from '../data/programs';
import { getCoursesBySpecialization } from '../data/dataLoader';
import { validateConstraints } from '../utils/validation';
import { encodeSharePayload } from '../utils/urlShare';
import type { SelectedCourse, ValidationRules } from '../types';
import type { StartingSemester } from '../utils/semesterUtils';
import { courseToAssignedSemester } from '../utils/semesterUtils';

// ---- Collision helpers ----

function extractTimeBlocks(tb: string) {
    return tb.match(/TB[1-4]/g) ?? [];
}
function timeBlocksOverlap(b1: string, b2: string) {
    const set = new Set(extractTimeBlocks(b1));
    return extractTimeBlocks(b2).some(b => set.has(b));
}
function hasCollision(candidate: SelectedCourse, selected: SelectedCourse[]) {
    return selected.some(
        c =>
            c.assignedSemester === candidate.assignedSemester &&
            c.WeekDay === candidate.WeekDay &&
            timeBlocksOverlap(c.TimeBlock, candidate.TimeBlock),
    );
}

function tryAssign(
    course: SelectedCourse,
    startingSemester: StartingSemester,
    selected: SelectedCourse[],
    maxYears: 1 | 2 = 2,
): SelectedCourse | null {
    const years: Array<1 | 2> = maxYears === 1 ? [1] : [1, 2];
    for (const year of years) {
        const assignedSemester = courseToAssignedSemester(course.Semester, year, startingSemester);
        const candidate = { ...course, assignedSemester };
        if (!hasCollision(candidate, selected)) return candidate;
    }
    return null;
}

// ---- Credit stats helpers ----

const CATS = ['TSM', 'FTP', 'MA', 'CM', 'PI', 'MAP', 'CSI'] as const;

function computeStats(courses: SelectedCourse[]) {
    const stats: Record<string, { count: number; rec: number }> = Object.fromEntries(
        CATS.map(c => [c, { count: 0, rec: 0 }])
    );
    for (const c of courses) {
        const prefix = c.module.split('_')[0];
        const credits = c.credits ?? 3;
        if (stats[prefix]) {
            stats[prefix].count += credits;
            if (c.type === 'R' || c.type === 'C') stats[prefix].rec += credits;
        }
    }
    return stats;
}

function computeTotalOverflow(courses: SelectedCourse[], rules: ValidationRules) {
    const s = computeStats(courses);
    return CATS.reduce((sum, cat) => {
        if (rules[cat].max === 0) return sum;
        return sum + Math.max(0, s[cat].count - rules[cat].max);
    }, 0);
}

function categoryNeedsMore(prefix: string, courses: SelectedCourse[], rules: ValidationRules) {
    const rule = rules[prefix as keyof ValidationRules];
    if (!rule || typeof rule !== 'object' || (rule as { max: number }).max === 0) return false;
    const r = rule as { max: number; minRec: number };
    const s = computeStats(courses)[prefix] ?? { count: 0, rec: 0 };
    return s.count < r.max || s.rec < r.minRec;
}

// ---- Types ----

interface GenerateResult {
    url: string;
    valid: boolean;
    warnings: string[];
    program: string;
    programName: string;
    startingSemester: string;
    stats: {
        totalCourses: number;
        totalEcts: number;
        preferencesSatisfied: string[];
        preferencesSkipped: string[];
        avoided: string[];
    };
}

export function GeneratePage() {
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const programParam   = params.get('program');
        const coursesParam   = params.get('courses') ?? '';
        const avoidParam     = params.get('avoid') ?? '';
        const semesterParam  = params.get('semester') ?? 'SA';
        const maxYears       = params.get('years') === '1' ? 1 : 2 as 1 | 2;
        const shouldRedirect = params.get('redirect') !== '0';

        if (!programParam) {
            setError('Missing required query parameter: program');
            return;
        }

        const run = async () => {
            await initializePrograms();
            const programs = await getAllPrograms();
            const program = programs.find(
                p => p.id === programParam || p.id.toLowerCase() === programParam.toLowerCase()
            );

            if (!program) {
                setError(`Program "${programParam}" not found. Available: ${programs.map(p => p.id).join(', ')}`);
                return;
            }

            const courses = await getCoursesBySpecialization(program.masterCode, program.specializationCode);
            const preferences = coursesParam.split(',').map(s => s.trim()).filter(Boolean);
            const avoidSet    = new Set(avoidParam.split(',').map(s => s.trim()).filter(Boolean));
            const prefSet     = new Set(preferences);
            const startingSemester: StartingSemester = semesterParam === 'SP' ? 'SP' : 'SA';
            const rules = program.validationRules;
            const warnings: string[] = [];
            const selected: SelectedCourse[] = [];
            const actuallyAvoided: string[] = [];

            const mandatory = courses.filter(c => c.type === 'C');
            const preferred = preferences
                .map(mod => courses.find(c => c.module === mod))
                .filter((c): c is NonNullable<typeof c> => c !== undefined && c.type !== 'C');

            // Pool split: non-avoided courses first, avoided ones as last resort.
            // poolAvoided is ordered so that courses at the END of the avoid list are tried
            // first (least important to avoid), and courses at the START are tried last
            // (most important to avoid = hardest to include as fallback).
            const avoidList = avoidParam.split(',').map(s => s.trim()).filter(Boolean);
            const avoidPriority = new Map(avoidList.map((mod, i) => [mod, i]));
            const poolBase = courses.filter(c => c.type !== 'C' && !prefSet.has(c.module));
            const poolNormal  = poolBase
                .filter(c => !avoidSet.has(c.module))
                .sort((a, b) => (a.type === 'R' ? -1 : b.type === 'R' ? 1 : 0));
            const poolAvoided = poolBase
                .filter(c => avoidSet.has(c.module))
                .sort((a, b) => {
                    // Higher index in avoid list = less important to avoid = try first
                    const iPriority = (avoidPriority.get(b.module) ?? 0) - (avoidPriority.get(a.module) ?? 0);
                    if (iPriority !== 0) return iPriority;
                    return a.type === 'R' ? -1 : b.type === 'R' ? 1 : 0;
                });

            for (const mod of preferences) {
                if (!courses.some(c => c.module === mod))
                    warnings.push(`Preferred "${mod}" not found in specialization ${program.id} — skipped.`);
            }
            for (const mod of avoidList) {
                if (!courses.some(c => c.module === mod))
                    warnings.push(`Avoid "${mod}" not found in specialization ${program.id} — ignored.`);
            }

            // 1. Mandatory (always included)
            for (const c of mandatory) {
                const base: SelectedCourse = { ...c, assignedSemester: '1' };
                const assigned = tryAssign(base, startingSemester, selected, maxYears);
                if (assigned) {
                    selected.push(assigned);
                } else {
                    const slot = courseToAssignedSemester(c.Semester, 1, startingSemester);
                    selected.push({ ...c, assignedSemester: slot });
                    warnings.push(`Compulsory "${c.module}" has a collision — placed anyway.`);
                }
            }

            // 2. Preferred courses — processed in the exact order given by the caller.
            //    A course is skipped only if:
            //      a) its category has no credit budget left (totalOverflow would exceed BONUS), OR
            //      b) it collides in all available year slots
            const prefSatisfied: string[] = [];
            const prefSkipped: string[] = [];
            for (const c of preferred) {
                const prefix = c.module.split('_')[0];
                const credits = c.credits ?? 3;
                const catRule = rules[prefix as keyof ValidationRules] as { max: number } | undefined;

                if (catRule && catRule.max > 0) {
                    const catCount = computeStats(selected)[prefix]?.count ?? 0;
                    const wouldOverflow = Math.max(0, catCount + credits - catRule.max);
                    if (computeTotalOverflow(selected, rules) + wouldOverflow > rules.BONUS) {
                        warnings.push(`Preferred "${c.module}" skipped — ${prefix} credit limit reached.`);
                        prefSkipped.push(c.module);
                        continue;
                    }
                }

                const base: SelectedCourse = { ...c, assignedSemester: '1' };
                const assigned = tryAssign(base, startingSemester, selected, maxYears);
                if (assigned) {
                    selected.push(assigned);
                    prefSatisfied.push(c.module);
                } else {
                    warnings.push(`Preferred "${c.module}" collides — skipped.`);
                    prefSkipped.push(c.module);
                }
            }

            // 3. Fill helper — shared logic for normal and avoided pools
            const tryFill = (pool: typeof poolNormal) => {
                for (const c of pool) {
                    if (validateConstraints(selected, rules).isValid) break;

                    const prefix = c.module.split('_')[0];
                    if (!categoryNeedsMore(prefix, selected, rules)) continue;

                    const credits = c.credits ?? 3;
                    const catRule = rules[prefix as keyof ValidationRules] as { max: number } | undefined;
                    const catCount = computeStats(selected)[prefix]?.count ?? 0;
                    const currentOverflow = computeTotalOverflow(selected, rules);
                    const wouldOverflow = catRule ? Math.max(0, catCount + credits - catRule.max) : 0;
                    if (currentOverflow + wouldOverflow > rules.BONUS) continue;

                    const base: SelectedCourse = { ...c, assignedSemester: '1' };
                    const assigned = tryAssign(base, startingSemester, selected, maxYears);
                    if (assigned) {
                        selected.push(assigned);
                        if (avoidSet.has(c.module)) actuallyAvoided.push(c.module);
                    }
                }
            };

            // Fill with normal pool first, then fall back to avoided courses only if still needed
            tryFill(poolNormal);
            tryFill(poolAvoided);

            if (actuallyAvoided.length > 0)
                warnings.push(`Could not avoid: ${actuallyAvoided.join(', ')} (needed to complete the plan).`);

            const validation = validateConstraints(selected, rules);
            if (!validation.isValid) {
                if (!validation.tsm.valid)   warnings.push(validation.tsm.message   ?? 'TSM invalid');
                if (!validation.ftp.valid)   warnings.push(validation.ftp.message   ?? 'FTP invalid');
                if (!validation.ma.valid)    warnings.push(validation.ma.message    ?? 'MA invalid');
                if (!validation.cm.valid)    warnings.push(validation.cm.message    ?? 'CM invalid');
                if (!validation.pi.valid)    warnings.push(validation.pi.message    ?? 'PI invalid');
                if (!validation.map.valid)   warnings.push(validation.map.message   ?? 'MAP invalid');
                if (!validation.csi.valid)   warnings.push(validation.csi.message   ?? 'CSI invalid');
                if (!validation.bonus.valid) warnings.push(validation.bonus.message ?? 'Bonus overflow');
            }

            const encoded = encodeSharePayload(program.id, startingSemester, selected);
            const base = window.location.origin + window.location.pathname.replace(/\/generate\/?$/, '/');
            const planUrl = `${base}#plan=${encoded}`;

            const res: GenerateResult = {
                url: planUrl,
                valid: validation.isValid,
                warnings,
                program: program.id,
                programName: program.name,
                startingSemester,
                stats: {
                    totalCourses: selected.length,
                    totalEcts: validation.totalEcts,
                    preferencesSatisfied: prefSatisfied,
                    preferencesSkipped: prefSkipped,
                    avoided: actuallyAvoided,
                },
            };

            if (shouldRedirect) {
                window.location.href = planUrl;
                return;
            }

            setResult(res);
        };

        run().catch(e => setError(String(e)));
    }, []);

    if (error) {
        return (
            <pre style={{ padding: '2rem', color: 'red' }}>
                {JSON.stringify({ error }, null, 2)}
            </pre>
        );
    }

    if (!result) {
        return (
            <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
                Generating schedule…
            </div>
        );
    }

    return (
        <pre style={{ padding: '2rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
        </pre>
    );
}
