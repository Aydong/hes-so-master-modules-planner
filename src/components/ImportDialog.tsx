import React, { useState } from 'react';
import { X, Upload, AlertTriangle, Info } from 'lucide-react';
import type { ScheduleExport } from '../store/useCourseStore';
import { getSemesterLabels } from '../utils/semesterUtils';
import { cn } from '../utils/cn';

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
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Semesters to import
                        </span>
                        <div className="flex gap-2">
                            <button onClick={selectAll}   className="text-xs text-blue-500 hover:text-blue-700 font-medium">All</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={deselectAll} className="text-xs text-gray-400 hover:text-gray-600 font-medium">None</button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        {(['1', '2', '3', '4'] as Sem[]).map(s => {
                            const n       = counts[s];
                            const isEmpty = n === 0;
                            const checked = selected.has(s);
                            return (
                                <label
                                    key={s}
                                    className={cn(
                                        'flex items-center justify-between px-4 py-2.5 rounded-xl border cursor-pointer transition-all select-none',
                                        isEmpty
                                            ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50'
                                            : checked
                                                ? 'border-blue-300 bg-blue-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            disabled={isEmpty}
                                            checked={checked}
                                            onChange={() => toggle(s)}
                                            className="accent-blue-600 w-4 h-4"
                                        />
                                        <span className={cn(
                                            'text-sm font-medium',
                                            checked && !isEmpty ? 'text-blue-700' : 'text-gray-600'
                                        )}>
                                            {labels[s]}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        'text-xs font-bold px-2 py-0.5 rounded-full',
                                        isEmpty
                                            ? 'bg-gray-100 text-gray-400'
                                            : checked
                                                ? 'bg-blue-100 text-blue-600'
                                                : 'bg-gray-100 text-gray-500'
                                    )}>
                                        {n} course{n !== 1 ? 's' : ''}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
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
