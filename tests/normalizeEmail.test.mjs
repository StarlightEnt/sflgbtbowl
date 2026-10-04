import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail } from "../lib/normalizeEmail.js";

test("lowercases and trims", () => {
  assert.equal(normalizeEmail("  Jane.Doe@Gmail.COM "), "jane.doe@gmail.com");
});
test("already-normal input is unchanged", () => {
  assert.equal(normalizeEmail("a@b.co"), "a@b.co");
});
test("blank, whitespace, null, undefined and non-strings become null", () => {
  for (const v of ["", "   ", null, undefined, 42, {}]) assert.equal(normalizeEmail(v), null);
});
