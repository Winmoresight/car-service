import assert from "node:assert/strict";
import test from "node:test";
import { combineLegacyBangkokDateTime } from "./legacy-date-time";

test("combines a legacy date and separate Bangkok time", () => {
  assert.equal(
    combineLegacyBangkokDateTime(new Date("2026-10-27T00:00:00.000Z"), "09:15"),
    "2026-10-27T02:15:00.000Z",
  );
});

test("keeps the stored date when the separate time is unavailable", () => {
  assert.equal(
    combineLegacyBangkokDateTime(new Date("2026-10-27T00:00:00.000Z"), ""),
    "2026-10-27T00:00:00.000Z",
  );
});
