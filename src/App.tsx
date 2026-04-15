import { Layout } from './components/Layout';
import { MasterSpecializationSelector } from './components/MasterSpecializationSelector';
import { ImportDialog } from './components/ImportDialog';
import { useCourseStore } from './store/useCourseStore';
import type { ScheduleExport } from './store/useCourseStore';
import { initializePrograms, getProgramById, getProgramByIdAndCatalog } from './data/programs';
import { getCourseIndex } from './data/dataLoader';
import { getShareHashParam, decodeSharePayload, clearShareHash } from './utils/urlShare';
import { useEffect, useState } from 'react';

function App() {
  const { refreshData, currentProgramId, importSchedule, catalogFiles, setCatalogFiles } = useCourseStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [shareImportData, setShareImportData] = useState<ScheduleExport | null>(null);

  // Serialize catalogFiles for useEffect dependency (avoid object reference instability)
  const catalogFilesKey = JSON.stringify(catalogFiles);

  useEffect(() => {
    const init = async () => {
      const index = await getCourseIndex();
      const validFiles = new Set(index.years.map(y => y.file));

      // Validate each semester's catalogFile and replace invalid ones with default
      const semesters = ['1', '2', '3', '4'] as const;
      const validated = { ...catalogFiles };
      let anyChanged = false;
      for (const sem of semesters) {
        if (!validFiles.has(catalogFiles[sem])) {
          validated[sem] = index.default;
          anyChanged = true;
        }
      }

      if (anyChanged) {
        await setCatalogFiles(validated);
        return; // setCatalogFiles triggers a re-render which re-runs this effect
      }

      // Initialize programs for all unique catalogue files in parallel
      const uniqueFiles = [...new Set(Object.values(catalogFiles))];
      await Promise.all(uniqueFiles.map(f => initializePrograms(f)));
      refreshData();

      const hashParam = getShareHashParam();
      if (hashParam) {
        const payload = decodeSharePayload(hashParam);
        if (payload) {
          // Resolve per-semester catalogues from the share payload
          const sharedFiles: Record<'1'|'2'|'3'|'4', string> = payload.y4
            ?? (payload.y
              ? { '1': payload.y, '2': payload.y, '3': payload.y, '4': payload.y }
              : catalogFiles);

          // Load any catalogue not already in memory
          const uniqueSharedFiles = [...new Set(Object.values(sharedFiles))];
          await Promise.all(uniqueSharedFiles.map(f => initializePrograms(f)));

          // Look up the program; fall back across all loaded catalogues
          const program = getProgramById(payload.p)
            ?? getProgramByIdAndCatalog(payload.p, sharedFiles['1']);

          if (program) {
            // For each course in the payload, look it up from its semester's catalogue
            const selectedCourses = payload.c.flatMap(({ m, a }) => {
              const prog = getProgramByIdAndCatalog(payload.p, sharedFiles[a]) ?? program;
              const course = prog.courses.find(c => c.module === m);
              return course ? [{ ...course, assignedSemester: a }] : [];
            });

            setShareImportData({
              version: '1.0',
              exportedAt: new Date().toISOString(),
              programId: payload.p,
              programName: program.name,
              startingSemester: payload.s,
              catalogFiles: sharedFiles,
              selectedCourses,
            });
          }
        }
        clearShareHash();
      }

      setIsInitialized(true);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshData, catalogFilesKey]);

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
