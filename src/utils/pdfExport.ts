import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SelectedCourse, ValidationResult, ValidationRules } from '../types';

//  Constants 

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

const TIME_BLOCKS = [
    { id: 'TB1', label: 'Block 1', time: '08:55–11:10' },
    { id: 'TB2', label: 'Block 2', time: '11:15–13:40' },
    { id: 'TB3', label: 'Block 3', time: '15:00–17:25' },
    { id: 'TB4', label: 'Block 4', time: '17:30–19:55' },
] as const;

const SEMESTER_LABELS: Record<string, string> = {
    '1': 'Semester 1 – Autumn Year 1',
    '2': 'Semester 2 – Spring Year 1',
    '3': 'Semester 3 – Autumn Year 2',
    '4': 'Semester 4 – Spring Year 2',
};

const CAT_FILL: Record<string, [number, number, number]> = {
    TSM: [219, 234, 254],
    FTP: [243, 232, 255],
    MA:  [209, 250, 229],
    CM:  [254, 243, 199],
};

const CAT_TEXT: Record<string, [number, number, number]> = {
    TSM: [29,  78,  216],
    FTP: [109, 40,  217],
    MA:  [4,   120, 87],
    CM:  [180, 83,  9],
};

const BLUE:  [number, number, number] = [37,  99,  235];
const GRAY:  [number, number, number] = [107, 114, 128];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK:  [number, number, number] = [31,  41,  55];
const LIGHT: [number, number, number] = [243, 244, 246];
const GREEN: [number, number, number] = [22,  163, 74];
const RED:   [number, number, number] = [220, 38,  38];

//  Helpers 

const getCategory = (module: string) => module.split('_')[0];

const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s;

