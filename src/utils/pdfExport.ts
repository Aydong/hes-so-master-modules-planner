import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SelectedCourse, ValidationResult, ValidationRules } from '../types';
import { extractTimeBlocks } from './timeBlockUtils';
import { getSemesterLabels } from './semesterUtils';
import type { StartingSemester } from './semesterUtils';
import { getBlockTime, formatMinutes } from './timeBlockData';

//  Colors 

const CAT_FILL: Record<string, [number, number, number]> = {
    TSM: [219, 234, 254],
    FTP: [243, 232, 255],
    MA:  [209, 250, 229],
    CM:  [254, 243, 199],
    PI:  [229, 231, 235],
    MAP: [224, 231, 255],
    CSI: [243, 232, 255],
};
const CAT_TEXT: Record<string, [number, number, number]> = {
    TSM: [29,  78,  216],
    FTP: [109, 40,  217],
    MA:  [4,   120, 87],
    CM:  [180, 83,  9],
    PI:  [75,  85,  99],
    MAP: [67,  56,  202],
    CSI: [109, 40,  217],
};

const BLUE:   [number, number, number] = [37,  99,  235];
const GRAY:   [number, number, number] = [107, 114, 128];
const WHITE:  [number, number, number] = [255, 255, 255];
const DARK:   [number, number, number] = [31,  41,  55];
const LIGHT:  [number, number, number] = [243, 244, 246];
const GREEN:  [number, number, number] = [22,  163, 74];
const RED:    [number, number, number] = [220, 38,  38];
const ORANGE: [number, number, number] = [249, 115, 22];

//  Misc helpers 

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

const getCategory = (module: string) => module.split('_')[0];
const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s;

