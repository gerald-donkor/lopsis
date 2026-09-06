const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s]+/gi;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6_PATTERN = /(?<![\w:])(?:[A-F0-9]{0,4}:){2,7}[A-F0-9]{0,4}(?![\w:])/gi;
const PHONE_PATTERN = /(?:^|(?<=[^A-Z0-9]))\+?\d[\d\s().-]{7,}\d(?=$|\s|[,.!?;:])/gi;
const HANDLE_PATTERN = /(^|\s)@[A-Z0-9_]{2,32}\b/gi;

export function sanitizeAnalyticsQuery(value: string) {
  return value
    .normalize("NFKC")
    .replace(URL_PATTERN, "[url]")
    .replace(EMAIL_PATTERN, "[email]")
    .replace(IPV6_PATTERN, "[ip]")
    .replace(IPV4_PATTERN, "[ip]")
    .replace(PHONE_PATTERN, (match) => `${match.startsWith(" ") ? " " : ""}[phone]`)
    .replace(HANDLE_PATTERN, (_, prefix: string) => `${prefix}[handle]`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}
