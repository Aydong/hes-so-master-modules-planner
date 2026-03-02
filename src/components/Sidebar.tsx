import type { ValidationResult, ValidationRules } from '../types';
import { AddModule } from './AddModule';
import { cn } from '../utils/cn';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface SidebarProps {
    validation: ValidationResult;
    rules: ValidationRules;
}

const ConstraintItem = ({
    label,
    current,
    max,
    minRec,
    rec,
    valid,
    message,
    colorClass,
    barColorClass
}: {
    label: string;
    current: number;
    max: number;
    minRec?: number;
    rec?: number;
    valid: boolean;
    message: string;
    colorClass: string;
    barColorClass: string;
}) => (
    <div className="mb-4">
        <div className="flex justify-between items-baseline mb-1">
            <span className={cn("font-bold text-lg", colorClass)}>{label}</span>
            <span className="text-sm text-gray-500 font-medium">{current} / {max} Max</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
                className={cn("h-full transition-all duration-500", barColorClass)}
                style={{ width: `${Math.min(100, (current / max) * 100)}%` }}
            />
        </div>
        <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">
                {minRec ? `Rec: ${rec ?? 0} / ${minRec}` : 'No Min Rec'}
            </span>
            <div className={cn(
                "px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1",
                valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
                {valid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {message}
            </div>
        </div>
    </div>
);

export const Sidebar: React.FC<SidebarProps> = ({ validation, rules }) => {
    return (
        <div className="p-6 flex flex-col gap-8 min-h-full">
            {/* Constraints Check */}
            <section>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="bg-blue-600 text-white p-1 rounded">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 11l3 3L22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                    </span>
                    Constraints Check
                </h2>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-gray-700">Bonus Credits</span>
                        <div className="flex gap-1">
                            {Array.from({ length: rules.BONUS }).map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-2.5 h-2.5 rounded-full transition-colors",
                                        i < validation.bonus.count ? "bg-emerald-400" : "bg-gray-200"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">Max {rules.BONUS} ECTS overflow allowed</p>
                </div>

                <ConstraintItem
                    label="TSM"
                    current={validation.tsm.count}
                    max={rules.TSM.max}
                    minRec={rules.TSM.minRec}
                    rec={validation.tsm.rec}
                    valid={validation.tsm.valid}
                    message={validation.tsm.message || ''}
                    colorClass="text-blue-600"
                    barColorClass="bg-blue-600"
                />
                <ConstraintItem
                    label="FTP"
                    current={validation.ftp.count}
                    max={rules.FTP.max}
                    minRec={rules.FTP.minRec}
                    rec={validation.ftp.rec}
                    valid={validation.ftp.valid}
                    message={validation.ftp.message || ''}
                    colorClass="text-purple-600"
                    barColorClass="bg-purple-600"
                />
                <ConstraintItem
                    label="MA"
                    current={validation.ma.count}
                    max={rules.MA.max}
                    minRec={rules.MA.minRec}
                    rec={validation.ma.rec}
                    valid={validation.ma.valid}
                    message={validation.ma.message || ''}
                    colorClass="text-emerald-500"
                    barColorClass="bg-emerald-500"
                />
                <ConstraintItem
                    label="CM"
                    current={validation.cm.count}
                    max={rules.CM.max}
                    minRec={rules.CM.minRec}
                    valid={validation.cm.valid}
                    message={validation.cm.message || ''}
                    colorClass="text-amber-500"
                    barColorClass="bg-amber-500"
                />
            </section>

            {/* Add Module */}
            <section className="flex-1 min-h-[500px]">
                <AddModule />
            </section>
        </div>
    );
};
