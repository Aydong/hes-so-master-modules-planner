/**
 * Client-side schedule generator page
 *
 * Form mode  : /generate                             - interactive UI
 * URL mode   : /generate?program=DS-DS&courses=...   - programmatic, redirects to plan
 *              add &redirect=0 to see JSON result
 */

import { useEffect, useRef, useState } from 'react';
import { useCourseStore } from '../store/useCourseStore';
import { Search, X, ArrowUp, ArrowDown, CheckCircle, AlertTriangle, Copy, ExternalLink, ChevronRight } from 'lucide-react';
import { initializePrograms, getAllPrograms } from '../data/programs';
import { getCoursesBySpecialization } from '../data/dataLoader';
import { validateConstraints } from '../utils/validation';
import { encodeSharePayload } from '../utils/urlShare';
import type { Course, SelectedCourse, ValidationRules } from '../types';
import type { StartingSemester } from '../utils/semesterUtils';
import { courseToAssignedSemester } from '../utils/semesterUtils';
import type { Program } from '../data/programs';
import { cn } from '../utils/cn';

// Collision helpers 

function extractTimeBlocks(tb: string) { return tb.match(/TB[1-4]/g) ?? []; }
function timeBlocksOverlap(b1: string, b2: string) {
    const s = new Set(extractTimeBlocks(b1));
    return extractTimeBlocks(b2).some(b => s.has(b));
}
function hasCollision(candidate: SelectedCourse, selected: SelectedCourse[]) {
    return selected.some(c =>
        c.assignedSemester === candidate.assignedSemester &&
        c.WeekDay === candidate.WeekDay &&
        timeBlocksOverlap(c.TimeBlock, candidate.TimeBlock),
    );
}
function tryAssign(
    course: SelectedCourse,
    startingSemester: StartingSemester,
    selected: SelectedCourse[],
    maxYears: 1 | 2 = 1,
): SelectedCourse | null {
    for (const year of (maxYears === 1 ? [1] : [1, 2]) as Array<1 | 2>) {
        const candidate = { ...course, assignedSemester: courseToAssignedSemester(course.Semester, year, startingSemester) };
        if (!hasCollision(candidate, selected)) return candidate;
    }
    return null;
}

// Credit helpers 

const CATS = ['TSM', 'FTP', 'MA', 'CM', 'PI', 'MAP', 'CSI'] as const;

function computeStats(courses: SelectedCourse[]) {
    const stats: Record<string, { count: number; rec: number }> = Object.fromEntries(CATS.map(c => [c, { count: 0, rec: 0 }]));
    for (const c of courses) {
        const p = c.module.split('_')[0]; const cr = c.credits ?? 3;
        if (stats[p]) { stats[p].count += cr; if (c.type === 'R' || c.type === 'C') stats[p].rec += cr; }
    }
    return stats;
}
function computeTotalOverflow(courses: SelectedCourse[], rules: ValidationRules) {
    const s = computeStats(courses);
    return CATS.reduce((sum, cat) => rules[cat].max === 0 ? sum : sum + Math.max(0, s[cat].count - rules[cat].max), 0);
}
function categoryNeedsMore(prefix: string, courses: SelectedCourse[], rules: ValidationRules) {
    const r = rules[prefix as keyof ValidationRules];
    if (!r || typeof r !== 'object' || (r as { max: number }).max === 0) return false;
    const rr = r as { max: number; minRec: number };
    const s = computeStats(courses)[prefix] ?? { count: 0, rec: 0 };
    return s.count < rr.max || s.rec < rr.minRec;
}

// Core generation logic 

interface GenerateResult {
    url: string; valid: boolean; warnings: string[];
    program: string; programName: string; startingSemester: string;
    stats: { totalCourses: number; totalEcts: number; preferencesSatisfied: string[]; preferencesSkipped: string[]; avoided: string[] };
}

