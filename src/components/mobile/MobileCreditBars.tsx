import React from 'react';
import { cn } from '../../utils/cn';
import type { ValidationResult, ValidationRules } from '../../types';

interface Props {
    validation: ValidationResult;
    rules:      ValidationRules;
}

export const MobileCreditBars: React.FC<Props> = ({ validation, rules }) => {
    const indicators = [
        rules.TSM.max > 0 && { label: 'TSM', current: validation.tsm.count, rec: validation.tsm.rec, max: rules.TSM.max, minRec: rules.TSM.minRec, bar: 'bg-blue-500',    text: 'text-blue-600'    },
        rules.FTP.max > 0 && { label: 'FTP', current: validation.ftp.count, rec: validation.ftp.rec, max: rules.FTP.max, minRec: rules.FTP.minRec, bar: 'bg-purple-500',  text: 'text-purple-600'  },
        rules.MA.max  > 0 && { label: 'MA',  current: validation.ma.count,  rec: validation.ma.rec,  max: rules.MA.max,  minRec: rules.MA.minRec,  bar: 'bg-emerald-500', text: 'text-emerald-600' },
        rules.CM.max  > 0 && { label: 'CM',  current: validation.cm.count,  rec: 0,                  max: rules.CM.max,  minRec: rules.CM.minRec,  bar: 'bg-amber-500',   text: 'text-amber-600'   },
        rules.PI.max  > 0 && { label: 'PI',  current: validation.pi.count,  rec: validation.pi.rec,  max: rules.PI.max,  minRec: rules.PI.minRec,  bar: 'bg-gray-500',    text: 'text-gray-600'    },
        rules.MAP.max > 0 && { label: 'MAP', current: validation.map.count, rec: validation.map.rec, max: rules.MAP.max, minRec: rules.MAP.minRec, bar: 'bg-indigo-500',  text: 'text-indigo-600'  },
        rules.CSI.max > 0 && { label: 'CSI', current: validation.csi.count, rec: validation.csi.rec, max: rules.CSI.max, minRec: rules.CSI.minRec, bar: 'bg-purple-500',  text: 'text-purple-600'  },
    ].filter(Boolean) as { label: string; current: number; rec: number; max: number; minRec: number; bar: string; text: string }[];

    return (
        <div className="bg-white border-b border-gray-100 shrink-0">
            <div className="flex overflow-x-auto gap-3 px-4 py-2.5 scrollbar-none">
                {indicators.map(({ label, current, max, rec, minRec, bar, text }) => {
                    const pct    = Math.min(100, (current / max) * 100);
                    const isOver = current > max;
                    const recOk  = minRec === 0 || rec >= minRec;

                    return (
                        <div key={label} className="flex flex-col shrink-0" style={{ minWidth: '50px' }}>
                            <div className="flex justify-between items-baseline mb-1">
                                <span className={cn('text-[11px] font-bold', text)}>{label}</span>
                                <span className={cn('text-[11px] font-semibold',
                                    isOver        ? 'text-red-500' :
                                    current === max ? 'text-green-600' :
                                    'text-gray-600'
                                )}>
                                    {current}/{max}
                                </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={cn('h-full rounded-full transition-all duration-500', bar)}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            {minRec > 0 && (
                                <span className={cn('text-[9px] mt-0.5 font-medium leading-none', recOk ? 'text-green-600' : 'text-red-500')}>
                                    Rec {rec}/{minRec}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* Bonus dots */}
                <div className="flex flex-col shrink-0" style={{ minWidth: '56px' }}>
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[11px] font-bold text-gray-600">
                            Bonus {validation.bonus.count}/{rules.BONUS}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 h-1.5">
                        {Array.from({ length: rules.BONUS }).map((_, i) => (
                            <div key={i} className={cn('w-1.5 h-1.5 rounded-full transition-colors',
                                i < validation.bonus.count
                                    ? validation.bonus.count > rules.BONUS ? 'bg-red-500' : 'bg-emerald-400'
                                    : 'bg-gray-300'
                            )} />
                        ))}
                    </div>
                    <span className="text-[9px] mt-0.5">&nbsp;</span>
                </div>
            </div>
        </div>
    );
};
