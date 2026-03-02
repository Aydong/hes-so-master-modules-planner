import React from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { useCourseStore } from '../store/useCourseStore';
import type { SelectedCourse } from '../types';
import { cn } from '../utils/cn';

const SEMESTER_LABELS: Record<string, string> = {
    '1': 'Semester 1 – Autumn Year 1',
    '2': 'Semester 2 – Spring Year 1',
    '3': 'Semester 3 – Autumn Year 2',
    '4': 'Semester 4 – Spring Year 2',
};

const TIME_BLOCK_LABELS: Record<string, string> = {
    TB1: '08:55–11:10',
    TB2: '11:15–13:40',
    TB3: '15:00–17:25',
    TB4: '17:30–19:55',
};

// Sort helpers
const DAY_ORDER: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4,
};
const TB_ORDER: Record<string, number> = {
    TB1: 0, TB2: 1, TB3: 2, TB4: 3,
};

const sortBySchedule = (a: SelectedCourse, b: SelectedCourse) => {
    const dayDiff = (DAY_ORDER[a.WeekDay] ?? 0) - (DAY_ORDER[b.WeekDay] ?? 0);
    return dayDiff !== 0 ? dayDiff : (TB_ORDER[a.TimeBlock] ?? 0) - (TB_ORDER[b.TimeBlock] ?? 0);
};

/** Returns a Set of "WeekDay-TimeBlock" keys that have at least 2 courses in the same slot */
const buildCollisionKeys = (courses: SelectedCourse[]): Set<string> => {
    const keys = new Set<string>();
    for (let i = 0; i < courses.length; i++) {
        for (let j = i + 1; j < courses.length; j++) {
            if (courses[i].WeekDay === courses[j].WeekDay && courses[i].TimeBlock === courses[j].TimeBlock) {
                keys.add(`${courses[i].WeekDay}-${courses[i].TimeBlock}`);
            }
        }
    }
    return keys;
};

const getCategoryStyle = (moduleCode: string) => {
    if (moduleCode.startsWith('TSM')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (moduleCode.startsWith('FTP')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (moduleCode.startsWith('MA')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (moduleCode.startsWith('CM')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
};

export const CourseListView: React.FC = () => {
    const { getSelectedCourses } = useCourseStore();
    const selectedCourses = getSelectedCourses();

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
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>TSM</div>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span>FTP</div>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>MA</div>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span>CM</div>
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

                        // Detect which slots have collisions
                        const collisionKeys = buildCollisionKeys(semCourses);
                        const isColliding = (c: SelectedCourse) =>
                            collisionKeys.has(`${c.WeekDay}-${c.TimeBlock}`);

                        const semECTS = semCourses.reduce((sum, c) => sum + (c.credits || 3), 0);
                        const collisionCount = collisionKeys.size;

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
                                                        key={course.module}
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
                                                                course.type === 'R'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-gray-100 text-gray-500'
                                                            )}>
                                                                {course.type === 'R' ? 'Rec.' : 'Opt.'}
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

                                                        {/* Time – orange + bold on collision */}
                                                        <td className={cn(
                                                            'px-3 py-2.5 text-center text-xs whitespace-nowrap',
                                                            collision
                                                                ? 'font-bold text-orange-500'
                                                                : 'text-gray-500'
                                                        )}>
                                                            {TIME_BLOCK_LABELS[course.TimeBlock] || course.TimeBlock}
                                                        </td>

                                                        <td className="px-3 py-2.5 text-center text-gray-500 text-xs">
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
