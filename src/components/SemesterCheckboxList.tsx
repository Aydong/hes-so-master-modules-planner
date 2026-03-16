import React from 'react';
import { cn } from '../utils/cn';

type Sem = '1' | '2' | '3' | '4';

interface Props {
    title:        string;
    labels:       Record<Sem, string>;
    counts:       Record<Sem, number>;
    selected:     Set<Sem>;
    available:    Sem[];
    onToggle:     (s: Sem) => void;
    onSelectAll:  () => void;
    onDeselectAll: () => void;
}

export const SemesterCheckboxList: React.FC<Props> = ({
    title, labels, counts, selected, available, onToggle, onSelectAll, onDeselectAll,
}) => (
    <div>
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
            <div className="flex gap-2">
                <button onClick={onSelectAll}   className="text-xs text-blue-500 hover:text-blue-700 font-medium">All</button>
                <span className="text-gray-300">|</span>
                <button onClick={onDeselectAll} className="text-xs text-gray-400 hover:text-gray-600 font-medium">None</button>
            </div>
        </div>

        <div className="flex flex-col gap-2">
            {(['1', '2', '3', '4'] as Sem[]).map(s => {
                const n       = counts[s];
                const isEmpty = !available.includes(s);
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
                                onChange={() => onToggle(s)}
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
);
