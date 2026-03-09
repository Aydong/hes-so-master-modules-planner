import React, { useState, useEffect } from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { useCourseStore } from '../store/useCourseStore';
import type { SelectedCourse } from '../types';
import { cn } from '../utils/cn';
import { buildTravelWarningModules } from '../utils/travelWarning';
import { checkCollisions } from '../utils/validation';
import { extractTimeBlocks } from '../utils/timeBlockUtils';
import type { ValidationRules } from '../types';
import { getSemesterLabels } from '../utils/semesterUtils';
import type { StartingSemester } from '../utils/semesterUtils';
import { getBlockTime, formatMinutes, timeBlockDataReady } from '../utils/timeBlockData';

// Sort helpers
const DAY_ORDER: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4,
};
const TB_ORDER: Record<string, number> = {
    TB1: 0, TB2: 1, TB3: 2, TB4: 3,
};

const sortBySchedule = (a: SelectedCourse, b: SelectedCourse) => {
    const dayDiff = (DAY_ORDER[a.WeekDay] ?? 0) - (DAY_ORDER[b.WeekDay] ?? 0);
    // Extract the first block for sorting purposes
    const aFirstBlock = extractTimeBlocks(a.TimeBlock)[0] ?? '';
    const bFirstBlock = extractTimeBlocks(b.TimeBlock)[0] ?? '';
    return dayDiff !== 0 ? dayDiff : (TB_ORDER[aFirstBlock] ?? 0) - (TB_ORDER[bFirstBlock] ?? 0);
};

/** Returns a Set of collision module codes */
const buildCollisionModules = (courses: SelectedCourse[]): Set<string> => {
    const collisions = checkCollisions(courses);
    const collisionModules = new Set<string>();
    collisions.forEach(collision => {
        collisionModules.add(collision.course1.module);
        collisionModules.add(collision.course2.module);
    });
    return collisionModules;
};

