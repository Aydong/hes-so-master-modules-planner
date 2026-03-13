import React, { useState } from 'react';
import { X, Upload, AlertTriangle, Info } from 'lucide-react';
import type { ScheduleExport } from '../store/useCourseStore';
import { getSemesterLabels } from '../utils/semesterUtils';
import { SemesterCheckboxList } from './SemesterCheckboxList';

type Sem = '1' | '2' | '3' | '4';

interface Props {
    data: ScheduleExport;
    onConfirm: (semesters: Sem[]) => void;
    onClose: () => void;
}

export const ImportDialog: React.FC<Props> = ({ data, onConfirm, onClose }) => {
    const labels = getSemesterLabels(data.startingSemester ?? 'SA');

    // Count courses per semester in the file
    const counts = (['1', '2', '3', '4'] as Sem[]).reduce<Record<Sem, number>>(
        (acc, s) => {
            acc[s] = data.selectedCourses.filter(c => c.assignedSemester === s).length;
            return acc;
        },
        { '1': 0, '2': 0, '3': 0, '4': 0 },
    );

    // Pre-select all semesters that have courses
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

    const exportedAt = new Date(data.exportedAt).toLocaleDateString('fr-CH', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

                {/* Header */}
                <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <Upload size={18} />
                        <span className="font-bold text-base">Import Schedule</span>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* File info */}
                <div className="px-6 pt-4 pb-2">
                    <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-1 border border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Info size={12} />
                            <span className="font-semibold text-gray-700">{data.programName}</span>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-400 mt-0.5">
                            <span>Exported {exportedAt}</span>
                            <span>Start: {data.startingSemester === 'SA' ? 'Autumn' : 'Spring'}</span>
                            <span>{data.selectedCourses.length} courses total</span>
                        </div>
                    </div>
                </div>

                {/* Semester selection */}
                <div className="px-6 pt-2 pb-3">
                    <SemesterCheckboxList
                        title="Semesters to import"
                        labels={labels}
                        counts={counts}
                        selected={selected}
                        available={available}
                        onToggle={toggle}
                        onSelectAll={selectAll}
                        onDeselectAll={deselectAll}
                    />
                </div>

                {/* Warning */}
                <div className="px-6 pb-4">
                    <div className="flex items-start gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        <span>Existing courses in the selected semesters will be replaced.</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-5 flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={selected.size === 0}
                        onClick={() => onConfirm([...selected])}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
                    >
                        <Upload size={14} />
                        Import {selected.size < available.length && selected.size > 0
                            ? `${selected.size} semester${selected.size > 1 ? 's' : ''}`
                            : 'All'}
                    </button>
                </div>
            </div>
        </div>
    );
};
