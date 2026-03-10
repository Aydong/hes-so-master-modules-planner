/**
 * Utility functions for handling time blocks
 * Handles both single blocks (TB1, TB2, etc.) and combined blocks (TB1+TB2, TB3+TB4, etc.)
 */

const SINGLE_BLOCK_REGEX = /TB[1-4]/g;

/**
 * Extracts individual time blocks from a TimeBlock string
 * Examples:
 * - "TB1" → ["TB1"]
 * - "TB1+TB2" → ["TB1", "TB2"]
 * - "TB3+TB4" → ["TB3", "TB4"]
 */
export function extractTimeBlocks(timeBlock: string): string[] {
    const matches = timeBlock.match(SINGLE_BLOCK_REGEX);
    return matches || [];
}

/**
 * Checks if two time blocks overlap
 * Examples:
 * - "TB1" and "TB1+TB2" → true (TB1 is in both)
 * - "TB1+TB2" and "TB3+TB4" → false (no overlap)
 * - "TB1" and "TB2" → false (no overlap)
 * - "TB1+TB2" and "TB2+TB3" → true (TB2 is in both)
 */
export function timeBlocksOverlap(block1: string, block2: string): boolean {
    const blocks1 = new Set(extractTimeBlocks(block1));
    const blocks2 = new Set(extractTimeBlocks(block2));
    
    for (const block of blocks1) {
        if (blocks2.has(block)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Checks if a course fits in a specific time slot
 * Used by the ScheduleGrid to determine which courses can be displayed
 */
export function courseHasTimeBlock(course: { TimeBlock: string }, targetBlock: string): boolean {
    return timeBlocksOverlap(course.TimeBlock, targetBlock);
}

