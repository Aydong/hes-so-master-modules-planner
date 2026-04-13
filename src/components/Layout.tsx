import React, { useRef, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ScheduleGrid } from './ScheduleGrid';
import { CourseListView } from './CourseListView';
import { ImportDialog } from './ImportDialog';
import { ExportDialog } from './ExportDialog';
import { RefreshCw, ChevronLeft, Download, Upload, LayoutGrid, List, Share2, XCircle, AlertTriangle } from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { useCourseStore } from '../store/useCourseStore';
import type { ScheduleExport } from '../store/useCourseStore';
import { validateConstraints, checkCollisions, getValidationIssues } from '../utils/validation';
import { getProgramById, getDefaultValidationRules } from '../data/programs';
import { getCourseIndex } from '../data/dataLoader';
import type { CourseYearEntry } from '../data/dataLoader';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileLayout } from './mobile/MobileLayout';

import { cn } from '../utils/cn';


type View = 'schedule' | 'list';

const DesktopLayout: React.FC = () => {
    const { getSelectedCourses, currentProgramId, setProgram, exportSchedule, importSchedule, buildShareURL, startingSemester, setStartingSemester, catalogFile, setCatalogFile } = useCourseStore();
    const selectedCourses = getSelectedCourses();
    const currentProgram = currentProgramId ? getProgramById(currentProgramId) : null;

    const [view, setView] = useState<View>('schedule');
    const [showTooltip, setShowTooltip] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importData, setImportData]       = useState<ScheduleExport | null>(null);
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [availableYears, setAvailableYears] = useState<CourseYearEntry[]>([]);

    useEffect(() => {
        getCourseIndex().then(index => setAvailableYears(index.years));
    }, []);

    const handleShare = () => {
        const url = buildShareURL();
        if (!url) return;
        navigator.clipboard.writeText(url).then(() => {
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        });
    };

    type Sem = '1' | '2' | '3' | '4';
    const semesterCounts = (['1', '2', '3', '4'] as Sem[]).reduce<Record<Sem, number>>(
        (acc, s) => { acc[s] = selectedCourses.filter(c => c.assignedSemester === s).length; return acc; },
        { '1': 0, '2': 0, '3': 0, '4': 0 },
    );

    const rules = currentProgram?.validationRules ?? getDefaultValidationRules();

    const validation = validateConstraints(selectedCourses, rules);
    const collisions = checkCollisions(selectedCourses);
    const hasCollisions = collisions.length > 0;
    const collisionCount = collisions.length;

    const { errors: planErrors, warnings: planWarnings } = getValidationIssues(validation, rules, hasCollisions, collisionCount);

    type PlanStatus = 'valid' | 'warning' | 'invalid';
    const planStatus: PlanStatus = !validation.isValid
        ? 'invalid'
        : (hasCollisions || !validation.outOfSpec.valid)
            ? 'warning'
            : 'valid';

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const outcome = importSchedule(result);
            if (!outcome.success) { alert(`Import failed: ${outcome.error}`); return; }
            if (outcome.data) setImportData(outcome.data);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleImportConfirm = (sems: Sem[]) => {
        if (!importData) return;
        const outcome = importSchedule(JSON.stringify(importData), sems);
        if (!outcome.success) alert(`Import failed: ${outcome.error}`);
        setImportData(null);
    };

    const handleExportJSON = (sems: Sem[]) => exportSchedule(sems);
    const handleExportPDF  = async (sems: Sem[]) => {
        const filtered = selectedCourses.filter(c => sems.includes(c.assignedSemester));
        const { exportToPDF } = await import('../utils/pdfExport');
        exportToPDF(filtered, currentProgram?.name || 'MSE Program', validation, rules, hasCollisions, startingSemester);
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

                    {/* Starting semester toggle */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Start</span>
                        <div className="flex bg-gray-100 p-0.5 rounded-lg">
                            <button
                                onClick={() => setStartingSemester('SA')}
                                className={cn(
                                    'px-2.5 py-1 rounded-md text-xs font-bold transition-all',
                                    startingSemester === 'SA'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                )}
                                title="Start in Autumn semester"
                            >
                                SA
                            </button>
                            <button
                                onClick={() => setStartingSemester('SP')}
                                className={cn(
                                    'px-2.5 py-1 rounded-md text-xs font-bold transition-all',
                                    startingSemester === 'SP'
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                )}
                                title="Start in Spring semester"
                            >
                                SP
                            </button>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-gray-200"></div>

                    {/* Catalogue year selector */}
                    {availableYears.length > 0 && (
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Catalogue</span>
                            <select
                                value={catalogFile}
                                onChange={e => setCatalogFile(e.target.value)}
                                className="text-xs font-bold text-gray-700 bg-gray-100 border-0 rounded-lg px-2 py-1 cursor-pointer hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                {availableYears.map(y => (
                                    <option key={y.file} value={y.file}>{y.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="h-6 w-px bg-gray-200"></div>

                    <div
                        className="flex flex-col items-end relative"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider cursor-help select-none">Compliance</span>
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
                            {(planErrors.length > 0 || planWarnings.length > 0) && (
                                <span className="text-xs font-bold text-gray-400">
                                    ({planErrors.length + planWarnings.length})
                                </span>
                            )}
                        </div>

                        {/* Tooltip */}
                        {showTooltip && (planErrors.length > 0 || planWarnings.length > 0) && (
                            <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 min-w-[300px] max-w-sm">
                                {planErrors.length > 0 && (
                                    <div className={planWarnings.length > 0 ? 'mb-3' : ''}>
                                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5">Issues</p>
                                        <div className="space-y-1">
                                            {planErrors.map((e, i) => (
                                                <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                                                    <XCircle size={12} className="shrink-0 mt-0.5" />{e}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {planWarnings.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1.5">Warnings</p>
                                        <div className="space-y-1">
                                            {planWarnings.map((w, i) => (
                                                <p key={i} className="text-xs text-orange-600 flex items-start gap-1.5">
                                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />{w}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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

                        {/* Share via URL */}
                        <button
                            onClick={handleShare}
                            title="Copy shareable link to clipboard"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Share2 size={14} />
                            {shareCopied ? 'Copied !' : 'Share'}
                        </button>

                        {/* Import JSON */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            title="Import schedule from JSON"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Upload size={14} />
                            Import
                        </button>

                        {/* Export (JSON + PDF via dialog) */}
                        <button
                            onClick={() => setExportDialogOpen(true)}
                            title="Export schedule"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            <Download size={14} />
                            Export
                        </button>

                        <div className="h-6 w-px bg-gray-200 mx-1"></div>

                        <a
                            href="https://github.com/Aydong/hes-so-master-modules-planner"
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
                <aside className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
                    <Sidebar />
                </aside>

                {/* Schedule Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 p-6">
                    {/* View toggle toolbar */}
                    <div className="flex items-center gap-4 mb-4 shrink-0">
                        {/* View toggle */}
                        <div className="flex bg-gray-200 p-1 rounded-lg shrink-0">
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

                        <div className="h-6 w-px bg-gray-200 shrink-0"></div>

                        {/* Credit indicators */}
                        <div className="flex items-center gap-4 flex-1">
                            {(() => {
                                const indicators = [];
                                if (rules.TSM.max > 0) indicators.push({ label: 'TSM', current: validation.tsm.count, rec: validation.tsm.rec, max: rules.TSM.max, minRec: rules.TSM.minRec, barClass: 'bg-blue-500', labelClass: 'text-blue-600' });
                                if (rules.FTP.max > 0) indicators.push({ label: 'FTP', current: validation.ftp.count, rec: validation.ftp.rec, max: rules.FTP.max, minRec: rules.FTP.minRec, barClass: 'bg-purple-500', labelClass: 'text-purple-600' });
                                if (rules.MA.max > 0)  indicators.push({ label: 'MA',  current: validation.ma.count,  rec: validation.ma.rec,  max: rules.MA.max,  minRec: rules.MA.minRec,  barClass: 'bg-emerald-500', labelClass: 'text-emerald-600' });
                                if (rules.CM.max > 0)  indicators.push({ label: 'CM',  current: validation.cm.count,  rec: 0,                  max: rules.CM.max,  minRec: rules.CM.minRec,  barClass: 'bg-amber-500', labelClass: 'text-amber-600' });
                                if (rules.PI.max > 0)  indicators.push({ label: 'PI',  current: validation.pi.count,  rec: validation.pi.rec,  max: rules.PI.max,  minRec: rules.PI.minRec,  barClass: 'bg-gray-500', labelClass: 'text-gray-600' });
                                if (rules.MAP.max > 0) indicators.push({ label: 'MAP', current: validation.map.count, rec: validation.map.rec, max: rules.MAP.max, minRec: rules.MAP.minRec, barClass: 'bg-indigo-500', labelClass: 'text-indigo-600' });
                                if (rules.CSI.max > 0) indicators.push({ label: 'CSI', current: validation.csi.count, rec: validation.csi.rec, max: rules.CSI.max, minRec: rules.CSI.minRec, barClass: 'bg-purple-500', labelClass: 'text-purple-600' });
                                return indicators;
                            })().map(({ label, current, rec, max, minRec, barClass, labelClass }) => {
                                const getTextColor = () => {
                                    if (rec < minRec) return 'text-red-500';
                                    if (current === max) return 'text-green-600';
                                    if (current <= max+3) return 'text-orange-600';
                                    return 'text-red-500';
                                };

                                return (
                                    <div key={label} className="flex flex-col min-w-[72px]">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className={cn('text-xs font-bold', labelClass)}>{label}</span>
                                            <span className={cn('text-xs font-semibold', getTextColor())}>
                                                {current}/{max}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={cn('h-full rounded-full transition-all duration-500', barClass)}
                                                style={{ width: `${Math.min(100, (current / max) * 100)}%` }}
                                            />
                                        </div>
                                        {minRec > 0 ? (
                                            <span className={cn('text-[10px] mt-0.5 font-medium', rec >= minRec ? 'text-green-600' : 'text-red-500')}>
                                                Rec: {rec}/{minRec}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] mt-0.5">&nbsp;</span>
                                        )}
                                    </div>
                                );
                            })}
                            {/* Bonus dots */}
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold text-gray-700 mb-1">BONUS {validation.bonus.count}/3</span>
                                <div className="flex items-center gap-1 h-2">
                                    {Array.from({ length: rules.BONUS }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn('w-2 h-2 rounded-full transition-colors',
                                                i < validation.bonus.count
                                                    ? validation.bonus.count > rules.BONUS ? 'bg-red-500' : 'bg-emerald-400'
                                                    : 'bg-gray-400'
                                            )}
                                        />
                                    ))}
                                </div>
                                <span className="text-[10px] mt-0.5">&nbsp;</span>
                            </div>

                            {/* Out-of-spec indicator (only shown when at least 1 out-of-spec course) */}
                            {validation.outOfSpec.count > 0 && (
                                <div className="flex flex-col items-start">
                                    <span className="text-xs font-bold text-orange-500 mb-1">Out of spec</span>
                                    <div className="flex items-center gap-1 h-2">
                                        {[0].map((_, i) => (
                                            <div
                                                key={i}
                                                className={cn('w-2 h-2 rounded-full transition-colors',
                                                    validation.outOfSpec.valid ? 'bg-emerald-400' : 'bg-red-500'
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <span className={cn('text-[10px] mt-0.5 font-medium',
                                        validation.outOfSpec.valid ? 'text-green-600' : 'text-red-500'
                                    )}>
                                        {validation.outOfSpec.count}/1
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Issues strip - constant visibility without taking much space */}
                    {(planErrors.length > 0 || planWarnings.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
                            {planErrors.map((e, i) => (
                                <span key={`e-${i}`} className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full whitespace-nowrap">
                                    <XCircle size={10} /> {e}
                                </span>
                            ))}
                            {planWarnings.map((w, i) => (
                                <span key={`w-${i}`} className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-full whitespace-nowrap truncate max-w-[500px] truncate">
                                    <AlertTriangle size={10} className="shrink-0" /> {w}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        {view === 'schedule' ? <ScheduleGrid /> : <CourseListView rules={rules} startingSemester={startingSemester} />}
                    </div>
                </div>
            </main>

            {/* Import dialog */}
            {importData && (
                <ImportDialog
                    data={importData}
                    onConfirm={handleImportConfirm}
                    onClose={() => setImportData(null)}
                />
            )}

            {/* Export dialog */}
            {exportDialogOpen && (
                <ExportDialog
                    startingSemester={startingSemester}
                    counts={semesterCounts}
                    onExportJSON={handleExportJSON}
                    onExportPDF={handleExportPDF}
                    onClose={() => setExportDialogOpen(false)}
                />
            )}
        </div>
    );
};

export const Layout: React.FC = () => {
    const isMobile = useIsMobile();
    return isMobile ? <MobileLayout /> : <DesktopLayout />;
};
