export const ANALYTICS_EVENTS = {
  courseViewed: "course_viewed",
  lessonViewed: "lesson_viewed",
  lessonResourceOpened: "lesson_resource_opened",
  lessonTabSelected: "lesson_tab_selected",
  searchFailed: "search_failed",
  searchPerformed: "search_performed",
  searchResultOpened: "search_result_opened",
  searchSortChanged: "search_sort_changed",
  searchZeroResults: "search_zero_results",
  videoCompleted: "video_completed",
  videoPlaybackFailed: "video_playback_failed",
  videoPlayed: "video_played",
  videoWatchDepthReached: "video_watch_depth_reached",
  resumeUsed: "resume_used",
  lessonCompleted: "lesson_completed",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsProperty = boolean | number | string | null | undefined;
export type AnalyticsProperties = Record<string, AnalyticsProperty>;

export type ProgressAnalyticsEvent =
  | {
      event: typeof ANALYTICS_EVENTS.resumeUsed;
      properties: {
        course_id: string;
        lesson_id: string;
        resume_position_seconds: number;
      };
    }
  | {
      event: typeof ANALYTICS_EVENTS.lessonCompleted;
      properties: {
        course_id: string;
        lesson_id: string;
        completion_source: "manual" | "video_ended";
      };
    };
