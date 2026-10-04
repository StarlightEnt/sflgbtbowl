import { test } from "node:test";
import assert from "node:assert/strict";
import { closePoolAfterResponse } from "../lib/closePoolAfterResponse.js";

const fakePool = () => {
  const p = { ended: 0 };
  p.end = async () => {
    p.ended += 1;
  };
  return p;
};

test("does not close the pool until the scheduled callback runs", () => {
  const pool = fakePool();
  let scheduled = null;
  closePoolAfterResponse(pool, (fn) => {
    scheduled = fn;
  });
  assert.equal(pool.ended, 0);
  assert.equal(typeof scheduled, "function");
});

test("closes the pool exactly once when the scheduled callback runs", async () => {
  const pool = fakePool();
  let scheduled;
  closePoolAfterResponse(pool, (fn) => {
    scheduled = fn;
  });
  await scheduled();
  assert.equal(pool.ended, 1);
});

test("a pool.end() failure is swallowed", async () => {
  const pool = {
    end: async () => {
      throw new Error("already closed");
    },
  };
  let scheduled;
  closePoolAfterResponse(pool, (fn) => {
    scheduled = fn;
  });
  await assert.doesNotReject(() => scheduled());
});

test("scheduling outside a request scope does not throw", () => {
  const pool = fakePool();
  assert.doesNotThrow(() =>
    closePoolAfterResponse(pool, () => {
      throw new Error("after() was called outside a request scope");
    })
  );
  assert.equal(pool.ended, 0);
});
