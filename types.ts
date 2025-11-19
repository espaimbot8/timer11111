
export const TaskStatus = { TODO: 'TODO', IN_PROGRESS: 'IN_PROGRESS', DONE: 'DONE' };
export const TimerMode = { FOCUS: 'Focus', SHORT_BREAK: 'Short Break', LONG_BREAK: 'Long Break' };

export interface Task {
  id: string;
  title: string;
  status: string;
}

export interface Goal {
  id: string;
  title: string;
  progress: number;
  tasks: Task[];
}

export interface VisionItem {
  id: string;
  type: string;
  content: string;
  caption?: string;
}

export interface Exam {
  id: string;
  subject: string;
  date: string;
  topics: string[];
}