const drawHeader = (doc: jsPDF, left: string, right: string) => {
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

const ORANGE: [number, number, number] = [249, 115, 22];

const statusCell = (msg: string, valid: boolean) => ({
    content: msg,
    styles: {
        textColor: valid ? GREEN : RED,
        fontStyle: 'bold' as const,
        halign: 'center' as const,
    },
});

const planStatusCell = (planStatus: 'valid' | 'warning' | 'invalid') => {
    const map = {
        valid:   { content: 'Valid Plan',   textColor: GREEN },
        warning: { content: 'Warning Plan', textColor: ORANGE },
        invalid: { content: 'Invalid Plan', textColor: RED },
    };
    const s = map[planStatus];
    return { content: s.content, styles: { textColor: s.textColor, fontStyle: 'bold' as const, halign: 'center' as const } };
};

//  Calendar grid 

const drawCalendar = (doc: jsPDF, semCourses: SelectedCourse[], startY: number) => {
    // Category legend strip above the grid
    const cats = ['TSM', 'FTP', 'MA', 'CM'] as const;
    let lx = 14;
    cats.forEach((cat) => {
        doc.setFillColor(...(CAT_FILL[cat] ?? LIGHT));
        doc.roundedRect(lx, startY - 5, 24, 5, 1, 1, 'F');
        doc.setTextColor(...(CAT_TEXT[cat] ?? GRAY));
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text(cat, lx + 12, startY - 1.2, { align: 'center' });
        lx += 28;
    });
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(lx, startY - 5, 32, 5, 1, 1, 'F');
    doc.setTextColor(...RED);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Collision', lx + 16, startY - 1.2, { align: 'center' });
    doc.setTextColor(...DARK);

    const body = TIME_BLOCKS.map((block) => {
        const timeCell = {
            content: `${block.label}\n${block.time}`,
            styles: {
                fillColor: LIGHT,
                textColor: DARK,
                fontStyle: 'bold' as const,
                halign: 'center' as const,
                valign: 'middle' as const,
                fontSize: 6.5,
            },
        };

        const dayCells = WEEK_DAYS.map((day) => {
            const slot = semCourses.filter(
                (c) => c.WeekDay === day && c.TimeBlock === block.id
            );

            if (slot.length === 0) {
                return {
                    content: '',
                    styles: { fillColor: WHITE, lineColor: [229, 231, 235] as [number, number, number] },
                };
            }

            const isCollision = slot.length > 1;
            const cat = getCategory(slot[0].module);
            const fill: [number, number, number] = isCollision ? [254, 226, 226] : (CAT_FILL[cat] ?? LIGHT);
            const textColor: [number, number, number] = isCollision ? RED : (CAT_TEXT[cat] ?? DARK);

            // Concise content: module + truncated title + location only
            const lines = slot.flatMap((c, i) => [
                ...(i > 0 ? [''] : []),
                c.module,
                trunc(c.title, 32),
                ...(c.location ? [`@ ${c.location}`] : []),
            ]);

            return {
                content: isCollision ? ['COLLISION', ...lines].join('\n') : lines.join('\n'),
                styles: {
                    fillColor: fill,
                    textColor,
                    fontStyle: 'bold' as const,
                    fontSize: 6.5,
                    valign: 'top' as const,
                },
            };
        });

        return [timeCell, ...dayCells];
    });

    autoTable(doc, {
        startY,
        head: [
            [
                { content: 'Time', styles: { halign: 'center', fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 } },
                ...WEEK_DAYS.map((d) => ({
                    content: d,
                    styles: { halign: 'center' as const, fillColor: BLUE, textColor: WHITE, fontStyle: 'bold' as const, fontSize: 8 },
                })),
            ],
        ],
        body,
        theme: 'grid',
        styles: {
            cellPadding: 2,
            fontSize: 6.5,
            minCellHeight: 28,
            lineColor: [209, 213, 219],
            lineWidth: 0.25,
            overflow: 'linebreak',
        },
        columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 49 },
            2: { cellWidth: 49 },
            3: { cellWidth: 49 },
            4: { cellWidth: 49 },
            5: { cellWidth: 49 },
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index > 0) {
                const block = TIME_BLOCKS[data.row.index];
                const day = WEEK_DAYS[data.column.index - 1];
                const matched = semCourses.filter(
                    (c) => c.WeekDay === day && c.TimeBlock === block.id
                );
                if (matched.length === 1 && matched[0].link) {
                    doc.link(
                        data.cell.x,
                        data.cell.y,
                        data.cell.width,
                        data.cell.height,
                        { url: matched[0].link }
                    );
                }
            }
        },
    });
};

//  Detail list 

const drawDetailList = (doc: jsPDF, semCourses: SelectedCourse[], startY: number) => {
    autoTable(doc, {
        startY,
        head: [['Module', 'Title', 'Cat.', 'ECTS', 'Type', 'Day', 'Block', 'Schedule', 'Location', 'Link']],
        body: semCourses.map((c) => {
            const cat = getCategory(c.module);
            const block = TIME_BLOCKS.find((b) => b.id === c.TimeBlock);
            return [
                {
                    content: c.module,
                    styles: {
                        font: 'courier',
                        fontStyle: 'bold' as const,
                        fontSize: 7.5,
                        textColor: BLUE,
                    },
                },
                c.title,
                {
                    content: cat,
                    styles: {
                        fillColor: CAT_FILL[cat] ?? LIGHT,
                        textColor: CAT_TEXT[cat] ?? DARK,
                        fontStyle: 'bold' as const,
                        halign: 'center' as const,
                    },
                },
                {
                    content: String(c.credits || 3),
                    styles: { halign: 'center' as const, fontStyle: 'bold' as const },
                },
                {
                    content: c.type === 'R' ? 'Rec.' : 'Opt.',
                    styles: { textColor: c.type === 'R' ? GREEN : GRAY, halign: 'center' as const },
                },
                c.WeekDay,
                { content: block ? block.label : c.TimeBlock, styles: { halign: 'center' as const } },
                block ? block.time : '–',
                c.location || '–',
                { content: 'View', styles: { textColor: BLUE, halign: 'left' as const } },
            ];
        }),
        theme: 'striped',
        headStyles: { fillColor: LIGHT, textColor: DARK, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
            0: { cellWidth: 34 },
            2: { halign: 'center', cellWidth: 14 },
            3: { halign: 'center', cellWidth: 13 },
            4: { halign: 'center', cellWidth: 14 },
            5: { cellWidth: 24 },
            6: { halign: 'center', cellWidth: 16 },
            7: { cellWidth: 26 },
            8: { cellWidth: 22 },
        },
        didDrawCell: (data) => {
            // Make module code cell clickable
            if ((data.section === 'body' && data.column.index === 0) || (data.section === 'body' && data.column.index === 9)) {
                const course = semCourses[data.row.index];
                if (course?.link) {
                    doc.link(
                        data.cell.x,
                        data.cell.y,
                        data.cell.width,
                        data.cell.height,
                        { url: course.link }
                    );
                }
            }
        },
    });
};

