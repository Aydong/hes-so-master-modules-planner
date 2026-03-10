import React, { useState, useEffect } from 'react';
import { useCourseStore } from '../store/useCourseStore';
import { getMastersData } from '../data/dataLoader';
import { GraduationCap, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react';
import type { Master, Specialization } from '../data/dataLoader';
import Disclaimer from './Disclaimer';

export const MasterSpecializationSelector: React.FC = () => {
    const setProgram = useCourseStore((state) => state.setProgram);
    
    const [masters, setMasters] = useState<Master[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);

    useEffect(() => {
        const loadMasters = async () => {
            try {
                const data = await getMastersData();
                setMasters(data.masters);
            } catch (error) {
                console.error('Failed to load masters:', error);
            } finally {
                setLoading(false);
            }
        };

        loadMasters();
    }, []);

    const handleMasterSelect = (master: Master) => {
        setSelectedMaster(master);
    };

    const handleSpecializationSelect = (specialization: Specialization) => {
        if (!selectedMaster) return;
        
        const programId = `${selectedMaster.code}-${specialization.code || selectedMaster.code}`;
        setProgram(programId);
    };

    const handleBack = () => {
        setSelectedMaster(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading masters...</p>
                </div>
            </div>
        );
    }

    if (selectedMaster) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="max-w-4xl w-full">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-8 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Change Master
                    </button>

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-200">
                            <GraduationCap size={32} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            {selectedMaster.name}
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Select your specialization to start planning your courses.
                        </p>
                    </div>

                    {/* Disclaimer Alert */}
                    <Disclaimer />

                    <div className="grid md:grid-cols-2 gap-6">
                        {selectedMaster.specializations.map((spec) => (
                            <button
                                key={spec.code || 'default'}
                                onClick={() => handleSpecializationSelect(spec)}
                                className="group relative bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 text-left"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-t-2xl" />

                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                    {spec.name}
                                </h3>
                                {spec.code && selectedMaster.specializations.length > 1 && (
                                    <p className="text-sm text-gray-500 mb-6">
                                        Specialization: {spec.code}
                                    </p>
                                )}

                                <div className="flex items-center text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                    Start Planning <ArrowRight size={16} className="ml-2" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-200">
                        <GraduationCap size={32} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Select your Master Program</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Choose your master to start planning your courses.
                        Each program has its own specific modules and requirements.
                    </p>
                </div>

                {/* Disclaimer Alert */}
                <Disclaimer />

                <div className="grid md:grid-cols-2 gap-6">
                    {masters.map((master) => (
                        <div
                            key={master.code}
                            className="group relative bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-t-2xl" />

                            {/* Link button in top right */}
                            {master.link && (
                                <a
                                    href={master.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="View master details"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink size={20} />
                                </a>
                            )}

                            <button
                                onClick={() => handleMasterSelect(master)}
                                className="w-full text-left group"
                            >
                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                    {master.name}
                                </h3>
                                <p className="text-gray-500 mb-6 leading-relaxed">
                                    {master.specialization_count} {master.specialization_count === 1 ? 'specialization' : 'specializations'}
                                </p>

                                <div className="flex items-center text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                    Continue <ArrowRight size={16} className="ml-2" />
                                </div>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};