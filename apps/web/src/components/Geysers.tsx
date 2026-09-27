import type { Edit, GeyserView } from "../worker/model.ts";
import { Card, CommitInput } from "./ui.tsx";
import { humanize } from "../lib/format.ts";

const fmt = (n: number, digits = 1) =>
  n.toLocaleString(undefined, { maximumFractionDigits: digits });

export function Geysers({
  geysers,
  onEdit,
}: {
  geysers: GeyserView[];
  onEdit: (edit: Edit) => void;
}) {
  if (geysers.length === 0) return <Card>No geysers in this save.</Card>;
  return (
    <Card title={`Geysers, vents and volcanoes (${geysers.length})`}>
      <table className="w-full text-left text-sm">
        <thead className="text-zinc-400">
          <tr>
            <th className="pb-2 font-normal">Name</th>
            <th className="pb-2 font-normal">Type</th>
            <th className="pb-2 text-right font-normal">Output while erupting</th>
            <th className="pb-2 text-right font-normal">Eruption</th>
            <th className="pb-2 text-right font-normal">Active / dormant</th>
            <th className="pb-2 text-right font-normal">Average</th>
            <th className="pb-2 text-right font-normal">Position</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {geysers.map((g) => {
            const average =
              g.iterationSeconds > 0
                ? (g.rate * (g.eruptionSeconds / g.iterationSeconds) * g.activeCycles) /
                  Math.max(g.activeCycles + g.dormancyCycles, 1e-9)
                : 0;
            return (
              <tr key={g.id}>
                <td className="py-1.5 pr-2">
                  <CommitInput
                    value={g.name}
                    onCommit={(name) => onEdit({ type: "setGeyserName", id: g.id, name })}
                  />
                </td>
                <td className="pr-2">{humanize(g.prefab)}</td>
                <td className="text-right">{fmt(g.rate / 1000, 2)} kg/s</td>
                <td className="text-right">
                  {fmt(g.eruptionSeconds, 0)} s of {fmt(g.iterationSeconds, 0)} s
                </td>
                <td className="text-right">
                  {fmt(g.activeCycles)} / {fmt(g.dormancyCycles)} cycles
                </td>
                <td className="text-right">{fmt(average, 0)} g/s</td>
                <td className="text-right text-zinc-400">
                  {g.x}, {g.y}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
