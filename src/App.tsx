import { Layout } from './components/Layout';
import { MasterSpecializationSelector } from './components/MasterSpecializationSelector';
import { useCourseStore } from './store/useCourseStore';
import { initializePrograms } from './data/programs';
import { useEffect, useState } from 'react';

function App() {
  const { refreshData, currentProgramId } = useCourseStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initializePrograms();
      refreshData();
      setIsInitialized(true);
    };
    init();
  }, [refreshData]);

  if (!isInitialized) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading programs...</p>
      </div>
    </div>;
  }

  if (!currentProgramId) {
    return <MasterSpecializationSelector />;
  }

  return (
    <Layout />
  );
}

export default App;
