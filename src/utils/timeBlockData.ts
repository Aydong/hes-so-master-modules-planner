/**
 * Time block data - loaded from /public/data/HES_TimeBlock.json.
 */

//  Types 
export interface BlockTime { startMin: number; endMin: number }

interface _RawBlock { id: number; time_start: string; time_stop: string }
interface _RawSite  { code: string; name: string; block: _RawBlock[] }

type BlockMap = Record<string, Record<number, BlockTime>>;

// Built from JSON - null until the fetch resolves
let LOCATION_NAME_TO_CODE: Record<string, string> | null = null;

/** Resolve a location full name to its code, falling back to 'L' if unknown or not yet loaded. */
function locationCode(location: string | undefined): string {
    if (!location || !LOCATION_NAME_TO_CODE) return 'L';
    return LOCATION_NAME_TO_CODE[location] ?? 'L';
}

// Helpers 

/** Parse "8h45" to minutes from midnight */
export function parseTimeStr(t: string): number {
    const [hPart, mPart] = t.split('h');
    return parseInt(hPart) * 60 + (parseInt(mPart) || 0);
}

/** Format minutes from midnight to "8h45" */
export function formatMinutes(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
}

function buildMap(sites: _RawSite[]): BlockMap {
    const map: BlockMap = {};
    for (const site of sites) {
        map[site.code] = {};
        for (const b of site.block) {
            map[site.code][b.id] = {
                startMin: parseTimeStr(b.time_start),
                endMin:   parseTimeStr(b.time_stop),
            };
        }
    }
    return map;
}

//  Module-level cache - null until the JSON is fetched 

let BLOCK_TIME_MAP: BlockMap | null = null;

/** Resolves once the JSON has been fetched and parsed. */
export const timeBlockDataReady: Promise<void> = (async () => {
    const base = (import.meta.env.BASE_URL as string) ?? '/';
    const res  = await fetch(`${base}data/HES_TimeBlock.json`);
    const json: { time_block: _RawSite[] } = await res.json();
    // Build name→code map from the JSON's "name" field
    const nameToCode: Record<string, string> = {};
    for (const site of json.time_block) nameToCode[site.name] = site.code;
    LOCATION_NAME_TO_CODE = nameToCode;
    BLOCK_TIME_MAP = buildMap(json.time_block);
})();

// Public API

/** Returns true once the JSON has been loaded. */
export function isTimeBlockDataReady(): boolean {
    return BLOCK_TIME_MAP !== null;
}

export function getNameForCode(code: string): string {
    if (!LOCATION_NAME_TO_CODE) return code;
    for (const [name, c] of Object.entries(LOCATION_NAME_TO_CODE)) {
        if (c === code) return name;
    }
    return code;
}

/**
 * Get start/end minutes for a location + block number.
 * Returns null if data hasn't loaded yet (use `timeBlockDataReady` to await it).
 * Falls back to the 'L' (Lausanne) entry when the location is unknown.
 */
export function getBlockTime(location: string | undefined, blockNum: number): BlockTime | null {
    if (!BLOCK_TIME_MAP) return null;
    const code   = locationCode(location);
    const locMap = BLOCK_TIME_MAP[code] ?? BLOCK_TIME_MAP['L'];
    if (!locMap) return null;
    return locMap[blockNum] ?? BLOCK_TIME_MAP['L']?.[blockNum] ?? null;
}

/**
 * Bounding time range (min start, max end) across a set of locations for one block.
 * Returns null if data isn't loaded yet.
 */
export function getBlockTimeBounds(
    locations: (string | undefined)[],
    blockNum: number,
): BlockTime | null {
    const times = locations.map(loc => getBlockTime(loc, blockNum)).filter((t): t is BlockTime => t !== null);
    if (times.length === 0) return null;
    return {
        startMin: Math.min(...times.map(t => t.startMin)),
        endMin:   Math.max(...times.map(t => t.endMin)),
    };
}

/**
 * Every distinct timing for a block across the given locations,
 * with the location codes that share each timing.
 * Returns an empty array if data isn't loaded yet.
 */
export function getDistinctTimings(
    locations: (string | undefined)[],
    blockNum: number,
): Array<{ timing: BlockTime; locationCode: string }> {
    if (!BLOCK_TIME_MAP) return [];
    const seen = new Set<string>();
    const result: Array<{ timing: BlockTime; locationCode: string }> = [];
    for (const loc of locations) {
        const timing = getBlockTime(loc, blockNum);
        if (!timing) continue;
        const code = locationCode(loc);
        if (seen.has(code)) continue;
        seen.add(code);
        result.push({ timing, locationCode: code });
    }
    return result.sort((a, b) => a.timing.startMin - b.timing.startMin);
}
