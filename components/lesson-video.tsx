"use client";

import type Player from "@vimeo/player";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useLearnerProgress } from "@/lib/progress/use-learner-progress";
import { resolveLessonStartSeconds, shouldAutoCompleteLesson } from "@/lib/progress/lesson-state";
import { createEmbedUrl } from "@/lib/search/timestamp-resolution";
type TimingData = { duration?: number; percent?: number; seconds?: number };
type YouTubePlayerInstance = {
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
};
type YouTubePlayerEvent = { data: number; target: YouTubePlayerInstance };
type BunnyCallback = (data?: string | TimingData) => void;
type BunnyPlayer = {
  on(event: string, callback: BunnyCallback): void;
  off(event: string, callback: BunnyCallback): void;
  setCurrentTime?(seconds: number): void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLIFrameElement, options: {
        events: {
          onError: (event: YouTubePlayerEvent) => void;
          onReady: (event: YouTubePlayerEvent) => void;
          onStateChange: (event: YouTubePlayerEvent) => void;
        };
      }) => YouTubePlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
    playerjs?: { Player: new (element: HTMLIFrameElement) => BunnyPlayer };
  }
}

const DEPTH_MILESTONES = [25, 50, 75, 90, 100] as const;
const POSITION_SAVE_INTERVAL_MS = 15_000;
const MINIMUM_RESUME_SECONDS = 5;
let youtubeApiPromise: Promise<void> | null = null;
let bunnyApiPromise: Promise<void> | null = null;

function loadScript(src: string, ready: () => boolean) {
  return new Promise<void>((resolve, reject) => {
    if (ready()) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("player_api_unavailable")), { once: true });
    if (!existing) {
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise<void>((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        resolve();
      };
      void loadScript("https://www.youtube.com/iframe_api", () => Boolean(window.YT?.Player)).catch(reject);
    });
  }
  return youtubeApiPromise;
}

function loadBunnyApi() {
  if (window.playerjs?.Player) return Promise.resolve();
  if (!bunnyApiPromise) {
    bunnyApiPromise = loadScript(
      "https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js",
      () => Boolean(window.playerjs?.Player),
    );
  }
  return bunnyApiPromise;
}

