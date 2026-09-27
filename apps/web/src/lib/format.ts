/** `BingeEater` → `Binge Eater`, `GeyserGeneric_hot_water` → `Hot Water`. */
export function humanize(id: string): string {
  return id
    .replace(/^GeyserGeneric_/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const DLC_NAMES: Record<string, string> = {
  EXPANSION1_ID: "Spaced Out",
  DLC2_ID: "Frosty Planet",
  DLC3_ID: "Bionic Booster",
  DLC4_ID: "Prehistoric Planet",
  DLC5_ID: "DLC5",
};
