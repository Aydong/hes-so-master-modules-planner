import React, { useState } from 'react';
import { useCourseStore } from '../store/useCourseStore';
import { cn } from '../utils/cn';
import { X, ExternalLink, AlertTriangle, Plus } from 'lucide-react';
import type { Course } from '../types';
import { buildTravelWarningModules } from '../utils/travelWarning';

const TIME_BLOCKS = [
    { id: 'TB1', label: 'Block 1', time: '08:55 - 11:10' },
    { id: 'TB2', label: 'Block 2', time: '11:15 - 13:40' },
    { id: 'TB3', label: 'Block 3', time: '15:00 - 17:25' },
    { id: 'TB4', label: 'Block 4', time: '17:30 - 19:55' },
];

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const getCategoryColor = (moduleCode: string) => {
    if (moduleCode.startsWith('TSM')) return 'bg-blue-100 border-blue-200 text-blue-800';
    if (moduleCode.startsWith('FTP')) return 'bg-purple-100 border-purple-200 text-purple-800';
    if (moduleCode.startsWith('MA')) return 'bg-emerald-100 border-emerald-200 text-emerald-800';
    if (moduleCode.startsWith('CM')) return 'bg-amber-100 border-amber-200 text-amber-800';
    return 'bg-gray-100 border-gray-200 text-gray-800';
};

const getCategoryBadge = (moduleCode: string) => {
    if (moduleCode.startsWith('TSM')) return 'bg-blue-100 text-blue-700';
    if (moduleCode.startsWith('FTP')) return 'bg-purple-100 text-purple-700';
    if (moduleCode.startsWith('MA')) return 'bg-emerald-100 text-emerald-700';
    if (moduleCode.startsWith('CM')) return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-700';
};

interface SlotPickerProps {
    day: string;
    block: { id: string; label: string; time: string };
    semester: '1' | '2' | '3' | '4';
    courses: Course[];
    onAdd: (course: Course) => void;
    onClose: () => void;
}

