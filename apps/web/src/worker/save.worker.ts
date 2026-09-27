import { expose, transfer } from "comlink";
import { parseSave, writeSaveParts, type SaveGame } from "@oni-duplicity/save-parser";
import {
  applyEdit,
  knownTraits,
  listDuplicants,
  listGeysers,
  summarize,
  type Edit,
} from "./model.ts";

let save: SaveGame | null = null;
let fileName = "";
let edits = 0;

function current(): SaveGame {
  if (!save) throw new Error("No save loaded");
  return save;
}

const api = {
  load(buffer: ArrayBuffer, name: string, onProgress: (fraction: number) => void) {
    save = null;
    edits = 0;
    let last = 0;
    save = parseSave(buffer, {
      onProgress: (fraction) => {
        if (fraction - last >= 0.02) {
          last = fraction;
          onProgress(fraction);
        }
      },
    });
    fileName = name;
    return summarize(save, fileName);
  },
  summary: () => summarize(current(), fileName),
  duplicants: () => listDuplicants(current()),
  knownTraits: () => knownTraits(current()),
  geysers: () => listGeysers(current()),
  apply(edit: Edit) {
    applyEdit(current(), edit);
    edits++;
    return edits;
  },
  async save() {
    const save = current();
    const { head, body } = writeSaveParts(save);
    // The browser's native zlib ("deflate") is several times faster than JS on 400 MB bodies.
    const payload = save.header.isCompressed
      ? new Uint8Array(
          await new Response(
            new Blob([body as BlobPart]).stream().pipeThrough(new CompressionStream("deflate")),
          ).arrayBuffer(),
        )
      : body;
    const bytes = new Uint8Array(head.length + payload.length);
    bytes.set(head);
    bytes.set(payload, head.length);
    return transfer(bytes, [bytes.buffer]);
  },
  close() {
    save = null;
    edits = 0;
  },
};

export type SaveApi = typeof api;

expose(api);
