import assert from "node:assert/strict";
import test from "node:test";
import { parseLocalDateInput } from "./date-input";

test("parses a valid local calendar date", () => {
  const date = parseLocalDateInput("2026-12-10");

  assert.ok(date);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 11);
  assert.equal(date.getDate(), 10);
});

test("rejects an impossible calendar date", () => {
  assert.equal(parseLocalDateInput("2026-02-30"), null);
});
