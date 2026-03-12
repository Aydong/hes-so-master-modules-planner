import React, { useState } from 'react';
import { ExternalLink, Trash2, AlertTriangle, Plus } from 'lucide-react';
import { useCourseStore } from '../../store/useCourseStore';
import { cn } from '../../utils/cn';
import { getSemesterLabels } from '../../utils/semesterUtils';
import { checkCollisions } from '../../utils/validation';
import { extractTimeBlocks } from '../../utils/timeBlockUtils';
import type { StartingSemester } from '../../utils/semesterUtils';
import type { SelectedCourse } from '../../types';
import type { Course } from '../../types';
import { getBlockTime, formatMinutes } from '../../utils/timeBlockData';


const WEEK_DAYS      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
const WEEK_DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SEMESTERS      = ['1', '2', '3', '4'] as const;

// Approximate positions
const DAY_START = 480; 
const DAY_SPAN  = 600;

const TB_APPROX: Record<number, { start: number; end: number }> = {
    1: { start: 510, end: 600  }, 
    2: { start: 615, end: 720  }, 
    3: { start: 780, end: 900  }, 
    4: { start: 915, end: 1020 }, 
};

function tbToPercents(blockNums: number[]): { top: number; height: number } | null {
    if (blockNums.length === 0) return null;
    const first = TB_APPROX[Math.min(...blockNums)];
    const last  = TB_APPROX[Math.max(...blockNums)];
    if (!first || !last) return null;
    return {
        top:    ((first.start - DAY_START) / DAY_SPAN) * 100,
        height: ((last.end   - first.start) / DAY_SPAN) * 100,
    };
}

const getCategoryBg = (module: string): string => {
    if (module.startsWith('TSM')) return 'bg-blue-500';
    if (module.startsWith('FTP')) return 'bg-purple-500';
    if (module.startsWith('MA'))  return 'bg-emerald-500';
    if (module.startsWith('CM'))  return 'bg-amber-500';
    if (module.startsWith('PI'))  return 'bg-gray-500';
    if (module.startsWith('MAP')) return 'bg-indigo-500';
    if (module.startsWith('CSI')) return 'bg-purple-500';
    return 'bg-gray-400';
};

