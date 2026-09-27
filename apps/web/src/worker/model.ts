import {
  MAX_VERIFIED_MINOR,
  type Behavior,
  type GameObject,
  type SaveGame,
  type TemplateData,
} from "@oni-duplicity/save-parser";

// --- View models (sent to the UI) -----------------------------------------

export interface Summary {
  fileName: string;
  baseName: string;
  cycles: number;
  duplicants: number;
  version: string;
  buildVersion: number;
  dlcIds: string[];
  clusterId: string;
  isAutoSave: boolean;
  sandbox: boolean;
  unverified: boolean;
  warnings: string[];
}

export interface AttributeView {
  id: string;
  level: number;
}

export interface DuplicantView {
  id: string;
  prefab: string;
  name: string;
  gender: string;
  traits: string[];
  attributes: AttributeView[];
  skills: string[];
}

export interface GeyserView {
  id: string;
  prefab: string;
  name: string;
  x: number;
  y: number;
  /** Grams per second while erupting. */
  rate: number;
  eruptionSeconds: number;
  iterationSeconds: number;
  activeCycles: number;
  dormancyCycles: number;
}

export type Edit =
  | { type: "setColonyName"; name: string }
  | { type: "setSandbox"; enabled: boolean }
  | { type: "setDuplicantName"; id: string; name: string }
  | { type: "setAttributeLevel"; id: string; attributeId: string; level: number }
  | { type: "addTrait"; id: string; traitId: string }
  | { type: "removeTrait"; id: string; traitId: string }
  | { type: "setGeyserName"; id: string; name: string };

// --- Helpers ---------------------------------------------------------------

const SECONDS_PER_CYCLE = 600;

function behavior(obj: GameObject, name: string): Behavior | undefined {
  return obj.behaviors.find((b) => b.name === name);
}

function data(obj: GameObject, name: string): TemplateData {
  const found = behavior(obj, name)?.templateData;
  if (!found) throw new Error(`Object has no decoded "${name}" behavior`);
  return found;
}

/** Objects are addressed as `<prefab>:<index>`, stable for the lifetime of a loaded save. */
function objectsWith(
  save: SaveGame,
  behaviorName: string,
): { id: string; prefab: string; obj: GameObject }[] {
  const result: { id: string; prefab: string; obj: GameObject }[] = [];
  for (const group of save.gameObjects) {
    group.gameObjects.forEach((obj, index) => {
      if (behavior(obj, behaviorName)?.templateData) {
        result.push({ id: `${group.name}:${index}`, prefab: group.name, obj });
      }
    });
  }
  return result;
}

function objectById(save: SaveGame, id: string): GameObject {
  const split = id.lastIndexOf(":");
  const group = save.gameObjects.find((g) => g.name === id.slice(0, split));
  const obj = group?.gameObjects[Number(id.slice(split + 1))];
  if (!obj) throw new Error(`No object ${id}`);
  return obj;
}

function saveGameBehavior(save: SaveGame): TemplateData | undefined {
  const obj = save.gameObjects.find((g) => g.name === "SaveGame")?.gameObjects[0];
  return obj ? (behavior(obj, "SaveGame")?.templateData ?? undefined) : undefined;
}

function dlcIds(save: SaveGame): string[] {
  const info = save.header.gameInfo;
  if (Array.isArray(info.dlcIds)) return info.dlcIds.filter((id) => id !== "");
  return info.dlcId ? [info.dlcId] : [];
}

// --- Views -----------------------------------------------------------------

export function summarize(save: SaveGame, fileName: string): Summary {
  const info = save.header.gameInfo;
  return {
    fileName,
    baseName: info.baseName,
    cycles: info.numberOfCycles,
    duplicants: info.numberOfDuplicants,
    version: `${info.saveMajorVersion}.${info.saveMinorVersion}`,
    buildVersion: save.header.buildVersion,
    dlcIds: dlcIds(save),
    clusterId: info.clusterId ?? "",
    isAutoSave: info.isAutoSave,
    sandbox: Boolean(saveGameBehavior(save)?.sandboxEnabled ?? info.sandboxEnabled),
    unverified: info.saveMinorVersion > MAX_VERIFIED_MINOR,
    warnings: save.warnings,
  };
}

