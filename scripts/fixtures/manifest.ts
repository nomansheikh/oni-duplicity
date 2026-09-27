import { readFile } from "node:fs/promises";

export type Tier = "small" | "full";
export type TierSelection = "small" | "all";

export interface Fixture {
  file: string;
  sha256: string;
  size: number;
  tier: Tier;
  committed: boolean;
  saveVersion: string;
  dlcIds: string[];
  cycles: number;
  duplicants: number;
  source: string;
  upstream: string | null;
  license: string;
}

export interface FixtureManifest {
  baseUrl: string;
  fixtures: Fixture[];
}

const FILE_NAME = /^[a-z0-9][a-z0-9.-]*\.sav$/;
const SHA256 = /^[0-9a-f]{64}$/;

export function parseManifest(json: unknown): FixtureManifest {
  if (typeof json !== "object" || json === null) {
    throw new Error("Fixture manifest must be an object");
  }
  const { baseUrl, fixtures } = json as { baseUrl?: unknown; fixtures?: unknown };
  if (typeof baseUrl !== "string" || !baseUrl.startsWith("https://")) {
    throw new Error("Fixture manifest baseUrl must be an https URL");
  }
  if (!Array.isArray(fixtures)) {
    throw new Error("Fixture manifest fixtures must be an array");
  }

  const seen = new Set<string>();
  for (const fixture of fixtures as Fixture[]) {
    if (!FILE_NAME.test(fixture.file)) {
      throw new Error(`Invalid fixture file name: ${fixture.file}`);
    }
    if (seen.has(fixture.file)) {
      throw new Error(`Duplicate fixture: ${fixture.file}`);
    }
    seen.add(fixture.file);
    if (!SHA256.test(fixture.sha256)) {
      throw new Error(`Invalid sha256 for ${fixture.file}`);
    }
    if (fixture.tier !== "small" && fixture.tier !== "full") {
      throw new Error(`Invalid tier for ${fixture.file}: ${String(fixture.tier)}`);
    }
  }

  return { baseUrl, fixtures: fixtures as Fixture[] };
}

export async function loadManifest(path: string): Promise<FixtureManifest> {
  return parseManifest(JSON.parse(await readFile(path, "utf8")));
}

export function selectFixtures(manifest: FixtureManifest, selection: TierSelection): Fixture[] {
  return manifest.fixtures.filter((fixture) => selection === "all" || fixture.tier === "small");
}