const drawPageHeader = (doc: jsPDF, left: string, right: string) => {
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, w, 17, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(left, 14, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(right, w - 14, 11, { align: 'right' });
    doc.setTextColor(...DARK);
};

const statusCell = (msg: string, valid: boolean) => ({
    content: msg,
    styles: { textColor: valid ? GREEN : RED, fontStyle: 'bold' as const, halign: 'center' as const },
});
const planStatusCell = (status: 'valid' | 'warning' | 'invalid') => {
    const map = {
        valid:   { content: 'Valid Plan',   textColor: GREEN },
        warning: { content: 'Warning Plan', textColor: ORANGE },
        invalid: { content: 'Invalid Plan', textColor: RED },
    };
    const s = map[status];
    return { content: s.content, styles: { textColor: s.textColor, fontStyle: 'bold' as const, halign: 'center' as const } };
};

//  Course timing helper 

interface CourseTiming { startMin: number; endMin: number }

function getCourseTiming(course: SelectedCourse): CourseTiming {
    const blocks    = extractTimeBlocks(course.TimeBlock);
    const blockNums = blocks.map(b => parseInt(b.replace('TB', ''))).filter(n => !isNaN(n));
    if (blockNums.length === 0) return { startMin: 8 * 60 + 45, endMin: 11 * 60 + 10 };
    const first = getBlockTime(course.location, Math.min(...blockNums));
    const last  = getBlockTime(course.location, Math.max(...blockNums));
    if (!first || !last) return { startMin: 8 * 60 + 45, endMin: 11 * 60 + 10 };
    return { startMin: first.startMin, endMin: last.endMin };
}

function getRealTimeStr(course: SelectedCourse): string {
    const { startMin, endMin } = getCourseTiming(course);
    return `${formatMinutes(startMin)} - ${formatMinutes(endMin)}`;
}

//  Gantt calendar page 

const drawGanttCalendar = (doc: jsPDF, semCourses: SelectedCourse[], startY: number) => {
    const PAGE_W = doc.internal.pageSize.getWidth();   // 297mm
    const PAGE_H = doc.internal.pageSize.getHeight();  // 210mm

    const MARGIN_L   = 14;
    const MARGIN_R   = 14;
    const TIME_COL_W = 18; // time axis column
    const DAY_HDR_H  = 7;  // day label strip height

    const GRID_LEFT = MARGIN_L + TIME_COL_W;
    const GRID_W    = PAGE_W - MARGIN_L - MARGIN_R - TIME_COL_W;
    const COL_W     = GRID_W / 5;

    const DAY_START  = 8 * 60;         // 480 min
    const DAY_END    = 20 * 60 + 30;   // 1230 min
    const TOTAL_MIN  = DAY_END - DAY_START;

    const TL_TOP    = startY + DAY_HDR_H;
    const TL_BOTTOM = PAGE_H - 8;
    const TL_H      = TL_BOTTOM - TL_TOP;

    const toY = (min: number) => TL_TOP + (min - DAY_START) / TOTAL_MIN * TL_H;
    const toH = (s: number, e: number) => Math.max((e - s) / TOTAL_MIN * TL_H, 2);

    // Background
    doc.setFillColor(249, 250, 251);
    doc.rect(GRID_LEFT, TL_TOP, GRID_W, TL_H, 'F');

    // Day header strip
    WEEK_DAYS.forEach((day, i) => {
        const x = GRID_LEFT + i * COL_W;
        doc.setFillColor(...BLUE);
        doc.rect(x, startY, COL_W, DAY_HDR_H, 'F');
        // vertical separator
        if (i > 0) {
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.3);
            doc.line(x, startY, x, startY + DAY_HDR_H);
        }
        doc.setTextColor(...WHITE);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(day, x + COL_W / 2, startY + 4.5, { align: 'center' });
    });
    doc.setTextColor(...DARK);

    // Hour grid lines + labels
    for (let h = 8; h <= 20; h++) {
        const y = toY(h * 60);
        doc.setDrawColor(209, 213, 219);
        doc.setLineWidth(h % 2 === 0 ? 0.35 : 0.15);
        doc.line(GRID_LEFT, y, GRID_LEFT + GRID_W, y);
        doc.setTextColor(...GRAY);
        doc.setFontSize(5.5);
        doc.setFont('helvetica', h % 2 === 0 ? 'bold' : 'normal');
        doc.text(`${h}h`, GRID_LEFT - 2, y + 1.2, { align: 'right' });
    }

    // Vertical column separators
    WEEK_DAYS.forEach((_, i) => {
        if (i === 0) return;
        const x = GRID_LEFT + i * COL_W;
        doc.setDrawColor(209, 213, 219);
        doc.setLineWidth(0.25);
        doc.line(x, TL_TOP, x, TL_BOTTOM);
    });

    // Draw courses per day
    WEEK_DAYS.forEach((day, dayIdx) => {
        const dayCourses = semCourses.filter(c => c.WeekDay === day);
        if (dayCourses.length === 0) return;

        const timed = dayCourses.map(c => ({ course: c, ...getCourseTiming(c) }));

        // Simple collision layout
        const layout = new Map<string, { colIdx: number; colCount: number }>();
        for (const item of timed) {
            const group = timed
                .filter(o => item.startMin < o.endMin && item.endMin > o.startMin)
                .sort((a, b) => a.course.module.localeCompare(b.course.module));
            const colIdx = group.findIndex(g => g.course.module === item.course.module);
            layout.set(item.course.module, { colIdx, colCount: group.length });
        }

        const dayX = GRID_LEFT + dayIdx * COL_W;

        timed.forEach(({ course, startMin, endMin }) => {
            const { colIdx, colCount } = layout.get(course.module) ?? { colIdx: 0, colCount: 1 };
            const isCollision  = colCount > 1;
            const isOutOfSpec  = course.isOutOfSpecialization === true;
            const cW = COL_W / colCount - 3;
            const cX = dayX + colIdx * cW + 0.7 + 1.5;
            const cY = toY(startMin) + 0.5;
            const cH = toH(startMin, endMin) - 1;

            const cat    = getCategory(course.module);
            const fill   = isCollision ? ([254, 226, 226] as [number, number, number]) : (CAT_FILL[cat] ?? LIGHT);
            const tColor = isCollision ? RED : (CAT_TEXT[cat] ?? DARK);
            const border = isCollision ? RED : isOutOfSpec ? ORANGE : tColor;

            doc.setFillColor(...fill);
            doc.setDrawColor(...border);
            doc.setLineWidth(isCollision ? 0.6 : isOutOfSpec ? 0.8 : 0.1);
            doc.roundedRect(cX, cY, cW - 1.4, cH, 3, 3, 'FD');

            doc.setTextColor(...tColor);

            // Module code
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(trunc(course.module, 18), cX + 3.5, cY + 5, { align: 'left', maxWidth: cW - 2.5 });

            // "Out of specialization" label below module code
            if (isOutOfSpec && cH > 7) {
                doc.setFontSize(6);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...ORANGE);
                doc.text('Out of spec', cX + 3.5, cY + 10, { align: 'left' });
                doc.setTextColor(...tColor);
            }

            // Title (only if tall enough)
            if (cH > 9) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                const titleY = isOutOfSpec ? cY + 15 : cY + 10;
                const titleLines = doc.splitTextToSize(trunc(course.title, 40), cW - 3);
                doc.text(titleLines.slice(0, 2), cX + 3.5, titleY, { align: 'left' });
            }

            // Type of course
            if (cH > 12) {
                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'normal');
                const typeStr = course.type === 'R' ? 'Recommended' :
                                course.type === 'C' ? 'Compulsory' :
                                course.type === 'O' ? 'Optional' : 'Other';
                doc.setTextColor(...tColor);
                doc.text(typeStr, cX + 3.5, cY + cH - 11, { align: 'left' });
            }

            // Time
            if (cH > 14) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.text(`${formatMinutes(startMin)} - ${formatMinutes(endMin)}`, cX + 3.5, cY + cH - 7, { align: 'left' });
            }

            // Location
            if (cH > 18 && course.location) {
                doc.setFontSize(6.5);
                doc.text(`@ ${course.location}`, cX + 3.5, cY + cH - 3, { align: 'left' });
            }

            // Clickable link
            if (course.link) {
                doc.link(cX, cY, cW - 1.4, cH, { url: course.link });
            }
        });
    });

    // Outer border
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.4);
    doc.rect(GRID_LEFT, TL_TOP, GRID_W, TL_H, 'S');
};

