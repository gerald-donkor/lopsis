export interface ProgressRecord {
  _id: string;
  userId: string;
  courseId: string;
  courseSlug?: string;
  completedLessonIds: string[];
  lastLessonId?: string;
  lastLessonSlug?: string;
  lastPositionSeconds?: number;
  lastUpdated: string;
}

export interface CourseProgressSummary {
  completedCount: number;
  totalLessons?: number;
  percentage: number;
  isCompleted: boolean;
  lastLessonId?: string;
  lastLessonSlug?: string;
  lastPositionSeconds?: number;
}

export interface ToggleCompletePayload {
  action: 'toggle_complete';
  courseId: string;
  lessonId: string;
  completed?: boolean;
  completionSource?: 'manual' | 'video_ended';
}

export interface SavePositionPayload {
  action: 'save_position';
  courseId: string;
  lessonId: string;
  positionSeconds: number;
}

export interface RecordResumePayload {
  action: 'record_resume';
  courseId: string;
  lessonId: string;
  resumePositionSeconds: number;
}

export type ProgressActionPayload =
  | ToggleCompletePayload
  | SavePositionPayload
  | RecordResumePayload;

export interface LearnerProgressContextValue {
  records: Record<string, ProgressRecord>;
  isLoading: boolean;
  isSignedIn: boolean;
  isLessonCompleted: (courseId: string, lessonId: string) => boolean;
  getCourseProgress: (courseId: string, totalLessons?: number) => CourseProgressSummary;
  toggleComplete: (
    courseId: string,
    lessonId: string,
    completed?: boolean,
    source?: 'manual' | 'video_ended',
  ) => Promise<boolean>;
  savePosition: (
    courseId: string,
    lessonId: string,
    positionSeconds: number,
  ) => Promise<void>;
  recordResume: (
    courseId: string,
    lessonId: string,
    positionSeconds: number,
  ) => Promise<void>;
  refresh: () => Promise<void>;
}
