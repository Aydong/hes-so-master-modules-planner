import React, { useMemo, useState, useEffect } from 'react';
import { X, ExternalLink, Plus, AlertTriangle } from 'lucide-react';
import { useCourseStore } from '../../store/useCourseStore';
import { cn } from '../../utils/cn';
import { slotToCourseSemester, getSemesterLabels } from '../../utils/semesterUtils';
import { formatCourseTime } from '../../utils/timeBlockUtils';
import { getCategoryBadge, getTypeBadge, CATEGORY_PREFIXES, getCategoryPrefix } from '../../utils/courseColors';
import { getOutOfSpecializationCourses } from '../../data/dataLoader';
import type { StartingSemester } from '../../utils/semesterUtils';
import type { Course } from '../../types';

interface Props {
    dayFull:          string;
    assignedSem:      '1' | '2' | '3' | '4';
    startingSemester: StartingSemester;
    onClose:          () => void;
}

export const MobileAddCourseSheet: React.FC<Props> = ({ dayFull, assignedSem, startingSemester, onClose }) => {
    const { addCourse, isCourseSelected, getAllCourses, currentProgramId, scopeFilter: storeScopeFilter, setScopeFilter, catalogFile } = useCourseStore();
    const allCourses     = getAllCourses();
    const courseSemester = slotToCourseSemester(assignedSem, startingSemester);
    const semLabel       = getSemesterLabels(startingSemester)[assignedSem];

    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const scopeFilter = storeScopeFilter;
    const [outOfSpecCourses, setOutOfSpecCourses] = useState<Course[]>([]);

    useEffect(() => {
        if (!currentProgramId) return;
        getOutOfSpecializationCourses(currentProgramId, catalogFile).then(setOutOfSpecCourses);
    }, [currentProgramId, catalogFile]);

    useEffect(() => {
        if (scopeFilter === 'own') setCategoryFilter(null);
    }, [scopeFilter]);

    const sourceCourses = useMemo(
        () => scopeFilter === 'extended' ? outOfSpecCourses : allCourses,
        [scopeFilter, allCourses, outOfSpecCourses]
    );

    const baseCourses = useMemo(() =>
        sourceCourses.filter(c =>
            !isCourseSelected(c.module) &&
            c.WeekDay  === dayFull &&
            c.Semester === courseSemester
        ),
    [sourceCourses, dayFull, courseSemester, isCourseSelected]);

    const availableCategories = useMemo(() => {
        const cats = new Set(baseCourses.map(c => getCategoryPrefix(c.module)));
        return [...CATEGORY_PREFIXES].filter(cat => cats.has(cat));
    }, [baseCourses]);

    const courses = useMemo(() =>
        categoryFilter ? baseCourses.filter(c => c.module.startsWith(categoryFilter)) : baseCourses,
    [baseCourses, categoryFilter]);

    const handleAdd = (course: Course) => {
        addCourse(course, assignedSem);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl flex flex-col w-full" style={{ maxWidth: '480px', maxHeight: '75dvh' }}>

                {/* Header */}
                <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Add a course</h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {dayFull} · {semLabel}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors -mr-1 -mt-1"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 mx-5 shrink-0" />

                {/* Scope toggle */}
                <div className="px-5 pt-3 shrink-0">
                    <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                        <button
                            className={cn('flex-1 py-1 text-xs font-bold rounded transition-colors',
                                scopeFilter === 'own' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white')}
                            onClick={() => setScopeFilter('own')}
                        >
                            {currentProgramId ?? 'My spec'}
                        </button>
                        <button
                            className={cn('flex-1 py-1 text-xs font-bold rounded transition-colors',
                                scopeFilter === 'extended' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:bg-white')}
                            onClick={() => setScopeFilter('extended')}
                        >
                            Other
                        </button>
                    </div>
                    {scopeFilter === 'extended' && (
                        <p className="text-[10px] text-orange-500 mt-1 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            Courses outside your specialization count as Optional (no recommended credits)
                        </p>
                    )}
                </div>

                {/* Category filter */}
                {availableCategories.length > 1 && (
                    <div className="px-5 pt-3 pb-1 shrink-0 flex flex-wrap gap-1.5">
                        {availableCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                                className={cn(
                                    'px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors',
                                    categoryFilter === cat
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Course list */}
                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-2">
                    {courses.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">
                            No courses available for {dayFull}
                        </div>
                    ) : courses.map(course => {
                        const isOutOfSpec = course.isOutOfSpecialization === true;
                        return (
                            <div
                                key={course.module}
                                className={cn(
                                    'bg-white border rounded-xl px-3 py-2.5 shadow-sm hover:shadow-md transition-shadow',
                                    isOutOfSpec ? 'border-orange-200' : 'border-gray-200'
                                )}
                            >
                                {/* Top row: info + add button */}
                                <div className="flex items-center gap-2">
                                    {/* Info (left) */}
                                    <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md whitespace-nowrap', getCategoryBadge(course.module))}>
                                            {course.module}
                                        </span>
                                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap', getTypeBadge(course.type))}>
                                            {course.type === 'R' ? 'Rec' : course.type === 'C' ? 'Com' : 'Opt'}
                                        </span>
                                        {isOutOfSpec && (
                                            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-bold bg-orange-100 text-orange-600 border border-orange-200 whitespace-nowrap">
                                                <AlertTriangle size={9} />
                                                Out of spec
                                            </span>
                                        )}
                                        <span className="text-[11px] text-gray-400 whitespace-nowrap">
                                            {course.credits ?? 3} ECTS
                                        </span>
                                    </div>

                                    {/* Link and Add button (right) */}
                                    <a
                                        href={course.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-500 hover:text-blue-500 transition-colors"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <ExternalLink size={12} />
                                    </a>

                                    <button
                                        onClick={() => handleAdd(course)}
                                        className="shrink-0 flex items-center gap-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Plus size={12} />
                                        Add
                                    </button>
                                </div>

                                {course.location && (
                                    <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                        {course.location} | {formatCourseTime(course)}
                                    </span>
                                )}

                                {/* Course title */}
                                <p className="text-xs text-gray-800 mt-1.5 leading-snug line-clamp-2">
                                    {course.title}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
