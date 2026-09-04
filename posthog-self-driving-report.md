# PostHog Self-driving setup report

## Summary
PostHog Self-driving is configured for the Lopsis learning application. Session Replay and Error Tracking were already enabled; Support was enabled, and native health, error-tracking, and support signal sources were turned on. Findings should start appearing in the [Self-driving inbox](https://us.posthog.com/project/437003/inbox) within about 30 minutes as eligible data arrives.

## AI data processing
Approved.

## GitHub
The PostHog GitHub App was already connected before this setup. GitHub Issues was not selected as a Self-driving source, so no GitHub Issues responder was enabled.

## Products enabled

| Product | Status | Notes |
|---|---|---|
| Session Replay | Already enabled | Browser initialization was checked: it does not disable session recording. No recordings were returned by the probe yet. |
| Error Tracking | Already enabled | Browser initialization explicitly enables exception capture. No error issues were returned by the probe yet. |
| Support | Enabled | Connect an inbound email, inbox, or Slack channel in PostHog before tickets can arrive. |

## Signal sources

| Signal source | Action | Source config ID |
|---|---|---|
| `signals_scout` / `cross_source_issue` | Already active by server default; no opt-out row was created. | — |
| `health_checks` / `health_issue` | Enabled | `01a06e2c-2481-7c75-ab7b-8e4d474bb46b` |
| `error_tracking` / `issue_created` | Enabled | `01a06e2c-2481-7cc6-8f8b-9e553e40bb9a` |
| `error_tracking` / `issue_reopened` | Enabled | `01a06e2c-2550-7aae-8a64-2e9bcf97caae` |
| `error_tracking` / `issue_spiking` | Enabled | `01a06e2c-252a-7b67-af4a-05065b542cf7` |
| `conversations` / `ticket` | Enabled | `01a06e2c-256f-7b2b-9228-993e5bdd75f1` |
| Session replay | Deliberately not given a source row | Coverage belongs to Replay Vision scanners, which remain a follow-up below. |

## Connected tools

| Tool | Status |
|---|---|
| GitHub Issues | Not used — not selected in this setup. |
| Linear | Not used — not selected in this setup. |
| Jira | Not used — not selected in this setup. |
| Sentry | Not used — not selected in this setup. |
| Zendesk | Not used — not selected in this setup. |

## Scout troop

**Active (6):**

| Scout | Why it is active |
|---|---|
| `signals-scout-general` | Covers cross-product patterns and otherwise-unowned surfaces. |
| `signals-scout-product-analytics` | The application has extensive course, curriculum, catalog, and authentication engagement instrumentation. |
| `signals-scout-web-analytics` | The Next.js application depends on public traffic, landing pages, and learner navigation. |
| `signals-scout-health-checks` | Monitors actionable PostHog setup and instrumentation health. |
| `signals-scout-course-discovery-start` | Custom check for discovery-to-learning-start progression and discovery-entry volume collapses. |
| `signals-scout-curriculum-engagement` | Custom check for sustained learner drop-off while exploring curriculum after entering a course. |

**Disabled (23):** The remaining scouts are disabled to keep the troop selective. Error-tracking coverage is provided by the native source; session-replay coverage is reserved for Replay Vision scanners. Surface-specific scouts for AI observability, APM, Conversations, CSP, customer analytics, data pipelines/warehouse, experiments, feature flags, logs, revenue, surveys, tasks, web vitals, and other inactive surfaces can be enabled later when those surfaces become important.

| Run-budget setting | Value |
|---|---|
| Maximum runs per day | 100 |
| Runs used today | 0 |
| Runs remaining today | 100 |

> Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more.

## Custom scouts

| Scout | What it watches | Report discriminator | Coverage rationale |
|---|---|---|---|
| `signals-scout-course-discovery-start` | The progression from course discovery through course viewing to starting learning. | A sustained material progression regression, or discovery-entry collapse while overall traffic is stable. | The built-in product-analytics scout partially overlaps but primarily watches saved flows with stable entrants; this custom scout owns the Lopsis discovery-to-start contract and entrant-volume failure mode. |
| `signals-scout-curriculum-engagement` | Learners entering courses, expanding modules, choosing lessons, and starting learning. | A sustained, material deterioration after course entry, broad enough to rule out ordinary exploration or low-volume curricula. | The built-in product-analytics scout is broad; this custom scout owns the curriculum-specific engagement loop. |

The approved scouts are enabled, emitting, and scheduled daily with server defaults. They contain explicit low-volume, new-content, test-traffic, and untrusted-data safeguards. To diagnose noise without deleting a scout, set its configuration's `emit` value to `false` in PostHog; it will run in dry-run mode.

Surfaces considered but not made into custom scouts: search and sign-up completion do not currently have sufficiently complete success/failure event pairs, so they would not produce reliable findings.

## Replay Vision scanners

A Replay Vision scanner is an LLM that watches individual session recordings on a schedule and pushes confirmed visual defects to the inbox. It is the only part of this setup that spends Replay Vision quota; scanner findings carry half weight and need corroboration before promotion into a report.

| Required monitor | Status | Reason |
|---|---|---|
| Broken-experience monitor | Deferred | No existing scanners were found, and Session Replay is enabled, but the required shared monitor-brief skills and in-product scanner guidance were unavailable in this environment. A locked brief was not replaced with an invented prompt. |
| User-frustration monitor | Deferred | Same environment limitation. The monitor should target frustration sessions independently from the completion-flow breakage monitor. |

No recordings were returned by the setup probe. Configure the two monitors after the shared Replay Vision scanner skills are available; they will remain idle until recordings begin.

## Follow-ups

- [ ] Connect an inbound Support channel (email, inbox, or Slack) in PostHog to begin receiving support-ticket findings.
- [ ] Configure the two Replay Vision monitors in PostHog once the shared scanner-brief skills are available. Use the Replay Vision area: https://us.posthog.com/project/437003/replay-vision
- [ ] Add success events for search submission/results and authentication completion before introducing dedicated scouts for those journeys.

## What happens next
Fresh scout configurations are picked up by the coordinator within about 30 minutes and draw from the daily run budget. Eligible findings cluster into reports in the [Self-driving inbox](https://us.posthog.com/project/437003/inbox); immediately actionable reports can start coding tasks.

## Repository files

| File | Change |
|---|---|
| `posthog-self-driving-report.md` | Created this setup report. |

No application source files were modified.
