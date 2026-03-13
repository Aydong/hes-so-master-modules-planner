import React from 'react';
import { ExternalLink, Trash2, AlertTriangle } from 'lucide-react';
import { useCourseStore } from '../../store/useCourseStore';
import { cn } from '../../utils/cn';
import { buildCollisionModules } from '../../utils/validation';
import { getCategoryBadge } from '../../utils/courseColors';
import { formatCourseTime } from '../../utils/timeBlockUtils';
import { getSemesterLabels } from '../../utils/semesterUtils';
import type { StartingSemester } from '../../utils/semesterUtils';


interface MobilePlanViewProps {
    startingSemester: StartingSemester;
}

export const MobilePlanView: React.FC<MobilePlanViewProps> = ({ startingSemester }) => {
    const { getSelectedCourses, removeCourse } = useCourseStore();
    const selectedCourses = getSelectedCourses();
    const SEMESTER_LABELS = getSemesterLabels(startingSemester);

    if (selectedCourses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm gap-2 text-center">
                <p>No courses selected yet.</p>
                <p className="text-xs">Use the "Add" tab to browse and add courses.</p>
            </div>
        );
    }

    const totalECTS = selectedCourses.reduce((sum, c) => sum + (c.credits || 3), 0);

    return (
        <div className="space-y-6 pb-2">
            <p className="text-xs text-gray-500 font-medium">
                {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} | {totalECTS} ECTS total
            </p>

            {(['1', '2', '3', '4'] as const).map((sem) => {
                const semCourses = selectedCourses.filter(c => c.assignedSemester === sem);
                if (semCourses.length === 0) return null;

                const collisionSet = buildCollisionModules(semCourses);
                const semECTS = semCourses.reduce((sum, c) => sum + (c.credits || 3), 0);
                const collisionCount = collisionSet.size;

                return (
                    <div key={sem}>
                        {/* Semester header */}
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {SEMESTER_LABELS[sem]}
                            </h3>
                            <div className="flex items-center gap-1.5">
                                {collisionCount > 0 && (
                                    <span className="text-xs font-bold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <AlertTriangle size={10} />
                                        {collisionCount}
                                    </span>
                                )}
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    {semECTS} ECTS
                                </span>
                            </div>
                        </div>

                        {/* Course cards */}
                        <div className="space-y-2">
                            {semCourses.map(course => {
                                const hasCollision = collisionSet.has(course.module);
                                const category = course.module.split('_')[0];

                                return (
                                    <div
                                        key={course.module}
                                        className={cn(
                                            'bg-white rounded-xl border p-3 shadow-sm',
                                            hasCollision ? 'border-orange-300 bg-orange-50/30' : 'border-gray-200'
                                        )}
                                    >
                                        {/* Top row: badges + actions */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={cn('text-xs font-bold px-2 py-0.5 rounded', getCategoryBadge(course.module))}>
                                                    {category}
                                                </span>
                                                <span className="text-xs font-mono font-bold text-gray-700">
                                                    {course.module}
                                                </span>
                                                <span className={cn(
                                                    'text-[10px] px-1.5 py-0.5 rounded font-bold',
                                                    course.type === 'R' ? 'bg-emerald-100 text-emerald-700' :
                                                    course.type === 'C' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-600'
                                                )}>
                                                    {course.type === 'R' ? 'Rec' : course.type === 'C' ? 'Com' : 'Opt'}
                                                </span>
                                                {hasCollision && (
                                                    <AlertTriangle size={12} className="text-orange-500" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                <a
                                                    href={course.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                                <button
                                                    onClick={() => removeCourse(course.module)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                    aria-label="Remove course"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <p className="text-sm text-gray-700 font-medium mt-1.5 leading-snug">
                                            {course.title}
                                        </p>

                                        {/* Schedule info */}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {course.WeekDay} | {course.TimeBlock}
                                            {formatCourseTime(course) ? ` | ${formatCourseTime(course)}` : ''}
                                            {course.location ? ` | ${course.location}` : ''}
                                            {` | ${course.credits || 3} ECTS`}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
