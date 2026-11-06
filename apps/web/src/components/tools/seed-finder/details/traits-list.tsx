import { findWorldgenTrait } from '@oni-duplicity/game-data'

/** The world traits of an asteroid with the game's descriptions. */
export function TraitsList({ traits }: { traits: string[] }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="type-h3">Traits</h3>
      {traits.length === 0 ? (
        <p className="type-small text-muted-foreground">No world traits.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {traits.map((id) => {
            const trait = findWorldgenTrait(id)
            return (
              <li key={id} className="well flex flex-col gap-0.5">
                <span className="type-label">{trait?.name ?? id}</span>
                {trait?.desc && (
                  <span className="type-small text-muted-foreground">{trait.desc}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