const getCategoryStyle = (moduleCode: string) => {
    if (moduleCode.startsWith('TSM')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (moduleCode.startsWith('FTP')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (moduleCode.startsWith('MA')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (moduleCode.startsWith('CM')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (moduleCode.startsWith('PI')) return 'bg-red-100 text-red-800 border-red-200';
    if (moduleCode.startsWith('MAP')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (moduleCode.startsWith('CSI')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
};

function getRealTimeStr(course: SelectedCourse): string {
    const blocks    = extractTimeBlocks(course.TimeBlock);
    const blockNums = blocks.map(b => parseInt(b.replace('TB', ''))).filter(n => !isNaN(n));
    if (blockNums.length === 0) return '–';
    const first = getBlockTime(course.location, Math.min(...blockNums));
    const last  = getBlockTime(course.location, Math.max(...blockNums));
    if (!first || !last) return '–';
    return `${formatMinutes(first.startMin)}–${formatMinutes(last.endMin)}`;
}

export const CourseListView: React.FC<{ rules: ValidationRules; startingSemester: StartingSemester }> = ({ rules, startingSemester }) => {
    const { getSelectedCourses } = useCourseStore();
    const selectedCourses = getSelectedCourses();
    const SEMESTER_LABELS = getSemesterLabels(startingSemester);
    const [timeBlockReady, setTimeBlockReady] = useState(false);
    useEffect(() => { timeBlockDataReady.then(() => setTimeBlockReady(true)); }, []);

    const totalECTS = selectedCourses.reduce((sum, c) => sum + (c.credits || 3), 0);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                <div>
                    <h2 className="font-bold text-gray-800 text-base">All Selected Courses</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} – {totalECTS} ECTS total
                    </p>
                </div>

                {/* Legends */}
                <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                    <div className="flex gap-3">
                        {rules.TSM.max > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>TSM</div>}
                        {rules.FTP.max > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span>FTP</div>}
                        {rules.MA.max > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>MA</div>}
                        {rules.CM.max > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span>CM</div>}
                        {rules.PI.max > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span>PI</div>}
                        {rules.MAP.max > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>MAP</div>}
                        {rules.CSI.max > 0 && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span>ICS</div>}
                    </div>
                    <div className="h-4 w-px bg-gray-200"></div>
                    <div className="flex items-center gap-1.5 text-orange-500 font-bold">
                        <AlertTriangle size={12} />
                        Collision
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-8">
                {selectedCourses.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                        No courses selected yet. Use the sidebar to add courses.
                    </div>
                ) : (
                    (['1', '2', '3', '4'] as const).map((sem) => {
                        const semCourses = selectedCourses.filter((c) => c.assignedSemester === sem);
                        if (semCourses.length === 0) return null;

                        // Sort by day then time block
                        const sorted = [...semCourses].sort(sortBySchedule);

                        // Detect which courses have collisions
                        const collisionModules = buildCollisionModules(semCourses);
                        const isColliding = (c: SelectedCourse) =>
                            collisionModules.has(c.module);

                        const travelWarnings = buildTravelWarningModules(semCourses);

                        const semECTS = semCourses.reduce((sum, c) => sum + (c.credits || 3), 0);
                        const collisionCount = collisionModules.size;

                        return (
                            <div key={sem}>
                                {/* Semester header */}
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
                                        {SEMESTER_LABELS[sem]}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {collisionCount > 0 && (
                                            <span className="text-xs font-bold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <AlertTriangle size={10} />
                                                {collisionCount} collision{collisionCount > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        <span className="text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-0.5 rounded-full">
                                            {semCourses.length} course{semCourses.length !== 1 ? 's' : ''} · {semECTS} ECTS
                                        </span>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                                <th className="text-left px-4 py-2.5">Module</th>
                                                <th className="text-left px-4 py-2.5">Title</th>
                                                <th className="text-center px-3 py-2.5">Cat.</th>
                                                <th className="text-center px-3 py-2.5">ECTS</th>
                                                <th className="text-center px-3 py-2.5">Type</th>
                                                <th className="text-center px-3 py-2.5">Day</th>
                                                <th className="text-center px-3 py-2.5">Block</th>
                                                <th className="text-center px-3 py-2.5">Time</th>
                                                <th className="text-center px-3 py-2.5">Location</th>
                                                <th className="text-center px-3 py-2.5">Link</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sorted.map((course, i) => {
                                                const category = course.module.split('_')[0];
                                                const collision = isColliding(course);

                                                return (
                                                    <tr
                                                        key={`${course.module}-${course.TimeBlock}`}
                                                        className={cn(
                                                            'border-t border-gray-50 transition-colors hover:bg-blue-50/30',
                                                            i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                                                        )}
                                                    >
                                                        <td className="px-4 py-2.5 font-mono font-bold text-xs text-gray-700 whitespace-nowrap">
                                                            {course.module}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-medium text-gray-800 max-w-xs">
                                                            {course.title}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={cn(
                                                                'px-2 py-0.5 rounded text-xs font-bold border',
                                                                getCategoryStyle(course.module)
                                                            )}>
                                                                {category}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center font-bold text-gray-700">
                                                            {course.credits || 3}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={cn(
                                                                'px-2 py-0.5 rounded-full text-xs font-semibold',
                                                                course.type === 'C'
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : course.type === 'R'
                                                                        ? 'bg-green-100 text-green-700'
                                                                        : 'bg-gray-100 text-gray-500'
                                                            )}>
                                                                {course.type === 'C' ? 'Com.' : course.type === 'R' ? 'Rec.' : 'Opt.'}
                                                            </span>
                                                        </td>

                                                        {/* Day – orange + bold on collision */}
                                                        <td className={cn(
                                                            'px-3 py-2.5 text-center text-xs whitespace-nowrap',
                                                            collision
                                                                ? 'font-bold text-orange-500'
                                                                : 'text-gray-600'
                                                        )}>
                                                            {collision && (
                                                                <AlertTriangle size={10} className="inline mr-1 mb-0.5" />
                                                            )}
                                                            {course.WeekDay}
                                                        </td>

                                                        {/* Block */}
                                                        <td className={cn(
                                                            'px-3 py-2.5 text-center text-xs font-mono whitespace-nowrap',
                                                            collision ? 'font-bold text-orange-500' : 'text-gray-500'
                                                        )}>
                                                            {course.TimeBlock}
                                                        </td>

                                                        {/* Time – real start–end */}
                                                        <td className={cn(
                                                            'px-3 py-2.5 text-center text-xs whitespace-nowrap',
                                                            collision
                                                                ? 'font-bold text-orange-500'
                                                                : 'text-gray-500'
                                                        )}>
                                                            {timeBlockReady ? getRealTimeStr(course) : '–'}
                                                        </td>

                                                        <td className={cn(
                                                            'px-3 py-2.5 text-center text-xs',
                                                            travelWarnings.has(course.module)
                                                                ? 'font-bold text-orange-500'
                                                                : 'text-gray-500'
                                                        )}>
                                                            {travelWarnings.has(course.module) && (
                                                                <AlertTriangle size={10} className="inline mr-1 mb-0.5" />
                                                            )}
                                                            {course.location || '–'}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <a
                                                                href={course.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex text-blue-500 hover:text-blue-700 transition-colors"
                                                                title="Open in Moodle"
                                                            >
                                                                <ExternalLink size={14} />
                                                            </a>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
