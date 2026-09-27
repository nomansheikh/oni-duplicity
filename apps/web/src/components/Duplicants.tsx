import { useState } from "react";
import type { DuplicantView, Edit } from "../worker/model.ts";
import { Badge, Button, Card, CommitInput, Input } from "./ui.tsx";
import { humanize } from "../lib/format.ts";

export function Duplicants({
  duplicants,
  knownTraits,
  onEdit,
}: {
  duplicants: DuplicantView[];
  knownTraits: string[];
  onEdit: (edit: Edit) => void;
}) {
  const [selectedId, setSelectedId] = useState(duplicants[0]?.id);
  const [query, setQuery] = useState("");
  const selected = duplicants.find((d) => d.id === selectedId) ?? duplicants[0];
  const visible = duplicants.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

  if (!selected) return <Card>No duplicants in this save.</Card>;

  return (
    <div className="grid grid-cols-[16rem_1fr] gap-4">
      <Card title={`Duplicants (${duplicants.length})`}>
        <Input
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2 w-full"
        />
        <ul className="max-h-[70vh] space-y-1 overflow-auto">
          {visible.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => setSelectedId(d.id)}
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
                  d.id === selected.id ? "bg-emerald-900/50" : "hover:bg-zinc-800"
                }`}
              >
                {d.name}
                {d.prefab === "BionicMinion" && <Badge tone="sky">Bionic</Badge>}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <DuplicantEditor
        key={selected.id}
        dupe={selected}
        knownTraits={knownTraits}
        onEdit={onEdit}
      />
    </div>
  );
}

function DuplicantEditor({
  dupe,
  knownTraits,
  onEdit,
}: {
  dupe: DuplicantView;
  knownTraits: string[];
  onEdit: (edit: Edit) => void;
}) {
  const [newTrait, setNewTrait] = useState("");
  const addable = knownTraits.filter((t) => !dupe.traits.includes(t));

  return (
    <div className="space-y-4">
      <Card title="Identity">
        <div className="flex items-center gap-3 text-sm">
          <span className="w-24 text-zinc-400">Name</span>
          <CommitInput
            value={dupe.name}
            onCommit={(name) => onEdit({ type: "setDuplicantName", id: dupe.id, name })}
          />
          <Badge>{dupe.gender}</Badge>
          {dupe.prefab === "BionicMinion" && <Badge tone="sky">Bionic</Badge>}
        </div>
      </Card>

      <Card title="Traits">
        <div className="mb-3 flex flex-wrap gap-2">
          {dupe.traits.map((trait) => (
            <span
              key={trait}
              className="inline-flex items-center gap-1 rounded bg-zinc-800 py-0.5 pl-2 pr-1 text-sm"
            >
              {humanize(trait)}
              <button
                title="Remove trait"
                className="rounded px-1 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                onClick={() => onEdit({ type: "removeTrait", id: dupe.id, traitId: trait })}
              >
                ×
              </button>
            </span>
          ))}
          {dupe.traits.length === 0 && <span className="text-sm text-zinc-500">No traits</span>}
        </div>
        <div className="flex gap-2">
          <Input
            list="known-traits"
            placeholder="Trait ID, e.g. BingeEater"
            value={newTrait}
            onChange={(e) => setNewTrait(e.target.value)}
            className="w-64"
          />
          <datalist id="known-traits">
            {addable.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <Button
            disabled={!newTrait.trim()}
            onClick={() => {
              onEdit({ type: "addTrait", id: dupe.id, traitId: newTrait.trim() });
              setNewTrait("");
            }}
          >
            Add trait
          </Button>
        </div>
      </Card>

      <Card title="Attributes">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
          {dupe.attributes.map((attribute) => (
            <label key={attribute.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-zinc-300">{humanize(attribute.id)}</span>
              <CommitInput
                type="number"
                min={0}
                value={String(attribute.level)}
                onCommit={(v) =>
                  onEdit({
                    type: "setAttributeLevel",
                    id: dupe.id,
                    attributeId: attribute.id,
                    level: Number(v) || 0,
                  })
                }
                className="w-20 text-right"
              />
            </label>
          ))}
        </div>
      </Card>

      <Card title="Mastered skills">
        <div className="flex flex-wrap gap-1">
          {dupe.skills.map((s) => (
            <Badge key={s} tone="emerald">
              {humanize(s)}
            </Badge>
          ))}
          {dupe.skills.length === 0 && <span className="text-sm text-zinc-500">None</span>}
        </div>
      </Card>
    </div>
  );
}
