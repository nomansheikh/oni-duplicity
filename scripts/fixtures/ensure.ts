import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sha256Bytes, sha256File } from "./checksum.ts";
import type { Fixture } from "./manifest.ts";

export type Download = (url: string) => Promise<Uint8Array>;
export type EnsureResult = "present" | "downloaded";

export const COMMITTED_DIR = "test-data/saves";
export const FETCHED_DIR = "test-data/fetched";

export function fixturePath(root: string, fixture: Fixture): string {
  return join(root, fixture.committed ? COMMITTED_DIR : FETCHED_DIR, fixture.file);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function ensureFixture(
  root: string,
  baseUrl: string,
  fixture: Fixture,
  download: Download,
): Promise<EnsureResult> {
  const path = fixturePath(root, fixture);

  if (await exists(path)) {
    const actual = await sha256File(path);
    if (actual === fixture.sha256) return "present";
    if (fixture.committed) {
      throw new Error(
        `${fixture.file}: committed file does not match its manifest checksum (${actual})`,
      );
    }
  } else if (fixture.committed) {
    throw new Error(`${fixture.file}: committed fixture is missing from ${COMMITTED_DIR}`);
  }

  const bytes = await download(`${baseUrl}/${fixture.file}`);
  const actual = sha256Bytes(bytes);
  if (actual !== fixture.sha256) {
    throw new Error(
      `${fixture.file}: downloaded file has sha256 ${actual}, expected ${fixture.sha256}`,
    );
  }

  await mkdir(join(root, FETCHED_DIR), { recursive: true });
  const partial = `${path}.partial`;
  await writeFile(partial, bytes);
  await rename(partial, path);
  return "downloaded";
}