const SlotPicker: React.FC<SlotPickerProps> = ({ day, block, semester, courses, onAdd, onClose }) => (
    <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        onClick={onClose}
    >
        <div
            className="bg-white rounded-2xl shadow-xl w-[500px] max-h-[65vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                <div>
                    <h3 className="font-bold text-gray-800">Add a course</h3>
                    <p className="text-sm text-gray-400">{day} · {block.label} ({block.time}) — Semester {semester}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Course list */}
            <div className="overflow-y-auto p-4 space-y-2">
                {courses.length === 0 ? (
                    <p className="text-center text-gray-400 py-10 text-sm">No available courses for this slot</p>
                ) : (
                    courses.map((course) => (
                        <div
                            key={course.module}
                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded', getCategoryBadge(course.module))}>
                                        {course.module}
                                    </span>
                                    <span className={cn(
                                        'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                        course.type === 'R' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                    )}>
                                        {course.type === 'R' ? 'Rec' : 'Opt'}
                                    </span>
                                    <span className="text-xs text-gray-400">{course.credits ?? 3} ECTS</span>
                                    {course.location && (
                                        <span className="text-xs text-gray-400">{course.location}</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-700 truncate">{course.title}</p>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                                <a
                                    href={course.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open course details"
                                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink size={14} />
                                </a>
                                <button
                                    onClick={() => onAdd(course)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Plus size={12} />
                                    Add
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
);

export const ScheduleGrid: React.FC = () => {
    const { removeCourse, getSelectedCourses, getAllCourses, addCourse, isCourseSelected } = useCourseStore();
    const selectedCourses = getSelectedCourses();
    const allCourses = getAllCourses();
    const [semester, setSemester] = useState<'1' | '2' | '3' | '4'>('1');
    const [selectedSlot, setSelectedSlot] = useState<{ day: string; block: string } | null>(null);

    const semesterCourses = selectedCourses.filter((c) => c.assignedSemester === semester);
    const travelWarnings = buildTravelWarningModules(semesterCourses);

    const getCourseForSlot = (day: string, block: string) =>
        semesterCourses.filter(
            (c) => c.WeekDay === day && c.TimeBlock === block
        );

    // S1/S3 = Autumn courses, S2/S4 = Spring courses
    const semesterType = (semester === '1' || semester === '3') ? '1' : '2';

    const getAvailableForSlot = (day: string, block: string) =>
        allCourses.filter(
            (c) => c.WeekDay === day && c.TimeBlock === block && !isCourseSelected(c.module) && c.Semester === semesterType
        );

    const semesterECTS = selectedCourses
        .filter((c) => c.assignedSemester === semester)
        .reduce((sum, c) => sum + (c.credits ?? 3), 0);

    const activeBlock = selectedSlot ? TIME_BLOCKS.find((b) => b.id === selectedSlot.block) : null;
    const availableForSelected = selectedSlot
        ? getAvailableForSlot(selectedSlot.day, selectedSlot.block)
        : [];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-200 p-1 rounded-lg">
                        {(['1', '2', '3', '4'] as const).map((s) => (
                            <button
                                key={s}
                                className={cn(
                                    'px-4 py-1.5 rounded-md text-sm font-bold transition-all',
                                    semester === s ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                )}
                                onClick={() => setSemester(s)}
                            >
                                S{s}
                            </button>
                        ))}
                    </div>
                    <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Semester Credits:</span>
                        <span className="text-sm font-bold text-blue-600">{semesterECTS} ECTS</span>
                    </div>
                </div>

                <div className="flex gap-4 text-xs font-medium text-gray-500">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> TSM</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> FTP</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> MA</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> CM</div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-[100px_repeat(5,1fr)] gap-4 min-w-[800px]">
                    {/* Header Row */}
                    <div className="col-start-2 col-span-5 grid grid-cols-5 gap-4 mb-2">
                        {WEEK_DAYS.map((day) => (
                            <div key={day} className="text-center font-bold text-gray-600 uppercase tracking-wider text-sm bg-white py-2 rounded-lg border border-gray-100 shadow-sm">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Time Blocks */}
                    {TIME_BLOCKS.map((block) => (
                        <React.Fragment key={block.id}>
                            {/* Time Label */}
                            <div className="flex flex-col justify-center items-center text-center py-4 bg-white rounded-xl border border-gray-100 shadow-sm h-[140px]">
                                <span className="font-bold text-gray-700 text-sm">{block.label}</span>
                                <span className="text-xs text-gray-400 mt-1">{block.time.split(' - ')[0]}</span>
                                <div className="w-px h-4 bg-gray-200 my-1"></div>
                                <span className="text-xs text-gray-400">{block.time.split(' - ')[1]}</span>
                            </div>

                            {/* Day Cells */}
                            {WEEK_DAYS.map((day) => {
                                const coursesInSlot = getCourseForSlot(day, block.id);
                                const isCollision = coursesInSlot.length > 1;
                                const isEmpty = coursesInSlot.length === 0;
                                return (
                                    <div
                                        key={`${day}-${block.id}`}
                                        className={cn(
                                            'rounded-xl border border-dashed transition-all h-[140px] relative group p-2 overflow-y-auto',
                                            !isEmpty
                                                ? 'border-transparent bg-gray-50'
                                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                                        )}
                                        onClick={() => isEmpty && setSelectedSlot({ day, block: block.id })}
                                    >
                                        {/* Empty slot hint */}
                                        {isEmpty && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                <div className="bg-blue-100 text-blue-500 rounded-full p-2">
                                                    <Plus size={18} />
                                                </div>
                                            </div>
                                        )}

                                        {coursesInSlot.map((course) => (
                                            <div
                                                key={course.module}
                                                className={cn(
                                                    'w-full h-full rounded-lg p-3 border shadow-sm relative flex flex-col justify-between transition-transform hover:scale-[1.02]',
                                                    getCategoryColor(course.module),
                                                    isCollision ? 'h-[48%] mb-1 border-red-300 bg-red-50' : 'h-full'
                                                )}
                                            >
                                                {isCollision && (
                                                    <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full z-10 shadow-sm">
                                                        <AlertTriangle size={12} />
                                                    </div>
                                                )}

                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-xs">{course.module}</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeCourse(course.module); }}
                                                            className="text-current opacity-40 hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] font-medium leading-tight mt-1 line-clamp-3 opacity-80">
                                                        {course.title}
                                                    </p>
                                                </div>

                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-[10px] font-bold opacity-60">{course.type === 'R' ? 'Recommended' : 'Optional'}</span>
                                                    <a
                                                        href={course.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-current opacity-40 hover:opacity-100"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                                {course.location && (
                                                    <div className={cn(
                                                        "mt-1 flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider",
                                                        travelWarnings.has(course.module)
                                                            ? "font-bold text-orange-500 opacity-100"
                                                            : "opacity-60"
                                                    )}>
                                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                            <circle cx="12" cy="10" r="3"></circle>
                                                        </svg>
                                                        {course.location}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Course Picker Modal */}
            {selectedSlot && activeBlock && (
                <SlotPicker
                    day={selectedSlot.day}
                    block={activeBlock}
                    semester={semester}
                    courses={availableForSelected}
                    onAdd={(course) => {
                        addCourse(course, semester);
                        setSelectedSlot(null);
                    }}
                    onClose={() => setSelectedSlot(null)}
                />
            )}
        </div>
    );
};