export function listDuplicants(save: SaveGame): DuplicantView[] {
  return objectsWith(save, "MinionIdentity").map(({ id, prefab, obj }) => {
    const identity = data(obj, "MinionIdentity");
    const traits = behavior(obj, "Klei.AI.Traits")?.templateData?.TraitIds as string[] | undefined;
    const levels = behavior(obj, "Klei.AI.AttributeLevels")?.templateData?.saveLoadLevels as
      | { attributeId: string; level: number }[]
      | undefined;
    const mastery = behavior(obj, "MinionResume")?.templateData?.MasteryBySkillID as
      | [string, boolean][]
      | null
      | undefined;
    return {
      id,
      prefab,
      name: typeof identity.name === "string" ? identity.name : "",
      gender: typeof identity.gender === "string" ? identity.gender : "",
      traits: traits ?? [],
      attributes: (levels ?? []).map((l) => ({ id: l.attributeId, level: l.level })),
      skills: (mastery ?? []).filter(([, mastered]) => mastered).map(([skill]) => skill),
    };
  });
}

/** Every trait ID that appears on any duplicant in the save, for the "add trait" picker. */
export function knownTraits(save: SaveGame): string[] {
  const all = new Set<string>();
  for (const dupe of listDuplicants(save)) for (const t of dupe.traits) all.add(t);
  return [...all].sort();
}

export function listGeysers(save: SaveGame): GeyserView[] {
  return objectsWith(save, "Geyser").map(({ id, prefab, obj }) => {
    const config = data(obj, "Geyser").configuration as Record<string, number>;
    const name = behavior(obj, "UserNameable")?.templateData?.savedName;
    const yearSeconds = config.scaledYearLength ?? 0;
    const yearPercent = config.scaledYearPercent ?? 0;
    return {
      id,
      prefab,
      name: typeof name === "string" ? name : prefab,
      x: Math.round(obj.position.x),
      y: Math.round(obj.position.y),
      rate: config.scaledRate ?? 0,
      eruptionSeconds: (config.scaledIterationLength ?? 0) * (config.scaledIterationPercent ?? 0),
      iterationSeconds: config.scaledIterationLength ?? 0,
      activeCycles: (yearSeconds * yearPercent) / SECONDS_PER_CYCLE,
      dormancyCycles: (yearSeconds * (1 - yearPercent)) / SECONDS_PER_CYCLE,
    };
  });
}

// --- Edits -----------------------------------------------------------------

export function applyEdit(save: SaveGame, edit: Edit): void {
  switch (edit.type) {
    case "setColonyName":
      save.header.gameInfo.baseName = edit.name;
      return;
    case "setSandbox": {
      save.header.gameInfo.sandboxEnabled = edit.enabled;
      const saveGame = saveGameBehavior(save);
      if (saveGame) saveGame.sandboxEnabled = edit.enabled;
      return;
    }
    case "setDuplicantName":
      data(objectById(save, edit.id), "MinionIdentity").name = edit.name;
      return;
    case "setAttributeLevel": {
      const levels = data(objectById(save, edit.id), "Klei.AI.AttributeLevels").saveLoadLevels as {
        attributeId: string;
        level: number;
      }[];
      const entry = levels.find((l) => l.attributeId === edit.attributeId);
      if (!entry) throw new Error(`No attribute ${edit.attributeId}`);
      entry.level = Math.max(0, Math.round(edit.level));
      return;
    }
    case "addTrait": {
      const traits = data(objectById(save, edit.id), "Klei.AI.Traits");
      const ids = (traits.TraitIds as string[] | null) ?? [];
      if (!ids.includes(edit.traitId)) traits.TraitIds = [...ids, edit.traitId];
      return;
    }
    case "removeTrait": {
      const traits = data(objectById(save, edit.id), "Klei.AI.Traits");
      traits.TraitIds = ((traits.TraitIds as string[] | null) ?? []).filter(
        (t) => t !== edit.traitId,
      );
      return;
    }
    case "setGeyserName": {
      const nameable = behavior(objectById(save, edit.id), "UserNameable")?.templateData;
      if (!nameable) throw new Error("This geyser cannot be renamed");
      nameable.savedName = edit.name;
      return;
    }
  }
}
