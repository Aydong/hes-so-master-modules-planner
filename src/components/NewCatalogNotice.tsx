import React from 'react';
import { Sparkles, X } from 'lucide-react';

interface Props {
    newLabel: string;
    onSwitch: () => void;
    onDismiss: () => void;
}

export const NewCatalogNotice: React.FC<Props> = ({ newLabel, onSwitch, onDismiss }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button
                onClick={onDismiss}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
            >
                <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 rounded-full p-2">
                    <Sparkles size={20} className="text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">New catalog available</h2>
            </div>

            <p className="text-gray-600 text-sm mb-5">
                The <span className="font-medium text-gray-800">{newLabel}</span> course catalog is now available.
                Would you like to switch all your semesters to this new catalog?
            </p>

            <p className="text-xs text-gray-400 mb-5">
                You can always change the catalog per semester in the settings.
            </p>

            <div className="flex gap-3 justify-end">
                <button
                    onClick={onDismiss}
                    className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    Keep current
                </button>
                <button
                    onClick={onSwitch}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                    Switch to {newLabel}
                </button>
            </div>
        </div>
    </div>
);
