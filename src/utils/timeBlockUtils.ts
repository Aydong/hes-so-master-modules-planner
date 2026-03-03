/**
 * Utility functions for handling time blocks
 * Handles both single blocks (TB1, TB2, etc.) and combined blocks (TB1+TB2, TB3+TB4, etc.)
 */

const SINGLE_BLOCK_REGEX = /TB[1-4]/g;
const TIME_BLOCK_TIMES: Record<string, { time: string; label: string }> = {
    TB1: { time: '08:55–11:10', label: 'Block 1' },
    TB2: { time: '11:15–13:40', label: 'Block 2' },
    TB3: { time: '15:00–17:25', label: 'Block 3' },
    TB4: { time: '17:30–19:55', label: 'Block 4' },
};

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

/**
 * Gets a readable label for time blocks
 * Examples:
 * - "TB1" → "Block 1"
 * - "TB1+TB2" → "Blocks 1-2"
 */
export function getTimeBlockLabel(timeBlock: string): string {
    const blocks = extractTimeBlocks(timeBlock);
    
    if (blocks.length === 0) return timeBlock;
    if (blocks.length === 1) return `Block ${blocks[0].charAt(2)}`;
    
    const blockNumbers = blocks.map(b => b.charAt(2));
    const minBlock = Math.min(...blockNumbers.map(Number));
    const maxBlock = Math.max(...blockNumbers.map(Number));
    
    if (maxBlock - minBlock === blocks.length - 1) {
        // Consecutive blocks
        return `Blocks ${minBlock}-${maxBlock}`;
    }
    
    // Non-consecutive blocks
    return `Blocks ${blockNumbers.join(', ')}`;
}

/**
 * Gets the time range for time blocks
 * Examples:
 * - "TB1" → "08:55–11:10"
 * - "TB1+TB2" → "08:55–13:40"
 * - "TB3+TB4" → "15:00–19:55"
 */
export function getTimeBlockTimeRange(timeBlock: string): string {
    const blocks = extractTimeBlocks(timeBlock);
    
    if (blocks.length === 0) return '–';
    
    const firstBlock = TIME_BLOCK_TIMES[blocks[0]];
    const lastBlock = TIME_BLOCK_TIMES[blocks[blocks.length - 1]];
    
    if (!firstBlock || !lastBlock) return '–';
    
    if (blocks.length === 1) {
        return firstBlock.time;
    }
    
    // For multiple blocks, return start time of first block to end time of last block
    const startTime = firstBlock.time.split('–')[0];
    const endTime = lastBlock.time.split('–')[1];
    return `${startTime}–${endTime}`;
}