const getCategoryStyle = (module: string): string => {
    if (module.startsWith('TSM')) return 'bg-blue-100 text-blue-700';
    if (module.startsWith('FTP')) return 'bg-purple-100 text-purple-700';
    if (module.startsWith('MA'))  return 'bg-emerald-100 text-emerald-700';
    if (module.startsWith('CM'))  return 'bg-amber-100 text-amber-700';
    if (module.startsWith('PI'))  return 'bg-gray-100 text-gray-700';
    if (module.startsWith('MAP')) return 'bg-indigo-100 text-indigo-700';
    if (module.startsWith('CSI')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
};

const CourseBar: React.FC<{ course: SelectedCourse }> = ({ course }) => {
    const blocks    = extractTimeBlocks(course.TimeBlock);
    const blockNums = blocks.map(b => parseInt(b.replace('TB', ''))).filter(n => !isNaN(n));
    const pos       = tbToPercents(blockNums);
    if (!pos) return null;

    return (
        <div
            className={cn('absolute left-0.5 right-0.5 rounded-sm', getCategoryBg(course.module))}
            style={{ top: `${pos.top}%`, height: `${Math.max(pos.height, 8)}%`, minHeight: '4px' }}
        />
    );
};

function formatCourseTime(course: Course): string {
    const blocks = extractTimeBlocks(course.TimeBlock);
    const blockNums = blocks.map(b => parseInt(b.replace('TB', ''))).filter(n => !isNaN(n));
    if (blockNums.length === 0) return course.TimeBlock;
    const first = getBlockTime(course.location, Math.min(...blockNums));
    const last  = getBlockTime(course.location, Math.max(...blockNums));
    if (!first || !last) return course.TimeBlock;
    return `${formatMinutes(first.startMin)} - ${formatMinutes(last.endMin)}`;
}

type Sem = '1' | '2' | '3' | '4';

interface Props {
    startingSemester: StartingSemester;
    onAddCourse?: (dayFull: string, assignedSem: Sem) => void;
}

export const MobileCalendarView: React.FC<Props> = ({ startingSemester, onAddCourse }) => {
    const { getSelectedCourses, removeCourse } = useCourseStore();
    const selectedCourses = getSelectedCourses();
    const SEMESTER_LABELS = getSemesterLabels(startingSemester);

    const [selected, setSelected] = useState<{ sem: Sem; day: string } | null>(null);

    const collisions   = checkCollisions(selectedCourses);
    const collisionSet = new Set<string>();
    collisions.forEach(c => { collisionSet.add(c.course1.module); collisionSet.add(c.course2.module); });

    const getCoursesFor = (sem: string, dayShort: string): SelectedCourse[] => {
        const dayFull = WEEK_DAYS_FULL[WEEK_DAYS.indexOf(dayShort as typeof WEEK_DAYS[number])];
        return selectedCourses
            .filter(c => c.assignedSemester === sem && c.WeekDay === dayFull)
            .sort((a, b) => {
                const aBlocks = extractTimeBlocks(a.TimeBlock).map(t => parseInt(t.replace('TB', ''))).filter(n => !isNaN(n));
                const bBlocks = extractTimeBlocks(b.TimeBlock).map(t => parseInt(t.replace('TB', ''))).filter(n => !isNaN(n));
                const aMin = aBlocks.length ? Math.min(...aBlocks) : 99;
                const bMin = bBlocks.length ? Math.min(...bBlocks) : 99;
                return (TB_APPROX[aMin]?.start ?? 9999) - (TB_APPROX[bMin]?.start ?? 9999);
            });
    };

    const semShortLabel = (sem: string) => {
        const parts  = SEMESTER_LABELS[sem].split(' - ');
        const season = parts[1]?.split(' ')[0]?.slice(0, 3) ?? '';
        return { num: `S${sem}`, season };
    };

    const detailCourses = selected ? getCoursesFor(selected.sem, selected.day) : [];

    const handleAddClick = () => {
        if (!selected || !onAddCourse) return;
        const dayFull = WEEK_DAYS_FULL[WEEK_DAYS.indexOf(selected.day as typeof WEEK_DAYS[number])];
        onAddCourse(dayFull, selected.sem);
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">

            {/*  Top: semester X day grid  */}
            <div className="bg-white border-b border-gray-200 px-3 pt-3 pb-2 shrink-0">

                {/* Day header row */}
                <div className="flex">
                    <div className="w-10 shrink-0" />
                    {WEEK_DAYS.map(day => (
                        <div key={day} className="flex-1 text-center text-[11px] font-bold text-gray-500 uppercase pb-1.5">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Semester rows */}
                {SEMESTERS.map(sem => {
                    const { num, season } = semShortLabel(sem);
                    return (
                        <div key={sem} className="flex mb-1.5">
                            <div className="w-10 shrink-0 flex flex-col items-center justify-center pr-1">
                                <span className="text-[10px] font-bold text-gray-700 leading-none">{num}</span>
                                <span className="text-[9px] text-gray-400 mt-0.5 leading-none">{season}</span>
                            </div>

                            {WEEK_DAYS.map(day => {
                                const courses      = getCoursesFor(sem, day);
                                const isSelected   = selected?.sem === sem && selected?.day === day;
                                const hasCollision = courses.some(c => collisionSet.has(c.module));

                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelected(isSelected ? null : { sem, day })}
                                        className={cn(
                                            'flex-1 mx-0.5 rounded-lg relative overflow-hidden transition-all border',
                                            courses.length === 0 ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200',
                                            isSelected   && 'border-blue-400 ring-2 ring-blue-200 bg-blue-50/30',
                                            hasCollision && !isSelected && 'border-orange-300',
                                        )}
                                        style={{ height: '60px' }}
                                        aria-label={`S${sem} ${day}`}
                                    >
                                        {courses.map(course => (
                                            <CourseBar key={course.module} course={course} />
                                        ))}
                                        {courses.length === 0 && (
                                            <span className="absolute inset-0 flex items-center justify-center">
                                                <span className="w-1 h-1 rounded-full bg-gray-200" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/*  Bottom: day detail panel  */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {!selected && (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm text-center px-6">
                        Tap a cell to see course details
                    </div>
                )}

                {selected && (
                    <div className="px-4 py-3 space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            {WEEK_DAYS_FULL[WEEK_DAYS.indexOf(selected.day as typeof WEEK_DAYS[number])]} · {SEMESTER_LABELS[selected.sem]}
                        </p>

                        {detailCourses.length === 0 && (
                            <p className="text-sm text-gray-400 py-2">No courses placed on this day yet.</p>
                        )}

                        {detailCourses.map(course => {
                            const hasCollision = collisionSet.has(course.module);
                            const category     = course.module.split('_')[0];

                            return (
                                <div
                                    key={course.module}
                                    className={cn(
                                        'bg-white rounded-xl border p-3 shadow-sm flex gap-3',
                                        hasCollision ? 'border-orange-300 bg-orange-50/30' : 'border-gray-200'
                                    )}
                                >
                                    <div className={cn('w-1 rounded-full shrink-0', getCategoryBg(course.module))} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={cn('text-xs font-bold px-2 py-0.5 rounded', getCategoryStyle(course.module))}>
                                                    {category}
                                                </span>
                                                {hasCollision && <AlertTriangle size={12} className="text-orange-500" />}
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

                                        <p className="text-sm text-gray-700 font-medium mt-1.5 leading-snug">
                                            {course.title}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {course.TimeBlock}
                                            {formatCourseTime(course) ? ` | ${formatCourseTime(course)}` : ''}
                                            {course.location ? ` | ${course.location}` : ''}
                                            {` | ${course.credits || 3} ECTS`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add button */}
                        <button
                            onClick={handleAddClick}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                        >
                            <Plus size={16} />
                            Add a course
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
