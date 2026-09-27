import { useCallback, useEffect, useState } from "react";
import { DropZone } from "./components/DropZone.tsx";
import { Duplicants } from "./components/Duplicants.tsx";
import { Geysers } from "./components/Geysers.tsx";
import { Overview } from "./components/Overview.tsx";
import { Badge, Button } from "./components/ui.tsx";
import { DLC_NAMES } from "./lib/format.ts";
import { downloadBytes, loadSave, saveClient } from "./lib/save-client.ts";
import type { DuplicantView, Edit, GeyserView, Summary } from "./worker/model.ts";

type Tab = "overview" | "duplicants" | "geysers";

type State =
  | { status: "idle" }
  | { status: "loading"; fileName: string; progress: number }
  | { status: "error"; message: string }
  | { status: "loaded"; summary: Summary };

interface Views {
  duplicants: DuplicantView[];
  knownTraits: string[];
  geysers: GeyserView[];
}

export default function App() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [tab, setTab] = useState<Tab>("overview");
  const [views, setViews] = useState<Views | null>(null);
  const [edits, setEdits] = useState(0);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const [summary, duplicants, knownTraits, geysers] = await Promise.all([
      saveClient.summary(),
      saveClient.duplicants(),
      saveClient.knownTraits(),
      saveClient.geysers(),
    ]);
    setState({ status: "loaded", summary });
    setViews({ duplicants, knownTraits, geysers });
  }, []);

  const open = async (file: File) => {
    setState({ status: "loading", fileName: file.name, progress: 0 });
    setViews(null);
    setEdits(0);
    try {
      await loadSave(file, (progress) =>
        setState((s) => (s.status === "loading" ? { ...s, progress } : s)),
      );
      await refresh();
      setTab("overview");
    } catch (error) {
      setState({ status: "error", message: (error as Error).message });
    }
  };

  const edit = async (change: Edit) => {
    try {
      setEdits(await saveClient.apply(change));
      await refresh();
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const download = async () => {
    if (state.status !== "loaded") return;
    setSaving(true);
    try {
      const bytes = await saveClient.save();
      downloadBytes(bytes, `${state.summary.baseName}.sav`);
    } finally {
      setSaving(false);
    }
  };

  const close = async () => {
    if (edits > 0 && !confirm("Discard your unsaved changes?")) return;
    await saveClient.close();
    setState({ status: "idle" });
    setViews(null);
    setEdits(0);
  };

  useEffect(() => {
    if (edits === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edits]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Duplicity</h1>
        <span className="text-sm text-zinc-500">Oxygen Not Included save editor</span>
        {state.status === "loaded" && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-300">{state.summary.fileName}</span>
            <Badge>v{state.summary.version}</Badge>
            {state.summary.isAutoSave && <Badge tone="amber">Autosave</Badge>}
            {state.summary.dlcIds.map((id) => (
              <Badge key={id} tone="sky">
                {DLC_NAMES[id] ?? id}
              </Badge>
            ))}
            {edits > 0 && <Badge tone="emerald">{edits} unsaved edit(s)</Badge>}
            <Button variant="primary" onClick={download} disabled={saving}>
              {saving ? "Saving…" : "Download save"}
            </Button>
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
          </div>
        )}
      </header>

      {state.status === "idle" && <DropZone onFile={open} />}

      {state.status === "loading" && (
        <div className="space-y-2 rounded-lg border border-zinc-800 p-6">
          <p className="text-sm">Reading {state.fileName}…</p>
          <div className="h-2 overflow-hidden rounded bg-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${Math.round(state.progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm">
            <p className="font-medium text-red-300">This save could not be loaded.</p>
            <details className="mt-2 text-red-200/80">
              <summary className="cursor-pointer">Details</summary>
              <pre className="mt-2 whitespace-pre-wrap">{state.message}</pre>
            </details>
          </div>
          <DropZone onFile={open} />
        </div>
      )}

      {state.status === "loaded" && views && (
        <>
          {(state.summary.unverified || state.summary.warnings.length > 0) && (
            <div className="rounded-lg border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-200">
              {state.summary.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
              {state.summary.unverified && <p>Editing may corrupt this save. Keep a backup.</p>}
            </div>
          )}
          <p className="text-xs text-zinc-500">
            Back up your save before replacing it with the downloaded file.
          </p>
          <nav className="flex gap-1 border-b border-zinc-800">
            {(
              [
                ["overview", "Overview"],
                ["duplicants", `Duplicants (${views.duplicants.length})`],
                ["geysers", `Geysers (${views.geysers.length})`],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                  tab === id
                    ? "border-emerald-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          {tab === "overview" && <Overview summary={state.summary} onEdit={edit} />}
          {tab === "duplicants" && (
            <Duplicants
              duplicants={views.duplicants}
              knownTraits={views.knownTraits}
              onEdit={edit}
            />
          )}
          {tab === "geysers" && <Geysers geysers={views.geysers} onEdit={edit} />}
        </>
      )}
    </div>
  );
}
