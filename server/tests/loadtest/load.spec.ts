import { test, expect } from "bun:test";
import { load_test } from "./load.js";

// test("load test", async () => {
//   const response = await fetch("http://localhost:3000");
//   expect(response.status).toEqual(200);

//   const test = await load_test();
//   console.log(test);
//   expect(test).toBeGreaterThan(2500);
// }, 20000);

test("load test (multi)", async () => {
  const response = await fetch("http://localhost:3000");
  expect(response.status).toEqual(200);

  const tests = [];
  for (let i = 0; i < 100; i++) {
    tests.push(load_test());
  }
  await Promise.allSettled(tests);
}, 2000000);
