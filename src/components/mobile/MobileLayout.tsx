import React, { useRef, useState } from 'react';
import { Plus, List, CheckCircle, CalendarDays } from 'lucide-react';
import { MobileHeader } from './MobileHeader';
import { MobilePlanView } from './MobilePlanView';
import { MobileValidateView } from './MobileValidateView';
import { AddModule } from '../AddModule';
import { MobileCalendarView } from './MobileCalendarView';
import { MobileAddCourseSheet } from './MobileAddCourseSheet';
import { MobileCreditBars } from './MobileCreditBars';
import { ImportDialog } from '../ImportDialog';
import { ExportDialog } from '../ExportDialog';
import { useCourseStore } from '../../store/useCourseStore';
import type { ScheduleExport } from '../../store/useCourseStore';
import { validateConstraints, checkCollisions } from '../../utils/validation';
import { getProgramById } from '../../data/programs';
import { cn } from '../../utils/cn';

type MobileTab = 'add' | 'schedule' | 'plan' | 'validate';
type Sem = '1' | '2' | '3' | '4';

const TABS: { id: MobileTab; label: string; icon: React.ElementType }[] = [
    { id: 'add',      label: 'Add',      icon: Plus },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'plan',     label: 'My Plan',  icon: List },
    { id: 'validate', label: 'Validate', icon: CheckCircle },
];

export const MobileLayout: React.FC = () => {
    const {
        getSelectedCourses, currentProgramId, setProgram,
        exportSchedule, importSchedule, buildShareURL,
        startingSemester, setStartingSemester,
    } = useCourseStore();




    const selectedCourses = getSelectedCourses();
    const currentProgram = currentProgramId ? getProgramById(currentProgramId) : null;

    const [activeTab, setActiveTab] = useState<MobileTab>('add');
    const [addSheet, setAddSheet] = useState<{ dayFull: string; assignedSem: Sem } | null>(null);
    const [importData, setImportData] = useState<ScheduleExport | null>(null);
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const rules = currentProgram?.validationRules ?? {
        TSM: { max: 12, minRec: 6 }, FTP: { max: 9, minRec: 3 },
        MA:  { max: 18, minRec: 12 }, CM: { max: 6, minRec: 0 },
        PI:  { max: 6,  minRec: 6 },  MAP: { max: 0, minRec: 0 },
        CSI: { max: 18, minRec: 0 },  BONUS: 3,
    };

    const validation = validateConstraints(selectedCourses, rules);
    const collisions = checkCollisions(selectedCourses);
    const hasCollisions = collisions.length > 0;
    const collisionModules = new Set<string>();
    collisions.forEach(c => { collisionModules.add(c.course1.module); collisionModules.add(c.course2.module); });

    const planStatus = !validation.isValid ? 'invalid' : hasCollisions ? 'warning' : 'valid';

    const semesterCounts = (['1', '2', '3', '4'] as Sem[]).reduce<Record<Sem, number>>(
        (acc, s) => { acc[s] = selectedCourses.filter(c => c.assignedSemester === s).length; return acc; },
        { '1': 0, '2': 0, '3': 0, '4': 0 },
    );

    const handleShare = () => {
        const url = buildShareURL();
        if (!url) return;
        navigator.clipboard.writeText(url).then(() => {
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        });
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const handleExportPDF = async (sems: Sem[]) => {
        const filtered = selectedCourses.filter(c => sems.includes(c.assignedSemester));
        const { exportToPDF } = await import('../../utils/pdfExport');
        exportToPDF(filtered, currentProgram?.name ?? 'MSE Program', validation, rules, hasCollisions, startingSemester);
    };

    return (
        <div className="h-dvh bg-gray-50 flex flex-col font-sans">
            <MobileHeader
                programName={currentProgram?.name ?? 'Master Program'}
                planStatus={planStatus}
                startingSemester={startingSemester}
                onSetStartingSemester={setStartingSemester}
                onChangeProgram={() => setProgram('')}
                onShare={handleShare}
                shareCopied={shareCopied}
                onImportClick={() => fileInputRef.current?.click()}
                onExportClick={() => setExportDialogOpen(true)}
                onReset={() => {
                    if (confirm('Are you sure you want to reset your plan?')) {
                        localStorage.removeItem('course-planner-storage-v2');
                        window.location.reload();
                    }
                }}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
            />

            {/* Credit bars strip */}
            <MobileCreditBars validation={validation} rules={rules} />

            {/* Tab content - each panel manages its own scroll */}
            <main className="flex-1 min-h-0 overflow-hidden">
                {activeTab === 'add' && (
                    <div className="h-full px-4 pt-4 pb-2">
                        <AddModule />
                    </div>
                )}
                {activeTab === 'schedule' && (
                    <div className="h-full overflow-hidden">
                        <MobileCalendarView
                            startingSemester={startingSemester}
                            onAddCourse={(dayFull, assignedSem) => setAddSheet({ dayFull, assignedSem })}
                        />
                    </div>
                )}
                {activeTab === 'plan' && (
                    <div className="h-full overflow-y-auto px-4 py-4">
                        <MobilePlanView startingSemester={startingSemester} />
                    </div>
                )}
                {activeTab === 'validate' && (
                    <div className="h-full overflow-y-auto px-4 py-4">
                        <MobileValidateView
                            validation={validation}
                            rules={rules}
                            hasCollisions={hasCollisions}
                            collisionCount={collisionModules.size}
                        />
                    </div>
                )}
            </main>

            {/* Bottom navigation */}
            <nav className="bg-white border-t border-gray-200 flex shrink-0 safe-area-bottom">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={cn(
                            'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative',
                            activeTab === id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                        )}
                    >
                        <div className="relative">
                            <Icon size={22} strokeWidth={activeTab === id ? 2.5 : 2} />
                            {/* Badge on "My Plan" */}
                            {id === 'plan' && selectedCourses.length > 0 && (
                                <span className="absolute -top-1.5 -right-2.5 text-[9px] font-bold bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                    {selectedCourses.reduce((sum, c) => sum + (c.credits ?? 0), 0)}
                                </span>
                            )}
                        </div>
                        <span className={cn('text-xs', activeTab === id ? 'font-bold' : 'font-medium')}>
                            {label}
                        </span>
                    </button>
                ))}
            </nav>

            {/* Add course sheet */}
            {addSheet && (
                <MobileAddCourseSheet
                    dayFull={addSheet.dayFull}
                    assignedSem={addSheet.assignedSem}
                    startingSemester={startingSemester}
                    onClose={() => setAddSheet(null)}
                />
            )}

            {/* Dialogs */}
            {importData && (
                <ImportDialog
                    data={importData}
                    onConfirm={handleImportConfirm}
                    onClose={() => setImportData(null)}
                />
            )}
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