async function runGeneration(
    programs: Program[],
    programParam: string,
    preferences: string[],
    avoidList: string[],
    startingSemester: StartingSemester,
    maxYears: 1 | 2,
    catalogFile: string,
): Promise<GenerateResult> {
    const program = programs.find(p => p.id === programParam || p.id.toLowerCase() === programParam.toLowerCase());
    if (!program) throw new Error(`Program "${programParam}" not found. Available: ${programs.map(p => p.id).join(', ')}`);

    const courses = await getCoursesBySpecialization(program.masterCode, program.specializationCode, catalogFile);
    const avoidSet = new Set(avoidList);
    const prefSet = new Set(preferences);
    const rules = program.validationRules;
    const warnings: string[] = [];
    const selected: SelectedCourse[] = [];
    const actuallyAvoided: string[] = [];

    const mandatory = courses.filter(c => c.type === 'C');
    const preferred = preferences
        .map(mod => courses.find(c => c.module === mod))
        .filter((c): c is NonNullable<typeof c> => c !== undefined && c.type !== 'C');

    const avoidPriority = new Map(avoidList.map((mod, i) => [mod, i]));
    const poolBase = courses.filter(c => c.type !== 'C' && !prefSet.has(c.module));
    const poolNormal = poolBase.filter(c => !avoidSet.has(c.module)).sort((a, b) => (a.type === 'R' ? -1 : b.type === 'R' ? 1 : 0));
    const poolAvoided = poolBase.filter(c => avoidSet.has(c.module)).sort((a, b) => {
        const d = (avoidPriority.get(b.module) ?? 0) - (avoidPriority.get(a.module) ?? 0);
        return d !== 0 ? d : (a.type === 'R' ? -1 : b.type === 'R' ? 1 : 0);
    });

    for (const mod of preferences) { if (!courses.some(c => c.module === mod)) warnings.push(`Preferred "${mod}" not found in ${program.id} - skipped.`); }
    for (const mod of avoidList)   { if (!courses.some(c => c.module === mod)) warnings.push(`Avoid "${mod}" not found in ${program.id} - ignored.`); }

    // 1. Mandatory
    for (const c of mandatory) {
        const base: SelectedCourse = { ...c, assignedSemester: '1' };
        const assigned = tryAssign(base, startingSemester, selected, maxYears);
        if (assigned) { selected.push(assigned); }
        else { selected.push({ ...c, assignedSemester: courseToAssignedSemester(c.Semester, 1, startingSemester) }); warnings.push(`Compulsory "${c.module}" has a collision - placed anyway.`); }
    }

    // 2. Preferred (in exact order; skipped only on overflow or collision)
    const prefSatisfied: string[] = [];
    const prefSkipped:   string[] = [];
    for (const c of preferred) {
        const prefix = c.module.split('_')[0]; const credits = c.credits ?? 3;
        const catRule = rules[prefix as keyof ValidationRules] as { max: number } | undefined;
        if (catRule && catRule.max > 0) {
            const catCount = computeStats(selected)[prefix]?.count ?? 0;
            const wouldOverflow = Math.max(0, catCount + credits - catRule.max);
            if (computeTotalOverflow(selected, rules) + wouldOverflow > rules.BONUS) {
                warnings.push(`Preferred "${c.module}" skipped - ${prefix} credit limit reached.`);
                prefSkipped.push(c.module); continue;
            }
        }
        const base: SelectedCourse = { ...c, assignedSemester: '1' };
        const assigned = tryAssign(base, startingSemester, selected, maxYears);
        if (assigned) { selected.push(assigned); prefSatisfied.push(c.module); }
        else          { warnings.push(`Preferred "${c.module}" collides - skipped.`); prefSkipped.push(c.module); }
    }

    // 3. Fill
    const tryFill = (pool: Course[]) => {
        for (const c of pool) {
            if (validateConstraints(selected, rules).isValid) break;
            const prefix = c.module.split('_')[0];
            if (!categoryNeedsMore(prefix, selected, rules)) continue;
            const credits = c.credits ?? 3;
            const catRule = rules[prefix as keyof ValidationRules] as { max: number } | undefined;
            const catCount = computeStats(selected)[prefix]?.count ?? 0;
            if (computeTotalOverflow(selected, rules) + (catRule ? Math.max(0, catCount + credits - catRule.max) : 0) > rules.BONUS) continue;
            const assigned = tryAssign({ ...c, assignedSemester: '1' }, startingSemester, selected, maxYears);
            if (assigned) { selected.push(assigned); if (avoidSet.has(c.module)) actuallyAvoided.push(c.module); }
        }
    };
    tryFill(poolNormal);
    tryFill(poolAvoided);
    if (actuallyAvoided.length > 0) warnings.push(`Could not avoid: ${actuallyAvoided.join(', ')} (needed to complete the plan).`);

    const validation = validateConstraints(selected, rules);
    if (!validation.isValid) {
        (['tsm', 'ftp', 'ma', 'cm', 'pi', 'map', 'csi', 'bonus'] as const).forEach(k => {
            if (!validation[k].valid) warnings.push(validation[k].message ?? `${k.toUpperCase()} invalid`);
        });
    }

    const encoded = encodeSharePayload(program.id, startingSemester, selected);
    const base = window.location.origin + window.location.pathname.replace(/\/generate\/?$/, '/');
    return {
        url: `${base}#plan=${encoded}`,
        valid: validation.isValid,
        warnings,
        program: program.id,
        programName: program.name,
        startingSemester,
        stats: { totalCourses: selected.length, totalEcts: validation.totalEcts, preferencesSatisfied: prefSatisfied, preferencesSkipped: prefSkipped, avoided: actuallyAvoided },
    };
}

