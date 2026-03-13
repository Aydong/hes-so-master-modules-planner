/**
 * Centralised color/style helpers for course module categories and types.
 */

export const CATEGORY_PREFIXES = ['TSM', 'FTP', 'MA', 'CM', 'PI', 'MAP', 'CSI'] as const;
export type CategoryPrefix = typeof CATEGORY_PREFIXES[number];

/** Returns the category prefix of a module code, e.g. "TSM_Foo" -> "TSM". */
export function getCategoryPrefix(module: string): string {
    return module.split('_')[0];
}

/** bg + text - used for small badges / chips. */
export function getCategoryBadge(module: string): string {
    const p = getCategoryPrefix(module);
    if (p === 'TSM') return 'bg-blue-100 text-blue-700';
    if (p === 'FTP') return 'bg-purple-100 text-purple-700';
    if (p === 'MA')  return 'bg-emerald-100 text-emerald-700';
    if (p === 'CM')  return 'bg-amber-100 text-amber-700';
    if (p === 'PI')  return 'bg-gray-100 text-gray-700';
    if (p === 'MAP') return 'bg-indigo-100 text-indigo-700';
    if (p === 'CSI') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
}

/** bg + border + text - used for course cards / grid boxes. */
export function getCategoryCard(module: string): string {
    const p = getCategoryPrefix(module);
    if (p === 'TSM') return 'bg-blue-100 border-blue-200 text-blue-800';
    if (p === 'FTP') return 'bg-purple-100 border-purple-200 text-purple-800';
    if (p === 'MA')  return 'bg-emerald-100 border-emerald-200 text-emerald-800';
    if (p === 'CM')  return 'bg-amber-100 border-amber-200 text-amber-800';
    if (p === 'PI')  return 'bg-gray-100 border-gray-200 text-gray-800';
    if (p === 'MAP') return 'bg-indigo-100 border-indigo-200 text-indigo-800';
    if (p === 'CSI') return 'bg-purple-100 border-purple-200 text-purple-800';
    return 'bg-gray-100 border-gray-200 text-gray-800';
}

/** Solid background color (bg-500) - accepts a full module code or a raw prefix. Used for bars and dot legends. */
export function getCategorySolid(moduleOrPrefix: string): string {
    const p = moduleOrPrefix.includes('_') ? getCategoryPrefix(moduleOrPrefix) : moduleOrPrefix;
    if (p === 'TSM') return 'bg-blue-500';
    if (p === 'FTP') return 'bg-purple-500';
    if (p === 'MA')  return 'bg-emerald-500';
    if (p === 'CM')  return 'bg-amber-500';
    if (p === 'PI')  return 'bg-gray-500';
    if (p === 'MAP') return 'bg-indigo-500';
    if (p === 'CSI') return 'bg-purple-500';
    return 'bg-gray-400';
}

/** bg + text for course type (R / C / O) badges. */
export function getTypeBadge(type: string): string {
    if (type === 'R') return 'bg-emerald-100 text-emerald-700';
    if (type === 'O') return 'bg-gray-100 text-gray-700';
    if (type === 'C') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-500';
}
