import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";
import { sha256File } from "./checksum.ts";
import { fixturePath } from "./ensure.ts";
import { loadManifest } from "./manifest.ts";

const root = fileURLToPath(new URL("../..", import.meta.url));
const manifest = await loadManifest(join(root, "test-data/fixtures.json"));

test("lists nine fixtures served from the fixtures-v1 release", () => {
  expect(manifest.fixtures).toHaveLength(9);
  expect(manifest.baseUrl).toBe(
    "https://github.com/nomansheikh/oni-duplicity/releases/download/fixtures-v1",
  );
});

test.each(manifest.fixtures.filter((fixture) => fixture.committed))(
  "committed $file matches its checksum",
  async (fixture) => {
    expect(await sha256File(fixturePath(root, fixture))).toBe(fixture.sha256);
  },
);
