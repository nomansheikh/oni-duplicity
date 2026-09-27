import { useRef, useState } from "react";
import { Button } from "./ui.tsx";

export function DropZone({ onFile }: { onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 text-center transition ${
        over ? "border-emerald-500 bg-emerald-950/30" : "border-zinc-700"
      }`}
    >
      <p className="text-lg">Drop an Oxygen Not Included save here</p>
      <p className="max-w-md text-sm text-zinc-400">
        Saves are in <code>Documents/Klei/OxygenNotIncluded/cloud_save_files</code> on Windows and{" "}
        <code>~/Library/Application Support/unity.Klei.Oxygen Not Included/cloud_save_files</code>{" "}
        on macOS. The file never leaves your browser.
      </p>
      <Button variant="primary" onClick={() => input.current?.click()}>
        Choose a .sav file
      </Button>
      <input
        ref={input}
        type="file"
        accept=".sav"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
