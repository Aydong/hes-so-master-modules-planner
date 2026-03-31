import React, { useState, useEffect } from 'react';
import { useCourseStore } from '../store/useCourseStore';
import { cn } from '../utils/cn';
import { extractTimeBlocks, courseHasTimeBlock } from '../utils/timeBlockUtils';
import { X, ExternalLink, AlertTriangle, Plus } from 'lucide-react';
import type { Course, SelectedCourse } from '../types';
import { buildTravelWarningModules } from '../utils/travelWarning';
import { getProgramById } from '../data/programs';
import { slotToCourseSemester, getSlotShortLabel } from '../utils/semesterUtils';
import { getBlockTime, getBlockTimeBounds, getDistinctTimings, formatMinutes, timeBlockDataReady, getNameForCode } from '../utils/timeBlockData';
import { getCategoryCard, getCategoryBadge, getCategorySolid, getTypeBadge } from '../utils/courseColors';
import { getOutOfSpecializationCourses } from '../data/dataLoader';

//  Timeline constants

const DAY_START_MIN  = 8 * 60;        // 8h00
const DAY_END_MIN    = 20 * 60 + 30; // 20h30
const TOTAL_MIN      = DAY_END_MIN - DAY_START_MIN; // 750 min
const MIN_TIMELINE_PX = 500;          // minimum height in px

const HOUR_MARKS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const WEEK_DAYS  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_BLOCKS = ['TB1', 'TB2', 'TB3', 'TB4'] as const;

function toPercent(min: number): number {
    return (min - DAY_START_MIN) / TOTAL_MIN * 100;
}
function toHeightPercent(startMin: number, endMin: number): number {
    return (endMin - startMin) / TOTAL_MIN * 100;
}

//  Course timing helpers 

interface Timing { startMin: number; endMin: number }

function getCourseTiming(course: { TimeBlock: string; location?: string }): Timing {
    const blocks    = extractTimeBlocks(course.TimeBlock);
    const blockNums = blocks.map(b => parseInt(b.replace('TB', ''))).filter(n => !isNaN(n));
    if (blockNums.length === 0) return { startMin: DAY_START_MIN, endMin: DAY_START_MIN + 135 };
    const first = getBlockTime(course.location, Math.min(...blockNums));
    const last  = getBlockTime(course.location, Math.max(...blockNums));
    if (!first || !last) return { startMin: DAY_START_MIN, endMin: DAY_START_MIN + 135 };
    return { startMin: first.startMin, endMin: last.endMin };
}

function timingsOverlap(a: Timing, b: Timing): boolean {
    return a.startMin < b.endMin && a.endMin > b.startMin;
}

/** Assign a column index and total column count to each course in a day for collision layout. */
function buildCollisionLayout(courses: SelectedCourse[]): Map<string, { colIdx: number; colCount: number }> {
    const layout = new Map<string, { colIdx: number; colCount: number }>();
    const timed  = courses.map(c => ({ course: c, timing: getCourseTiming(c) }));

    for (const item of timed) {
        const group = timed
            .filter(other => timingsOverlap(item.timing, other.timing))
            .sort((a, b) => a.course.module.localeCompare(b.course.module));
        const colIdx  = group.findIndex(g => g.course.module === item.course.module);
        layout.set(item.course.module, { colIdx, colCount: group.length });
    }
    return layout;
}

//  SlotPicker modal 

interface SlotPickerProps {
    day: string;
    block: string;
    semester: '1' | '2' | '3' | '4';
    ownCourses: Course[];
    outOfSpecCourses: Course[];
    onAdd: (course: Course) => void;
    onClose: () => void;
}

