import { PostHog } from "posthog-node";
import { auth } from "@clerk/nextjs/server";
import "server-only";
import type {
  AnalyticsEvent,
  AnalyticsProperties,
  ProgressAnalyticsEvent,
} from "@/lib/analytics/events";

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!token) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured"
      );
    }
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(token, {
      host: host ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

function boundedHeader(request: Request, name: string, maxLength = 240) {
  const value = request.headers.get(name)?.trim();
  if (!value || value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

async function analyticsIdentity(request: Request) {
  const { userId } = await auth();
  const distinctId = userId ?? boundedHeader(request, "x-posthog-distinct-id");
  if (!distinctId) return null;

  return {
    distinctId,
    sessionId: boundedHeader(request, "x-posthog-session-id"),
  };
}

export async function captureServerEvent({
  request,
  event,
  properties = {},
}: {
  request: Request;
  event: AnalyticsEvent;
  properties?: AnalyticsProperties;
}) {
  try {
    const [client, identity] = await Promise.all([
      Promise.resolve(getPostHogClient()),
      analyticsIdentity(request),
    ]);
    if (!client || !identity) return;

    await client.captureImmediate({
      distinctId: identity.distinctId,
      event,
      properties: {
        ...properties,
        ...(identity.sessionId ? { $session_id: identity.sessionId } : {}),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("PostHog server capture failed", error instanceof Error ? error.name : "UnknownError");
    }
  }
}

/** Call only after the corresponding progress read or write has succeeded. */
export async function captureProgressEvent(
  request: Request,
  { event, properties }: ProgressAnalyticsEvent,
) {
  await captureServerEvent({ request, event, properties });
}
