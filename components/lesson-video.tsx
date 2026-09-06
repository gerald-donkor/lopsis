"use client";

import type Player from "@vimeo/player";
import { useEffect, useMemo, useRef } from "react";
import posthog from "posthog-js";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

type VideoEmbed = { provider: "YouTube" | "Vimeo" | "Bunny"; src: string };
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

function createEmbedUrl(videoUrl: string, startSeconds: number): VideoEmbed | null {
  try {
    const url = new URL(videoUrl);
    if (url.protocol !== "https:") return null;
    const start = String(Math.max(0, Math.floor(startSeconds)));
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      const id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
      if (!id || !/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null;
      return { provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}?start=${start}&rel=0&enablejsapi=1&playsinline=1` };
    }

    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      const id = url.pathname.split("/").find((part) => /^\d+$/.test(part));
      if (!id) return null;
      return { provider: "Vimeo", src: `https://player.vimeo.com/video/${id}#t=${start}s` };
    }

    if (host.endsWith("mediadelivery.net") || host.endsWith("b-cdn.net")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const libraryId = parts.indexOf("embed") >= 0 ? parts[parts.indexOf("embed") + 1] : parts[0];
      const videoId = parts.indexOf("embed") >= 0 ? parts[parts.indexOf("embed") + 2] : parts[1];
      if (!libraryId || !videoId || !/^[\w-]+$/.test(libraryId) || !/^[\w-]+$/.test(videoId)) return null;
      return { provider: "Bunny", src: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?t=${start}&start=${start}` };
    }
  } catch {
    return null;
  }
  return null;
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
  startSeconds: number;
  videoUrl: string;
};

/**
 * Renders the lesson's embedded video player with provider-specific playback, progress tracking, and analytics.
 * Player remounts when video source or playback context changes to ensure correct initialization.
 */
export function LessonVideo({ courseId, courseSlug, durationSeconds, lessonId, lessonSlug, lessonTitle, startSeconds, videoUrl }: LessonVideoProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playedRef = useRef(false);
  const failuresRef = useRef(new Set<string>());
  const reachedDepthsRef = useRef(new Set<number>());
  const embed = useMemo(() => createEmbedUrl(videoUrl, startSeconds), [startSeconds, videoUrl]);
  const playerKey = JSON.stringify([videoUrl, embed?.src, courseId, courseSlug, durationSeconds, lessonId, lessonSlug, startSeconds]);

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
    const initialDepth = durationSeconds && durationSeconds > 0 ? (startSeconds / durationSeconds) * 100 : 0;
    reachedDepthsRef.current = new Set(DEPTH_MILESTONES.filter((milestone) => milestone <= initialDepth));
    playedRef.current = false;
    failuresRef.current = new Set();

    const baseProperties = {
      provider: activeEmbed.provider.toLowerCase(),
      course_id: courseId ?? undefined,
      course_slug: courseSlug ?? undefined,
      lesson_id: lessonId,
      lesson_slug: lessonSlug,
      start_seconds: startSeconds,
    };

    function captureFailure(failureType: "player_api_unavailable" | "provider_error") {
      if (failuresRef.current.has(failureType)) return;
      failuresRef.current.add(failureType);
      posthog.capture(ANALYTICS_EVENTS.videoPlaybackFailed, { ...baseProperties, failure_type: failureType });
    }

    function recordPlay(position = startSeconds, duration = durationSeconds ?? undefined) {
      if (playedRef.current) return;
      playedRef.current = true;
      posthog.capture(ANALYTICS_EVENTS.videoPlayed, {
        ...baseProperties,
        position_seconds: Math.max(0, Math.round(position)),
        duration_seconds: duration && duration > 0 ? Math.round(duration) : undefined,
      });
    }

    function recordProgress(position: number, duration: number) {
      if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;
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

    function recordCompleted(position: number, duration: number) {
      recordProgress(duration, duration);
      posthog.capture(ANALYTICS_EVENTS.videoCompleted, {
        ...baseProperties,
        position_seconds: Math.max(0, Math.round(position)),
        duration_seconds: duration > 0 ? Math.round(duration) : undefined,
      });
    }

    async function connectPlayer() {
      try {
        if (activeEmbed.provider === "YouTube") {
          await loadYouTubeApi();
          if (disposed) return;
          if (!window.YT?.Player) throw new Error("player_api_unavailable");
          youtubePlayer = new window.YT.Player(iframe, {
            events: {
              onReady: (event) => {
                if (startSeconds > 0) {
                  event.target.seekTo(startSeconds, true);
                }
              },
              onError: () => captureFailure("provider_error"),
              onStateChange: (event) => {
                if (event.data === 1) {
                  recordPlay(event.target.getCurrentTime(), event.target.getDuration());
                  if (youtubeTimer) clearInterval(youtubeTimer);
                  youtubeTimer = setInterval(() => {
                    if (!disposed && youtubePlayer) recordProgress(youtubePlayer.getCurrentTime(), youtubePlayer.getDuration());
                  }, 1_000);
                } else if (event.data === 0) {
                  if (youtubeTimer) clearInterval(youtubeTimer);
                  youtubeTimer = null;
                  recordCompleted(event.target.getCurrentTime(), event.target.getDuration());
                } else if (event.data === 2 && youtubeTimer) {
                  clearInterval(youtubeTimer);
                  youtubeTimer = null;
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
          if (startSeconds > 0) {
            void vimeoPlayer.ready().then(() => {
              if (!disposed && vimeoPlayer) {
                return vimeoPlayer.setCurrentTime(startSeconds);
              }
            }).catch(() => undefined);
          }
          vimeoPlayer.on("play", (data) => recordPlay(data.seconds, data.duration));
          vimeoPlayer.on("timeupdate", (data) => recordProgress(data.seconds, data.duration));
          vimeoPlayer.on("ended", (data) => recordCompleted(data.seconds, data.duration));
          vimeoPlayer.on("error", () => captureFailure("provider_error"));
          return;
        }

        await loadBunnyApi();
        if (disposed) return;
        if (!window.playerjs?.Player) throw new Error("player_api_unavailable");
        bunnyPlayer = new window.playerjs.Player(iframe);
        if (startSeconds > 0) {
          bunnyPlayer.on("ready", () => {
            if (!disposed && bunnyPlayer && typeof bunnyPlayer.setCurrentTime === "function") {
              bunnyPlayer.setCurrentTime(startSeconds);
            }
          });
        }
        const onPlay: BunnyCallback = (raw) => { const data = parseTimingData(raw); recordPlay(data.seconds, data.duration); };
        const onTimeUpdate: BunnyCallback = (raw) => { const data = parseTimingData(raw); recordProgress(data.seconds ?? 0, data.duration ?? durationSeconds ?? 0); };
        const onEnded: BunnyCallback = (raw) => { const data = parseTimingData(raw); recordCompleted(data.seconds ?? data.duration ?? 0, data.duration ?? durationSeconds ?? 0); };
        const onError: BunnyCallback = () => captureFailure("provider_error");
        bunnyCleanups.push(["play", onPlay], ["timeupdate", onTimeUpdate], ["ended", onEnded], ["error", onError]);
        for (const [event, callback] of bunnyCleanups) bunnyPlayer.on(event, callback);
      } catch {
        captureFailure("player_api_unavailable");
      }
    }

    void connectPlayer();
    return () => {
      disposed = true;
      if (youtubeTimer) clearInterval(youtubeTimer);
      youtubePlayer?.destroy();
      void vimeoPlayer?.destroy().catch(() => undefined);
      if (bunnyPlayer) for (const [event, callback] of bunnyCleanups) bunnyPlayer.off(event, callback);
    };
  }, [courseId, courseSlug, durationSeconds, embed, lessonId, lessonSlug, startSeconds]);

  if (!embed) {
    return <div className="lesson-video-unavailable" role="status"><strong>Video unavailable</strong><span>This lesson video cannot be played in Lopsis yet.</span></div>;
  }

  return (
    <div className="lesson-video-frame">
      <iframe
        key={playerKey}
        ref={iframeRef}
        src={embed.src}
        title={`${lessonTitle} video on ${embed.provider}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      />
    </div>
  );
}
