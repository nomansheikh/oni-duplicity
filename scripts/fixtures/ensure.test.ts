import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { sha256Bytes } from "./checksum.ts";
import { COMMITTED_DIR, FETCHED_DIR, ensureFixture, fixturePath } from "./ensure.ts";
import type { Fixture } from "./manifest.ts";

const BASE_URL = "https://example.com/fixtures";
const bytes = new TextEncoder().encode("save bytes");

const fixture = (overrides: Partial<Fixture> = {}): Fixture => ({
  file: "example.sav",
  sha256: sha256Bytes(bytes),
  size: bytes.length,
  tier: "small",
  committed: false,
  saveVersion: "7.38",
  dlcIds: [],
  cycles: 1,
  duplicants: 3,
  source: "test",
  upstream: null,
  license: "CC0-1.0",
  ...overrides,
});

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "fixtures-"));
});

describe("ensureFixture", () => {
  test("downloads a missing fetched fixture", async () => {
    const download = vi.fn(async () => bytes);
    await expect(ensureFixture(root, BASE_URL, fixture(), download)).resolves.toBe("downloaded");
    expect(download).toHaveBeenCalledWith(`${BASE_URL}/example.sav`);
    expect(await readFile(join(root, FETCHED_DIR, "example.sav"))).toEqual(Buffer.from(bytes));
  });

  test("keeps a fetched fixture whose checksum matches", async () => {
    await mkdir(join(root, FETCHED_DIR), { recursive: true });
    await writeFile(fixturePath(root, fixture()), bytes);
    const download = vi.fn(async () => bytes);
    await expect(ensureFixture(root, BASE_URL, fixture(), download)).resolves.toBe("present");
    expect(download).not.toHaveBeenCalled();
  });

  test("re-downloads a corrupt fetched file", async () => {
    await mkdir(join(root, FETCHED_DIR), { recursive: true });
    await writeFile(fixturePath(root, fixture()), "truncated");
    const download = vi.fn(async () => bytes);
    await expect(ensureFixture(root, BASE_URL, fixture(), download)).resolves.toBe("downloaded");
    expect(await readFile(fixturePath(root, fixture()))).toEqual(Buffer.from(bytes));
  });

  test("rejects a download whose checksum does not match and writes nothing", async () => {
    const download = vi.fn(async () => new TextEncoder().encode("wrong bytes"));
    await expect(ensureFixture(root, BASE_URL, fixture(), download)).rejects.toThrow(
      /example\.sav: downloaded file has sha256/,
    );
    await expect(readdir(join(root, FETCHED_DIR))).rejects.toThrow();
  });

  test("propagates download failures and writes nothing", async () => {
    const download = vi.fn(async () => {
      throw new Error("GET failed: 404 Not Found");
    });
    await expect(ensureFixture(root, BASE_URL, fixture(), download)).rejects.toThrow(/404/);
    await expect(readdir(join(root, FETCHED_DIR))).rejects.toThrow();
  });

  test("never downloads a missing committed fixture", async () => {
    const download = vi.fn(async () => bytes);
    await expect(
      ensureFixture(root, BASE_URL, fixture({ committed: true }), download),
    ).rejects.toThrow(/committed fixture is missing/);
    expect(download).not.toHaveBeenCalled();
  });

  test("fails on a modified committed fixture", async () => {
    await mkdir(join(root, COMMITTED_DIR), { recursive: true });
    await writeFile(fixturePath(root, fixture({ committed: true })), "edited");
    const download = vi.fn(async () => bytes);
    await expect(
      ensureFixture(root, BASE_URL, fixture({ committed: true }), download),
    ).rejects.toThrow(/does not match its manifest checksum/);
    expect(download).not.toHaveBeenCalled();
  });
});
