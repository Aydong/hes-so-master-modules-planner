import React from 'react';
import { Info, ExternalLink } from 'lucide-react';

// Disclaimer component
const Disclaimer: React.FC = () => (
    <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8 flex gap-3 text-sm text-red-800 shadow-sm">
        <Info className="shrink-0 mt-0.5" size={18} />
        <div className="space-y-2">
            <p className="font-medium">
                Information updated Mars 2026 based on official HES-SO data.
            </p>
            <p className="text-red-700/80">
                Brasov modules for the ICS - Information and Cybersecurity program are currently not available in this app.
            </p>
            <p className="text-red-700/80">
                This is an <b>unofficial</b> tool created by a student for students. It is not affiliated with MSE and may not be 100% accurate. 
                <br />Always double-check with official sources and your academic advisor before making decisions based on this planner. 
                <br />Verify all details with the official<b>{' '}
                <a
                    href="https://www.hes-so.ch/fileadmin/documents/HES-SO/Documents_HES-SO/pdf/ingenierie_architecture/master/Engineering_MSE/MSE_ModuleOfferSchedule_AllProfiles_25-26.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-red-900 inline-flex items-center gap-1"
                >
                    Modules Plan Schedule (PDF) <ExternalLink size={12} />
                </a></b>
            </p>
        </div>
    </div>
);

export default Disclaimer;