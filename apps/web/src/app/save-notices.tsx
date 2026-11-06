import type { Summary } from '@/worker/model'

export function SaveNotices({ summary }: { summary: Summary }) {
  return (
    <>
      {summary.isAutoSave && (
        <div className="border border-ink bg-warn/15 px-4 py-3 type-small">
          <p className="font-medium">This is an autosave</p>
          <p className="text-muted-foreground">
            The game&apos;s autosave rotation may overwrite an edited autosave
            {summary.originalSaveName
              ? `. It was written from ${summary.originalSaveName}, so editing that save is safer`
              : ''}
            .
          </p>
        </div>
      )}
      {(summary.unverified || summary.warnings.length > 0) && (
        <div className="border border-ink bg-warn/15 px-4 py-3 type-small">
          {summary.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          {summary.unverified && <p>Editing may corrupt this save. Keep a backup.</p>}
        </div>
      )}
    </>
  )
}