//  Detail list 

const drawDetailList = (doc: jsPDF, semCourses: SelectedCourse[], startY: number) => {
    autoTable(doc, {
        startY,
        head: [['Module', 'Title', 'Cat.', 'ECTS', 'Type', 'Day', 'Block', 'Time', 'Location', 'Link']],
        body: semCourses.map(c => {
            const cat = getCategory(c.module);
            const isOutOfSpec = c.isOutOfSpecialization === true;
            const rowFill = isOutOfSpec ? ([255, 237, 213] as [number, number, number]) : undefined;
            const maybeRowFill = (extra?: object) => isOutOfSpec
                ? { fillColor: rowFill, ...extra }
                : { ...extra };
            return [
                {
                    content: isOutOfSpec ? `${c.module}\nOut of spec.` : c.module,
                    styles: { font: 'courier', fontStyle: 'bold' as const, fontSize: 7.5, textColor: isOutOfSpec ? ORANGE : BLUE, ...maybeRowFill() },
                },
                { content: c.title, styles: maybeRowFill() },
                {
                    content: cat,
                    styles: {
                        fillColor: CAT_FILL[cat] ?? LIGHT,
                        textColor: CAT_TEXT[cat] ?? DARK,
                        fontStyle: 'bold' as const,
                        halign: 'center' as const,
                    },
                },
                { content: String(c.credits || 3), styles: { halign: 'center' as const, fontStyle: 'bold' as const, ...maybeRowFill() } },
                {
                    content: c.type === 'R' ? 'Rec.' : c.type === 'C' ? 'Comp.' : 'Opt.',
                    styles: {
                        textColor: c.type === 'R' ? GREEN : c.type === 'C' ? RED : GRAY,
                        fontStyle: 'normal' as const,
                        halign: 'left' as const,
                        fillColor: rowFill,
                    },
                },
                { content: c.WeekDay, styles: maybeRowFill() },
                { content: c.TimeBlock, styles: { halign: 'left' as const, font: 'courier', ...maybeRowFill() } },
                { content: getRealTimeStr(c), styles: { halign: 'left' as const, fontSize: 7, ...maybeRowFill() } },
                { content: c.location || ' - ', styles: maybeRowFill() },
                { content: 'View', styles: { textColor: BLUE, halign: 'left' as const, ...maybeRowFill() } },
            ];
        }),
        theme: 'striped',
        headStyles: { fillColor: LIGHT, textColor: DARK, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
            0: { halign: 'left', cellWidth: 34 },
            2: { halign: 'left', cellWidth: 14 },
            3: { halign: 'left', cellWidth: 13 },
            4: { halign: 'left', cellWidth: 14 },
            5: { halign: 'left', cellWidth: 30 },
            6: { halign: 'left', cellWidth: 24 },
            7: { halign: 'left', cellWidth: 26 },
            8: { halign: 'left', cellWidth: 20 },
            9: { halign: 'left', cellWidth: 15 },
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && (data.column.index === 0 || data.column.index === 9)) {
                const course = semCourses[data.row.index];
                if (course?.link) {
                    doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: course.link });
                }
            }
        },
    });
};

