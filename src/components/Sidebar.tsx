import React from 'react';
import { AddModule } from './AddModule';

export const Sidebar: React.FC = () => {
    return (
        <div className="p-6 flex flex-col gap-8 min-h-full">
            <section className="flex-1 min-h-[500px]">
                <AddModule />
            </section>
        </div>
    );
};
