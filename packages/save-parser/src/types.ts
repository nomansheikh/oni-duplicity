/** Serialization type codes (low 6 bits of the type byte). */
export const TypeCode = {
  UserDefined: 0,
  SByte: 1,
  Byte: 2,
  Boolean: 3,
  Int16: 4,
  UInt16: 5,
  Int32: 6,
  UInt32: 7,
  Int64: 8,
  UInt64: 9,
  Single: 10,
  Double: 11,
  String: 12,
  Enumeration: 13,
  Vector2I: 14,
  Vector2: 15,
  Vector3: 16,
  Array: 17,
  Pair: 18,
  Dictionary: 19,
  List: 20,
  HashSet: 21,
  Queue: 22,
  Colour: 23,
} as const;

export const TYPE_CODE_MASK = 0x3f;
export const IS_VALUE_TYPE = 0x40;
export const IS_GENERIC_TYPE = 0x80;

export interface TypeInfo {
  /** Raw type byte: code plus value-type/generic flags. */
  info: number;
  templateName?: string;
  subTypes?: TypeInfo[];
}

export interface TemplateMember {
  name: string;
  type: TypeInfo;
}

export interface Template {
  name: string;
  fields: TemplateMember[];
  properties: TemplateMember[];
}

export type TemplateData = Record<string, unknown>;

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Behavior {
  name: string;
  /** Decoded fields, or null when the save has no template for this behavior. */
  templateData: TemplateData | null;
  /** Bytes after the template data (or all bytes when there is no template). */
  extraRaw: Uint8Array;
}

export interface GameObject {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  folder: number;
  behaviors: Behavior[];
}

export interface GameObjectGroup {
  /** Prefab name, e.g. `Minion` or `GeyserGeneric_steam`. */
  name: string;
  gameObjects: GameObject[];
}

export interface SaveHeader {
  buildVersion: number;
  headerVersion: number;
  isCompressed: boolean;
  /** Header JSON: baseName, numberOfCycles, dlcIds, saveMajorVersion, … */
  gameInfo: Record<string, unknown> & {
    baseName: string;
    numberOfCycles: number;
    numberOfDuplicants: number;
    isAutoSave: boolean;
    saveMajorVersion: number;
    saveMinorVersion: number;
    sandboxEnabled?: boolean;
    dlcId?: string | null;
    dlcIds?: string[];
    clusterId?: string;
  };
}

export interface SaveGame {
  header: SaveHeader;
  templates: Template[];
  world: TemplateData;
  settings: TemplateData;
  simData: Uint8Array;
  version: { major: number; minor: number };
  gameObjects: GameObjectGroup[];
  gameData: TemplateData;
  /** Warnings collected while parsing, e.g. an unverified save version. */
  warnings: string[];
}