// Sub-components 

function CourseChip({ code, onRemove, onUp, onDown }: { code: string; onRemove: () => void; onUp?: () => void; onDown?: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs font-mono text-blue-800">
            {code}
            {onUp   && <button onClick={onUp}   className="text-blue-400 hover:text-blue-700"><ArrowUp   size={10} /></button>}
            {onDown && <button onClick={onDown} className="text-blue-400 hover:text-blue-700"><ArrowDown size={10} /></button>}
            <button onClick={onRemove} className="text-blue-400 hover:text-red-500 ml-0.5"><X size={11} /></button>
        </span>
    );
}

function CourseListInput({ label, description, courses, list, onChange }: {
    label: string; description: string;
    courses: Course[]; list: string[]; onChange: (l: string[]) => void;
}) {
    const [query, setQuery] = useState('');
    const [open,  setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const filtered = query.length >= 1
        ? courses.filter(c => !list.includes(c.module) && (c.module.toLowerCase().includes(query.toLowerCase()) || c.title.toLowerCase().includes(query.toLowerCase()))).slice(0, 8)
        : [];

    useEffect(() => {
        function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const add = (mod: string) => { onChange([...list, mod]); setQuery(''); setOpen(false); };
    const remove = (i: number) => onChange(list.filter((_, j) => j !== i));
    const moveUp = (i: number) => { if (i === 0) return; const l = [...list]; [l[i-1], l[i]] = [l[i], l[i-1]]; onChange(l); };
    const moveDown = (i: number) => { if (i === list.length - 1) return; const l = [...list]; [l[i], l[i+1]] = [l[i+1], l[i]]; onChange(l); };

    return (
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{label}</label>
            <p className="text-xs text-gray-400 mb-2">{description}</p>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                {list.map((mod, i) => (
                    <CourseChip key={mod} code={mod}
                        onRemove={() => remove(i)}
                        onUp={i > 0 ? () => moveUp(i) : undefined}
                        onDown={i < list.length - 1 ? () => moveDown(i) : undefined}
                    />
                ))}
            </div>
            <div className="relative" ref={ref}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                    type="text" value={query} placeholder={courses.length ? 'Search module code or title…' : 'Select a program first'}
                    disabled={courses.length === 0}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter' && filtered.length > 0) add(filtered[0].module); }}
                />
                {open && filtered.length > 0 && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filtered.map(c => (
                            <button key={c.module} onMouseDown={() => add(c.module)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-start gap-3 border-b border-gray-50 last:border-0">
                                <span className="font-mono text-xs font-bold text-blue-700 mt-0.5 shrink-0">{c.module}</span>
                                <span className="text-xs text-gray-600 line-clamp-2">{c.title}</span>
                                <span className={cn('ml-auto text-[10px] font-bold shrink-0', c.type === 'R' ? 'text-emerald-600' : c.type === 'C' ? 'text-red-500' : 'text-gray-400')}>{c.type}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ResultPanel({ result, onReset }: { result: GenerateResult; onReset: () => void }) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(result.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };

    return (
        <div className="space-y-4">
            {/* Status */}
            <div className={cn('flex items-center gap-3 p-4 rounded-xl border-2', result.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200')}>
                {result.valid
                    ? <CheckCircle className="text-emerald-500 shrink-0" size={24} />
                    : <AlertTriangle className="text-amber-500 shrink-0" size={24} />}
                <div>
                    <p className={cn('font-bold text-sm', result.valid ? 'text-emerald-800' : 'text-amber-800')}>
                        {result.valid ? 'Valid plan generated' : 'Plan generated with warnings'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{result.programName} · {result.stats.totalCourses} courses · {result.stats.totalEcts} ECTS · Start {result.startingSemester}</p>
                </div>
            </div>

            {/* URL */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Plan URL</label>
                <div className="flex gap-2">
                    <input readOnly value={result.url} className="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 focus:outline-none" />
                    <button onClick={copy} className={cn('shrink-0 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors', copied ? 'bg-emerald-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')}>
                        <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <a href={result.url} className="shrink-0 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                        <ExternalLink size={13} /> Open
                    </a>
                </div>
            </div>

            {/* Preferences */}
            {result.stats.preferencesSatisfied.length > 0 && (
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Preferences included ({result.stats.preferencesSatisfied.length})</label>
                    <div className="flex flex-wrap gap-1.5">
                        {result.stats.preferencesSatisfied.map(m => <span key={m} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-xs font-mono text-emerald-700">{m}</span>)}
                    </div>
                </div>
            )}
            {result.stats.preferencesSkipped.length > 0 && (
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Preferences skipped ({result.stats.preferencesSkipped.length})</label>
                    <div className="flex flex-wrap gap-1.5">
                        {result.stats.preferencesSkipped.map(m => <span key={m} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-500 line-through">{m}</span>)}
                    </div>
                </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Warnings ({result.warnings.length})</label>
                    <ul className="space-y-1">
                        {result.warnings.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {w}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <button onClick={onReset} className="w-full py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                Generate another plan
            </button>
        </div>
    );
}

// Main component 

export function GeneratePage() {
    const catalogFile = useCourseStore(s => s.catalogFile);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [programCourses, setProgramCourses] = useState<Course[]>([]);
    const [selectedProgram, setSelectedProgram] = useState('');
    const [preferred, setPreferred] = useState<string[]>([]);
    const [avoid, setAvoid] = useState<string[]>([]);
    const [semester, setSemester] = useState<'SA' | 'SP'>('SA');
    const [years, setYears] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [urlMode, setUrlMode] = useState(false);

    // Load programs on mount; also check for URL params
    useEffect(() => {
        const init = async () => {
            await initializePrograms(catalogFile);
            const progs = await getAllPrograms();
            setPrograms(progs);

            const params = new URLSearchParams(window.location.search);
            const programParam = params.get('program');

            if (programParam) {
                setUrlMode(true);
                const preferences = (params.get('courses') ?? '').split(',').map(s => s.trim()).filter(Boolean);
                const avoidList = (params.get('avoid')   ?? '').split(',').map(s => s.trim()).filter(Boolean);
                const sem = params.get('semester') === 'SP' ? 'SP' : 'SA';
                const yrs = params.get('years') === '2' ? 2 : 1;
                const redirect = params.get('redirect') !== '0';

                try {
                    const res = await runGeneration(progs, programParam, preferences, avoidList, sem as StartingSemester, yrs as 1 | 2, catalogFile);
                    if (redirect) { window.location.href = res.url; return; }
                    setResult(res);
                } catch (e) { setError(String(e)); }
            }
        };
        init().catch(e => setError(String(e)));
    }, []);

    // When program changes, load its courses for autocomplete
    useEffect(() => {
        if (!selectedProgram) { setProgramCourses([]); return; }
        const prog = programs.find(p => p.id === selectedProgram);
        if (prog) getCoursesBySpecialization(prog.masterCode, prog.specializationCode, catalogFile).then(setProgramCourses);
    }, [selectedProgram, programs]);

    const handleGenerate = async () => {
        if (!selectedProgram) return;
        setLoading(true); setError(null); setResult(null);
        try {
            const res = await runGeneration(programs, selectedProgram, preferred, avoid, semester, years, catalogFile);
            setResult(res);
        } catch (e) { setError(String(e)); }
        finally { setLoading(false); }
    };

    // URL mode loading/error
    if (urlMode && !result && !error) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-sm text-gray-500 animate-pulse">Generating schedule…</p></div>;
    }
    if (error && urlMode) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-sm text-red-500">{error}</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                        <a href={window.location.pathname} className="hover:text-blue-500 transition-colors">Planner</a>
                        <ChevronRight size={12} />
                        <span className="text-gray-600 font-medium">Generator</span>
                    </div>
                    <h1 className="text-lg font-bold text-gray-800">Schedule Generator</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Auto-build a MSE plan from your preferences</p>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {result ? (
                        <ResultPanel result={result} onReset={() => { setResult(null); setUrlMode(false); }} />
                    ) : (
                        <>
                            {/* Program */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Specialization</label>
                                <select
                                    value={selectedProgram}
                                    onChange={e => { setSelectedProgram(e.target.value); setPreferred([]); setAvoid([]); }}
                                    className="w-full py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                                >
                                    <option value="">Select a specialization…</option>
                                    {programs.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
                                </select>
                            </div>

                            {/* Semester + Years toggles */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Starting semester</label>
                                    <div className="flex rounded-lg border border-gray-200 bg-white p-1 gap-1">
                                        {(['SA', 'SP'] as const).map(s => (
                                            <button key={s} onClick={() => setSemester(s)}
                                                className={cn('flex-1 py-1.5 text-xs font-bold rounded transition-colors', semester === s ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50')}>
                                                {s === 'SA' ? 'Autumn' : 'Spring'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Number of years</label>
                                    <div className="flex rounded-lg border border-gray-200 bg-white p-1 gap-1">
                                        {([1, 2] as const).map(y => (
                                            <button key={y} onClick={() => setYears(y)}
                                                className={cn('flex-1 py-1.5 text-xs font-bold rounded transition-colors', years === y ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50')}>
                                                {y === 1 ? '1 year' : '2 years'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Preferred courses */}
                            <CourseListInput
                                label="Preferred courses"
                                description="Added in this order. First course = highest priority. Skipped only if credit limit or collision."
                                courses={programCourses}
                                list={preferred}
                                onChange={setPreferred}
                            />

                            {/* Avoid courses */}
                            <CourseListInput
                                label="Courses to avoid"
                                description="Excluded from auto-fill. First = avoid most. Used as last resort if plan cannot be completed."
                                courses={programCourses}
                                list={avoid}
                                onChange={setAvoid}
                            />

                            {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

                            {/* Generate button */}
                            <button
                                onClick={handleGenerate}
                                disabled={!selectedProgram || loading}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <span className="animate-pulse">Generating…</span> : <>Generate Schedule <ChevronRight size={16} /></>}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
