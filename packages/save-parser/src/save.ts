import { unzlibSync, zlibSync } from "fflate";
import { ParseError, Reader, Writer } from "./binary.ts";
import {
  readTemplateData,
  readTemplates,
  writeTemplateData,
  writeTemplates,
  type TemplateMap,
} from "./templates.ts";
import type {
  Behavior,
  GameObject,
  GameObjectGroup,
  SaveGame,
  SaveHeader,
  Template,
  TemplateData,
} from "./types.ts";

export const SUPPORTED_MAJOR = 7;
export const MIN_MINOR = 31;
export const MAX_VERIFIED_MINOR = 38;

const WORLD = "Klei.SaveFileRoot";
const SETTINGS = "Game+Settings";
const GAME_DATA = "Game+GameSaveData";

export interface ParseOptions {
  /** Throw instead of warning when the save is newer than the verified range. */
  strictVersion?: boolean;
  onProgress?: (fraction: number) => void;
}

const utf8 = new TextDecoder("utf-8");
const utf8Encoder = new TextEncoder();

function readHeader(r: Reader): SaveHeader {
  r.context = "header";
  const buildVersion = r.u32();
  const headerSize = r.u32();
  const headerVersion = r.u32();
  const isCompressed = headerVersion >= 1 ? r.u32() !== 0 : false;
  const json = utf8.decode(r.bytesView(headerSize));
  let gameInfo: SaveHeader["gameInfo"];
  try {
    gameInfo = JSON.parse(json);
  } catch {
    return r.fail("Header is not valid JSON; this is probably not an ONI save file");
  }
  return { buildVersion, headerVersion, isCompressed, gameInfo };
}

function writeHeader(w: Writer, header: SaveHeader): void {
  const json = utf8Encoder.encode(JSON.stringify(header.gameInfo));
  w.u32(header.buildVersion);
  w.u32(json.length);
  w.u32(header.headerVersion);
  if (header.headerVersion >= 1) w.u32(header.isCompressed ? 1 : 0);
  w.bytes(json);
}

function checkVersion(header: SaveHeader, options: ParseOptions, warnings: string[]): void {
  const major = header.gameInfo.saveMajorVersion;
  const minor = header.gameInfo.saveMinorVersion;
  if (major !== SUPPORTED_MAJOR) {
    throw new ParseError(`Save version ${major}.${minor} is not supported (need 7.x)`, 0, "header");
  }
  if (minor < MIN_MINOR) {
    throw new ParseError(
      `Save version ${major}.${minor} is too old. Load it in the current game and save again.`,
      0,
      "header",
    );
  }
  if (minor > MAX_VERIFIED_MINOR) {
    const message = `Save version ${major}.${minor} is newer than the verified 7.${MIN_MINOR}–7.${MAX_VERIFIED_MINOR}.`;
    if (options.strictVersion) throw new ParseError(message, 0, "header");
    warnings.push(message);
  }
}

function expectName(r: Reader, expected: string): void {
  const name = r.name();
  if (name !== expected) r.fail(`Expected "${expected}", got "${name}"`);
}

function readBehavior(r: Reader, templates: TemplateMap, group: string): Behavior {
  const name = r.name();
  r.context = `${group} > ${name}`;
  const length = r.i32();
  if (length < 0 || length > r.remaining) r.fail(`Invalid behavior length ${length}`);
  const end = r.pos + length;
  let templateData: TemplateData | null = null;
  if (templates.has(name)) {
    templateData = readTemplateData(r, templates, name);
    if (r.pos > end) r.fail(`Behavior data overran its length by ${r.pos - end} bytes`);
  }
  const extraRaw = r.bytesView(end - r.pos);
  return { name, templateData, extraRaw };
}

function readGameObject(r: Reader, templates: TemplateMap, group: string): GameObject {
  const position = { x: r.f32(), y: r.f32(), z: r.f32() };
  const rotation = { x: r.f32(), y: r.f32(), z: r.f32(), w: r.f32() };
  const scale = { x: r.f32(), y: r.f32(), z: r.f32() };
  const folder = r.u8();
  const count = r.i32();
  if (count < 0 || count > r.remaining) r.fail(`Invalid behavior count ${count}`);
  const behaviors: Behavior[] = [];
  for (let i = 0; i < count; i++) behaviors.push(readBehavior(r, templates, group));
  return { position, rotation, scale, folder, behaviors };
}

function readGameObjects(
  r: Reader,
  templates: TemplateMap,
  onProgress?: (fraction: number) => void,
): GameObjectGroup[] {
  const groupCount = r.i32();
  if (groupCount < 0 || groupCount > r.remaining) r.fail(`Invalid group count ${groupCount}`);
  const groups: GameObjectGroup[] = [];
  for (let g = 0; g < groupCount; g++) {
    const name = r.name();
    r.context = name;
    const instanceCount = r.i32();
    const length = r.i32();
    if (instanceCount < 0 || length < 0 || length > r.remaining) {
      r.fail(`Invalid group header (count ${instanceCount}, length ${length})`);
    }
    const end = r.pos + length;
    const gameObjects: GameObject[] = [];
    for (let i = 0; i < instanceCount; i++) gameObjects.push(readGameObject(r, templates, name));
    if (r.pos !== end) r.fail(`Group read ${r.pos - (end - length)} bytes, expected ${length}`);
    groups.push({ name, gameObjects });
    onProgress?.(r.pos / r.bytes.length);
  }
  return groups;
}

