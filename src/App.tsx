import { Layout } from './components/Layout';
import { MasterSpecializationSelector } from './components/MasterSpecializationSelector';
import { ImportDialog } from './components/ImportDialog';
import { useCourseStore } from './store/useCourseStore';
import type { ScheduleExport } from './store/useCourseStore';
import { initializePrograms, getProgramById } from './data/programs';
import { getShareHashParam, decodeSharePayload, clearShareHash } from './utils/urlShare';
import { useEffect, useState } from 'react';

function App() {
  const { refreshData, currentProgramId, importSchedule } = useCourseStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [shareImportData, setShareImportData] = useState<ScheduleExport | null>(null);

  useEffect(() => {
    const init = async () => {
      await initializePrograms();
      refreshData();

      const hashParam = getShareHashParam();
      if (hashParam) {
        const payload = decodeSharePayload(hashParam);
        if (payload) {
          const program = getProgramById(payload.p);
          if (program) {
            const courseMap = new Map(program.courses.map(c => [c.module, c]));
            const selectedCourses = payload.c.flatMap(({ m, a }) => {
              const course = courseMap.get(m);
              return course ? [{ ...course, assignedSemester: a }] : [];
            });
            setShareImportData({
              version: '1.0',
              exportedAt: new Date().toISOString(),
              programId: payload.p,
              programName: program.name,
              startingSemester: payload.s,
              selectedCourses,
            });
          }
        }
        clearShareHash();
      }

      setIsInitialized(true);
    };
    init();
  }, [refreshData]);

  if (!isInitialized) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading programs.<br />Please wait young padawan you are on the way to master the planner force...</p>
      </div>
    </div>;
  }

  const handleShareImportConfirm = (sems: ('1'|'2'|'3'|'4')[]) => {
    if (!shareImportData) return;
    const outcome = importSchedule(JSON.stringify(shareImportData), sems);
    if (!outcome.success) alert(`Import failed: ${outcome.error}`);
    setShareImportData(null);
  };

  if (!currentProgramId) {
    return (
      <>
        <MasterSpecializationSelector />
        {shareImportData && (
          <ImportDialog
            data={shareImportData}
            onConfirm={handleShareImportConfirm}
            onClose={() => setShareImportData(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Layout />
      {shareImportData && (
        <ImportDialog
          data={shareImportData}
          onConfirm={handleShareImportConfirm}
          onClose={() => setShareImportData(null)}
        />
      )}
    </>
  );
}

export default App;
