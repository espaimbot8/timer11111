export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  completedAt?: Date;
}

export interface WeeklyGoal {
  id: string;
  title: string;
  progress: number; // 0 to 100
  tasks: Task[];
}

export interface Exam {
  id: string;
  subject: string;
  date: string; // ISO date string
  topics: string[];
}

export interface VisionItem {
  id: string;
  type: 'image' | 'quote' | 'text';
  content: string;
  caption?: string;
}

export interface FocusSession {
  id: string;
  durationMinutes: number;
  completedAt: string; // ISO string
  label: string;
}

export enum TimerMode {
  FOCUS = 'Focus',
  SHORT_BREAK = 'Short Break',
  LONG_BREAK = 'Long Break',
}