/** Parse the decompressed body (everything after the templates). */
export function parseBody(
  body: Uint8Array,
  templateList: Template[],
  onProgress?: (fraction: number) => void,
): Omit<SaveGame, "header" | "templates" | "warnings"> {
  const templates: TemplateMap = new Map(templateList.map((t) => [t.name, t]));
  const r = new Reader(body);

  r.context = "world";
  expectName(r, "world");
  expectName(r, WORLD);
  const world = readTemplateData(r, templates, WORLD);

  r.context = "settings";
  expectName(r, SETTINGS);
  const settings = readTemplateData(r, templates, SETTINGS);

  r.context = "sim data";
  const simLength = r.i32();
  if (simLength < 0) r.fail(`Invalid sim data length ${simLength}`);
  const simData = r.bytesView(simLength);

  r.context = "version";
  const marker = r.chars(4);
  if (marker !== "KSAV") r.fail(`Expected "KSAV" marker, got "${marker}"`);
  const version = { major: r.i32(), minor: r.i32() };

  const gameObjects = readGameObjects(r, templates, onProgress);

  r.context = "game data";
  expectName(r, GAME_DATA);
  const gameData = readTemplateData(r, templates, GAME_DATA);

  if (r.remaining !== 0) r.fail(`${r.remaining} unexpected bytes after the game data`);
  return { world, settings, simData, version, gameObjects, gameData };
}

/** Serialize the body back to uncompressed bytes. */
export function writeBody(save: SaveGame): Uint8Array {
  const templates: TemplateMap = new Map(save.templates.map((t) => [t.name, t]));
  const w = new Writer(Math.max(1 << 20, save.simData.length * 2));

  w.string("world");
  w.string(WORLD);
  writeTemplateData(w, templates, WORLD, save.world);
  w.string(SETTINGS);
  writeTemplateData(w, templates, SETTINGS, save.settings);

  w.i32(save.simData.length);
  w.bytes(save.simData);

  w.chars("KSAV");
  w.i32(save.version.major);
  w.i32(save.version.minor);

  w.i32(save.gameObjects.length);
  for (const group of save.gameObjects) {
    w.string(group.name);
    w.i32(group.gameObjects.length);
    const groupAt = w.beginLength();
    for (const obj of group.gameObjects) {
      const { position: p, rotation: q, scale: s } = obj;
      w.f32(p.x);
      w.f32(p.y);
      w.f32(p.z);
      w.f32(q.x);
      w.f32(q.y);
      w.f32(q.z);
      w.f32(q.w);
      w.f32(s.x);
      w.f32(s.y);
      w.f32(s.z);
      w.u8(obj.folder);
      w.i32(obj.behaviors.length);
      for (const behavior of obj.behaviors) {
        w.string(behavior.name);
        const at = w.beginLength();
        if (behavior.templateData) {
          writeTemplateData(w, templates, behavior.name, behavior.templateData);
        }
        w.bytes(behavior.extraRaw);
        w.endLength(at);
      }
    }
    w.endLength(groupAt);
  }

  w.string(GAME_DATA);
  writeTemplateData(w, templates, GAME_DATA, save.gameData);
  return w.finish();
}

/** Split a save file into header, templates and the decompressed body. */
export function readSaveParts(input: ArrayBuffer | Uint8Array): {
  header: SaveHeader;
  templates: Template[];
  body: Uint8Array;
} {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const r = new Reader(bytes);
  const header = readHeader(r);
  r.context = "templates";
  const templates = readTemplates(r);
  const rest = r.bytesView(r.remaining);
  let body: Uint8Array;
  try {
    body = header.isCompressed ? unzlibSync(rest) : rest;
  } catch (error) {
    throw new ParseError(`Could not decompress the save body: ${(error as Error).message}`, r.pos);
  }
  return { header, templates, body };
}

export function parseSave(input: ArrayBuffer | Uint8Array, options: ParseOptions = {}): SaveGame {
  const warnings: string[] = [];
  const { header, templates, body } = readSaveParts(input);
  checkVersion(header, options, warnings);
  const parsed = parseBody(body, templates, options.onProgress);
  if (
    parsed.version.major !== header.gameInfo.saveMajorVersion ||
    parsed.version.minor !== header.gameInfo.saveMinorVersion
  ) {
    warnings.push(
      `Body version ${parsed.version.major}.${parsed.version.minor} differs from header version ${header.gameInfo.saveMajorVersion}.${header.gameInfo.saveMinorVersion}.`,
    );
  }
  return { header, templates, ...parsed, warnings };
}

export function writeSave(save: SaveGame): Uint8Array {
  const w = new Writer(1 << 16);
  writeHeader(w, save.header);
  writeTemplates(w, save.templates);
  const body = writeBody(save);
  w.bytes(save.header.isCompressed ? zlibSync(body, { level: 1 }) : body);
  return w.finish();
}
