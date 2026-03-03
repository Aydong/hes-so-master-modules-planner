export type CourseType = 'R' | 'O' | 'C';
export type Semester = '1' | '2';
export type WeekDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
export type TimeBlock = 'TB1' | 'TB2' | 'TB3' | 'TB4';

export interface Course {
    module: string;
    title: string;
    link: string;
    type: CourseType;
    Semester: Semester;
    WeekDay: WeekDay;
    TimeBlock: TimeBlock;
    location?: string;
    credits?: number;
}

export interface SelectedCourse extends Course {
    assignedSemester: '1' | '2' | '3' | '4';
}

export interface ValidationResult {
    tsm: { count: number; rec: number; valid: boolean; message?: string };
    ftp: { count: number; rec: number; valid: boolean; message?: string };
    ma: { count: number; rec: number; valid: boolean; message?: string };
    cm: { count: number; valid: boolean; message?: string };
    bonus: { count: number; valid: boolean; message?: string };
    totalEcts: number;
    isValid: boolean;
}

export interface Collision {
    course1: Course;
    course2: Course;
}

export interface ValidationRules {
    TSM: { max: number; minRec: number };
    FTP: { max: number; minRec: number };
    MA: { max: number; minRec: number };
    CM: { max: number; minRec: number };
    BONUS: number;
}
