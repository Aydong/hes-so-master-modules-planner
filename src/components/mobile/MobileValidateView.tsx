import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { ValidationResult, ValidationRules } from '../../types';
import { getProgramById } from '../../data/programs';
import { useCourseStore } from '../../store/useCourseStore';


interface MobileValidateViewProps {
    validation: ValidationResult;
    rules: ValidationRules;
    hasCollisions: boolean;
    collisionCount: number;
}

export const MobileValidateView: React.FC<MobileValidateViewProps> = ({
    validation,
    rules,
    hasCollisions,
    collisionCount,
}) => {
    const planStatus = !validation.isValid ? 'invalid' : hasCollisions ? 'warning' : 'valid';

    const selectedECTS = validation.totalEcts;

    const totalECTS_default = selectedECTS + 30 + 6; // default: 30 ECTS TM, 6 PA
    const totalECTS_ICS = selectedECTS + 30 + 30;    // ICS: 30 TM + 30 Brasov
    const totalECTS_CE = selectedECTS + 30;          // CE: 30 TM only
    
    const programId = useCourseStore().currentProgramId;
    const program = getProgramById(programId || '');

    const totalECTS = program?.masterCode === 'ICS'
        ? totalECTS_ICS
        : program?.masterCode === 'CE'
            ? totalECTS_CE
            : totalECTS_default;

    const indicators = [
        rules.TSM.max > 0 && { label: 'TSM', current: validation.tsm.count, rec: validation.tsm.rec, max: rules.TSM.max, minRec: rules.TSM.minRec, barClass: 'bg-blue-500' },
        rules.FTP.max > 0 && { label: 'FTP', current: validation.ftp.count, rec: validation.ftp.rec, max: rules.FTP.max, minRec: rules.FTP.minRec, barClass: 'bg-purple-500' },
        rules.MA.max  > 0 && { label: 'MA',  current: validation.ma.count,  rec: validation.ma.rec,  max: rules.MA.max,  minRec: rules.MA.minRec,  barClass: 'bg-emerald-500' },
        rules.CM.max  > 0 && { label: 'CM',  current: validation.cm.count,  rec: 0,                  max: rules.CM.max,  minRec: rules.CM.minRec,  barClass: 'bg-amber-500' },
        rules.PI.max  > 0 && { label: 'PI',  current: validation.pi.count,  rec: validation.pi.rec,  max: rules.PI.max,  minRec: rules.PI.minRec,  barClass: 'bg-gray-500' },
        rules.MAP.max > 0 && { label: 'MAP', current: validation.map.count, rec: validation.map.rec, max: rules.MAP.max, minRec: rules.MAP.minRec, barClass: 'bg-indigo-500' },
        rules.CSI.max > 0 && { label: 'CSI', current: validation.csi.count, rec: validation.csi.rec, max: rules.CSI.max, minRec: rules.CSI.minRec, barClass: 'bg-purple-500' },
    ].filter(Boolean) as { label: string; current: number; rec: number; max: number; minRec: number; barClass: string }[];

    const issues = [
        validation.tsm, validation.ftp, validation.ma,
        validation.cm, validation.pi, validation.map,
        validation.csi, validation.bonus,
    ].filter(v => v.message && !v.valid);

    const warnings: string[] = [];
    if (hasCollisions) warnings.push(`${collisionCount} collision${collisionCount !== 1 ? 's' : ''} horaire`);
    if (!validation.outOfSpec.valid && validation.outOfSpec.message) warnings.push(validation.outOfSpec.message);

    return (
        <div className="space-y-4 pb-2">
            {/* Status banner */}
            <div className={cn(
                'flex items-center gap-3 p-4 rounded-xl',
                planStatus === 'valid'   ? 'bg-green-50 text-green-700' :
                planStatus === 'warning' ? 'bg-orange-50 text-orange-600' :
                'bg-red-50 text-red-600'
            )}>
                {planStatus === 'valid'   && <CheckCircle2 size={22} className="shrink-0" />}
                {planStatus === 'warning' && <AlertTriangle size={22} className="shrink-0" />}
                {planStatus === 'invalid' && <XCircle size={22} className="shrink-0" />}
                <div>
                    <p className="text-sm font-bold">
                        {planStatus === 'valid'   ? 'Plan is valid' :
                         planStatus === 'warning' ? 'Plan has warnings' :
                         'Plan is invalid'}
                    </p>
                    {hasCollisions && (
                        <p className="text-xs font-medium mt-0.5">
                            {collisionCount} schedule collision{collisionCount !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
            </div>

            {/* Credit bars */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Credits</p>
                </div>
                <div className="p-4 space-y-4">
                    {indicators.map(({ label, current, rec, max, minRec, barClass }) => {
                        const pct = Math.min(100, (current / max) * 100);
                        const isOver = current > max;
                        const recOk = minRec === 0 || rec >= minRec;

                        return (
                            <div key={label}>
                                <div className="flex justify-between items-baseline mb-1.5">
                                    <span className="text-sm font-bold text-gray-700">{label}</span>
                                    <div className="flex items-center gap-3 text-xs">
                                        {minRec > 0 && (
                                            <span className={cn('font-medium', recOk ? 'text-green-600' : 'text-red-500')}>
                                                Rec {rec}/{minRec}
                                            </span>
                                        )}
                                        <span className={cn(
                                            'font-bold',
                                            isOver ? 'text-red-500' :
                                            current === max ? 'text-green-600' :
                                            'text-gray-700'
                                        )}>
                                            {current}/{max} ECTS
                                        </span>
                                    </div>
                                </div>
                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={cn('h-full rounded-full transition-all duration-500', isOver ? 'bg-red-500' : barClass)}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {/* Bonus */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-700">BONUS</span>
                                    {Array.from({ length: rules.BONUS }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                'w-3 h-3 rounded-full transition-colors',
                                                i < validation.bonus.count
                                                    ? validation.bonus.count > rules.BONUS ? 'bg-red-500' : 'bg-emerald-400'
                                                    : 'bg-gray-200'
                                            )}
                                        />
                                    ))}
                                </div>
                            <span className={cn(
                                'text-xs font-bold',
                                validation.bonus.count > rules.BONUS ? 'text-red-500' : 'text-gray-700'
                            )}>
                                {validation.bonus.count}/{rules.BONUS}
                            </span>
                        </div>

                    </div>
                </div>
                {/* ECTS Total */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-sm font-bold text-gray-700">
                        Total: {selectedECTS}
                        {program?.masterCode === 'ICS' ? (
                            <> + 30 <span className="font-normal">(TM)</span> + 30 <span className="font-normal">(Brasov)</span></>
                        ) : program?.masterCode === 'CE' ? (
                            <> + 30 <span className="font-normal">(TM)</span></>
                        ) : (
                            <> + 6 <span className="font-normal">(PA)</span> + 30 <span className="font-normal">(TM)</span></>
                        )} = {totalECTS} ECTS
                    </p>
                </div>
            </div>

            {/* Errors */}
            {issues.length > 0 && (
                <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-red-100 bg-red-50/50">
                        <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Issues to fix</p>
                    </div>
                    <div className="p-4 space-y-2">
                        {issues.map((v, i) => (
                            <p key={i} className="text-sm text-red-600 flex items-start gap-2">
                                <XCircle size={14} className="shrink-0 mt-0.5" />
                                {v.message}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
                <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-orange-100 bg-orange-50/50">
                        <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">Warnings</p>
                    </div>
                    <div className="p-4 space-y-2">
                        {warnings.map((w, i) => (
                            <p key={i} className="text-sm text-orange-600 flex items-start gap-2">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                {w}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
