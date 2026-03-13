import React, { useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { getSemesterLabels } from '../utils/semesterUtils';
import type { StartingSemester } from '../utils/semesterUtils';
import { SemesterCheckboxList } from './SemesterCheckboxList';

type Sem = '1' | '2' | '3' | '4';

interface Props {
    startingSemester: StartingSemester;
    /** Number of selected courses per semester slot */
    counts: Record<Sem, number>;
    onExportJSON: (semesters: Sem[]) => void;
    onExportPDF:  (semesters: Sem[]) => void;
    onClose: () => void;
}

export const ExportDialog: React.FC<Props> = ({
    startingSemester, counts, onExportJSON, onExportPDF, onClose,
}) => {
    const labels = getSemesterLabels(startingSemester);

    const available = (['1', '2', '3', '4'] as Sem[]).filter(s => counts[s] > 0);
    const [selected, setSelected] = useState<Set<Sem>>(new Set(available));

    const toggle = (s: Sem) =>
        setSelected(prev => {
            const next = new Set(prev);
            next.has(s) ? next.delete(s) : next.add(s);
            return next;
        });

    const selectAll   = () => setSelected(new Set(available));
    const deselectAll = () => setSelected(new Set());

    const sems = [...selected] as Sem[];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

                {/* Header */}
                <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <Download size={18} />
                        <span className="font-bold text-base">Export Schedule</span>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Semester selection */}
                <div className="px-6 pt-5 pb-3">
                    <SemesterCheckboxList
                        title="Semesters to export"
                        labels={labels}
                        counts={counts}
                        selected={selected}
                        available={available}
                        onToggle={toggle}
                        onSelectAll={selectAll}
                        onDeselectAll={deselectAll}
                    />
                </div>

                {/* Actions */}
                <div className="px-6 pb-5 pt-3 flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={selected.size === 0}
                        onClick={() => { onExportJSON(sems); onClose(); }}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
                    >
                        <Download size={14} />
                        JSON
                    </button>
                    <button
                        disabled={selected.size === 0}
                        onClick={() => { onExportPDF(sems); onClose(); }}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
                    >
                        <FileText size={14} />
                        PDF
                    </button>
                </div>
            </div>
        </div>
    );
};
