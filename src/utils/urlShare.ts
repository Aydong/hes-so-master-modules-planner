/**
 * URL-based plan sharing: encodes/decodes a compact plan payload into a base64url hash.
 * Format: #plan=<base64url>
 *
 * Payload structure (compact to keep URLs short):
 * { v: "1", p: programId, s: "SA"|"SP", y?: catalogYear, c: [{ m: moduleCode, a: "1"|"2"|"3"|"4" }] }
 */

export interface SharePayload {
    v: '1';
    p: string;
    s: 'SA' | 'SP';
    y?: string;  // catalogue year, e.g. "25-26" (optional for backward compat)
    c: Array<{ m: string; a: '1' | '2' | '3' | '4' }>;
}

export function encodeSharePayload(
    programId: string,
    startingSemester: 'SA' | 'SP',
    courses: Array<{ module: string; assignedSemester: '1' | '2' | '3' | '4' }>,
    catalogYear?: string,
): string {
    const payload: SharePayload = {
        v: '1',
        p: programId,
        s: startingSemester,
        ...(catalogYear ? { y: catalogYear } : {}),
        c: courses.map(c => ({ m: c.module, a: c.assignedSemester })),
    };
    const json = JSON.stringify(payload);
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSharePayload(encoded: string): SharePayload | null {
    try {
        const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(base64);
        const payload = JSON.parse(json) as SharePayload;
        if (payload.v !== '1' || !payload.p || !Array.isArray(payload.c)) return null;
        return payload;
    } catch {
        return null;
    }
}

export function getShareHashParam(): string | null {
    const hash = window.location.hash;
    if (!hash.startsWith('#plan=')) return null;
    return hash.slice('#plan='.length);
}

export function clearShareHash(): void {
    history.replaceState(null, '', window.location.pathname + window.location.search);
}