//  Main export function
export const exportToPDF = (
    courses: SelectedCourse[],
    programName: string,
    validation: ValidationResult,
    rules: ValidationRules,
    hasCollisions: boolean
) => {
    const planStatus: 'valid' | 'warning' | 'invalid' = !validation.isValid
        ? 'invalid'
        : (hasCollisions || validation.bonus.count > 0)
            ? 'warning'
            : 'valid';
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageW = doc.internal.pageSize.getWidth();

    // PAGE 1: cover + validation summary
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('HES-SO MSE — Course Planner', 14, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${programName}   |   Exported: ${new Date().toLocaleDateString('fr-CH')}`, 14, 21);

    doc.setTextColor(...DARK);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Validation Summary', 14, 32);

    autoTable(doc, {
        startY: 36,
        head: [['Category', 'ECTS', 'Recommended (min)', 'Max ECTS', 'Status']],
        body: [
            ['TSM', String(validation.tsm.count), `${validation.tsm.rec} / ${rules.TSM.minRec}`, String(rules.TSM.max), statusCell(validation.tsm.message || '', validation.tsm.valid)],
            ['FTP', String(validation.ftp.count), `${validation.ftp.rec} / ${rules.FTP.minRec}`, String(rules.FTP.max), statusCell(validation.ftp.message || '', validation.ftp.valid)],
            ['MA',  String(validation.ma.count),  `${validation.ma.rec} / ${rules.MA.minRec}`,   String(rules.MA.max),  statusCell(validation.ma.message  || '', validation.ma.valid)],
            ['CM',  String(validation.cm.count),  '–', String(rules.CM.max), statusCell(validation.cm.message  || '', validation.cm.valid)],
            [
                { content: 'TOTAL', styles: { fontStyle: 'bold' as const } },
                { content: String(validation.totalEcts), styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
                '–', '–',
                planStatusCell(planStatus),
            ],
        ],
        theme: 'striped',
        headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 24 },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 48 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center' },
        },
    });

    // PAGES per semester: calendar + detail list
    (['1', '2', '3', '4'] as const).forEach((sem) => {
        const semCourses = courses.filter((c) => c.assignedSemester === sem);
        if (semCourses.length === 0) return;

        const semLabel = SEMESTER_LABELS[sem];
        const semECTS = semCourses.reduce((sum, c) => sum + (c.credits || 3), 0);
        const semInfo = `${semCourses.length} course${semCourses.length !== 1 ? 's' : ''} – ${semECTS} ECTS`;

        // Calendar page
        doc.addPage('landscape');
        drawHeader(doc, `${semLabel}  ·  Weekly Schedule`, semInfo);
        drawCalendar(doc, semCourses, 26);

        // Course detail list page
        doc.addPage('landscape');
        drawHeader(doc, `${semLabel}  ·  Course Details`, semInfo);
        drawDetailList(doc, semCourses, 22);
    });

    const slug = programName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    doc.save(`mse-schedule-${slug}.pdf`);
};
