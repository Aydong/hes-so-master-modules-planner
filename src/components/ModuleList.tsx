import React from 'react';
import { useCourseStore } from '../store/useCourseStore';
import { cn } from '../utils/cn';
import { getProgramById } from '../data/programs';

export const ModuleList: React.FC = () => {
    const { getSelectedCourses } = useCourseStore();
    const selectedCourses = getSelectedCourses();

    const selectedECTS = selectedCourses.reduce((sum, course) => sum + (course.credits || 3), 0);

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

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">


            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium">Total ECTS:</span>
                <span className={cn(
                    "px-3 py-1 rounded-lg font-bold text-sm",
                    totalECTS >= 90 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                )}>
                    {selectedECTS} <span className="font-normal">(selected modules)</span>
                    {' '}
                    {program?.masterCode === 'ICS' ? (
                        <> + 30 <span className="font-normal">(TM)</span> + 30 <span className="font-normal">(Brasov)</span></>
                    ) : program?.masterCode === 'CE' ? (
                        <> + 30 <span className="font-normal">(TM)</span></>
                    ) : (
                        <> + 6 <span className="font-normal">(PA)</span> + 30 <span className="font-normal">(TM)</span></>
                    )} = {totalECTS}
                    
                </span>
            </div>
        </div>
    );
};
