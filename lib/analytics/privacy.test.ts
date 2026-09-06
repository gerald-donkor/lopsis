import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeAnalyticsQuery } from "./privacy";

describe("sanitizeAnalyticsQuery", () => {
  it("redacts phone numbers prefixed by punctuation", () => {
    for (const query of ["Call:+1 202-555-0100", "Phone=202.555.0100!"]) {
      const sanitized = sanitizeAnalyticsQuery(query);

      assert.match(sanitized, /\[phone\]/);
      assert.doesNotMatch(sanitized, /202[-. ]555[-. ]0100/);
    }
  });

  it("preserves the alphanumeric start boundary", () => {
    assert.equal(sanitizeAnalyticsQuery("ref12025550100"), "ref12025550100");
  });
});
