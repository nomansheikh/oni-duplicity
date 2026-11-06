import { BasicsSections } from './gallery-basics'
import { FormSections } from './gallery-forms'
import { OverlaySections } from './gallery-overlays'

export default function Gallery() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
      <h1 className="type-display uppercase">Component gallery</h1>

      <BasicsSections />
      <FormSections />
      <OverlaySections />
    </div>
  )
}
