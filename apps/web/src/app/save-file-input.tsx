import type { Ref } from 'react'

/** The hidden file picker behind every "Choose a save" button. */
export function SaveFileInput({
  ref,
  onFile,
}: {
  ref: Ref<HTMLInputElement>
  onFile: (file: File) => void
}) {
  return (
    <input
      ref={ref}
      type="file"
      accept=".sav"
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) onFile(file)
        e.target.value = ''
      }}
    />
  )
}
