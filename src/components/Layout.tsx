import React, { useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { ScheduleGrid } from './ScheduleGrid';
import { ModuleList } from './ModuleList';
import { CourseListView } from './CourseListView';
import { RefreshCw, ChevronLeft, Download, Upload, FileText, LayoutGrid, List } from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { useCourseStore } from '../store/useCourseStore';
import { validateConstraints, checkCollisions } from '../utils/validation';
import { getProgramById } from '../data/programs';
import { exportToPDF } from '../utils/pdfExport';
import { cn } from '../utils/cn';

type View = 'schedule' | 'list';

export const Layout: React.FC = () => {
    const { getSelectedCourses, currentProgramId, setProgram, exportSchedule, importSchedule } = useCourseStore();
    const selectedCourses = getSelectedCourses();
    const currentProgram = currentProgramId ? getProgramById(currentProgramId) : null;

    const [view, setView] = useState<View>('schedule');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const rules = currentProgram?.validationRules || {
        TSM: { max: 12, minRec: 6 },
        FTP: { max: 9, minRec: 3 },
        MA: { max: 18, minRec: 12 },
        CM: { max: 6, minRec: 0 },
        BONUS: 3,
    };

    const validation = validateConstraints(selectedCourses, rules);
    const hasCollisions = checkCollisions(selectedCourses).length > 0;

    type PlanStatus = 'valid' | 'warning' | 'invalid';
    const planStatus: PlanStatus = !validation.isValid
        ? 'invalid'
        : (hasCollisions || validation.bonus.count > 0)
            ? 'warning'
            : 'valid';

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const outcome = importSchedule(result);
            if (!outcome.success) {
                alert(`Import failed: ${outcome.error}`);
            }
        };
        reader.readAsText(file);
        // Reset so same file can be re-imported
        e.target.value = '';
    };

    const handleExportPDF = () => {
        exportToPDF(selectedCourses, currentProgram?.name || 'MSE Program', validation, rules, hasCollisions);
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">MSE</div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 leading-tight">Course Planner</h1>
                        <p className="text-sm text-gray-500">{currentProgram?.name || 'Master Program'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setProgram('')}
                        className="text-sm font-bold text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                        <ChevronLeft size={16} />
                        Change Program
                    </button>

                    <div className="h-6 w-px bg-gray-200"></div>

                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Compliance</span>
                        <div className="flex items-center gap-2">
                            {planStatus === 'valid' && (
                                <span className="text-green-500 font-bold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Valid Plan
                                </span>
                            )}
                            {planStatus === 'warning' && (
                                <span className="text-orange-500 font-bold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Warning Plan
                                </span>
                            )}
                            {planStatus === 'invalid' && (
                                <span className="text-red-500 font-bold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Invalid Plan
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Hidden file input for import */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleImport}
                        />

                        {/* Import JSON */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            title="Import schedule from JSON"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Upload size={14} />
                            Import
                        </button>

                        {/* Export JSON */}
                        <button
                            onClick={exportSchedule}
                            title="Export schedule as JSON"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Download size={14} />
                            JSON
                        </button>

                        {/* Export PDF */}
                        <button
                            onClick={handleExportPDF}
                            title="Export schedule as PDF"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            <FileText size={14} />
                            PDF
                        </button>

                        <div className="h-6 w-px bg-gray-200 mx-1"></div>

                        <a
                            href="https://github.com/NoeBerdoz/hes-so-master-modules-planner"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Report an issue on GitHub"
                        >
                            <GithubIcon size={20} />
                        </a>
                        <button
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Reset"
                            onClick={() => {
                                if (confirm('Are you sure you want to reset your plan?')) {
                                    localStorage.removeItem('course-planner-storage-v2');
                                    window.location.reload();
                                }
                            }}
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
                    <Sidebar validation={validation} rules={rules} />
                </aside>

                {/* Schedule Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 p-6">
                    {/* View toggle toolbar */}
                    <div className="flex items-center gap-2 mb-4 shrink-0">
                        <div className="flex bg-gray-200 p-1 rounded-lg">
                            <button
                                onClick={() => setView('schedule')}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-bold transition-all',
                                    view === 'schedule'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                )}
                            >
                                <LayoutGrid size={14} />
                                Schedule
                            </button>
                            <button
                                onClick={() => setView('list')}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-bold transition-all',
                                    view === 'list'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                )}
                            >
                                <List size={14} />
                                Course List
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {view === 'schedule' ? <ScheduleGrid /> : <CourseListView />}
                    </div>

                    {/* Footer / Module List */}
                    <div className="mt-6 shrink-0">
                        <ModuleList />
                    </div>
                </div>
            </main>
        </div>
    );
};