function parseTimingData(data: string | TimingData | undefined): TimingData {
  if (!data) return {};
  if (typeof data !== "string") return data;
  try {
    const parsed = JSON.parse(data) as TimingData;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

type LessonVideoProps = {
  courseId: string | null;
  courseSlug: string | null;
  durationSeconds: number | null;
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  posterUrl: string | null;
  startSeconds: number;
  videoUrl: string;
};

/**
 * Renders the lesson's embedded video player with provider-specific playback, progress tracking, and analytics.
 * Player remounts when video source or playback context changes to ensure correct initialization.
 */
export function LessonVideo({ courseId, courseSlug, durationSeconds, lessonId, lessonSlug, lessonTitle, posterUrl, startSeconds, videoUrl }: LessonVideoProps) {
  const { records, isSignedIn, isLessonCompleted, recordResume, savePosition, toggleComplete } = useLearnerProgress();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playedRef = useRef(false);
  const failuresRef = useRef(new Set<string>());
  const reachedDepthsRef = useRef(new Set<number>());
  const currentPositionRef = useRef(0);
  const lastSavedAtRef = useRef(0);
  const lastSavedPositionRef = useRef(0);
  const resumedLessonRef = useRef<string | null>(null);
  const progressActionsRef = useRef({ isSignedIn, isCompleted: false, recordResume, savePosition, toggleComplete });
  const progressRecord = courseId ? records[courseId] : undefined;
  const savedResumeSeconds = resolveLessonStartSeconds({
    requestedStartSeconds: 0,
    lessonId,
    savedLessonId: progressRecord?.lastLessonId,
    savedPositionSeconds: progressRecord?.lastPositionSeconds,
  });
  const completed = courseId ? isLessonCompleted(courseId, lessonId) : false;
  const [startedPlayback, setStartedPlayback] = useState<{
    lessonId: string;
    queryStartSeconds: number;
    effectiveStartSeconds: number;
  } | null>(null);
  const desiredStartSeconds = resolveLessonStartSeconds({
    requestedStartSeconds: startSeconds,
    lessonId,
    savedLessonId: progressRecord?.lastLessonId,
    savedPositionSeconds: progressRecord?.lastPositionSeconds,
  });
  const effectiveStartSeconds =
    startedPlayback?.lessonId === lessonId &&
    startedPlayback.queryStartSeconds === startSeconds
      ? startedPlayback.effectiveStartSeconds
      : desiredStartSeconds;
  const embed = useMemo(() => createEmbedUrl(videoUrl, effectiveStartSeconds), [effectiveStartSeconds, videoUrl]);
  const playerKey = JSON.stringify([videoUrl, embed?.src, courseId, courseSlug, durationSeconds, lessonId, lessonSlug, effectiveStartSeconds]);

  useEffect(() => {
    progressActionsRef.current = {
      isSignedIn,
      isCompleted: completed,
      recordResume,
      savePosition,
      toggleComplete,
    };
  }, [completed, isSignedIn, recordResume, savePosition, toggleComplete]);

  useEffect(() => {
    if (
      startSeconds === 0 &&
      savedResumeSeconds > MINIMUM_RESUME_SECONDS &&
      courseId &&
      isSignedIn &&
      resumedLessonRef.current !== lessonId
    ) {
      resumedLessonRef.current = lessonId;
      void recordResume(courseId, lessonId, savedResumeSeconds);
    }
  }, [courseId, isSignedIn, lessonId, recordResume, savedResumeSeconds, startSeconds]);

  useEffect(() => {
    posthog.capture(ANALYTICS_EVENTS.lessonViewed, {
      course_id: courseId ?? undefined,
      course_slug: courseSlug ?? undefined,
      lesson_id: lessonId,
      lesson_slug: lessonSlug,
      start_seconds: startSeconds || undefined,
    });
  }, [courseId, courseSlug, lessonId, lessonSlug, startSeconds]);

  useEffect(() => {
    if (embed) return;
    posthog.capture(ANALYTICS_EVENTS.videoPlaybackFailed, {
      course_id: courseId ?? undefined,
      course_slug: courseSlug ?? undefined,
      lesson_id: lessonId,
      lesson_slug: lessonSlug,
      failure_type: "unsupported_provider",
    });
  }, [courseId, courseSlug, embed, lessonId, lessonSlug]);

  useEffect(() => {
    if (!embed || !iframeRef.current) return;
    const activeEmbed = embed;
    const iframe = iframeRef.current;
    let disposed = false;
    let youtubePlayer: YouTubePlayerInstance | null = null;
    let youtubeTimer: ReturnType<typeof setInterval> | null = null;
    let vimeoPlayer: Player | null = null;
    let bunnyPlayer: BunnyPlayer | null = null;
    const bunnyCleanups: Array<[string, BunnyCallback]> = [];
    const initialDepth = durationSeconds && durationSeconds > 0 ? (effectiveStartSeconds / durationSeconds) * 100 : 0;
    reachedDepthsRef.current = new Set(DEPTH_MILESTONES.filter((milestone) => milestone <= initialDepth));
    playedRef.current = false;
    failuresRef.current = new Set();
    currentPositionRef.current = effectiveStartSeconds;
    lastSavedPositionRef.current = effectiveStartSeconds;
    lastSavedAtRef.current = Date.now();

    const baseProperties = {
      provider: activeEmbed.provider.toLowerCase(),
      course_id: courseId ?? undefined,
      course_slug: courseSlug ?? undefined,
      lesson_id: lessonId,
      lesson_slug: lessonSlug,
      start_seconds: effectiveStartSeconds,
    };

    function captureFailure(failureType: "player_api_unavailable" | "provider_error") {
      if (failuresRef.current.has(failureType)) return;
      failuresRef.current.add(failureType);
      posthog.capture(ANALYTICS_EVENTS.videoPlaybackFailed, { ...baseProperties, failure_type: failureType });
    }

    function recordPlay(position = effectiveStartSeconds, duration = durationSeconds ?? undefined) {
      if (playedRef.current) return;
      playedRef.current = true;
      setStartedPlayback({
        lessonId,
        queryStartSeconds: startSeconds,
        effectiveStartSeconds,
      });
      currentPositionRef.current = position;
      posthog.capture(ANALYTICS_EVENTS.videoPlayed, {
        ...baseProperties,
        position_seconds: Math.max(0, Math.round(position)),
        duration_seconds: duration && duration > 0 ? Math.round(duration) : undefined,
      });
    }

    function recordProgress(position: number, duration: number) {
      if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;
      currentPositionRef.current = Math.max(0, position);
      const percent = Math.max(0, Math.min(100, (position / duration) * 100));
      for (const milestone of DEPTH_MILESTONES) {
        if (percent < milestone || reachedDepthsRef.current.has(milestone)) continue;
        reachedDepthsRef.current.add(milestone);
        posthog.capture(ANALYTICS_EVENTS.videoWatchDepthReached, {
          ...baseProperties,
          depth_percent: milestone,
          position_seconds: Math.max(0, Math.round(position)),
          duration_seconds: Math.round(duration),
        });
      }
    }

    function persistPosition(position: number, force = false, keepalive = false) {
      const actions = progressActionsRef.current;
      if (
        !courseId ||
        !actions.isSignedIn ||
        actions.isCompleted ||
        !playedRef.current ||
        !Number.isFinite(position) ||
        position <= MINIMUM_RESUME_SECONDS
      ) return;

      const roundedPosition = Math.max(0, Math.floor(position));
      const enoughTimePassed = Date.now() - lastSavedAtRef.current >= POSITION_SAVE_INTERVAL_MS;
      const positionChanged = Math.abs(roundedPosition - lastSavedPositionRef.current) >= 2;
      if ((!force && !enoughTimePassed) || !positionChanged) return;

      lastSavedAtRef.current = Date.now();
      lastSavedPositionRef.current = roundedPosition;
      void actions.savePosition(courseId, lessonId, roundedPosition, { keepalive });
    }

    function recordCompleted(position: number, duration: number) {
      currentPositionRef.current = Math.max(0, position);
      recordProgress(duration, duration);
      posthog.capture(ANALYTICS_EVENTS.videoCompleted, {
        ...baseProperties,
        position_seconds: Math.max(0, Math.round(position)),
        duration_seconds: duration > 0 ? Math.round(duration) : undefined,
      });
      const actions = progressActionsRef.current;
      if (courseId && shouldAutoCompleteLesson(courseId, actions.isSignedIn, actions.isCompleted)) {
        actions.isCompleted = true;
        void actions.toggleComplete(courseId, lessonId, true, "video_ended");
      }
    }

    const handleBeforeUnload = () => persistPosition(currentPositionRef.current, true, true);
    window.addEventListener("beforeunload", handleBeforeUnload);

    async function connectPlayer() {
      try {
        if (activeEmbed.provider === "YouTube") {
          await loadYouTubeApi();
          if (disposed) return;
          if (!window.YT?.Player) throw new Error("player_api_unavailable");
          youtubePlayer = new window.YT.Player(iframe, {
            events: {
              onReady: (event) => {
                if (!disposed && effectiveStartSeconds > 0) {
                  event.target.seekTo(effectiveStartSeconds, true);
                }
              },
              onError: () => captureFailure("provider_error"),
              onStateChange: (event) => {
                if (event.data === 1) {
                  recordPlay(event.target.getCurrentTime(), event.target.getDuration());
                  if (youtubeTimer) clearInterval(youtubeTimer);
                  youtubeTimer = setInterval(() => {
                    if (!disposed && youtubePlayer) {
                      const position = youtubePlayer.getCurrentTime();
                      recordProgress(position, youtubePlayer.getDuration());
                      persistPosition(position);
                    }
                  }, 1_000);
                } else if (event.data === 0) {
                  if (youtubeTimer) clearInterval(youtubeTimer);
                  youtubeTimer = null;
                  recordCompleted(event.target.getCurrentTime(), event.target.getDuration());
                } else if (event.data === 2) {
                  persistPosition(event.target.getCurrentTime(), true);
                  if (youtubeTimer) {
                    clearInterval(youtubeTimer);
                    youtubeTimer = null;
                  }
                }
              },
            },
          });
          return;
        }

        if (activeEmbed.provider === "Vimeo") {
          const { default: VimeoPlayer } = await import("@vimeo/player");
          if (disposed) return;
          vimeoPlayer = new VimeoPlayer(iframe);
          if (effectiveStartSeconds > 0) {
            void vimeoPlayer.ready().then(() => {
              if (!disposed && vimeoPlayer) {
                return vimeoPlayer.setCurrentTime(effectiveStartSeconds);
              }
            }).catch(() => undefined);
          }
          vimeoPlayer.on("play", (data) => recordPlay(data.seconds, data.duration));
          vimeoPlayer.on("timeupdate", (data) => {
            recordProgress(data.seconds, data.duration);
            persistPosition(data.seconds);
          });
          vimeoPlayer.on("pause", (data) => persistPosition(data.seconds, true));
          vimeoPlayer.on("ended", (data) => recordCompleted(data.seconds, data.duration));
          vimeoPlayer.on("error", () => captureFailure("provider_error"));
          return;
        }

        await loadBunnyApi();
        if (disposed) return;
        if (!window.playerjs?.Player) throw new Error("player_api_unavailable");
        bunnyPlayer = new window.playerjs.Player(iframe);
        if (effectiveStartSeconds > 0) {
          const onReady: BunnyCallback = () => {
            if (!disposed && bunnyPlayer && typeof bunnyPlayer.setCurrentTime === "function") {
              bunnyPlayer.setCurrentTime(effectiveStartSeconds);
            }
          };
          bunnyCleanups.push(["ready", onReady]);
          bunnyPlayer.on("ready", onReady);
        }
        const onPlay: BunnyCallback = (raw) => { const data = parseTimingData(raw); recordPlay(data.seconds, data.duration); };
        const onTimeUpdate: BunnyCallback = (raw) => { const data = parseTimingData(raw); const position = data.seconds ?? 0; recordProgress(position, data.duration ?? durationSeconds ?? 0); persistPosition(position); };
        const onPause: BunnyCallback = (raw) => { const data = parseTimingData(raw); persistPosition(data.seconds ?? currentPositionRef.current, true); };
        const onEnded: BunnyCallback = (raw) => { const data = parseTimingData(raw); recordCompleted(data.seconds ?? data.duration ?? 0, data.duration ?? durationSeconds ?? 0); };
        const onError: BunnyCallback = () => captureFailure("provider_error");
        const eventListeners: Array<[string, BunnyCallback]> = [["play", onPlay], ["timeupdate", onTimeUpdate], ["pause", onPause], ["ended", onEnded], ["error", onError]];
        for (const [event, callback] of eventListeners) {
          bunnyCleanups.push([event, callback]);
          bunnyPlayer.on(event, callback);
        }
      } catch {
        captureFailure("player_api_unavailable");
      }
    }

    void connectPlayer();
    return () => {
      persistPosition(currentPositionRef.current, true);
      disposed = true;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (youtubeTimer) clearInterval(youtubeTimer);
      youtubePlayer?.destroy();
      void vimeoPlayer?.destroy().catch(() => undefined);
      if (bunnyPlayer) for (const [event, callback] of bunnyCleanups) bunnyPlayer.off(event, callback);
    };
  }, [courseId, courseSlug, durationSeconds, effectiveStartSeconds, embed, lessonId, lessonSlug, startSeconds]);

  if (!embed) {
    return <div className="lesson-video-unavailable" role="status"><strong>Video unavailable</strong><span>This lesson video cannot be played in Lopsis yet.</span></div>;
  }

  return (
    <div className="lesson-video-frame" style={{ position: "relative" }}>
      {posterUrl && (
        <Image
          src={posterUrl}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 900px) calc(100vw - 48px), 860px"
          style={{ objectFit: "cover" }}
          priority={false}
        />
      )}
      <iframe
        key={playerKey}
        ref={iframeRef}
        src={embed.src}
        title={`${lessonTitle} video on ${embed.provider}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        style={{ position: "relative" }}
      />
    </div>
  );
}
