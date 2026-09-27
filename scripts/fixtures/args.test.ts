import { expect, test } from "vite-plus/test";
import { parseTierArg } from "./args.ts";

test("defaults to all", () => {
  expect(parseTierArg([])).toBe("all");
});

test("accepts --tier small and --tier all", () => {
  expect(parseTierArg(["--tier", "small"])).toBe("small");
  expect(parseTierArg(["--tier", "all"])).toBe("all");
});

test("rejects unknown tiers, missing values and unknown flags", () => {
  expect(() => parseTierArg(["--tier", "huge"])).toThrow(/--tier/);
  expect(() => parseTierArg(["--tier"])).toThrow(/--tier/);
  expect(() => parseTierArg(["--force"])).toThrow(/Unknown argument/);
});
