import React, { useState } from 'react';
import { MoreVertical, Share2, Upload, Download, RefreshCw, ChevronLeft } from 'lucide-react';
import { GithubIcon } from '../GithubIcon';
import { cn } from '../../utils/cn';
import type { StartingSemester } from '../../utils/semesterUtils';
import type { CourseYearEntry } from '../../data/dataLoader';

type PlanStatus = 'valid' | 'warning' | 'invalid';

interface MobileHeaderProps {
    programName: string;
    planStatus: PlanStatus;
    startingSemester: StartingSemester;
    onSetStartingSemester: (s: StartingSemester) => void;
    onChangeProgram: () => void;
    onShare: () => void;
    shareCopied: boolean;
    onImportClick: () => void;
    onExportClick: () => void;
    catalogFile: string;
    availableYears: CourseYearEntry[];
    onSetCatalogFile: (file: string) => void;
    onReset: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
    programName,
    planStatus,
    startingSemester,
    onSetStartingSemester,
    onChangeProgram,
    onShare,
    shareCopied,
    onImportClick,
    onExportClick,
    catalogFile,
    availableYears,
    onSetCatalogFile,
    onReset,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const statusColor =
        planStatus === 'valid' ? 'bg-green-500' :
        planStatus === 'warning' ? 'bg-orange-400' :
        'bg-red-500';

    const statusText =
        planStatus === 'valid' ? 'text-green-600' :
        planStatus === 'warning' ? 'text-orange-500' :
        'text-red-500';

    const statusLabel =
        planStatus === 'valid' ? 'Valid' :
        planStatus === 'warning' ? 'Warning' :
        'Invalid';

    return (
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
            {/* Left: logo + title */}
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 text-white px-2 py-1 rounded-md font-bold text-sm leading-tight">MSE</div>
                <div>
                    <h1 className="text-sm font-bold text-gray-800 leading-tight">Course Planner</h1>
                    <p className="text-xs text-gray-500 leading-tight truncate max-w-[400px]">{programName}</p>
                </div>
            </div>

            {/* Right: status + menu */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', statusColor)} />
                    <span className={cn('text-xs font-bold', statusText)}>{statusLabel}</span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(o => !o)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Menu"
                    >
                        <MoreVertical size={20} />
                    </button>

                    {menuOpen && (
                        <>
                            {/* Backdrop */}
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />

                            {/* Dropdown */}
                            <div className="absolute right-0 top-full mt-1 w-60 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
                                {/* Starting semester */}
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Starting semester</p>
                                    <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                        <button
                                            onClick={() => onSetStartingSemester('SA')}
                                            className={cn(
                                                'flex-1 py-1.5 rounded-md text-xs font-bold transition-all',
                                                startingSemester === 'SA' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            )}
                                        >
                                            SA (Autumn)
                                        </button>
                                        <button
                                            onClick={() => onSetStartingSemester('SP')}
                                            className={cn(
                                                'flex-1 py-1.5 rounded-md text-xs font-bold transition-all',
                                                startingSemester === 'SP' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            )}
                                        >
                                            SP (Spring)
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { onChangeProgram(); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <ChevronLeft size={16} className="text-gray-400" />
                                    Change Program
                                </button>

                                {availableYears.length > 0 && (
                                    <div className="px-4 py-3 border-t border-gray-100">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Catalogue</p>
                                        <select
                                            value={catalogFile}
                                            onChange={e => { onSetCatalogFile(e.target.value); setMenuOpen(false); }}
                                            className="w-full text-sm text-gray-700 bg-gray-100 border-0 rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        >
                                            {availableYears.map(y => (
                                                <option key={y.file} value={y.file}>{y.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="border-t border-gray-100" />

                                <button
                                    onClick={() => { onShare(); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Share2 size={16} className="text-gray-400" />
                                    {shareCopied ? 'Copied!' : 'Share link'}
                                </button>

                                <button
                                    onClick={() => { onImportClick(); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Upload size={16} className="text-gray-400" />
                                    Import JSON
                                </button>

                                <button
                                    onClick={() => { onExportClick(); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Download size={16} className="text-blue-500" />
                                    Export (JSON / PDF)
                                </button>

                                <div className="border-t border-gray-100" />

                                <a
                                    href="https://github.com/Aydong/hes-so-master-modules-planner"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <GithubIcon size={16} />
                                    GitHub
                                </a>

                                <button
                                    onClick={() => { onReset(); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
                                >
                                    <RefreshCw size={16} />
                                    Reset plan
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};
