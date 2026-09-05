"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

type VideoEmbed = { provider: "YouTube" | "Vimeo" | "Bunny"; src: string };

function createEmbedUrl(videoUrl: string, startSeconds: number): VideoEmbed | null {
  try {
    const url = new URL(videoUrl);
    if (url.protocol !== "https:") return null;

    const start = String(Math.max(0, Math.floor(startSeconds)));
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      const id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
      if (!id || !/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null;
      return { provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}?start=${start}&rel=0` };
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
      return { provider: "Bunny", src: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?start=${start}` };
    }
  } catch {
    return null;
  }

  return null;
}

export function LessonVideo({ lessonSlug, lessonTitle, videoUrl, startSeconds }: { lessonSlug: string; lessonTitle: string; videoUrl: string; startSeconds: number }) {
  const embed = createEmbedUrl(videoUrl, startSeconds);

  useEffect(() => {
    posthog.capture("lesson_viewed", { lesson_slug: lessonSlug, lesson_title: lessonTitle, start_seconds: startSeconds || undefined });
  }, [lessonSlug, lessonTitle, startSeconds]);

  if (!embed) {
    return <div className="lesson-video-unavailable" role="status"><strong>Video unavailable</strong><span>This lesson video cannot be played in Lopsis yet.</span></div>;
  }

  return (
    <div className="lesson-video-frame">
      <iframe
        src={embed.src}
        title={`${lessonTitle} video on ${embed.provider}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        onLoad={() => posthog.capture("lesson_video_embed_loaded", { lesson_slug: lessonSlug, provider: embed.provider, start_seconds: startSeconds || undefined })}
      />
    </div>
  );
}
