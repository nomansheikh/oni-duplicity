import type { ReactNode } from "react";
import { DLC_NAMES } from "../lib/format.ts";
import type { Edit, Summary } from "../worker/model.ts";
import { Badge, Card, CommitInput } from "./ui.tsx";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-zinc-400">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function Overview({ summary, onEdit }: { summary: Summary; onEdit: (edit: Edit) => void }) {
  return (
    <Card title="Colony">
      <dl className="grid grid-cols-[10rem_1fr] items-center gap-x-4 gap-y-3 text-sm">
        <Row label="Colony name">
          <CommitInput
            value={summary.baseName}
            onCommit={(name) => onEdit({ type: "setColonyName", name })}
            className="w-64"
          />
        </Row>
        <Row label="Cycles">{summary.cycles}</Row>
        <Row label="Duplicants">{summary.duplicants}</Row>
        <Row label="Cluster">
          <code className="text-xs">{summary.clusterId || "—"}</code>
        </Row>
        <Row label="Save version">
          {summary.version} (build {summary.buildVersion})
        </Row>
        <Row label="DLCs">
          {summary.dlcIds.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {summary.dlcIds.map((id) => (
                <Badge key={id} tone="sky">
                  {DLC_NAMES[id] ?? id}
                </Badge>
              ))}
            </span>
          ) : (
            "Base game"
          )}
        </Row>
        <Row label="Sandbox mode">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={summary.sandbox}
              onChange={(e) => onEdit({ type: "setSandbox", enabled: e.target.checked })}
            />
            {summary.sandbox ? "On" : "Off"}
          </label>
        </Row>
      </dl>
    </Card>
  );
}