const SlotPicker: React.FC<SlotPickerProps> = ({ day, block, semester, ownCourses, outOfSpecCourses, onAdd, onClose }) => {
    const { scopeFilter, setScopeFilter, currentProgramId } = useCourseStore();
    const courses = scopeFilter === 'extended' ? outOfSpecCourses : ownCourses;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-[500px] max-h-[65vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-800">Add a course</h3>
                        <p className="text-sm text-gray-400">{day} · {block} - Semester {semester}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Scope toggle */}
                <div className="px-6 pt-3 pb-1 shrink-0">
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
                            <AlertTriangle size={9} />
                            Courses outside your specialization count as Optional (no recommended credits)
                        </p>
                    )}
                </div>

                {/* Course list */}
                <div className="overflow-y-auto p-4 space-y-2">
                    {courses.length === 0 ? (
                        <p className="text-center text-gray-400 py-10 text-sm">No available courses for this slot</p>
                    ) : (
                        courses.map(course => {
                            const timing = getCourseTiming(course);
                            const isOutOfSpec = course.isOutOfSpecialization === true;
                            return (
                                <div key={course.module} className={cn(
                                    'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                                    isOutOfSpec
                                        ? 'border-orange-100 hover:border-orange-300 hover:bg-orange-50'
                                        : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50'
                                )}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={cn('text-xs font-bold px-2 py-0.5 rounded', getCategoryBadge(course.module))}>
                                                {course.module}
                                            </span>
                                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', getTypeBadge(course.type))}>
                                                {course.type === 'R' ? 'Rec' : course.type === 'C' ? 'Com' : 'Opt'}
                                            </span>
                                            {isOutOfSpec && (
                                                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-bold bg-orange-100 text-orange-600 border border-orange-200">
                                                    <AlertTriangle size={9} />
                                                    Out of spec
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400">{course.credits ?? 3} ECTS</span>
                                            {course.location && (
                                                <span className="text-xs text-gray-400">{course.location}</span>
                                            )}
                                            <span className="text-xs font-medium text-gray-500">
                                                {formatMinutes(timing.startMin)} – {formatMinutes(timing.endMin)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 truncate">{course.title}</p>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1.5">
                                        <a href={course.link} target="_blank" rel="noopener noreferrer"
                                           title="Open course details"
                                           className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                                           onClick={e => e.stopPropagation()}>
                                            <ExternalLink size={14} />
                                        </a>
                                        <button onClick={() => onAdd(course)}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                                            <Plus size={12} /> Add
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

//  Main component 

export const ScheduleGrid: React.FC = () => {
    const {
        removeCourse, getSelectedCourses, getAllCourses, addCourse,
        isCourseSelected, startingSemester, importVersion, scopeFilter,
    } = useCourseStore();

    const selectedCourses = getSelectedCourses();
    const allCourses      = getAllCourses();

    const programId = useCourseStore().currentProgramId;
    const program   = getProgramById(programId || '');

    const [semester, setSemester]         = useState<'1' | '2' | '3' | '4'>('1');
    const [selectedSlot, setSelectedSlot] = useState<{ day: string; block: string } | null>(null);
    const [timeBlockReady, setTimeBlockReady] = useState(false);
    const [outOfSpecCourses, setOutOfSpecCourses] = useState<Course[]>([]);

    useEffect(() => {
        timeBlockDataReady.then(() => setTimeBlockReady(true));
    }, []);

    useEffect(() => {
        setSemester('1');
        setSelectedSlot(null);
    }, [importVersion]);

    useEffect(() => {
        if (!programId) return;
        getOutOfSpecializationCourses(programId).then(setOutOfSpecCourses);
    }, [programId]);

    const semesterCourses = selectedCourses.filter(c => c.assignedSemester === semester);
    const travelWarnings  = buildTravelWarningModules(semesterCourses);
    const semesterType    = slotToCourseSemester(semester, startingSemester);
    const semesterECTS    = semesterCourses.reduce((s, c) => s + (c.credits ?? 3), 0);

    const selectedECTS = selectedCourses.reduce((sum, course) => sum + (course.credits || 3), 0);

    const totalECTS_default = selectedECTS + 30 + 6; // default: 30 ECTS TM, 6 PA
    const totalECTS_ICS = selectedECTS + 30 + 30;    // ICS: 30 TM + 30 Brasov
    const totalECTS_CE = selectedECTS + 30;          // CE: 30 TM only

    const totalECTS = program?.masterCode === 'ICS'
        ? totalECTS_ICS
        : program?.masterCode === 'CE'
            ? totalECTS_CE
            : totalECTS_default;

    const getAvailableForSlot = (day: string, block: string) =>
        allCourses.filter(c =>
            c.WeekDay === day &&
            extractTimeBlocks(c.TimeBlock).includes(block) &&
            !isCourseSelected(c.module) &&
            c.Semester === semesterType
        );

    const getOutOfSpecForSlot = (day: string, block: string) =>
        outOfSpecCourses.filter(c =>
            c.WeekDay === day &&
            extractTimeBlocks(c.TimeBlock).includes(block) &&
            !isCourseSelected(c.module) &&
            c.Semester === semesterType
        );

    const ownCoursesForSelected = selectedSlot
        ? getAvailableForSlot(selectedSlot.day, selectedSlot.block)
        : [];

    const outOfSpecForSelected = selectedSlot
        ? getOutOfSpecForSlot(selectedSlot.day, selectedSlot.block)
        : [];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            {/*  Toolbar  */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-200 p-1 rounded-lg">
                        {(['1', '2', '3', '4'] as const).map(s => (
                            <button key={s}
                                className={cn(
                                    'flex flex-col items-center px-3 py-1 rounded-md text-sm font-bold transition-all leading-tight',
                                    semester === s ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                )}
                                onClick={() => setSemester(s)}>
                                <span>S{s}</span>
                                <span className="text-[9px] font-normal opacity-70">
                                    {getSlotShortLabel(s, startingSemester).split('(')[1]?.replace(')', '') ?? ''}
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Semester Credits:</span>
                        <span className="text-sm font-bold text-blue-600">{semesterECTS} ECTS</span>
                    </div>
                    <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Total Credits:</span>
                        <span className="text-sm font-bold text-blue-600">{selectedECTS}
                    {' '}
                    {program?.masterCode === 'ICS' ? (
                        <> + 30 <span className="font-normal">(TM)</span> + 30 <span className="font-normal">(Brasov)</span></>
                    ) : program?.masterCode === 'CE' ? (
                        <> + 30 <span className="font-normal">(TM)</span></>
                    ) : (
                        <> + 6 <span className="font-normal">(PA)</span> + 30 <span className="font-normal">(TM)</span></>
                    )} = {totalECTS} ECTS</span>
                    </div>
                </div>
            </div>

            {/*  Timeline  */}
            <div className="flex-1 min-h-0 flex flex-col overflow-auto p-4">
                {/* Day header row */}
                <div className="flex gap-0 mb-0 shrink-0" style={{ paddingLeft: '30px' }}>
                    {WEEK_DAYS.map(day => (
                        <div key={day} className="flex-1 text-center font-bold text-gray-600 uppercase tracking-wider text-xs bg-white py-2 rounded-lg border border-gray-100 shadow-sm mx-0.5 mb-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Timeline body */}
                {!timeBlockReady && (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm" style={{ minHeight: `${MIN_TIMELINE_PX}px` }}>
                        Loading schedule data. Please wait young padawan you are on the way to master the planner force...
                    </div>
                )}
                {timeBlockReady && <div className="flex gap-0 flex-1" style={{ minHeight: `${MIN_TIMELINE_PX}px` }}>
                    {/* Time axis */}
                    <div className="relative shrink-0" style={{ width: '30px' }}>
                        {HOUR_MARKS.map(h => (
                            <div key={h}
                                className="absolute right-2 text-[10px] text-gray-400 font-medium leading-none"
                                style={{ top: `${toPercent(h * 60)}%`, transform: 'translateY(-50%)' }}>
                                {h}h
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {WEEK_DAYS.map(day => {
                        const dayCourses       = semesterCourses.filter(c => c.WeekDay === day);
                        const collisionLayout  = buildCollisionLayout(dayCourses);

                        return (
                            <div key={day} className="flex-1 relative mx-0.5">
                                {/* Horizontal hour grid lines */}
                                {HOUR_MARKS.map(h => (
                                    <div key={h}
                                        className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
                                        style={{ top: `${toPercent(h * 60)}%` }} />
                                ))}

                                {/* Empty clickable zones for each block */}
                                {(() => {
                                    // Pre-compute visual timing of each placed course on this day
                                    const placedTimings = dayCourses.map(c => getCourseTiming(c));

                                    return TIME_BLOCKS.map(block => {
                                    const blockNum  = parseInt(block.replace('TB', ''));
                                    const available = getAvailableForSlot(day, block);
                                    const availableOutOfSpec = getOutOfSpecForSlot(day, block);
                                    if (available.length === 0 && availableOutOfSpec.length === 0) return null;

                                    // Hide if a placed course already occupies this block slot
                                    const isOccupied = dayCourses.some(c => courseHasTimeBlock(c, block));
                                    if (isOccupied) return null;

                                    const displayCourses  = scopeFilter === 'extended'
                                        ? availableOutOfSpec
                                        : available;
                                    if (displayCourses.length === 0) return null;
                                    const locations       = displayCourses.map(c => c.location);
                                    const bounds          = getBlockTimeBounds(locations, blockNum);
                                    if (!bounds) return null;

                                    // Hide this zone if a placed course visually extends into it
                                    const coveredByPlaced = placedTimings.some(
                                        t => t.startMin < bounds.startMin && t.endMin > bounds.startMin
                                    );
                                    if (coveredByPlaced) return null;

                                    const distinctTimings = getDistinctTimings(locations, blockNum);

                                    return (
                                        <div key={block}
                                            className="absolute left-0 right-0 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 group overflow-hidden"
                                            style={{
                                                top:    `${toPercent(bounds.startMin)}%`,
                                                height: `${toHeightPercent(bounds.startMin, bounds.endMin)}%`,
                                            }}
                                            onClick={() => setSelectedSlot({ day, block })}>

                                            <div className="flex items-center gap-1 text-gray-300 group-hover:text-blue-400 transition-colors">
                                                <Plus size={14} />
                                                <span className="text-[18px] font-bold">{block}</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                                {distinctTimings.map(({ timing, locationCode }) => (
                                                    <div key={`${locationCode}-${timing.startMin}`}
                                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/70 border border-gray-200 group-hover:border-blue-200">
                                                        <span className="text-[12px] font-bold text-gray-500 group-hover:text-blue-600">
                                                            {getNameForCode(locationCode)}
                                                        </span>
                                                        <span className="text-[12px] text-gray-400 group-hover:text-blue-400">
                                                            {formatMinutes(timing.startMin)}–{formatMinutes(timing.endMin)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                {[...new Set(displayCourses.map(c => c.module.split('_')[0]))].map(prefix => (
                                                    <span key={prefix} className={`w-2.5 h-2.5 rounded-full ${getCategorySolid(prefix)}`} title={prefix} />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                    }); // end TIME_BLOCKS.map
                                })()} {/* end IIFE */}

                                {/* Placed courses */}
                                {dayCourses.map(course => {
                                    const timing = getCourseTiming(course);
                                    const { colIdx, colCount } = collisionLayout.get(course.module) ?? { colIdx: 0, colCount: 1 };
                                    const isCollision  = colCount > 1;
                                    const hasTravel    = travelWarnings.has(course.module);
                                    const isOutOfSpec  = course.isOutOfSpecialization === true;

                                    const colWidth = 100 / colCount;
                                    const colLeft  = colIdx * colWidth;

                                    return (
                                        <div key={`${course.module}-${course.TimeBlock}`}
                                            className={cn(
                                                'absolute rounded-xl border shadow-sm flex flex-col justify-between p-2 transition-transform hover:scale-[1.01] hover:z-10',
                                                getCategoryCard(course.module),
                                                isCollision && 'border-red-300 ring-1 ring-red-200',
                                                isOutOfSpec && !isCollision && 'border-orange-300 ring-1 ring-orange-200',
                                            )}
                                            style={{
                                                top:    `${toPercent(timing.startMin)}%`,
                                                height: `${toHeightPercent(timing.startMin, timing.endMin)}%`,
                                                left:   `${colLeft}%`,
                                                width:  `${colWidth}%`,
                                            }}>
                                            {isCollision && (
                                                <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full z-10 shadow-sm">
                                                    <AlertTriangle size={10} />
                                                </div>
                                            )}
                                            {isOutOfSpec && !isCollision && (
                                                <div className="absolute -top-1.5 -left-1.5 bg-orange-500 text-white p-0.5 rounded-full z-10 shadow-sm" title="Out of specialization">
                                                    <AlertTriangle size={10} />
                                                </div>
                                            )}

                                            {/* Top section */}
                                            <div>
                                                <div className="flex justify-between items-start gap-1">
                                                    <div className="flex items-baseline gap-1 min-w-0">
                                                        <span className="font-bold text-[13px] leading-tight truncate">{course.module}</span>
                                                        <span className="text-[10px] font-medium opacity-60 shrink-0 uppercase">
                                                            {course.type === 'R' ? 'Rec' : course.type === 'C' ? 'Com' : 'Opt'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); removeCourse(course.module); }}
                                                        className="text-current opacity-40 hover:opacity-100 transition-opacity shrink-0"
                                                        title="Remove course">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                                {isOutOfSpec && (
                                                    <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wide leading-none">
                                                        Out of specialization
                                                    </span>
                                                )}
                                                <p className="text-[11px] font-medium leading-tight mt-0.5 opacity-75 line-clamp-2">
                                                    {course.title}
                                                </p>
                                            </div>

                                            {/* Bottom section */}
                                            <div className="flex flex-col gap-0.5 mt-1">

                                                {/* Real time */}
                                                <span className="text-[11px] font-bold opacity-80">
                                                    {formatMinutes(timing.startMin)} – {formatMinutes(timing.endMin)}
                                                </span>

                                                <div className="flex justify-between items-center">
                                                    {/* Location */}
                                                    {course.location && (
                                                        <span className={cn(
                                                            'text-[10px] font-medium uppercase tracking-wide flex items-center gap-0.5',
                                                            hasTravel ? 'text-orange-500 font-bold' : 'opacity-60'
                                                        )}>
                                                            <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                                <circle cx="12" cy="10" r="3" />
                                                            </svg>
                                                            {course.location}
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-1 ml-auto">
                                                        <a href={course.link} target="_blank" rel="noopener noreferrer"
                                                           className="text-current opacity-40 hover:opacity-100"
                                                           onClick={e => e.stopPropagation()}>
                                                            <ExternalLink size={10} />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>}
            </div>

            {/*  SlotPicker modal  */}
            {selectedSlot && (
                <SlotPicker
                    day={selectedSlot.day}
                    block={selectedSlot.block}
                    semester={semester}
                    ownCourses={ownCoursesForSelected}
                    outOfSpecCourses={outOfSpecForSelected}
                    onAdd={course => {
                        addCourse(course, semester);
                        setSelectedSlot(null);
                    }}
                    onClose={() => setSelectedSlot(null)}
                />
            )}
        </div>
    );
};