//  Main export 

export const exportToPDF = (
    courses: SelectedCourse[],
    programName: string,
    validation: ValidationResult,
    rules: ValidationRules,
    hasCollisions: boolean,
    startingSemester: StartingSemester = 'SA',
) => {
    const SEMESTER_LABELS = getSemesterLabels(startingSemester);
    const planStatus: 'valid' | 'warning' | 'invalid' = !validation.isValid
        ? 'invalid'
        : (hasCollisions || !validation.outOfSpec.valid) ? 'warning' : 'valid';

    const doc   = new jsPDF({ orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();

    //  Page 1: cover + validation summary + disclaimer at the bottom
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('HES-SO MSE   |   Course Planner', 14, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const startLabel = startingSemester === 'SA' ? 'Start: Autumn' : 'Start: Spring';
    doc.text(`${programName}   |   ${startLabel}   |   Exported: ${new Date().toLocaleDateString('fr-CH')}`, 14, 21);

    doc.setTextColor(...DARK);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Validation Summary', 14, 32);

    const default_ECTS = ' + 6 (PA) + 30 (TM)';
    const ICS_ECTS     = ' + 30 (TM) + 30 (Brasov)';
    const CE_ECTS      = ' + 30 (TM)';
    const programECTS  = programName.includes('ICS') ? ICS_ECTS : programName.includes('CE') ? CE_ECTS : default_ECTS;
    const addECTS      = programName.includes('ICS') ? 60 : programName.includes('CE') ? 30 : 36;

    autoTable(doc, {
        startY: 36,
        head: [['Category', 'ECTS', 'Recommended (min)', 'Max ECTS', 'Status']],
        body: [
            rules.TSM.max > 0 ? ['TSM', String(validation.tsm.count), `${validation.tsm.rec} / ${rules.TSM.minRec}`, String(rules.TSM.max), statusCell(validation.tsm.message || '', validation.tsm.valid)] : null,
            rules.FTP.max > 0 ? ['FTP', String(validation.ftp.count), `${validation.ftp.rec} / ${rules.FTP.minRec}`, String(rules.FTP.max), statusCell(validation.ftp.message || '', validation.ftp.valid)] : null,
            rules.MA.max  > 0 ? ['MA',  String(validation.ma.count),  `${validation.ma.rec} / ${rules.MA.minRec}`,   String(rules.MA.max),  statusCell(validation.ma.message  || '', validation.ma.valid)] : null,
            rules.CM.max  > 0 ? ['CM',  String(validation.cm.count),  '', String(rules.CM.max), statusCell(validation.cm.message  || '', validation.cm.valid)] : null,
            rules.PI.max  > 0 ? ['PI',  String(validation.pi.count),  `${validation.pi.rec} / ${rules.PI.minRec}`,   String(rules.PI.max),  statusCell(validation.pi.message  || '', validation.pi.valid)] : null,
            rules.MAP.max > 0 ? ['MAP', String(validation.map.count), `${validation.map.rec} / ${rules.MAP.minRec}`, String(rules.MAP.max), statusCell(validation.map.message || '', validation.map.valid)] : null,
            rules.CSI.max > 0 ? ['ICS', String(validation.csi.count), `${validation.csi.rec} / ${rules.CSI.minRec}`, String(rules.CSI.max), statusCell(validation.csi.message || '', validation.csi.valid)] : null,
            [
                { content: 'TOTAL', styles: { fontStyle: 'bold' as const } },
                { content: `${validation.totalEcts}${programECTS} = ${validation.totalEcts + addECTS}`, styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
                '', '',
                planStatusCell(planStatus),
            ],
        ].filter(row => row !== null),
        theme: 'striped',
        headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 24 },
            1: { halign: 'center', cellWidth: 48 },
            2: { halign: 'center', cellWidth: 48 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center' },
        },
    });

    // Issues & Warnings section (only shown when there are problems)
    const pdfErrors: string[] = [];
    const pdfWarnings: string[] = [];
    if (rules.TSM.max > 0 && !validation.tsm.valid && validation.tsm.message) pdfErrors.push(validation.tsm.message);
    if (rules.FTP.max > 0 && !validation.ftp.valid && validation.ftp.message) pdfErrors.push(validation.ftp.message);
    if (rules.MA.max  > 0 && !validation.ma.valid  && validation.ma.message)  pdfErrors.push(validation.ma.message);
    if (rules.CM.max  > 0 && !validation.cm.valid  && validation.cm.message)  pdfErrors.push(validation.cm.message);
    if (rules.PI.max  > 0 && !validation.pi.valid  && validation.pi.message)  pdfErrors.push(validation.pi.message);
    if (rules.MAP.max > 0 && !validation.map.valid && validation.map.message) pdfErrors.push(validation.map.message);
    if (rules.CSI.max > 0 && !validation.csi.valid && validation.csi.message) pdfErrors.push(validation.csi.message);
    if (!validation.bonus.valid && validation.bonus.message) pdfErrors.push(validation.bonus.message);
    if (hasCollisions) pdfWarnings.push('Schedule conflicts detected, check overlapping courses.');
    if (!validation.outOfSpec.valid && validation.outOfSpec.message) pdfWarnings.push(validation.outOfSpec.message);

    if (pdfErrors.length > 0 || pdfWarnings.length > 0) {
        const issuesY = (doc as any).lastAutoTable.finalY + 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text('Issues & Warnings', 14, issuesY);

        let lineY = issuesY + 6;
        pdfErrors.forEach(msg => {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...RED);
            doc.text(`${msg}`, 18, lineY);
            lineY += 5;
        });
        pdfWarnings.forEach(msg => {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...ORANGE);
            const lines = doc.splitTextToSize(`${msg}`, pageW - 32);
            doc.text(lines, 18, lineY);
            lineY += lines.length * 4.5;
        });
    }

    doc.setFontSize(8);
    const disclaimer = 'This is an unofficial tool created by a student for students. It is not affiliated with MSE and may not be 100% accurate. Always double-check with official sources and your academic advisor before making decisions based on this planner. Visit the official MSE website for the most up-to-date information on courses, requirements, and schedules.';
    const link = 'https://www.hes-so.ch/master/hes-so-master/formations/engineering';
    const splitDisclaimer = doc.splitTextToSize(disclaimer, pageW - 28);
    doc.setTextColor(...RED);
    doc.text('Disclaimer:', 14, doc.internal.pageSize.getHeight() - splitDisclaimer.length * 4 - 9 - 5);
    doc.setTextColor(...GRAY);
    doc.text(splitDisclaimer, 14, doc.internal.pageSize.getHeight() - splitDisclaimer.length * 4 - 4 - 5);
    doc.setTextColor(...BLUE);
    doc.text(link, 14, doc.internal.pageSize.getHeight() - splitDisclaimer.length * 4 - 4 + splitDisclaimer.length * 4 - 5);


    //  One page pair per semester 
    (['1', '2', '3', '4'] as const).forEach(sem => {
        const semCourses = courses.filter(c => c.assignedSemester === sem);
        if (semCourses.length === 0) return;

        const semLabel = SEMESTER_LABELS[sem];
        const semECTS  = semCourses.reduce((s, c) => s + (c.credits || 3), 0);
        const semInfo  = `${semCourses.length} course${semCourses.length !== 1 ? 's' : ''} - ${semECTS} ECTS`;

        // Gantt timeline page
        doc.addPage('landscape');
        drawPageHeader(doc, `${semLabel}  ·  Weekly Timeline`, semInfo);
        drawGanttCalendar(doc, semCourses, 22);

        // Detail list page
        doc.addPage('landscape');
        drawPageHeader(doc, `${semLabel}  ·  Course Details`, semInfo);
        drawDetailList(doc, semCourses, 22);
    });

    const slug = programName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    doc.save(`mse-schedule-${slug}.pdf`);
};
