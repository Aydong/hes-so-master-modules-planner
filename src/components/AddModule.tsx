import React, { useState, useMemo } from 'react';
import { useCourseStore } from '../store/useCourseStore';
import { Search, ExternalLink } from 'lucide-react';
import { cn } from '../utils/cn';
import { courseToAssignedSemester } from '../utils/semesterUtils';

export const AddModule: React.FC = () => {
    const { addCourse, isCourseSelected, getAllCourses, startingSemester } = useCourseStore();
    const allCourses = getAllCourses();
    const [search, setSearch] = useState('');
    const [semesterFilter, setSemesterFilter] = useState<'1' | '2' | null>(null);
    const [typeFilter, setTypeFilter] = useState<'R' | 'O' | 'C' | null>(null);
    const [dayFilter, setDayFilter] = useState<string | null>(null);

    const filteredCourses = useMemo(() => {
        return allCourses.filter((course) => {
            const matchesSearch =
                course.module.toLowerCase().includes(search.toLowerCase()) ||
                course.title.toLowerCase().includes(search.toLowerCase());
            const matchesSemester = semesterFilter ? course.Semester === semesterFilter : true;
            const matchesType = typeFilter ? course.type === typeFilter : true;
            const matchesDay = dayFilter ? course.WeekDay === dayFilter : true;
            const notSelected = !isCourseSelected(course.module);
            return matchesSearch && matchesSemester && matchesType && matchesDay && notSelected;
        });
    }, [allCourses, search, semesterFilter, typeFilter, dayFilter, isCourseSelected]);

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="space-y-4 mb-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Module Name / Code</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Type code (e.g. FTP_Alg) or name..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Semester</label>
                        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
                            <button
                                className={cn(
                                    "flex-1 py-1 text-xs font-bold rounded transition-colors",
                                    semesterFilter === '1' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                                )}
                                onClick={() => setSemesterFilter(semesterFilter === '1' ? null : '1')}
                            >
                                Autumn
                            </button>
                            <button
                                className={cn(
                                    "flex-1 py-1 text-xs font-bold rounded transition-colors",
                                    semesterFilter === '2' ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                                )}
                                onClick={() => setSemesterFilter(semesterFilter === '2' ? null : '2')}
                            >
                                Spring
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
                        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
                            <button
                                className={cn(
                                    "flex-1 py-1 text-xs font-bold rounded transition-colors",
                                    typeFilter === 'R' ? "bg-emerald-500 text-white" : "text-gray-600 hover:bg-gray-50"
                                )}
                                onClick={() => setTypeFilter(typeFilter === 'R' ? null : 'R')}
                            >
                                Rec.
                            </button>
                            <button
                                className={cn(
                                    "flex-1 py-1 text-xs font-bold rounded transition-colors",
                                    typeFilter === 'O' ? "bg-gray-500 text-white" : "text-gray-600 hover:bg-gray-50"
                                )}
                                onClick={() => setTypeFilter(typeFilter === 'O' ? null : 'O')}
                            >
                                Opt.
                            </button>
                            <button
                                className={cn(
                                    "flex-1 py-1 text-xs font-bold rounded transition-colors",
                                    typeFilter === 'C' ? "bg-red-500 text-white" : "text-gray-600 hover:bg-gray-50"
                                )}
                                onClick={() => setTypeFilter(typeFilter === 'C' ? null : 'C')}
                            >
                                Comp.
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Day</label>
                    <select
                        className="w-full py-1.5 px-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={dayFilter || ''}
                        onChange={(e) => setDayFilter(e.target.value || null)}
                    >
                        <option value="">All Days</option>
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50 p-2 space-y-2">
                {filteredCourses.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No modules found</div>
                ) : (
                    filteredCourses.map((course) => (
                        <div
                            key={course.module}
                            className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-default group"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-gray-800 text-sm">{course.module}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                                        course.type === 'R' ? "bg-emerald-100 text-emerald-700" :
                                        course.type === 'C' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                                    )}>
                                        {course.type === 'R' ? 'Rec' : course.type === 'C' ? 'Com' : 'Opt'}
                                    </span>
                                    <a
                                        href={course.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Open course details"
                                        className="text-gray-300 hover:text-blue-600 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ExternalLink size={12} />
                                    </a>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{course.title}</p>
                            <div className="flex justify-between items-center text-[10px] text-gray-400 mb-2">
                                <span>{course.WeekDay} • {course.TimeBlock}</span>
                                {course.location && (
                                    <span className="flex items-center gap-1">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        {course.location}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => addCourse(course, courseToAssignedSemester(course.Semester, 1, startingSemester))}
                                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold py-1.5 rounded transition-colors"
                                >
                                    Add to Year 1 ({course.Semester === '1' ? 'Autumn' : 'Spring'})
                                </button>
                                <button
                                    onClick={() => addCourse(course, courseToAssignedSemester(course.Semester, 2, startingSemester))}
                                    className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs font-bold py-1.5 rounded transition-colors"
                                >
                                    Add to Year 2 ({course.Semester === '1' ? 'Autumn' : 'Spring'})
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
