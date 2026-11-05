/**
 * What a text field shows while the model behind it is edited asynchronously.
 *
 * `draft` is the text typed since the field last matched the model, or `null` when the
 * field simply shows the model's value.
 */

/**
 * The draft to keep once the model's value has changed. A focused field keeps what is being
 * typed, because the change may be the answer to an earlier edit, not to this one.
 */
export function draftAfterModelChange(draft: string | null, focused: boolean): string | null {
  return focused ? draft : null
}

/** The text to commit when the field loses focus, or `null` when nothing changed. */
export function textToCommit(draft: string | null, value: string): string | null {
  return draft !== null && draft !== value ? draft : null
}
